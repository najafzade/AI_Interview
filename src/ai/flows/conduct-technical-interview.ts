
'use server';
/**
 * @fileOverview This file implements a Genkit flow for conducting a structured technical interview.
 * It enforces a strict state machine: Ask -> Evaluate -> Clarify -> Next (3 times).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  MAX_QUESTIONS,
  QUESTIONS_BY_SKILL,
  SKILLS,
  applyInterviewAction,
  initializeInterviewState,
} from '@/lib/interview-state';

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
    const state: InterviewState = initializeInterviewState(input.currentState);

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

    const { newState, isInterviewComplete } = applyInterviewAction(state, output.action, output.aiResponse);

    return {
      newState,
      aiResponse: output.aiResponse,
      isInterviewComplete,
      evaluation: output.evaluation,
      clarificationNeeded: output.clarificationNeeded
    };
  }
);
