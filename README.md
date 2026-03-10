
# Interview Loop AI

An end-to-end, production-ready conversational interview agent platform featuring real-time audio interaction.

## Features

1.  **Stateful Audio Agent**: Conducts multi-step interviews using Genkit flows.
    - Transitions: `WELCOME` → `ASKING_QUESTION` → `EVALUATING_RESPONSE` → `CLARIFYING` → `COMPLETED`.
    - Real-time Audio: Processes candidate speech and responds with AI-generated voice.
2.  **Multimodal Pipeline**:
    - **Transcription**: Uses Gemini 2.5 Flash to convert speech-to-text with high accuracy.
    - **TTS (Text-to-Speech)**: Uses Gemini TTS to generate natural agent voices.
3.  **Evaluator Dashboard**: Review full transcripts and audio-derived data.
4.  **Production Feedback Loop**: Evaluators can rate and flag issues.
5.  **Prompt Management**: Dynamic versioning system for agent behavioral updates.

## Architecture Choice: State-Machine Orchestrator

For this agent, I chose a **State-Machine Orchestrator** architecture over a linear LLM call.

### Why?
-   **Predictability**: By breaking the interview into distinct states (`ASKING`, `EVALUATING`, `CLARIFYING`), we can enforce strict constraints, such as asking exactly 3 technical questions before wrapping up.
-   **Granularity**: Each state transition allows for side effects, such as generating speech (TTS) or logging audit trails, which would be difficult to manage in a single long-running session.
-   **Resilience**: If an audio transcription fails or is ambiguous, the `CLARIFYING` state provides a robust fallback mechanism to recover the conversation without losing the overall progress of the interview.
-   **Hybrid Interaction**: The orchestrator allows candidates to switch between voice and text input seamlessly within the same session.

## Setup & Running

1.  **Environment Variables**: Ensure `GOOGLE_GENAI_API_KEY` is set.
2.  **Install Dependencies**: `npm install` (includes `wav` for audio processing).
3.  **Run Dev**: `npm run dev`.
