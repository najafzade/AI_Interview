'use server';
/**
 * @fileOverview This file implements a Genkit flow for conducting a structured technical interview.
 *
 * - conductTechnicalInterview - A wrapper function to call the Genkit flow.
 * - ConductInterviewInput - The input type for the conductTechnicalInterview function.
 * - ConductInterviewOutput - The return type for the conductTechnicalInterview function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// --- Skill and Question Data ---
const SKILLS = ['Problem Solving', 'Communication', 'Collaboration & Teamwork'] as const;
type Skill = (typeof SKILLS)[number];

const QUESTIONS_BY_SKILL: Record<Skill, string[]> = {
  'Problem Solving': [
    "Describe a complex problem you've encountered and how you approached solving it. What was the outcome?",
    "Tell me about a time you had to make a difficult technical decision with incomplete information. How did you proceed?",
    "Imagine you're facing a critical bug in production. What steps would you take to diagnose and resolve it quickly?"
  ],
  'Communication': [
    "How do you ensure effective communication within your team, especially when working on complex projects?",
    "Describe a situation where you had to explain a highly technical concept to a non-technical audience. How did you adapt your communication style?",
    "Tell me about a time you received constructive criticism. How did you respond and what did you learn?"
  ],
  'Collaboration & Teamwork': [
    "Describe your ideal team environment. What role do you typically play in a team setting?",
    "Tell me about a challenging team project. What was your contribution, and how did you navigate disagreements or conflicts?",
    "How do you ensure that all team members are engaged and contributing effectively, especially in a remote or distributed team?"
  ]
};

const MAX_QUESTIONS_PER_SKILL = 3; // Fixed requirement

// --- Zod Schemas ---

const InterviewTurnSchema = z.object({
  speaker: z.enum(['candidate', 'ai']),
  text: z.string()
});

const InterviewStateSchema = z.object({
  skill: z.enum(SKILLS).optional().describe('The technical skill being interviewed.'),
  questionIndex: z.number().int().min(0).max(MAX_QUESTIONS_PER_SKILL - 1).default(0).describe('The index of the current main question being asked (0-indexed).'),
  conversationHistory: z.array(InterviewTurnSchema).default([]).describe('A chronological list of all interactions in the interview.'),
  interviewStage: z.enum(['WELCOME', 'ASKING_QUESTION', 'EVALUATING_RESPONSE', 'CLARIFYING', 'COMPLETED']).default('WELCOME').describe('The current stage of the interview process.'),
  lastQuestion: z.string().optional().describe('The last question (main or clarifying) asked by the AI.')
});

export type InterviewState = z.infer<typeof InterviewStateSchema>;

const ConductInterviewInputSchema = z.object({
  candidateResponse: z.string().optional().describe("The candidate's most recent response to the AI's question or clarification."),
  currentState: InterviewStateSchema.optional().describe("The current state of the interview, including skill, question index, and conversation history.")
});
export type ConductInterviewInput = z.infer<typeof ConductInterviewInputSchema>;

const ConductInterviewOutputSchema = z.object({
  newState: InterviewStateSchema.describe('The updated state of the interview.'),
  aiResponse: z.string().describe("The AI's response, which could be a question, clarification, evaluation, or a closing statement."),
  isInterviewComplete: z.boolean().describe('True if the interview is complete, false otherwise.'),
  evaluation: z.string().optional().describe("The AI's evaluation of the candidate's last response, if applicable."),
  clarificationNeeded: z.boolean().default(false).describe('True if the AI is asking for clarification, false otherwise.')
});
export type ConductInterviewOutput = z.infer<typeof ConductInterviewOutputSchema>;

// --- Wrapper Function ---
export async function conductTechnicalInterview(input: ConductInterviewInput): Promise<ConductInterviewOutput> {
  return conductTechnicalInterviewFlow(input);
}

// --- Prompt Definition ---

const InterviewAgentPromptOutputSchema = z.object({
  aiResponse: z.string().describe("The AI's response, which could be a question, clarification, evaluation, or a closing statement."),
  evaluation: z.string().optional().describe("The AI's evaluation of the candidate's last response, if applicable."),
  clarificationNeeded: z.boolean().default(false).describe('True if the AI is asking for clarification, false otherwise.'),
  action: z.enum(['ASK_FIRST_QUESTION', 'CLARIFY', 'EVALUATE_AND_ASK_NEXT', 'COMPLETE_INTERVIEW']).describe('The action the AI agent decides to take next.')
});


const interviewAgentPrompt = ai.definePrompt({
  name: 'interviewAgentPrompt',
  input: {
    schema: ConductInterviewInputSchema.extend({
      skillQuestions: z.array(z.string()).describe('The list of main questions for the selected skill.'),
      isFirstTurn: z.boolean().describe('True if this is the very first interaction of the interview.'),
      currentMainQuestion: z.string().optional().describe('The current main question being discussed.') // Added to help LLM focus
    })
  },
  output: {
    schema: InterviewAgentPromptOutputSchema
  },
  prompt: `You are an AI technical interviewer. Your goal is to assess a candidate's understanding and application of the "{{currentState.skill}}" skill.\nYou will ask exactly ${MAX_QUESTIONS_PER_SKILL} main questions related to this skill, one at a time. For each main question, you will evaluate the candidate's response.\nIf a response is incomplete or ambiguous, you will ask clarifying or probing questions. Only move to the next main question once you are satisfied with the response to the current one (including clarifications).\nMaintain a professional, neutral, and encouraging tone. Do not provide direct answers or hint at correct solutions.\n\nInterview Context:\nSelected Skill: {{currentState.skill}}\nCurrent Main Question Being Addressed (0-indexed): {{currentState.questionIndex}}\nTotal Main Questions to Ask: ${MAX_QUESTIONS_PER_SKILL}\n\nConversation History (chronological):\n{{#each currentState.conversationHistory}}\n  {{speaker}}: {{text}}\n{{/each}}\n\n{{#if candidateResponse}}\nCandidate's Latest Response: {{{candidateResponse}}}\n{{/if}}\n\n{{#if isFirstTurn}}\n  Your task is to introduce yourself, clearly state the skill you will be interviewing for, and then ask the FIRST main question for this skill. Set 'action' to 'ASK_FIRST_QUESTION'.\n  The first main question for "{{currentState.skill}}" is: "{{skillQuestions.[0]}}".\n{{else}}\n  Your task is to analyze the candidate's 'Latest Response' to the current main question "{{currentMainQuestion}}" (or the last clarifying question if currentState.interviewStage is 'CLARIFYING').\n  Based on this, decide the next action:\n\n  If the candidate's response is sufficient, complete, and directly addresses the current main question (and any previous clarifications):\n    - Provide a brief, positive acknowledgement or summary.\n    - Set 'evaluation' describing the completeness and quality of the candidate's response to the current main question.\n    - Set 'clarificationNeeded' to false.\n    - If there are still main questions remaining (i.e., currentState.questionIndex < ${MAX_QUESTIONS_PER_SKILL - 1}):\n      - Set 'action' to 'EVALUATE_AND_ASK_NEXT'.\n      - Ask the NEXT main question. The next main question is "{{skillQuestions.[currentState.questionIndex + 1]}}".\n    - If all main questions have been asked and sufficiently answered (i.e., currentState.questionIndex == ${MAX_QUESTIONS_PER_SKILL - 1}):\n      - Set 'action' to 'COMPLETE_INTERVIEW'.\n      - Provide a polite closing statement for the interview.\n\n  If the candidate's response is incomplete, ambiguous, or needs further detail regarding the current main question (or previous clarification):\n    - Provide a brief, neutral acknowledgement.\n    - Set 'evaluation' describing what aspects of the response are missing or unclear.\n    - Set 'clarificationNeeded' to true.\n    - Set 'action' to 'CLARIFY'.\n    - Ask a specific clarifying or probing question to elicit more details related to the current main question or the last clarification. Do NOT move to the next main question.\n{{/if}}\n\nEnsure your output is a valid JSON object strictly adhering to the provided schema, including the 'action' field.\nThe 'aiResponse' field must contain the full text of your response, whether it's a welcome, a question, a clarification, or a closing statement.\n`
});


// --- Genkit Flow Definition ---
const conductTechnicalInterviewFlow = ai.defineFlow(
  {
    name: 'conductTechnicalInterviewFlow',
    inputSchema: ConductInterviewInputSchema,
    outputSchema: ConductInterviewOutputSchema
  },
  async (input) => {
    let currentState: InterviewState = input.currentState || {
      skill: undefined,
      questionIndex: 0,
      conversationHistory: [],
      interviewStage: 'WELCOME',
      lastQuestion: undefined
    };

    const isFirstTurn = currentState.interviewStage === 'WELCOME';

    if (isFirstTurn) {
      const randomIndex = Math.floor(Math.random() * SKILLS.length);
      currentState.skill = SKILLS[randomIndex];
      currentState.questionIndex = 0; // Ensure it's 0 for the first question
      currentState.interviewStage = 'WELCOME'; // Keep as WELCOME for prompt to handle initial message
    }

    const skill = currentState.skill!; // Guaranteed to be set by now
    const skillQuestions = QUESTIONS_BY_SKILL[skill];

    // Add candidate's response to history ONLY if it's not the first turn
    if (input.candidateResponse) {
      currentState.conversationHistory.push({
        speaker: 'candidate',
        text: input.candidateResponse
      });
    }

    // Prepare input for the prompt
    const promptInput = {
      candidateResponse: input.candidateResponse,
      currentState: currentState,
      skillQuestions: skillQuestions,
      isFirstTurn: isFirstTurn,
      currentMainQuestion: skillQuestions[currentState.questionIndex]
    };

    const { output } = await interviewAgentPrompt(promptInput);

    if (!output) {
      throw new Error('LLM did not return a valid output for interviewAgentPrompt');
    }

    // Update state based on LLM's action and output
    let nextAiResponse = output.aiResponse;
    let nextEvaluation = output.evaluation;
    let nextClarificationNeeded = output.clarificationNeeded;
    let nextIsInterviewComplete = false;
    let nextQuestionIndex = currentState.questionIndex;
    let newInterviewStage = currentState.interviewStage;
    let newLastQuestion = nextAiResponse; // The AI's response is the question/clarification

    switch (output.action) {
      case 'ASK_FIRST_QUESTION':
        newInterviewStage = 'ASKING_QUESTION';
        nextClarificationNeeded = false;
        break;
      case 'CLARIFY':
        newInterviewStage = 'CLARIFYING';
        nextClarificationNeeded = true;
        // questionIndex remains the same as we are clarifying the current main question
        break;
      case 'EVALUATE_AND_ASK_NEXT':
        nextQuestionIndex++; // Move to the next main question
        nextClarificationNeeded = false;
        newInterviewStage = 'ASKING_QUESTION'; // Will be asking the new question
        break;
      case 'COMPLETE_INTERVIEW':
        newInterviewStage = 'COMPLETED';
        nextIsInterviewComplete = true;
        nextClarificationNeeded = false;
        break;
      default:
        console.warn('Unknown action from LLM:', output.action);
        // Fallback for unexpected action: try to complete or move to next if possible
        if (currentState.questionIndex < MAX_QUESTIONS_PER_SKILL - 1) {
          nextQuestionIndex++;
          newInterviewStage = 'ASKING_QUESTION';
          newLastQuestion = skillQuestions[nextQuestionIndex];
          nextAiResponse = newLastQuestion; // Fallback for aiResponse
        } else {
          newInterviewStage = 'COMPLETED';
          nextIsInterviewComplete = true;
          nextAiResponse = "Thank you for your responses. The interview is now complete.";
        }
        nextClarificationNeeded = false;
    }

    // Always add AI's response to history
    currentState.conversationHistory.push({
      speaker: 'ai',
      text: nextAiResponse
    });

    const newInterviewState: InterviewState = {
      ...currentState,
      questionIndex: nextQuestionIndex,
      conversationHistory: currentState.conversationHistory,
      interviewStage: newInterviewStage,
      lastQuestion: newLastQuestion
    };

    return {
      newState: newInterviewState,
      aiResponse: nextAiResponse,
      isInterviewComplete: nextIsInterviewComplete,
      evaluation: nextEvaluation,
      clarificationNeeded: nextClarificationNeeded
    };
  }
);
