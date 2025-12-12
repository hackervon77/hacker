import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, Send, AlertTriangle, Zap, Cloud } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { MessageBubble } from './components/MessageBubble';
import { StorageService } from './services/storage';
import { GeminiCloud } from './services/gemini';
import { GeminiNano } from './services/nano';
import { ChatSession, Message, Role, ConnectionMode } from './types';

export default function App() {
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [nanoAvailable, setNanoAvailable] = useState(false);
  const [mode, setMode] = useState<ConnectionMode>(ConnectionMode.AUTO);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize
  useEffect(() => {
    // Load sessions
    const loadedSessions = StorageService.getSessions();
    setSessions(loadedSessions);
    if (loadedSessions.length > 0) {
      setCurrentSessionId(loadedSessions[0].id);
    } else {
      createNewChat();
    }

    // Network listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check Nano availability
    GeminiNano.isAvailable().then(setNanoAvailable);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, currentSessionId, isGenerating]);

  // Current session helper
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  // Actions
  const createNewChat = () => {
    const newSession = StorageService.createSession();
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setIsSidebarOpen(false); // Close sidebar on mobile
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    StorageService.deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
      } else {
        createNewChat();
      }
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentSessionId || isGenerating) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: Role.USER,
      content: input.trim(),
      timestamp: Date.now()
    };

    // Update state with user message
    const updatedSessions = sessions.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMessage],
          updatedAt: Date.now(),
          // Generate title if it's the first message
          title: s.messages.length === 0 ? userMessage.content.slice(0, 30) : s.title
        };
      }
      return s;
    });
    
    // Sort so the updated session is at the top
    updatedSessions.sort((a, b) => b.updatedAt - a.updatedAt);
    setSessions(updatedSessions);
    StorageService.saveSession(updatedSessions.find(s => s.id === currentSessionId)!);
    
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsGenerating(true);

    // Determine Mode
    let useCloud = false;
    if (mode === ConnectionMode.CLOUD) {
        useCloud = true;
    } else if (mode === ConnectionMode.LOCAL) {
        useCloud = false;
    } else {
        // AUTO
        useCloud = isOnline;
    }

    // Fallback logic
    if (useCloud && !isOnline) {
        useCloud = false; // Forced to local if offline
    }

    try {
        let stream;
        const history = updatedSessions.find(s => s.id === currentSessionId)?.messages || [];

        // Prepare placeholder for response
        const responseId = crypto.randomUUID();
        let currentResponseContent = '';

        const appendChunk = (chunk: string) => {
            currentResponseContent += chunk;
            setSessions(prev => prev.map(s => {
                if (s.id === currentSessionId) {
                    const msgs = [...s.messages];
                    const lastMsg = msgs[msgs.length - 1];
                    if (lastMsg && lastMsg.id === responseId) {
                        lastMsg.content = currentResponseContent;
                    } else {
                        msgs.push({
                            id: responseId,
                            role: Role.MODEL,
                            content: currentResponseContent,
                            timestamp: Date.now()
                        });
                    }
                    return { ...s, messages: msgs };
                }
                return s;
            }));
        };

        if (useCloud) {
            if (!GeminiCloud.isConfigured()) {
                throw new Error("Gemini API Key is missing. Check your environment variables.");
            }
            stream = GeminiCloud.streamResponse(history, userMessage.content);
        } else {
            // Local Mode
            if (!nanoAvailable) {
                // If attempting local but not available
                throw new Error("Offline mode requires Chrome Built-in AI (Gemini Nano), which is not detected. Please connect to the internet to use the Cloud model.");
            }
            stream = GeminiNano.streamResponse(history, userMessage.content);
        }

        for await (const chunk of stream) {
            appendChunk(chunk);
        }

        // Final save
        const finalSessions = StorageService.getSessions();
        const sessionToUpdate = finalSessions.find(s => s.id === currentSessionId);
        if (sessionToUpdate) {
            // We need to fetch the *actual* latest content from state, but simplified here:
            // StorageService relies on memory or we pass the constructed object.
            // Let's just update the specific session with the accumulated string.
            const lastMsgIdx = sessionToUpdate.messages.findIndex(m => m.id === responseId);
            if (lastMsgIdx >= 0) {
                sessionToUpdate.messages[lastMsgIdx].content = currentResponseContent;
            } else {
                sessionToUpdate.messages.push({
                    id: responseId,
                    role: Role.MODEL,
                    content: currentResponseContent,
                    timestamp: Date.now()
                });
            }
            StorageService.saveSession(sessionToUpdate);
        }

    } catch (error: any) {
        // Add error message
        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                return {
                    ...s,
                    messages: [...s.messages, {
                        id: crypto.randomUUID(),
                        role: Role.MODEL,
                        content: `Error: ${error.message}`,
                        timestamp: Date.now(),
                        isError: true
                    }]
                };
            }
            return s;
        }));
    } finally {
        setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getActiveModeName = () => {
      if (mode === ConnectionMode.AUTO) return isOnline ? 'Auto (Cloud)' : 'Auto (Offline)';
      return mode;
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => {
            setCurrentSessionId(id);
            setIsSidebarOpen(false);
        }}
        onNewChat={createNewChat}
        onDeleteSession={handleDeleteSession}
        isOnline={isOnline}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 z-10">
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden p-2 text-gray-400 hover:text-white rounded-md hover:bg-gray-800"
                >
                    <Menu size={20} />
                </button>
                <div className="font-semibold text-gray-200">
                    {currentSession?.title || 'Gemini Chat'}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {!isOnline && (
                    <div className="hidden sm:flex items-center gap-1 text-orange-400 text-xs px-2 py-1 bg-orange-900/20 rounded border border-orange-900/50">
                        <AlertTriangle size={12} />
                        <span>Offline</span>
                    </div>
                )}
                <div className="relative group">
                    <button className="flex items-center gap-2 text-xs font-medium text-gray-300 hover:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700 transition-colors">
                        {mode === ConnectionMode.CLOUD && <Cloud size={12} />}
                        {mode === ConnectionMode.LOCAL && <Zap size={12} />}
                        {mode === ConnectionMode.AUTO && (isOnline ? <Cloud size={12} /> : <Zap size={12} />)}
                        {getActiveModeName()}
                    </button>
                    {/* Dropdown for Mode Selection */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-50">
                        <div className="p-1">
                            {Object.values(ConnectionMode).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`w-full text-left px-3 py-2 text-xs rounded-md ${mode === m ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
            {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                    <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-gray-700">
                        {isOnline ? <Cloud size={32} /> : <Zap size={32} className="text-orange-400"/>}
                    </div>
                    <h2 className="text-2xl font-semibold text-white mb-2">
                        {isOnline ? 'Gemini Offline Chat' : 'Offline Mode Active'}
                    </h2>
                    <p className="max-w-md text-sm mb-6">
                        {isOnline 
                            ? "Connected to Gemini Cloud. Go offline to test Nano capabilities." 
                            : "You are currently offline. Using experimental Gemini Nano (window.ai) if available in your browser."}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
                        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:bg-gray-800 transition-colors cursor-pointer" onClick={() => setInput("Explain quantum physics in simple terms")}>
                            "Explain quantum physics in simple terms"
                        </div>
                        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:bg-gray-800 transition-colors cursor-pointer" onClick={() => setInput("Write a haiku about coding without internet")}>
                            "Write a haiku about coding without internet"
                        </div>
                    </div>
                </div>
            ) : (
                <div className="pb-32">
                    {messages.map((msg, idx) => (
                        <MessageBubble key={idx} message={msg} />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-gray-900 via-gray-900 to-transparent pt-10 pb-6 px-4">
            <div className="max-w-3xl mx-auto relative">
                <div className="relative flex items-end w-full p-3 bg-gray-700/50 rounded-2xl border border-gray-600 focus-within:border-gray-500 focus-within:bg-gray-700 transition-colors shadow-lg">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={isGenerating ? "Thinking..." : "Message Gemini..."}
                        className="w-full max-h-[200px] py-2 pl-2 pr-10 bg-transparent border-0 focus:ring-0 resize-none text-white placeholder-gray-400"
                        rows={1}
                        disabled={isGenerating}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isGenerating}
                        className={`absolute right-3 bottom-3 p-1.5 rounded-lg transition-colors ${
                            !input.trim() || isGenerating 
                                ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed' 
                                : 'bg-white text-black hover:bg-gray-200'
                        }`}
                    >
                        <Send size={16} />
                    </button>
                </div>
                <div className="text-center mt-2 text-xs text-gray-500">
                    {isGenerating 
                        ? (mode === ConnectionMode.LOCAL || (!isOnline && mode === ConnectionMode.AUTO) ? "Generating on device..." : "Generating via Cloud...") 
                        : "Gemini may display inaccurate info, including about people, so double-check its responses."}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}