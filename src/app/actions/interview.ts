
'use server';

import { conductTechnicalInterview } from "@/ai/flows/conduct-technical-interview";
import { transcribeAudio } from "@/ai/flows/transcribe-audio-flow";
import { generateSpeech } from "@/ai/flows/text-to-speech-flow";
import { db } from "@/firebase/config";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  doc, 
  getDoc, 
  orderBy,
  updateDoc,
  setDoc
} from "firebase/firestore";
import { PromptConfig, InterviewSession, InterviewTurn, FeedbackRecord } from "@/lib/db";
import { buildFeedbackPayload } from "@/lib/feedback";

export async function processTurnAction(params: {
  sessionId: string;
  candidateResponse?: string;
  audioDataUri?: string;
  currentState?: any;
  systemInstructions?: string;
  promptVersion?: string;
}) {
  let text = params.candidateResponse || '';
  let asrUsed = false;

  if (params.audioDataUri) {
    try {
      const { transcription } = await transcribeAudio({ audioDataUri: params.audioDataUri });
      text = transcription;
      asrUsed = true;
    } catch (e) {
      console.error("Transcription failed:", e);
    }
  }

  const output = await conductTechnicalInterview({
    candidateResponse: text,
    currentState: params.currentState,
    systemInstructions: params.systemInstructions
  });

  let audioResponse: string | undefined;
  try {
    const tts = await generateSpeech(output.aiResponse);
    audioResponse = tts.audioDataUri;
  } catch (e) {
    console.error("TTS failed:", e);
  }

  // Build the turn history
  const candidateTurn: InterviewTurn = {
    speaker: 'candidate',
    text: text,
    audioDataUri: params.audioDataUri
  };

  const aiTurn: InterviewTurn = {
    speaker: 'ai',
    text: output.aiResponse,
    audioDataUri: audioResponse
  };

  return {
    ...output,
    candidateTurn,
    aiTurn,
    audioResponse,
    transcription: text
  };
}

export async function getPromptConfigsAction(): Promise<PromptConfig[]> {
  const q = query(collection(db, 'prompt_configs'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PromptConfig));
}

export async function createPromptConfigAction(instructions: string, version: string): Promise<PromptConfig> {
  const q = query(collection(db, 'prompt_configs'), where('isActive', '==', true));
  const activeSnap = await getDocs(q);
  
  for (const d of activeSnap.docs) {
    await updateDoc(doc(db, 'prompt_configs', d.id), { isActive: false });
  }

  const newConfig = {
    version,
    instructions,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, 'prompt_configs'), newConfig);
  return { id: docRef.id, ...newConfig };
}


export async function createSessionAction(params: {
  candidateName: string;
  initialState: any;
  promptVersion: string;
}): Promise<InterviewSession> {
  const id = crypto.randomUUID();
  const sessionData: InterviewSession = {
    id,
    candidateName: params.candidateName,
    skill: params.initialState?.skill || 'Problem Solving',
    status: 'IN_PROGRESS',
    state: params.initialState,
    promptVersion: params.promptVersion,
    createdAt: new Date().toISOString(),
    history: [],
  };
  await setDoc(doc(db, 'sessions', id), sessionData);
  return sessionData;
}

export async function appendTurnsToSessionAction(params: {
  sessionId: string;
  state: any;
  isInterviewComplete: boolean;
  candidateTurn: InterviewTurn;
  aiTurn: InterviewTurn;
}) {
  const ref = doc(db, 'sessions', params.sessionId);
  const current = await getDoc(ref);
  if (!current.exists()) throw new Error('Session not found');
  const session = current.data() as InterviewSession;
  const mergedHistory = [...(session.history || []), params.candidateTurn, params.aiTurn];

  await updateDoc(ref, {
    history: mergedHistory,
    state: params.state,
    status: params.isInterviewComplete ? 'COMPLETED' : 'IN_PROGRESS',
  });
}

export async function submitFeedbackAction(params: {
  sessionId: string;
  evaluatorId: string;
  overallRating: number;
  fairnessRating?: number;
  relevanceRating?: number;
  flags?: string[];
  notes?: string;
  comparisonSessionId?: string;
  preferredSessionId?: string;
}): Promise<FeedbackRecord> {
  const payload = buildFeedbackPayload({
    sessionId: params.sessionId,
    evaluatorId: params.evaluatorId,
    overallRating: params.overallRating,
    fairnessRating: params.fairnessRating,
    relevanceRating: params.relevanceRating,
    flags: params.flags || [],
    notes: params.notes || '',
    comparisonSessionId: params.comparisonSessionId,
    preferredSessionId: params.preferredSessionId,
  });

  const ref = await addDoc(collection(db, 'feedback'), payload);
  return { id: ref.id, ...payload };
}

export async function getFeedbackForSessionAction(sessionId: string): Promise<FeedbackRecord[]> {
  const q = query(collection(db, 'feedback'), where('sessionId', '==', sessionId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FeedbackRecord));
}
