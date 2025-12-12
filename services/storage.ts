import { ChatSession, Message, Role } from '../types';

const STORAGE_KEY = 'gemini_offline_chat_sessions';

export const StorageService = {
  getSessions: (): ChatSession[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const sessions = JSON.parse(stored);
      return sessions.sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt);
    } catch (e) {
      console.error('Failed to load sessions', e);
      return [];
    }
  },

  saveSession: (session: ChatSession): void => {
    const sessions = StorageService.getSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  },

  deleteSession: (id: string): void => {
    const sessions = StorageService.getSessions().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  },

  createSession: (): ChatSession => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    StorageService.saveSession(newSession);
    return newSession;
  },

  updateSessionTitle: (id: string, title: string): void => {
    const sessions = StorageService.getSessions();
    const session = sessions.find(s => s.id === id);
    if (session) {
      session.title = title;
      StorageService.saveSession(session);
    }
  }
};