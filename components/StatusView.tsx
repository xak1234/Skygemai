import React from 'react';
import { Message } from '../types';
import { BrainIcon } from './icons';

interface StatusViewProps {
  title: string;
  messages: Message[];
  isActive?: boolean;
}

const getIconForType = (type: Message['type']) => {
    switch (type) {
        case 'thought':
            return '🤔';
        case 'goal':
            return '🎯';
        case 'delegation':
            return '👉';
        case 'plan':
            return '📋';
        case 'result':
            return '✅';
        case 'error':
            return '❌';
        case 'info':
            return 'ℹ️';
        case 'recommendation':
            return '💡';
        default:
            return '🔹';
    }
}

const getColorForType = (type: Message['type']) => {
    switch (type) {
        case 'thought':
            return 'text-cyan-300';
        case 'goal':
            return 'text-fuchsia-300';
        case 'delegation':
            return 'text-yellow-300';
        case 'plan':
            return 'text-indigo-300';
        case 'result':
            return 'text-green-300';
        case 'error':
            return 'text-red-400';
        case 'recommendation':
            return 'text-yellow-400';
        default:
            return 'text-gray-300';
    }
}

export const StatusView: React.FC<StatusViewProps> = ({ title, messages, isActive = false }) => {
    const messagesEndRef = React.useRef<null | HTMLDivElement>(null);

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    return (
        <div className={`bg-gray-800/50 backdrop-blur-sm rounded-lg border ${isActive ? 'border-violet-500 shadow-lg shadow-violet-900/50' : 'border-gray-700'} flex flex-col h-full`}>
            <div className="flex items-center gap-2 p-2 border-b border-gray-700 flex-shrink-0">
                <BrainIcon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-gray-400'}`} />
                <h3 className="text-sm font-bold text-gray-200">{title}</h3>
                {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>}
            </div>
            <div className="p-2 space-y-2 overflow-y-auto flex-grow">
                {messages.length === 0 ? (
                    <p className="text-gray-500 italic text-center pt-4 text-xs">Awaiting instructions...</p>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="text-xs leading-relaxed">
                            <div className={`flex items-start gap-1 ${getColorForType(msg.type)}`}>
                                <span className="mt-0.5 text-xs" title={msg.type}>{getIconForType(msg.type)}</span>
                                <p className="flex-1 whitespace-pre-wrap font-mono text-xs">{msg.content}</p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};