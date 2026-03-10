# **App Name**: Interview Loop AI

## Core Features:

- AI Interview Conductor: Orchestrates the multi-step technical interview, using an AI model as a reasoning tool to dynamically select skill questions, evaluate candidate responses, and clarify or probe as needed for skills like Problem Solving or Communication.
- Interview Client Interface: A responsive, web-based UI where candidates interact with the AI agent, providing text-based answers and following the conversational flow of the interview.
- Evaluator Dashboard: A web interface for human evaluators to browse and view detailed transcripts of completed interviews, with basic filtering capabilities by skill, interview status, or date.
- Feedback Submission System: Allows human evaluators to submit ratings (e.g., overall quality, fairness, relevance) and flag specific issues (e.g., inappropriate questions, biased evaluations) directly on interview transcripts, with all feedback persistently stored.
- Dynamic Prompt Management: Enables the AI Interview Conductor to load system prompts, evaluation criteria, and clarification rules from a database. This feature ensures prompt versioning and logs the specific prompt version used for each interview.
- Secure Agent Interaction API: Provides a robust RESTful API that handles communication between the client interface and the AI Interview Conductor, managing the stateful progression of interviews and persisting conversation history and metadata.

## Style Guidelines:

- Color scheme: A clean and professional light theme, conveying analytical insight and clarity.
- Primary color: A deep, professional blue (#2E7FC2) representing trust and focus.
- Background color: A very light, subtle blue-grey (#ECF2F7) to maintain visual spaciousness and readability.
- Accent color: A vibrant, purplish-blue (#664CE5) used for interactive elements and highlights, providing clear visual cues without being distracting.
- Headlines font: 'Space Grotesk' (sans-serif), for a modern, tech-forward, and assertive presence.
- Body text font: 'Inter' (sans-serif), providing excellent readability and a neutral, objective tone for interview transcripts and feedback forms.
- Utilize simple, outlined icons for clarity and functional navigation within the evaluator dashboard and client interface.
- Design layouts to be structured and content-focused, minimizing distractions and enhancing the readability of interview conversations and feedback.
- Implement subtle, functional animations for state transitions and feedback interactions, guiding user attention without being obtrusive.