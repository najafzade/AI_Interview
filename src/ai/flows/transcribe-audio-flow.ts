
'use server';
/**
 * @fileOverview A Genkit flow to transcribe audio input from a candidate.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranscribeAudioInputSchema = z.object({
  audioDataUri: z.string().describe("The audio recording of the candidate's response, as a data URI."),
});

const TranscribeAudioOutputSchema = z.object({
  transcription: z.string().describe("The transcribed text of the audio."),
});

export async function transcribeAudio(input: z.infer<typeof TranscribeAudioInputSchema>) {
  return transcribeAudioFlow(input);
}

const transcribeAudioFlow = ai.defineFlow(
  {
    name: 'transcribeAudioFlow',
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
      prompt: [
        { text: "Transcribe the following audio recording accurately. Do not add any filler or commentary. If there is no speech, return an empty string." },
        { media: { url: input.audioDataUri, contentType: 'audio/wav' } },
      ],
    });

    return { transcription: response.text };
  }
);
