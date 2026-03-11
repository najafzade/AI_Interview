
export interface TurnEvaluation {
  asrRating?: number;
  ttsRating?: number;
  logicRating?: number;
  flags?: string[];
}

export interface InterviewTurn {
  speaker: 'ai' | 'candidate';
  text: string;
  audioDataUri?: string;
  evaluations?: TurnEvaluation;
}

export interface InterviewSession {
  id: string;
  candidateName: string;
  skill: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  promptVersion: string;
  history: InterviewTurn[];
  createdAt: string;
  // State is kept in the sessions for the agent logic
  state?: any; 
}

export interface PromptConfig {
  id: string;
  version: string;
  isActive: boolean;
  instructions: string;
  createdAt: string;
}


export interface FeedbackRecord {
  id: string;
  sessionId: string;
  evaluatorId: string;
  overallRating: number;
  fairnessRating?: number;
  relevanceRating?: number;
  flags?: string[];
  notes?: string;
  comparisonSessionId?: string;
  preferredSessionId?: string;
  createdAt: string;
}


export const DB = {
  sessions: new Map<string, InterviewSession>(),
};
