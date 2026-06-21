# BridgeNote

**Mental health support, between sessions.**

BridgeNote is an AI-powered continuity-of-care platform that keeps therapy working in the 10,000 minutes between sessions. Clients do daily check-ins and chat with a personalized AI companion. Therapists see mood trends, journal sentiment, and AI-generated session summaries — before the next appointment begins.

---

## What it does

| Role | Experience |
|------|-----------|
| **Client** | Daily mood + slider check-in → optional journal → chat with AI companion anytime |
| **Therapist** | Dashboard with mood trends, slider charts, check-in history, and AI conversation summaries per client |

The AI companion is not generic — it knows each client's treatment goals, triggers, strengths, diagnoses, and last session summary because the therapist enters that context once. Every chatbot response is built on that foundation.

---

## Live Demo

> **Requirements:** Redis (local or Docker) + an [Anthropic API key](https://console.anthropic.com/). The seed script pre-loads all demo data — no manual setup beyond that.

### 1. Clone & configure

```bash
git clone https://github.com/crystallamar/BridgeNote.git
cd BridgeNote
```

Copy the example env file and add your key:

```bash
cp backend/.env.example backend/.env
# then open backend/.env and set ANTHROPIC_API_KEY=your_key_here
```

### 2. Start Redis

```bash
# Docker (easiest)
docker-compose up redis -d

# Or Homebrew on Mac
brew services start redis
```

### 3. Start the backend

```bash
cd backend
pip install -r requirements.txt
python -m textblob.download_corpora   # one-time setup
uvicorn main:app --reload
# → http://localhost:8000
```

### 4. Seed demo data

```bash
# From the backend/ directory
python seed_demo.py
```

This loads 5 demo clients with 7 days of check-ins, therapist context, and personalized check-in configs. The primary demo client is **Ethan Rhodes** (client-001) — a CS junior navigating academic burnout and imposter syndrome.

### 5. Start the frontend

```bash
cd ../frontend
npm install --legacy-peer-deps
npm start
# → http://localhost:3000
```

### 6. Walk the demo

**Therapist view** (loads by default):
- Select **Ethan Rhodes** from the client dropdown
- **Overview tab** — treatment goals, triggers, strengths, last session summary entered by therapist
- **Check-ins tab** — mood entries, stress/energy sliders, journal snippets, "What got in the way?" habit tags
- **Conversations tab** — AI-generated session summaries ready before the next appointment

**Client view** (toggle in nav):
- Complete a check-in: mood rating → stress/energy sliders → habit buttons → AI-generated journal prompt
- Chat with the AI companion — it already knows Ethan's full context

---

## Demo Clients

| ID | Name | Profile |
|----|------|---------|
| client-001 | **Ethan Rhodes** ⭐ | CS junior, academic burnout, imposter syndrome |
| client-002 | Jordan Reid | Depression, GRAPES framework |
| client-003 | Sam Tran | PTSD stabilization, grounding focus |
| client-004 | Maya Krishnamurthy | College anxiety/depression, biweekly sessions |
| client-005 | Alex Morales | GAD, workplace performance anxiety |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Recharts |
| Backend | FastAPI (Python 3.12), Uvicorn |
| AI | Claude claude-sonnet-4-6 (Anthropic) — streaming SSE |
| Sentiment analysis | TextBlob |
| Storage | Redis (async via redis.asyncio) — no SQL |
| Containerization | Docker Compose |

---

## Safety Protocol

The AI companion has a hardcoded safety guardrail that activates on any language related to suicidal ideation, self-harm, or intent to harm others — whether direct, hypothetical, or through metaphor:

1. Stays present and warm — never ends the conversation
2. Explicitly discloses it is an AI, not a human
3. Provides crisis resources immediately: **988 Lifeline** and **Crisis Text Line (HOME to 741741)**
4. Offers grounding (5-4-3-2-1 senses, box breathing)
5. Stays in conversation and asks grounding follow-up questions

This is an absolute constraint in the system prompt — it cannot be overridden by user messages.

---

## API Reference

```
POST /checkin/                    Submit a check-in (runs TextBlob sentiment)
GET  /checkin/recent/{id}         Fetch last N check-ins for a client
POST /checkin/journal-prompt      Generate AI journaling prompt from mood + context
POST /chat/start                  Create a new conversation
POST /chat/message                Streaming SSE chat response
GET  /chat/history/{conv_id}      Full conversation history
GET  /chat/summary/{conv_id}      AI-generated therapist summary
POST /therapist/context           Create or update therapist client context
GET  /therapist/context/{id}      Fetch therapist context
GET  /therapist/dashboard/{id}    Full dashboard: mood trend + check-ins + summaries
```

---

## Project Structure

```
BridgeNote/
├── backend/
│   ├── main.py                     FastAPI app entry point + CORS
│   ├── seed_demo.py                Seeds 5 demo clients into Redis
│   ├── services/
│   │   ├── claude_client.py        System prompt builder, streaming, safety protocol
│   │   └── redis_client.py         All Redis reads/writes
│   └── routers/
│       ├── chat.py                 Streaming SSE chat endpoint
│       ├── checkin.py              Check-in submission + journal prompt
│       └── therapist.py            Dashboard aggregation + context CRUD
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Chat/               Streaming chat UI
│       │   ├── CheckIn/            3-step check-in form
│       │   └── TherapistDashboard/ Recharts mood trends, summaries
│       └── hooks/
│           └── useChat.js          SSE streaming hook
└── docker-compose.yml
```

---

## Notes for Reviewers

- **No auth system** — client/therapist IDs are hardcoded (`client-001` / `therapist-001`) for hackathon scope
- **Redis is not persisted** between restarts unless configured — run `seed_demo.py` again if data disappears
- `npm install --legacy-peer-deps` is required due to an ajv@8 peer dependency conflict with react-scripts 5
- The `/chat/message` endpoint returns `text/event-stream`; the frontend proxy in `package.json` forwards to `localhost:8000`

---

*Built in 48 hours. Mental health tooling deserves better infrastructure.*
