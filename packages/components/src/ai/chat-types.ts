export interface Attachment {
  url: string;
  name: string;
  contentType: string;
  file?: File;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokens?: number;
  attachments?: Attachment[];
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  active?: boolean;
}
