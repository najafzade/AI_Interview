# Interview Loop AI

An end-to-end, production-ready conversational interview agent platform.

## Features

1.  **Stateful Interview Agent**: Conducts multi-step interviews using Genkit flows.
    - Transitions: `WELCOME` → `ASKING_QUESTION` → `EVALUATING_RESPONSE` → `CLARIFYING` → `COMPLETED`.
    - Handles probing questions dynamically based on response quality.
2.  **Evaluator Dashboard**: Persistent storage for reviewing transcripts and audit trails.
3.  **Production Feedback Loop**: Evaluators can rate and flag issues with specific sessions.
4.  **Prompt Management**: Dynamic versioning system where updates change the behavior of future interviews.
5.  **A/B Comparison Readiness**: Each session is tagged with a prompt version ID.

## Setup & Running

1.  **Environment Variables**:
    Ensure `GOOGLE_GENAI_API_KEY` is set in your environment or `.env` file.

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Walkthrough Demo

Follow these steps to experience the full loop:

1.  **Run an Interview**:
    - Go to `/interview`.
    - Enter a name and complete the 3-question interview.
    - Experience the AI probing for details if your answers are short.

2.  **View Conversation**:
    - Go to `/dashboard`.
    - Find your session in the list.
    - Click "Review Transcript" to see the full audit trail.

3.  **Submit Feedback**:
    - On the transcript page, use the right-side "Evaluator Feedback" panel.
    - Rate the interview, flag any issues (e.g., "Missed Probing Opportunity"), and add comments.
    - Click "Submit Feedback".

4.  **Update Prompt Instructions**:
    - Click "Manage Prompt Versions" in the Dashboard or go to `/admin/prompts`.
    - Enter new instructions (e.g., "Be more strict and ask at least two clarifying questions").
    - Deploy the new version.

5.  **Verify New Behavior**:
    - Start a new interview at `/interview`.
    - Notice that the metadata now reflects the new prompt version.

## Design Decisions

- **Architecture**: A state-machine approach was chosen for the agent. This ensures that the interview follows a logical progression and allows for specific "Clarification" steps that don't prematurely consume one of the 3 main technical questions.
- **Persistence**: For this prototype, a robust server-side "Mock DB" is used in `src/lib/db.ts` to ensure zero-setup friction for reviewers while demonstrating the schema for a real database like Firestore.
- **Feedback Loop**: Feedback is granular (Quality, Fairness, Relevance) to provide data for automated prompt optimization in the future.
- **Prompt Versioning**: Every session stores a snapshot of the prompt version active at the time of creation, ensuring auditability.
