'use server';
/**
 * @fileOverview A Genkit flow to evaluate a candidate's response to an interview question
 * and determine if a clarifying or probing follow-up question is needed.
 *
 * - evaluateAndClarifyCandidateResponse - A function that orchestrates the evaluation and clarification process.
 * - EvaluateAndClarifyCandidateResponseInput - The input type for the evaluateAndClarifyCandidateResponse function.
 * - EvaluateAndClarifyCandidateResponseOutput - The return type for the evaluateAndClarifyCandidateResponse function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EvaluateAndClarifyCandidateResponseInputSchema = z.object({
  skill: z.string().describe('The technical skill being assessed.'),
  question: z.string().describe('The interview question asked to the candidate.'),
  candidateResponse: z.string().describe('The candidate\'s response to the interview question.'),
});
export type EvaluateAndClarifyCandidateResponseInput = z.infer<typeof EvaluateAndClarifyCandidateResponseInputSchema>;

const EvaluateAndClarifyCandidateResponseOutputSchema = z.object({
  evaluation: z.string().describe('An evaluation of the candidate\'s response.'),
  clarificationNeeded: z.boolean().describe('True if a follow-up clarification or probing question is needed, false otherwise.'),
  followUpQuestion: z.string().optional().describe('A clarifying or probing question to ask the candidate, if clarificationNeeded is true.'),
});
export type EvaluateAndClarifyCandidateResponseOutput = z.infer<typeof EvaluateAndClarifyCandidateResponseOutputSchema>;

const evaluateAndClarifyCandidateResponsePrompt = ai.definePrompt({
  name: 'evaluateAndClarifyCandidateResponsePrompt',
  input: { schema: EvaluateAndClarifyCandidateResponseInputSchema },
  output: { schema: EvaluateAndClarifyCandidateResponseOutputSchema },
  prompt: `You are an expert technical interviewer. Your goal is to assess a candidate's understanding of the skill '{{{skill}}}'.

Analyse the candidate's response to the following question:

Question: "{{{question}}}"
Candidate's Response: "{{{candidateResponse}}}"

First, provide a brief evaluation of the candidate's response. Then, determine if the response is complete, accurate, and sufficiently detailed. If the response is incomplete, ambiguous, or lacks depth, you MUST indicate that clarification is needed and formulate a concise, probing follow-up question to help the candidate elaborate or clarify their understanding.

If the response is sufficiently complete and clear, set 'clarificationNeeded' to false and omit 'followUpQuestion'.

Example for clarification needed:
Question: "Explain the difference between a process and a thread."
Candidate's Response: "A process is an instance of a computer program that is being executed. A thread is a path of execution within a process."
Evaluation: The candidate has provided basic definitions but hasn't elaborated on the key differences or when to use each.
ClarificationNeeded: true
FollowUpQuestion: "Can you elaborate on the key differences in how processes and threads manage resources and execution context?"

Example for no clarification needed:
Question: "Describe the SOLID principles of object-oriented design."
Candidate's Response: "The SOLID principles are five design principles intended to make software designs more understandable, flexible, and maintainable. They include the Single Responsibility Principle, Open/Closed Principle, Liskov Substitution Principle, Interface Segregation Principle, and Dependency Inversion Principle. Each principle helps in structuring classes and modules to achieve a robust and adaptable system."
Evaluation: The candidate has correctly identified and briefly explained the purpose of each SOLID principle.
ClarificationNeeded: false`,
});

const evaluateAndClarifyCandidateResponseFlow = ai.defineFlow(
  {
    name: 'evaluateAndClarifyCandidateResponseFlow',
    inputSchema: EvaluateAndClarifyCandidateResponseInputSchema,
    outputSchema: EvaluateAndClarifyCandidateResponseOutputSchema,
  },
  async (input) => {
    const { output } = await evaluateAndClarifyCandidateResponsePrompt(input);
    if (!output) {
      throw new Error('Failed to get output from prompt.');
    }
    return output;
  }
);

export async function evaluateAndClarifyCandidateResponse(
  input: EvaluateAndClarifyCandidateResponseInput
): Promise<EvaluateAndClarifyCandidateResponseOutput> {
  return evaluateAndClarifyCandidateResponseFlow(input);
}
