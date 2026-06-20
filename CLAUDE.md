# BridgeNote — Claude Code Context

## What this project is
A therapeutic continuity web app. Clients do daily mood check-ins and chat with an AI companion between therapy sessions. Therapists see a dashboard of mood trends, journal sentiment, and chatbot summaries.

## Stack
- **Frontend**: React 18, React Router v6, Recharts — lives in `frontend/`
- **Backend**: FastAPI (Python 3.12), Uvicorn — lives in `backend/`
- **AI**: Claude API (`claude-sonnet-4-6`) via `anthropic` SDK — streaming SSE responses
- **Storage**: Redis (async via `redis.asyncio`) — all persistence, no SQL DB
- **Containerization**: `docker-compose.yml` at root runs Redis + backend

## Running the project locally
```bash
# 1. Redis (required)
docker-compose up redis -d        # or: brew services start redis

# 2. Backend
cd backend
cp .env.example .env              # fill in ANTHROPIC_API_KEY
pip install -r requirements.txt
python -m textblob.download_corpora  # one-time
uvicorn main:app --reload         # http://localhost:8000

# 3. Seed demo data (optional but useful)
python seed_demo.py

# 4. Frontend
cd ../frontend
npm install --legacy-peer-deps    # ajv@^8 is required alongside react-scripts 5
npm start                         # http://localhost:3000
```

## Key files to know
| File | Purpose |
|------|---------|
| `backend/services/claude_client.py` | **Core chatbot logic** — builds dynamic system prompt from Redis data, streams responses |
| `backend/services/redis_client.py` | All Redis reads/writes — check-ins, therapist context, chat history |
| `backend/routers/chat.py` | Streaming SSE endpoint (`POST /chat/message`) |
| `backend/routers/checkin.py` | Daily check-in + AI journal prompt generation |
| `backend/routers/therapist.py` | Therapist context CRUD + dashboard aggregation |
| `frontend/src/hooks/useChat.js` | SSE streaming hook — reads `text/event-stream` chunks |
| `frontend/src/components/Chat/ChatWindow.jsx` | Chat UI |
| `frontend/src/components/CheckIn/CheckInForm.jsx` | 3-step mood check-in form |
| `frontend/src/components/TherapistDashboard/Dashboard.jsx` | Recharts mood trends + summaries |

## Redis data model
```
checkin:{client_id}:{checkin_id}     → JSON check-in record
checkins:{client_id}                 → sorted set (score = timestamp)
therapist_context:{client_id}        → JSON therapist-provided context
chat:{conversation_id}               → list of JSON messages (30-day TTL)
conversations:{client_id}            → set of conversation IDs
conv_client:{conversation_id}        → client_id string
```

## Demo IDs (hardcoded for hackathon)
- Client: `client-001`
- Therapist: `therapist-001`
These are set in `frontend/src/App.jsx` — change them to add multi-user support.

## API endpoints
```
POST /checkin/              Create check-in (runs sentiment analysis)
GET  /checkin/recent/{id}   Last N check-ins for client
POST /checkin/journal-prompt  AI-generated journaling prompt
POST /chat/start            Create new conversation
POST /chat/message          Streaming SSE chat message
GET  /chat/history/{conv}   Full conversation history
GET  /chat/summary/{conv}   AI summary of conversation
POST /therapist/context     Upsert therapist client context
GET  /therapist/context/{id}  Fetch therapist context
GET  /therapist/dashboard/{id}  Full dashboard data
```

## The chatbot system prompt pipeline
`build_dynamic_system_prompt(client_id)` in `claude_client.py`:
1. Fetches `therapist_context:{client_id}` from Redis (goals, triggers, strengths, session notes)
2. Fetches last 7 check-ins from Redis (mood, anxiety, energy, sleep, journal snippets)
3. Assembles a multi-section system prompt: base persona + therapist context + check-in history
4. Passes to `stream_chat()` which calls `client.messages.stream()` with `claude-sonnet-4-6`

## Important constraints
- **No auth system** — client_id/therapist_id are hardcoded for hackathon scope
- **ajv dependency**: `npm install --legacy-peer-deps` is required; react-scripts 5 + ajv@8 peer dep conflict
- **TextBlob corpora**: must run `python -m textblob.download_corpora` before first backend start
- **Streaming**: the `/chat/message` endpoint returns `text/event-stream`; the `proxy` in `package.json` forwards to `localhost:8000`

## GitHub
Repo: https://github.com/crystallamar/BridgeNote.git
Push pattern: commit on main, push to origin main.
