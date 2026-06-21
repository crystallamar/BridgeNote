from fastapi import APIRouter, HTTPException
from models.schemas import TherapistContext
from services.redis_client import (
    save_therapist_context,
    get_therapist_context,
    get_recent_checkins,
    get_mood_trend,
    get_client_conversations,
    get_conversation,
    get_therapist_clients,
    register_client,
    save_checkin_config,
    get_checkin_config,
)
from services.claude_client import summarize_conversation

router = APIRouter(prefix="/therapist", tags=["therapist"])


@router.get("/clients/{therapist_id}")
async def list_clients(therapist_id: str):
    clients = await get_therapist_clients(therapist_id)
    return {"therapist_id": therapist_id, "clients": clients}


@router.post("/clients/{therapist_id}/add")
async def add_client(therapist_id: str, client_id: str, name: str):
    await register_client(client_id, name, therapist_id)
    return {"status": "added", "client_id": client_id}


@router.get("/checkin-config/{client_id}")
async def get_checkin_config_route(client_id: str):
    return await get_checkin_config(client_id)


@router.post("/checkin-config/{client_id}")
async def save_checkin_config_route(client_id: str, config: dict):
    await save_checkin_config(client_id, config)
    return {"status": "saved"}


@router.post("/context")
async def upsert_context(context: TherapistContext):
    """Create or update therapist-provided client context."""
    await save_therapist_context(context.model_dump())
    return {"status": "saved", "client_id": context.client_id}


@router.get("/context/{client_id}")
async def fetch_context(client_id: str):
    context = await get_therapist_context(client_id)
    if not context:
        raise HTTPException(status_code=404, detail="No context found for client")
    return context


@router.get("/dashboard/{client_id}")
async def therapist_dashboard(client_id: str):
    """Aggregate view: mood trends, recent journals, conversation metadata.
    Summaries are NOT generated here — fetch /chat/summary/{id} lazily per conversation."""
    import asyncio
    checkins, mood_trend, context, conv_ids = await asyncio.gather(
        get_recent_checkins(client_id, limit=30),
        get_mood_trend(client_id, days=30),
        get_therapist_context(client_id),
        get_client_conversations(client_id),
    )

    # Return conversation metadata only — no Claude calls here
    conversations = []
    conv_list = list(conv_ids)[:10]
    for conv_id in conv_list:
        messages = await get_conversation(conv_id)
        if messages:
            last_ts = messages[-1].get("timestamp", "") if messages else ""
            conversations.append({
                "conversation_id": conv_id,
                "message_count": len(messages),
                "last_message_at": last_ts,
            })

    return {
        "client_id": client_id,
        "client_name": context.get("client_name") if context else "Unknown",
        "mood_trend": mood_trend,
        "recent_checkins": checkins[:7],
        "conversations": conversations,
        "therapist_context": context,
    }


@router.get("/conversation-summary/{conv_id}")
async def conversation_summary(conv_id: str):
    """Generate an AI summary for a single conversation — called lazily from the UI."""
    messages = await get_conversation(conv_id)
    if not messages:
        raise HTTPException(status_code=404, detail="Conversation not found")
    try:
        summary = await summarize_conversation(messages)
    except Exception:
        summary = f"[{len(messages)} messages — summary unavailable]"
    return {"conversation_id": conv_id, "message_count": len(messages), "summary": summary}
