from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import json
import uuid

from models.schemas import ChatRequest
from services.claude_client import build_dynamic_system_prompt, stream_chat, summarize_conversation
from services.redis_client import (
    save_message,
    get_conversation,
    create_conversation,
    get_client_conversations,
)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/start")
async def start_conversation(client_id: str):
    """Create a new conversation and return its ID."""
    conv_id = await create_conversation(client_id)
    return {"conversation_id": conv_id}


@router.post("/message")
async def send_message(req: ChatRequest):
    """
    Send a message and get a streaming Claude response.
    Pulls therapist context + recent check-ins from Redis to build a dynamic system prompt.
    """
    conv_id = req.conversation_id
    if not conv_id:
        conv_id = await create_conversation(req.client_id)

    # Build personalized system prompt from Redis data
    system_prompt = await build_dynamic_system_prompt(req.client_id)

    # Load existing conversation history
    history = await get_conversation(conv_id)

    # Save the user message immediately
    user_msg = {"role": "user", "content": req.message}
    await save_message(conv_id, user_msg)

    async def generate():
        # Yield conversation_id first so client can track it
        yield f"data: {json.dumps({'type': 'conv_id', 'conversation_id': conv_id})}\n\n"

        full_response = []
        with stream_chat(system_prompt, history, req.message) as stream:
            for text in stream.text_stream:
                full_response.append(text)
                yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"

        # Persist assistant response
        assistant_content = "".join(full_response)
        assistant_msg = {"role": "assistant", "content": assistant_content}
        await save_message(conv_id, assistant_msg)

        yield f"data: {json.dumps({'type': 'done', 'conversation_id': conv_id})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history/{conversation_id}")
async def get_history(conversation_id: str):
    messages = await get_conversation(conversation_id)
    return {"conversation_id": conversation_id, "messages": messages}


@router.get("/conversations/{client_id}")
async def list_conversations(client_id: str):
    conv_ids = await get_client_conversations(client_id)
    return {"client_id": client_id, "conversations": conv_ids}


@router.get("/summary/{conversation_id}")
async def get_summary(conversation_id: str):
    messages = await get_conversation(conversation_id)
    summary = await summarize_conversation(messages)
    return {"conversation_id": conversation_id, "summary": summary}
