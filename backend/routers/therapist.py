from fastapi import APIRouter, HTTPException
from models.schemas import TherapistContext
from services.redis_client import (
    save_therapist_context,
    get_therapist_context,
    get_recent_checkins,
    get_mood_trend,
    get_client_conversations,
    get_conversation,
)
from services.claude_client import summarize_conversation

router = APIRouter(prefix="/therapist", tags=["therapist"])


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
    """Aggregate view: mood trends, recent journals, and chat summaries."""
    checkins = await get_recent_checkins(client_id, limit=30)
    mood_trend = await get_mood_trend(client_id, days=30)
    context = await get_therapist_context(client_id)

    # Get summaries of recent conversations
    conv_ids = await get_client_conversations(client_id)
    chat_summaries = []
    for conv_id in list(conv_ids)[:5]:  # Last 5 conversations
        messages = await get_conversation(conv_id)
        if messages:
            summary = await summarize_conversation(messages)
            chat_summaries.append({
                "conversation_id": conv_id,
                "message_count": len(messages),
                "summary": summary,
            })

    return {
        "client_id": client_id,
        "client_name": context.get("client_name") if context else "Unknown",
        "mood_trend": mood_trend,
        "recent_checkins": checkins[:7],
        "chat_summaries": chat_summaries,
        "therapist_context": context,
    }
