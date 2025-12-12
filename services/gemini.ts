import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role } from "../types";

// Initialize the client strictly as instructed
// Assuming process.env.API_KEY is available in the environment
const apiKey = process.env.API_KEY || ''; 
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
    aiClient = new GoogleGenAI({ apiKey });
}

export const GeminiCloud = {
  isConfigured: () => !!apiKey,

  streamResponse: async function* (
    history: Message[],
    newMessage: string
  ): AsyncGenerator<string, void, unknown> {
    if (!aiClient) {
      throw new Error("API Key is missing. Cannot use Cloud mode.");
    }

    try {
      // Map internal messages to Gemini format if needed, 
      // but simpler to just use system instructions + new prompt for single turn
      // or chat history for multi-turn.
      // We will use chat mode.
      
      const historyForModel = history
        .filter(m => m.role !== Role.SYSTEM && !m.isError)
        .map(m => ({
          role: m.role === Role.USER ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

      const chat = aiClient.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: "You are a helpful, clever, and knowledgeable AI assistant. Responses should be formatted in Markdown.",
        },
        history: historyForModel
      });

      const resultStream = await chat.sendMessageStream({ message: newMessage });

      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
            yield c.text;
        }
      }
    } catch (error: any) {
      console.error("Gemini Cloud Error:", error);
      throw new Error(error.message || "Failed to generate response from Gemini Cloud.");
    }
  }
};