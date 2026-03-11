import assert from 'node:assert/strict';
import { applyInterviewAction, initializeInterviewState } from '@/lib/interview-state';

const initial = initializeInterviewState();
assert.equal(initial.questionIndex, 0);
assert.equal(initial.interviewStage, 'WELCOME');
assert.ok(initial.skill);

const asked = applyInterviewAction(initial, 'ASK_FIRST_QUESTION', 'Q1');
assert.equal(asked.newState.interviewStage, 'ASKING_QUESTION');
assert.equal(asked.newState.conversationHistory.length, 1);

const clarify = applyInterviewAction(asked.newState, 'CLARIFY', 'Please elaborate');
assert.equal(clarify.newState.interviewStage, 'CLARIFYING');

let state = clarify.newState;
state.questionIndex = 2;
const completeByProgress = applyInterviewAction(state, 'EVALUATE_AND_ASK_NEXT', 'Done');
assert.equal(completeByProgress.newState.interviewStage, 'COMPLETED');
assert.equal(completeByProgress.isInterviewComplete, true);

console.log('interview-state.test.ts passed');
