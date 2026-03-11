export const SKILLS = ['Problem Solving', 'Communication', 'Collaboration & Teamwork'] as const;
export const MAX_QUESTIONS = 3;

export type InterviewStage = 'WELCOME' | 'ASKING_QUESTION' | 'CLARIFYING' | 'COMPLETED';
export type AgentAction = 'ASK_FIRST_QUESTION' | 'CLARIFY' | 'EVALUATE_AND_ASK_NEXT' | 'COMPLETE_INTERVIEW';

export interface InterviewTurn {
  speaker: 'candidate' | 'ai';
  text: string;
}

export interface InterviewState {
  skill?: string;
  questionIndex: number;
  conversationHistory: InterviewTurn[];
  interviewStage: InterviewStage;
  lastQuestion?: string;
}

export const QUESTIONS_BY_SKILL: Record<string, string[]> = {
  'Problem Solving': [
    "Describe a complex problem you've encountered and how you approached solving it. What was the outcome?",
    'Tell me about a time you had to make a difficult technical decision with incomplete information. How did you proceed?',
    "Imagine you're facing a critical bug in production. What steps would you take to diagnose and resolve it quickly?",
  ],
  Communication: [
    'How do you ensure effective communication within your team, especially when working on complex projects?',
    'Describe a situation where you had to explain a highly technical concept to a non-technical audience. How did you adapt your communication style?',
    'Tell me about a time you received constructive criticism. How did you respond and what did you learn?',
  ],
  'Collaboration & Teamwork': [
    'Describe your ideal team environment. What role do you typically play in a team setting?',
    'Tell me about a challenging team project. What was your contribution, and how did you navigate disagreements or conflicts?',
    'How do you ensure that all team members are engaged and contributing effectively, especially in a remote or distributed team?',
  ],
};

export function initializeInterviewState(existing?: Partial<InterviewState>): InterviewState {
  if (existing?.skill) {
    return {
      skill: existing.skill,
      questionIndex: existing.questionIndex ?? 0,
      conversationHistory: existing.conversationHistory ?? [],
      interviewStage: existing.interviewStage ?? 'WELCOME',
      lastQuestion: existing.lastQuestion,
    };
  }

  return {
    skill: SKILLS[Math.floor(Math.random() * SKILLS.length)],
    questionIndex: 0,
    conversationHistory: [],
    interviewStage: 'WELCOME',
  };
}

export function applyInterviewAction(
  state: InterviewState,
  action: AgentAction,
  aiResponse: string
): { newState: InterviewState; isInterviewComplete: boolean } {
  let nextStage = state.interviewStage;
  let nextIndex = state.questionIndex;
  let isComplete = false;

  if (action === 'ASK_FIRST_QUESTION') {
    nextStage = 'ASKING_QUESTION';
  }

  if (action === 'CLARIFY') {
    nextStage = 'CLARIFYING';
  }

  if (action === 'EVALUATE_AND_ASK_NEXT') {
    nextIndex = Math.min(state.questionIndex + 1, MAX_QUESTIONS);
    nextStage = nextIndex >= MAX_QUESTIONS ? 'COMPLETED' : 'ASKING_QUESTION';
    isComplete = nextIndex >= MAX_QUESTIONS;
  }

  if (action === 'COMPLETE_INTERVIEW') {
    nextStage = 'COMPLETED';
    isComplete = true;
  }

  return {
    newState: {
      ...state,
      questionIndex: nextIndex,
      interviewStage: nextStage,
      lastQuestion: aiResponse,
      conversationHistory: [...state.conversationHistory, { speaker: 'ai', text: aiResponse }],
    },
    isInterviewComplete: isComplete,
  };
}
