import React, { useState, useEffect, useRef } from 'react';
import { TerminalIcon, LoadingSpinner } from './icons';

interface TerminalProps {
  lines: string[];
  onCommand: (command: string) => Promise<void>;
  isProcessing: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({ lines, onCommand, isProcessing }) => {
    const [input, setInput] = useState('');
    const endOfLinesRef = useRef<null | HTMLDivElement>(null);
    const inputRef = useRef<null | HTMLInputElement>(null);

    useEffect(() => {
        endOfLinesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lines]);

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && input.trim() !== '' && !isProcessing) {
            await onCommand(input);
            setInput('');
        }
    };
    
    const handleClick = () => {
        inputRef.current?.focus();
    };

    return (
        <div className="bg-black/70 backdrop-blur-md border-t-2 border-violet-800 flex flex-col h-full text-sm font-mono" onClick={handleClick}>
            <div className="flex items-center gap-2 p-2 bg-gray-900/50 border-b border-gray-700 flex-shrink-0">
                <TerminalIcon className="w-5 h-5 text-green-400" />
                <h3 className="font-bold text-green-400">Direct Command Interface</h3>
            </div>
            <div className="flex-grow p-2 overflow-y-auto">
                {lines.map((line, index) => (
                    <div key={index} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: line }} />
                ))}
                 {isProcessing && (
                    <div className="flex items-center gap-2 text-yellow-400">
                        <LoadingSpinner className="w-4 h-4" />
                        <span>Processing...</span>
                    </div>
                 )}
                <div ref={endOfLinesRef} />
            </div>
            <div className="flex items-center p-2 border-t border-gray-700 flex-shrink-0">
                <span className="text-cyan-400">CMD&gt;</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="bg-transparent border-none text-gray-200 w-full focus:outline-none pl-2"
                    placeholder="Type 'help' for commands..."
                    disabled={isProcessing}
                    autoFocus
                />
            </div>
        </div>
    );
};
