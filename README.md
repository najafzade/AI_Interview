# Interview Loop AI

Production-style take-home implementation for a **stateful technical interview agent** with a persisted **human feedback loop** and **prompt version management**.

## Why this architecture

The interview logic is intentionally built as a **state-machine orchestrator** (not a single prompt call):

`WELCOME → ASKING_QUESTION → CLARIFYING → COMPLETED`

This guarantees deterministic interview progression (3 questions), supports evaluation/clarification loops, and makes transitions testable.

## Implemented requirements

- ✅ Stateful interview flow with ask → evaluate → clarify → next question behavior.
- ✅ Deployable interface via Next.js app routes and server actions.
- ✅ Feedback submission persisted to Firestore (`feedback` collection).
- ✅ Conversation retrieval by ID via `/dashboard/[id]`.
- ✅ Prompt loading from configurable source (`prompt_configs` in Firestore) and recorded `promptVersion` per conversation.
- ✅ Tests for state transitions, feedback payload validation, and prompt loading behavior.
- ✅ Demo walkthrough via `make demo`.

## Skills used by the agent

- Problem Solving
- Communication
- Collaboration & Teamwork

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment in `.env`:
   - `GOOGLE_GENAI_API_KEY=...`
   - Firebase client config variables used by the app.
3. Run locally:
   ```bash
   npm run dev
   ```
4. Open:
   - Interview: `http://localhost:9002/interview`
   - Dashboard: `http://localhost:9002/dashboard`
   - Prompt admin: `http://localhost:9002/admin/prompts`

## Docker

```bash
docker build -t interview-loop .
docker run -p 3000:3000 interview-loop
```

## Testing

```bash
npm run test
npm run typecheck
```

## Demo walkthrough

```bash
make demo
```

Follow the printed steps:
1. Run interview.
2. Discover/view session.
3. Submit feedback on session detail page.
4. Update prompt version.
5. Run new interview and verify prompt/version change.

## Assumptions

- Firestore is the persistent backend for sessions, prompts, and evaluator feedback.
- Clarification decisioning is done by the interview prompt action output (`CLARIFY` vs `EVALUATE_AND_ASK_NEXT`).
- A simple evaluator identity (`dashboard-evaluator`) is used from the dashboard UI.

## Observability & resilience

- Health endpoint: `/api/health`
- Defensive error handling around ASR/TTS failures to avoid blocking interview progression.
- Prompt version is attached to each session for traceability.
