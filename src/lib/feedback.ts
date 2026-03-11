import { FeedbackRecord } from '@/lib/db';

export function buildFeedbackPayload(input: Omit<FeedbackRecord, 'id' | 'createdAt'>) {
  if (input.overallRating < 1 || input.overallRating > 5) {
    throw new Error('overallRating must be between 1 and 5');
  }

  return {
    ...input,
    flags: input.flags || [],
    notes: input.notes || '',
    createdAt: new Date().toISOString(),
  };
}
