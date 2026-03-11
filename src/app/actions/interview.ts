
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
import { PromptConfig, InterviewSession, InterviewTurn } from "@/lib/db";

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
