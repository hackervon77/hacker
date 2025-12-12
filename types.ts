// Chat Types
export enum Role {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export enum ConnectionMode {
  CLOUD = 'Cloud (Gemini 2.5)',
  LOCAL = 'Offline (Gemini Nano)',
  AUTO = 'Auto'
}

// Window AI (Gemini Nano) Types
export interface AICapabilities {
  available: 'readily' | 'after-download' | 'no';
  defaultTemperature?: number;
  defaultTopK?: number;
  maxTopK?: number;
}

export interface AILanguageModel {
  prompt(input: string): Promise<string>;
  promptStreaming(input: string): ReadableStream<string>;
  destroy(): void;
  clone(): Promise<AILanguageModel>;
}

export interface AILanguageModelFactory {
  capabilities(): Promise<AICapabilities>;
  create(options?: {
    systemPrompt?: string;
    temperature?: number;
    topK?: number;
  }): Promise<AILanguageModel>;
}

export interface AI {
  languageModel: AILanguageModelFactory;
}

declare global {
  interface Window {
    ai?: AI;
  }
}