export interface A2AAgentCard {
  name: string;
  description: string;
  version: string;
  capabilities: {
    streaming?: boolean;
    tools?: string[];
  };
  url: string;
}

export interface A2ATaskMessage {
  role: 'user';
  parts: Array<{ text: string }>;
}

export interface A2ATask {
  id: string;
  message: A2ATaskMessage;
  sessionId?: string;
}

export interface A2ATaskResult {
  id: string;
  status: 'completed' | 'failed' | 'in_progress';
  artifacts?: Array<{ parts: Array<{ text: string }> }>;
  error?: { message: string };
}
