import React from 'react';
import { Plus, MessageSquare, Trash2, X, WifiOff, Wifi } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  isOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isOnline
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-700 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="p-4 flex-none">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 transition-colors"
          >
            <Plus size={18} />
            <span className="font-medium text-sm">New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
            <div className="px-2 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                History
            </div>
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`
                group w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors relative
                ${currentSessionId === session.id ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800/50'}
              `}
            >
              <MessageSquare size={16} className="flex-none" />
              <div className="flex-1 text-left truncate pr-8">
                {session.title}
              </div>
              <div 
                role="button"
                tabIndex={0}
                onClick={(e) => onDeleteSession(session.id, e)}
                className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
              >
                <Trash2 size={14} />
              </div>
            </button>
          ))}
          {sessions.length === 0 && (
            <div className="text-center text-gray-500 text-sm mt-8">
                No chat history
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex-none">
            <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${isOnline ? 'text-green-400' : 'text-orange-400'}`}>
                {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>{isOnline ? 'Online Mode' : 'Offline Mode'}</span>
            </div>
        </div>
      </div>
    </>
  );
};