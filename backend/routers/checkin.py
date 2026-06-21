from fastapi import APIRouter, HTTPException
from models.schemas import CheckInCreate, JournalPromptRequest
from services.redis_client import save_checkin, get_recent_checkins, get_checkin, get_therapist_context, get_checkin_config, save_checkin_config
from services.sentiment import analyze_sentiment
from services.claude_client import generate_journal_prompt

router = APIRouter(prefix="/checkin", tags=["checkin"])


@router.post("/")
async def create_checkin(checkin: CheckInCreate):
    data = checkin.model_dump()
    if data.get("journal_entry"):
        sentiment = analyze_sentiment(data["journal_entry"])
        data["sentiment_score"] = sentiment["score"]
        data["sentiment_label"] = sentiment["label"]
    checkin_id = await save_checkin(data)
    return {"checkin_id": checkin_id, "status": "saved"}


@router.get("/recent/{client_id}")
async def recent_checkins(client_id: str, limit: int = 7):
    checkins = await get_recent_checkins(client_id, limit=limit)
    return {"client_id": client_id, "checkins": checkins}


@router.post("/journal-prompt")
async def get_journal_prompt(req: JournalPromptRequest):
    therapist_context = await get_therapist_context(req.client_id)
    try:
        prompt = await generate_journal_prompt(
            req.mood_score,
            req.mood_label,
            therapist_context,
            previous_prompt=req.previous_prompt,
        )
    except Exception:
        # Fallback if Claude API unavailable
        fallback = [
            "What's one small thing that brought you comfort or peace today, even briefly?",
            "What emotion have you been sitting with most today? Where do you feel it in your body?",
            "If you could tell your therapist one thing about this week, what would it be?",
            "What does your inner critic say most often? What would a kind friend say instead?",
        ]
        import random
        prompt = random.choice(fallback)
    return {"prompt": prompt}


# IMPORTANT: /config/ and specific paths must come BEFORE /{client_id}/{checkin_id}
# to avoid the wildcard route swallowing them.
@router.get("/config/{client_id}")
async def get_config(client_id: str):
    config = await get_checkin_config(client_id)
    return config


@router.post("/config/{client_id}")
async def save_config(client_id: str, config: dict):
    await save_checkin_config(client_id, config)
    return {"status": "saved"}


@router.get("/{client_id}/{checkin_id}")
async def get_single_checkin(client_id: str, checkin_id: str):
    checkin = await get_checkin(client_id, checkin_id)
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")
    return checkin
