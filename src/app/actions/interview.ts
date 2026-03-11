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
  limit
} from "firebase/firestore";
import { PromptConfig, InterviewSession, Feedback } from "@/lib/db";

/**
 * Orchestrates a single interview turn.
 * 1. Transcribes audio if provided.
 * 2. Runs the stateful interview logic (Ask -> Evaluate -> Clarify -> Next).
 * 3. Generates TTS for the AI response.
 */
export async function processTurnAction(params: {
  sessionId: string;
  candidateResponse?: string;
  audioDataUri?: string;
  currentState?: any;
  systemInstructions?: string;
}) {
  let text = params.candidateResponse || '';

  // Requirement 2 & 4: Handle multimodal input (audio/text)
  if (params.audioDataUri) {
    try {
      const { transcription } = await transcribeAudio({ audioDataUri: params.audioDataUri });
      text = transcription;
    } catch (e) {
      console.error("Transcription failed:", e);
    }
  }

  // Requirement 1: Stateful interview agent (3 questions, clarify when needed)
  const output = await conductTechnicalInterview({
    candidateResponse: text,
    currentState: params.currentState,
    systemInstructions: params.systemInstructions
  });

  // Requirement 1 side-effect: Audio response
  let audioResponse: string | undefined;
  try {
    const tts = await generateSpeech(output.aiResponse);
    audioResponse = tts.audioDataUri;
  } catch (e) {
    console.error("TTS failed:", e);
  }

  const updatedHistory = [...output.newState.conversationHistory];
  if (params.audioDataUri && updatedHistory.length >= 1) {
    for (let i = updatedHistory.length - 1; i >= 0; i--) {
      if (updatedHistory[i].speaker === 'candidate') {
        (updatedHistory[i] as any).audioDataUri = params.audioDataUri;
        break;
      }
    }
  }

  return {
    ...output,
    newState: {
      ...output.newState,
      conversationHistory: updatedHistory
    },
    audioResponse,
    transcription: text
  };
}

/**
 * Requirement 5: Prompt versioning and loading.
 */
export async function getPromptConfigsAction(): Promise<PromptConfig[]> {
  const q = query(collection(db, 'prompt_configs'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PromptConfig));
}

/**
 * Requirement 5: Create and activate new prompt versions.
 */
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

/**
 * Requirement 4: Retrieve session details.
 */
export async function getSessionAction(id: string): Promise<InterviewSession | null> {
  const docRef = doc(db, 'sessions', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as InterviewSession;
}

/**
 * Requirement 3: Persist evaluator feedback.
 */
export async function submitFeedbackAction(feedback: Omit<Feedback, 'id' | 'createdAt'>): Promise<Feedback> {
  const newFeedback = {
    ...feedback,
    createdAt: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, 'feedback'), newFeedback);
  return { id: docRef.id, ...newFeedback };
}
