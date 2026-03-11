
'use server';
/**
 * @fileOverview This file implements a Genkit flow for conducting a structured technical interview.
 * It enforces a strict state machine: Ask -> Evaluate -> Clarify -> Next (3 times).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SKILLS = ['Problem Solving', 'Communication', 'Collaboration & Teamwork'] as const;
const MAX_QUESTIONS = 3;

const QUESTIONS_BY_SKILL: Record<string, string[]> = {
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

const InterviewTurnSchema = z.object({
  speaker: z.enum(['candidate', 'ai']),
  text: z.string()
});

const InterviewStateSchema = z.object({
  skill: z.string().optional(),
  questionIndex: z.number().int().min(0).default(0),
  conversationHistory: z.array(InterviewTurnSchema).default([]),
  interviewStage: z.enum(['WELCOME', 'ASKING_QUESTION', 'CLARIFYING', 'COMPLETED']).default('WELCOME'),
  lastQuestion: z.string().optional()
});

export type InterviewState = z.infer<typeof InterviewStateSchema>;

const ConductInterviewInputSchema = z.object({
  candidateResponse: z.string().optional(),
  currentState: InterviewStateSchema.optional(),
  systemInstructions: z.string().optional().describe("Dynamic instructions from the prompt configuration.")
});

const ConductInterviewOutputSchema = z.object({
  newState: InterviewStateSchema,
  aiResponse: z.string(),
  isInterviewComplete: z.boolean(),
  evaluation: z.string().optional(),
  clarificationNeeded: z.boolean()
});

const interviewAgentPrompt = ai.definePrompt({
  name: 'interviewAgentPrompt',
  input: {
    schema: ConductInterviewInputSchema.extend({
      skillQuestions: z.array(z.string()),
      currentMainQuestion: z.string().optional()
    })
  },
  output: {
    schema: z.object({
      aiResponse: z.string(),
      evaluation: z.string().optional(),
      clarificationNeeded: z.boolean(),
      action: z.enum(['ASK_FIRST_QUESTION', 'CLARIFY', 'EVALUATE_AND_ASK_NEXT', 'COMPLETE_INTERVIEW'])
    })
  },
  prompt: `
  {{#if systemInstructions}}
  System Instructions: {{{systemInstructions}}}
  {{else}}
  You are an AI technical interviewer. Conduct a professional interview.
  {{/if}}

  Rules:
  1. Assess the skill: "{{currentState.skill}}".
  2. Ask exactly ${MAX_QUESTIONS} questions.
  3. Current Question Index: {{currentState.questionIndex}} (0-indexed).
  4. If the response is incomplete, ask for clarification. Do NOT move to the next question until satisfied.
  
  History:
  {{#each currentState.conversationHistory}}
    {{speaker}}: {{text}}
  {{/each}}

  {{#if candidateResponse}}
  Candidate Response: {{{candidateResponse}}}
  {{/if}}

  Decide your next action based on the response to: "{{currentMainQuestion}}".
  `
});

export async function conductTechnicalInterview(input: z.infer<typeof ConductInterviewInputSchema>) {
  return conductTechnicalInterviewFlow(input);
}

const conductTechnicalInterviewFlow = ai.defineFlow(
  {
    name: 'conductTechnicalInterviewFlow',
    inputSchema: ConductInterviewInputSchema,
    outputSchema: ConductInterviewOutputSchema
  },
  async (input) => {
    let state: InterviewState = input.currentState || {
      skill: SKILLS[Math.floor(Math.random() * SKILLS.length)],
      questionIndex: 0,
      conversationHistory: [],
      interviewStage: 'WELCOME'
    };

    const skillQuestions = QUESTIONS_BY_SKILL[state.skill!] || [];
    
    if (input.candidateResponse) {
      state.conversationHistory.push({ speaker: 'candidate', text: input.candidateResponse });
    }

    const { output } = await interviewAgentPrompt({
      ...input,
      currentState: state,
      skillQuestions,
      currentMainQuestion: skillQuestions[state.questionIndex]
    });

    if (!output) throw new Error('Agent failed to respond');

    let isComplete = false;
    let nextStage = state.interviewStage;
    let nextIndex = state.questionIndex;

    switch (output.action) {
      case 'ASK_FIRST_QUESTION':
        nextStage = 'ASKING_QUESTION';
        break;
      case 'CLARIFY':
        nextStage = 'CLARIFYING';
        break;
      case 'EVALUATE_AND_ASK_NEXT':
        nextIndex++;
        nextStage = 'ASKING_QUESTION';
        break;
      case 'COMPLETE_INTERVIEW':
        nextStage = 'COMPLETED';
        isComplete = true;
        break;
    }

    state.conversationHistory.push({ speaker: 'ai', text: output.aiResponse });

    const newState: InterviewState = {
      ...state,
      questionIndex: nextIndex,
      interviewStage: nextStage,
      lastQuestion: output.aiResponse
    };

    return {
      newState,
      aiResponse: output.aiResponse,
      isInterviewComplete: isComplete,
      evaluation: output.evaluation,
      clarificationNeeded: output.clarificationNeeded
    };
  }
);
