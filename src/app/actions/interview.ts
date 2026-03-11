
'use server';

import { conductTechnicalInterview } from "@/ai/flows/conduct-technical-interview";
import { transcribeAudio } from "@/ai/flows/transcribe-audio-flow";
import { generateSpeech } from "@/ai/flows/text-to-speech-flow";

export async function processTurnAction(params: {
  sessionId: string;
  candidateResponse?: string;
  audioDataUri?: string;
  currentState?: any;
  systemInstructions?: string;
}) {
  let text = params.candidateResponse || '';

  // 1. Transcribe audio if provided
  if (params.audioDataUri) {
    const { transcription } = await transcribeAudio({ audioDataUri: params.audioDataUri });
    text = transcription;
  }

  // 2. Conduct the technical interview turn
  const output = await conductTechnicalInterview({
    candidateResponse: text,
    currentState: params.currentState,
    systemInstructions: params.systemInstructions
  });

  // 3. Generate speech for the AI's response
  const tts = await generateSpeech(output.aiResponse);

  // 4. Update the state with the audio data for the candidate's turn
  // Note: In a production app, we would save this to Firebase Storage,
  // but for this MVP, we pass it back to be persisted in the session doc.
  const updatedHistory = [...output.newState.conversationHistory];
  if (params.audioDataUri && updatedHistory.length >= 1) {
    // Find the last candidate message and attach the audio
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
    audioResponse: tts.audioDataUri,
    transcription: text
  };
}
