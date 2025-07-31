import React from 'react';
import { Message } from '../types';
import { BrainIcon } from './icons';

interface StatusViewProps {
  title: string;
  messages: Message[];
  isActive?: boolean;
  isWaiting?: boolean;
  isPaused?: boolean;
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

export const StatusView: React.FC<StatusViewProps> = ({ title, messages, isActive = false, isWaiting = false, isPaused = false }) => {
    const messagesEndRef = React.useRef<null | HTMLDivElement>(null);

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    return (
        <div className={`bg-gray-800/50 backdrop-blur-sm rounded-lg border ${isActive ? 'border-violet-500 shadow-lg shadow-violet-900/50' : isWaiting ? 'border-orange-500 shadow-lg shadow-orange-900/50' : isPaused ? 'border-yellow-500 shadow-lg shadow-yellow-900/50' : 'border-gray-700'} flex flex-col h-full`}>
            <div className="flex items-center gap-2 p-2 border-b border-gray-700 flex-shrink-0">
                <BrainIcon className={`w-4 h-4 ${isActive ? 'text-violet-400' : isWaiting ? 'text-orange-400' : isPaused ? 'text-yellow-400' : 'text-gray-400'}`} />
                <h3 className="text-sm font-bold text-gray-200">{title}</h3>
                {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>}
                {isWaiting && <div className="ml-auto w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>}
                {isPaused && <div className="ml-auto w-2 h-2 rounded-full bg-yellow-400"></div>}
            </div>
            <div className="p-2 space-y-1 overflow-y-auto flex-grow max-h-32">
                {messages.length === 0 ? (
                    <p className="text-gray-500 italic text-center pt-2 text-xs">Awaiting instructions...</p>
                ) : (
                    messages.slice(-5).map((msg) => (
                        <div key={msg.id} className="text-xs leading-tight">
                            <div className={`flex items-start gap-1 ${getColorForType(msg.type)}`}>
                                <span className="mt-0.5 text-xs" title={msg.type}>{getIconForType(msg.type)}</span>
                                <p className="flex-1 whitespace-pre-wrap font-mono text-xs leading-tight">{msg.content.substring(0, 150)}...</p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};