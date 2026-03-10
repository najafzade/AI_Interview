import { InterviewState } from "@/ai/flows/conduct-technical-interview";

export interface Feedback {
  id: string;
  interviewId: string;
  quality: number;
  fairness: number;
  relevance: number;
  issues: string[];
  comments: string;
  createdAt: string;
}

export interface InterviewSession {
  id: string;
  skill: string;
  candidateName: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  state: InterviewState;
  promptVersion: string;
  createdAt: string;
}

export interface PromptConfig {
  id: string;
  version: string;
  isActive: boolean;
  instructions: string;
  createdAt: string;
}

// In-memory mock DB for demonstration purposes as requested for minimal friction.
// In a real app, this would be Firestore or Postgres.
const sessions: InterviewSession[] = [];
const feedbackList: Feedback[] = [];
const promptConfigs: PromptConfig[] = [
  {
    id: '1',
    version: '1.0.0',
    isActive: true,
    instructions: 'Standard technical interview guidelines.',
    createdAt: new Date().toISOString()
  }
];

export const DB = {
  sessions: {
    save: (session: InterviewSession) => {
      const idx = sessions.findIndex(s => s.id === session.id);
      if (idx > -1) sessions[idx] = session;
      else sessions.push(session);
    },
    get: (id: string) => sessions.find(s => s.id === id),
    list: () => [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  },
  feedback: {
    add: (feedback: Feedback) => feedbackList.push(feedback),
    listForInterview: (interviewId: string) => feedbackList.filter(f => f.interviewId === interviewId),
    listAll: () => [...feedbackList],
  },
  prompts: {
    getActive: () => promptConfigs.find(p => p.isActive) || promptConfigs[0],
    list: () => [...promptConfigs],
    add: (config: PromptConfig) => {
      promptConfigs.forEach(p => p.isActive = false);
      promptConfigs.push(config);
    }
  }
};
