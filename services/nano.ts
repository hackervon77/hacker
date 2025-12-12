import { Message, Role } from "../types";

export const GeminiNano = {
  isAvailable: async (): Promise<boolean> => {
    if (!window.ai || !window.ai.languageModel) return false;
    try {
      const caps = await window.ai.languageModel.capabilities();
      return caps.available !== 'no';
    } catch (e) {
      return false;
    }
  },

  streamResponse: async function* (
    history: Message[],
    newMessage: string
  ): AsyncGenerator<string, void, unknown> {
    if (!window.ai || !window.ai.languageModel) {
        throw new Error("Browser does not support Built-in AI.");
    }

    const caps = await window.ai.languageModel.capabilities();
    if (caps.available === 'no') {
        throw new Error("Gemini Nano is not available on this device.");
    }

    // Construct a prompt that includes context, as Nano sessions are often ephemeral or need manual history management
    // depending on the implementation version. We'll use a simple prompt construction for robustness.
    const context = history
        .filter(m => !m.isError)
        .map(m => `${m.role === Role.USER ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');
    
    const fullPrompt = `
System: You are a helpful AI assistant residing locally on the user's device. 
${context ? `\nContext:\n${context}` : ''}

User: ${newMessage}

Assistant:`;

    let session;
    try {
        session = await window.ai.languageModel.create({
            systemPrompt: "You are a helpful offline assistant."
        });

        // Use streaming if available
        const stream = session.promptStreaming(fullPrompt);
        
        // The stream returns the accumulated text in some versions, or chunks in others.
        // The current spec draft often returns the *full* text so far in each chunk or delta.
        // We need to handle both. Standardizing on 'delta' logic is safer if we track length,
        // but let's assume standard iterator yields chunks.
        
        let previousLength = 0;
        for await (const chunk of stream) {
            const newContent = chunk.slice(previousLength);
            previousLength = chunk.length;
            yield newContent;
        }

    } catch (error: any) {
        console.error("Gemini Nano Error:", error);
        throw new Error("Failed to generate response from Local AI (Nano). Ensure you have Chrome Canary with experimental flags enabled.");
    } finally {
        if (session) {
            session.destroy();
        }
    }
  }
};