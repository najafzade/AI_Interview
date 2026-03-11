import assert from 'node:assert/strict';
import { buildFeedbackPayload } from '@/lib/feedback';

const payload = buildFeedbackPayload({
  sessionId: 'session-1',
  evaluatorId: 'eval-1',
  overallRating: 5,
  flags: ['bias'],
});

assert.equal(payload.sessionId, 'session-1');
assert.equal(payload.flags.length, 1);
assert.ok(payload.createdAt);

assert.throws(() => {
  buildFeedbackPayload({
    sessionId: 'session-1',
    evaluatorId: 'eval-1',
    overallRating: 0,
  });
});

console.log('feedback.test.ts passed');
