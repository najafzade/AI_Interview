
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

  if (params.audioDataUri) {
    const { transcription } = await transcribeAudio({ audioDataUri: params.audioDataUri });
    text = transcription;
  }

  const output = await conductTechnicalInterview({
    candidateResponse: text,
    currentState: params.currentState,
    systemInstructions: params.systemInstructions
  });

  const tts = await generateSpeech(output.aiResponse);

  return {
    ...output,
    audioResponse: tts.audioDataUri,
    transcription: text
  };
}
