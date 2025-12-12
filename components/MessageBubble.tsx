import React from 'react';
import { Role, Message } from '../types';
import { Bot, User, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const isError = message.isError;

  return (
    <div className={`group w-full text-gray-100 border-b border-black/10 dark:border-gray-900/50 ${isUser ? 'bg-gray-900' : 'bg-gray-800'}`}>
      <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-3xl xl:max-w-4xl p-4 md:py-6 flex lg:px-0 m-auto">
        <div className="flex-shrink-0 flex flex-col relative items-end">
          <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${isUser ? 'bg-gray-600' : isError ? 'bg-red-500' : 'bg-green-500'}`}>
            {isUser ? <User size={20} /> : isError ? <AlertCircle size={20} /> : <Bot size={20} />}
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden">
            {isError ? (
                <div className="text-red-400 font-medium">
                    {message.content}
                </div>
            ) : (
                <div className="prose prose-invert max-w-none leading-7 text-sm md:text-base">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};