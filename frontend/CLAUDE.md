# Frontend — Claude Code Context

## Run
```bash
cd frontend
npm start   # port 3000, proxies /api calls to localhost:8000
```

## Install note
Must use `--legacy-peer-deps` due to ajv version conflict with react-scripts 5:
```bash
npm install --legacy-peer-deps
```

## Routing (React Router v6)
- `/` — CheckInForm (daily mood + journal)
- `/chat` — ChatWindow (streaming AI chat)
- `/therapist` — TherapistDashboard (mood trends, summaries)

## State management
No Redux. Local `useState` + the `useChat` custom hook for the chat stream.

## Streaming chat hook: src/hooks/useChat.js
- Calls `POST /chat/message` and reads `text/event-stream` via `response.body.getReader()`
- Accumulates partial tokens into the last message in state
- Handles `conv_id`, `text`, and `done` SSE event types
- Exposes: `{ messages, sendMessage, isStreaming, conversationId, reset }`

## API calls: src/services/api.js
All backend calls go through `api.*` helpers. The `proxy` field in `package.json` routes to `http://localhost:8000`.

## Adding a new view
1. Create component in `src/components/<Name>/`
2. Add `<Route>` in `src/App.jsx`
3. Add nav link in the `NavBar` component in `App.jsx`

## CSS approach
Plain CSS modules co-located with each component (e.g. `ChatWindow.css`). No Tailwind, no CSS-in-JS.
Color palette: primary `#6c63ff`, success `#2ecc71`, danger `#e74c3c`, bg `#f7f7fb`.
