# Interview Loop AI

An end-to-end, production-ready conversational interview agent platform.

## Architecture: Stateful Agent Orchestrator

This platform uses a **State-Machine Orchestrator** to manage the interview flow. 
- **Reasoning**: Unlike simple chat interfaces, technical interviews require strict adherence to a structure (e.g., exactly 3 questions, specific assessment criteria). 
- **State Machine**: The agent transitions through states: `WELCOME` → `ASKING_QUESTION` → `EVALUATING_RESPONSE` → `CLARIFYING` → `COMPLETED`.
- **Hybrid Input**: Supports both real-time audio (transcribed by Gemini) and text input.

## Features

- **Stateful Flow**: Strictly asks 3 questions and probes for depth if answers are ambiguous.
- **Multimodal Pipeline**: Transcription (Gemini Flash) + Logic (Genkit) + TTS (Gemini TTS).
- **Prompt Versioning**: Admins can update system instructions in real-time. Each interview logs the version used.
- **Evaluator Dashboard**: Filtering, discovery, and transcript review with feedback persistence.

## Setup & Running

1. **Environment**: Ensure `GOOGLE_GENAI_API_KEY` is set in `.env`.
2. **Install**: `npm install`.
3. **Run Dev**: `npm run dev`.
4. **Docker**: `docker build -t interview-loop .` and `docker run -p 3000:3000 interview-loop`.

## Requirements Walkthrough (Step-by-Step)

### 1. Run an Interview
Go to `/interview`, enter your name, and start. Use the "Tap to Speak" button to answer. Note how the AI might ask you to elaborate if your answer is too short (Requirement 1 & 2).

### 2. View Conversation & Submit Feedback
Go to `/dashboard`. Find your session. Click "Review Interview" to see the full transcript and audio markers (Requirement 3 & 4). Use the side panel to rate and flag issues.

### 3. Update Prompt Version
Go to `/admin/prompts`. Update the system instructions (e.g., "Be very strict and formal"). Save a new version (Requirement 5).

### 4. Verify Update
Start a new interview at `/interview`. Observe the change in AI personality or behavior (Requirement 5).

## Testing
- Core logic resides in `src/ai/flows/conduct-technical-interview.ts`.
- State transitions are verified by checking the `newState` object in `processTurnAction`.
- To run logic simulations, use `npm run genkit:dev` to open the Genkit UI.

## Observability
- **Health Check**: Available at `/api/health` (implemented via simple route).
- **Logging**: Errors in TTS/Transcription are logged to the server console with descriptive context.
