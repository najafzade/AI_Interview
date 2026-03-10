
'use server';

import { conductTechnicalInterview, ConductInterviewOutput, InterviewState } from "@/ai/flows/conduct-technical-interview";
import { transcribeAudio } from "@/ai/flows/transcribe-audio-flow";
import { generateSpeech } from "@/ai/flows/text-to-speech-flow";
import { DB, InterviewSession, Feedback, PromptConfig } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';

export type SubmitResponseOutput = ConductInterviewOutput & {
  audioResponse?: string;
  transcription?: string;
};

export async function startInterviewAction(candidateName: string): Promise<InterviewSession & { initialAudio?: string }> {
  const activePrompt = DB.prompts.getActive();
  const initialOutput = await conductTechnicalInterview({});
  
  // Generate audio for the first AI response
  const tts = await generateSpeech(initialOutput.aiResponse);

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
  return { ...session, initialAudio: tts.audioDataUri };
}

export async function submitResponseAction(
  sessionId: string, 
  text?: string, 
  audioDataUri?: string
): Promise<SubmitResponseOutput> {
  const session = DB.sessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  let finalInputText = text || '';

  // 1. Transcription if audio is provided
  if (audioDataUri) {
    const { transcription } = await transcribeAudio({ audioDataUri });
    finalInputText = transcription;
  }

  if (!finalInputText.trim()) {
    throw new Error('No input provided (text or audio)');
  }

  // 2. Logic processing
  const output = await conductTechnicalInterview({
    candidateResponse: finalInputText,
    currentState: session.state
  });

  // 3. Update session
  session.state = output.newState;
  if (output.isInterviewComplete) {
    session.status = 'COMPLETED';
  }
  DB.sessions.save(session);

  // 4. TTS for AI response
  const tts = await generateSpeech(output.aiResponse);

  return {
    ...output,
    audioResponse: tts.audioDataUri,
    transcription: finalInputText
  };
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
