# Backend — Claude Code Context

## Run
```bash
cd backend
uvicorn main:app --reload   # port 8000
```
Requires: Redis on `localhost:6379`, `ANTHROPIC_API_KEY` in `.env`.

## Package management
`pip install -r requirements.txt` — no virtualenv assumed, but recommended.
After adding deps: update `requirements.txt` with pinned versions.

## Core service: claude_client.py
- `build_dynamic_system_prompt(client_id)` — async, fetches Redis context then builds prompt
- `stream_chat(system_prompt, history, user_message)` — returns `anthropic.Stream` (sync, used inside async generator)
- `generate_journal_prompt(mood_score, mood_label, therapist_context)` — one-shot call for check-in flow
- `summarize_conversation(messages)` — for therapist dashboard

## Redis patterns
Always use `await get_redis()` — returns a shared async connection pool.
Keys are namespaced: `checkin:{cid}:{id}`, `therapist_context:{cid}`, `chat:{conv_id}`, etc.
See `services/redis_client.py` for all helpers.

## Adding a new route
1. Add router file in `routers/`
2. Register with `app.include_router(...)` in `main.py`
3. Add Pydantic models in `models/schemas.py`

## Streaming
The `/chat/message` endpoint uses `StreamingResponse` with an async generator that yields SSE events:
- `data: {"type": "conv_id", "conversation_id": "..."}` — first event
- `data: {"type": "text", "content": "..."}` — each token chunk
- `data: {"type": "done", "conversation_id": "..."}` — final event
