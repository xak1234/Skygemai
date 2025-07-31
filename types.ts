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
  suggestedAgentIds?: string[]; // Updated to support multiple agents
  suggestedModels?: string[]; // Updated to support multiple models
  suggestedAgentId?: string; // Backward compatibility
  suggestedModel?: string; // Backward compatibility
  status: 'running' | 'complete';
  finalOutput?: string;
  recommendation?: string;
}

export interface Mission {
    id: string;
    objective: string;
    githubUrl: string; // Now supports both GitHub URLs and local folder paths
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

// AI Model types
export type AIModel = 'grok-4' | 'grok-3-mini' | 'grok-3-mini-fast' | 'deepseek-coder-33b-instruct';

export interface ModelSelection {
  model: AIModel;
  reason: string;
}