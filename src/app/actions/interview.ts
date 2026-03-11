
'use server';

import { conductTechnicalInterview } from "@/ai/flows/conduct-technical-interview";
import { transcribeAudio } from "@/ai/flows/transcribe-audio-flow";
import { generateSpeech } from "@/ai/flows/text-to-speech-flow";

/**
 * Orchestrates an interview turn:
 * 1. Transcribes incoming audio (if any).
 * 2. Runs the stateful interview agent flow.
 * 3. Synthesizes AI response audio.
 * 4. Attaches references for persistence.
 */
export async function processTurnAction(params: {
  sessionId: string;
  candidateResponse?: string;
  audioDataUri?: string;
  currentState?: any;
  systemInstructions?: string;
}) {
  let text = params.candidateResponse || '';

  // 1. Handle Audio Input (Transcription)
  if (params.audioDataUri) {
    try {
      const { transcription } = await transcribeAudio({ audioDataUri: params.audioDataUri });
      text = transcription;
    } catch (e) {
      console.error("Transcription failed:", e);
      // Fallback to text if transcription fails
    }
  }

  // 2. Stateful Agent Transition
  const output = await conductTechnicalInterview({
    candidateResponse: text,
    currentState: params.currentState,
    systemInstructions: params.systemInstructions
  });

  // 3. AI Speech Synthesis
  let audioResponse: string | undefined;
  try {
    const tts = await generateSpeech(output.aiResponse);
    audioResponse = tts.audioDataUri;
  } catch (e) {
    console.error("TTS failed:", e);
  }

  // 4. Persistence enrichment
  // We attach the audio reference to the conversation history so it can be reviewed later.
  const updatedHistory = [...output.newState.conversationHistory];
  if (params.audioDataUri && updatedHistory.length >= 1) {
    // Find the last candidate message and attach the source audio
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
