export interface Agent {
  id: string;
  name: string;
  role: string;
}

export interface Message {
  id: string;
  source: string; // "master" or Agent ID
  sourceName: string; // "AgentSmith" or Agent Name
  type: 'thought' | 'delegation' | 'result' | 'error' | 'info' | 'plan' | 'goal' | 'recommendation';
  content: string;
  timestamp: string; // ISO string
}

export interface AgentSmithDecision {
  thought: string;
  plan?: string[];
  currentGoal?: string;
  suggestedAgentId?: string;
  status: 'running' | 'complete';
  finalOutput?: string;
  recommendation?: string;
}

export interface Mission {
    id: string;
    objective: string;
    githubUrl: string;
    status: 'running' | 'completed' | 'error';
    createdAt: Date;
    finalOutput?: string;
    agents: Agent[];
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}