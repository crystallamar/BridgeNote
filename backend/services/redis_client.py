import redis.asyncio as redis
import json
import os
from typing import Optional, List
from datetime import datetime
import uuid

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

_pool: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    global _pool
    if _pool is None:
        _pool = redis.from_url(REDIS_URL, decode_responses=True)
    return _pool


# ── Check-ins ──────────────────────────────────────────────────────────────

async def save_checkin(checkin_data: dict) -> str:
    r = await get_redis()
    checkin_id = str(uuid.uuid4())
    checkin_data["id"] = checkin_id
    checkin_data["timestamp"] = datetime.utcnow().isoformat()

    client_id = checkin_data["client_id"]
    key = f"checkin:{client_id}:{checkin_id}"
    await r.set(key, json.dumps(checkin_data))
    # Keep a sorted list by timestamp score for easy retrieval
    await r.zadd(f"checkins:{client_id}", {checkin_id: datetime.utcnow().timestamp()})
    return checkin_id


async def get_recent_checkins(client_id: str, limit: int = 7) -> List[dict]:
    r = await get_redis()
    # Get most recent checkin IDs
    ids = await r.zrevrange(f"checkins:{client_id}", 0, limit - 1)
    checkins = []
    for cid in ids:
        raw = await r.get(f"checkin:{client_id}:{cid}")
        if raw:
            checkins.append(json.loads(raw))
    return checkins


async def get_checkin(client_id: str, checkin_id: str) -> Optional[dict]:
    r = await get_redis()
    raw = await r.get(f"checkin:{client_id}:{checkin_id}")
    return json.loads(raw) if raw else None


# ── Therapist context ──────────────────────────────────────────────────────

async def save_therapist_context(context: dict) -> None:
    r = await get_redis()
    client_id = context["client_id"]
    await r.set(f"therapist_context:{client_id}", json.dumps(context))


async def get_therapist_context(client_id: str) -> Optional[dict]:
    r = await get_redis()
    raw = await r.get(f"therapist_context:{client_id}")
    return json.loads(raw) if raw else None


# ── Chat history ───────────────────────────────────────────────────────────

async def save_message(conversation_id: str, message: dict) -> None:
    r = await get_redis()
    message["timestamp"] = datetime.utcnow().isoformat()
    await r.rpush(f"chat:{conversation_id}", json.dumps(message))
    await r.expire(f"chat:{conversation_id}", 86400 * 30)  # 30-day TTL


async def get_conversation(conversation_id: str) -> List[dict]:
    r = await get_redis()
    raw_messages = await r.lrange(f"chat:{conversation_id}", 0, -1)
    return [json.loads(m) for m in raw_messages]


async def create_conversation(client_id: str) -> str:
    r = await get_redis()
    conv_id = str(uuid.uuid4())
    await r.sadd(f"conversations:{client_id}", conv_id)
    await r.set(f"conv_client:{conv_id}", client_id)
    return conv_id


async def get_client_conversations(client_id: str) -> List[str]:
    r = await get_redis()
    return list(await r.smembers(f"conversations:{client_id}"))


# ── Check-in config (therapist-configured form) ────────────────────────────

DEFAULT_CHECKIN_CONFIG = {
    "sliders": [
        {"key": "anxiety", "label": "Anxiety", "color": "#e74c3c"},
        {"key": "energy",  "label": "Energy",  "color": "#2ecc71"},
    ],
    "button_groups": [
        {
            "key": "grapes",
            "label": "GRAPES — what did you do today?",
            "multi": True,
            "items": ["Grateful", "Relax", "Accomplish", "Pleasure", "Exercise", "Social"],
        },
        {
            "key": "self_care",
            "label": "Self-care",
            "multi": True,
            "items": ["Showered", "Ate meals", "Took medication", "Got outside", "Slept well"],
        },
    ],
}


async def save_checkin_config(client_id: str, config: dict) -> None:
    r = await get_redis()
    await r.set(f"checkin_config:{client_id}", json.dumps(config))


async def get_checkin_config(client_id: str) -> dict:
    r = await get_redis()
    raw = await r.get(f"checkin_config:{client_id}")
    return json.loads(raw) if raw else DEFAULT_CHECKIN_CONFIG


# ── Client registry ────────────────────────────────────────────────────────

async def register_client(client_id: str, name: str, therapist_id: str) -> None:
    r = await get_redis()
    await r.hset(f"client:{client_id}", mapping={"name": name, "therapist_id": therapist_id})
    await r.sadd(f"therapist_clients:{therapist_id}", client_id)


async def get_therapist_clients(therapist_id: str) -> List[dict]:
    r = await get_redis()
    client_ids = list(await r.smembers(f"therapist_clients:{therapist_id}"))
    clients = []
    for cid in client_ids:
        data = await r.hgetall(f"client:{cid}")
        if data:
            clients.append({"client_id": cid, **data})
    return clients


# ── Mood analytics ─────────────────────────────────────────────────────────

async def get_mood_trend(client_id: str, days: int = 30) -> List[dict]:
    checkins = await get_recent_checkins(client_id, limit=days)
    results = []
    for c in checkins:
        slider_vals = c.get("slider_values") or {}
        entry = {
            "date": c.get("entry_date") or c.get("timestamp", "")[:10],
            "mood_score": c.get("mood_score"),
            "sentiment_score": c.get("sentiment_score"),
        }
        # Spread all slider values as top-level keys for the chart
        entry.update(slider_vals)
        results.append(entry)
    return results
