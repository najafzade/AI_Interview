'use server';

import { conductTechnicalInterview, ConductInterviewOutput, InterviewState } from "@/ai/flows/conduct-technical-interview";
import { DB, InterviewSession, Feedback, PromptConfig } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';

export async function startInterviewAction(candidateName: string): Promise<string> {
  const activePrompt = DB.prompts.getActive();
  const initialOutput = await conductTechnicalInterview({});
  
  const sessionId = uuidv4();
  const session: InterviewSession = {
    id: sessionId,
    candidateName,
    skill: initialOutput.newState.skill || 'Unknown',
    status: 'IN_PROGRESS',
    state: initialOutput.newState,
    promptVersion: activePrompt.version,
    createdAt: new Date().toISOString(),
  };

  DB.sessions.save(session);
  return sessionId;
}

export async function submitResponseAction(sessionId: string, text: string): Promise<ConductInterviewOutput> {
  const session = DB.sessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  const output = await conductTechnicalInterview({
    candidateResponse: text,
    currentState: session.state
  });

  session.state = output.newState;
  if (output.isInterviewComplete) {
    session.status = 'COMPLETED';
  }
  DB.sessions.save(session);

  return output;
}

export async function submitFeedbackAction(feedbackData: Omit<Feedback, 'id' | 'createdAt'>) {
  const feedback: Feedback = {
    ...feedbackData,
    id: uuidv4(),
    createdAt: new Date().toISOString()
  };
  DB.feedback.add(feedback);
  return { success: true };
}

export async function getSessionAction(id: string) {
  return DB.sessions.get(id);
}

export async function getAllSessionsAction() {
  return DB.sessions.list();
}

export async function createPromptConfigAction(instructions: string, version: string) {
  const config: PromptConfig = {
    id: uuidv4(),
    version,
    instructions,
    isActive: true,
    createdAt: new Date().toISOString()
  };
  DB.prompts.add(config);
  return config;
}

export async function getPromptConfigsAction() {
  return DB.prompts.list();
}
