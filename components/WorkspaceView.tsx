
import React from 'react';

interface WorkspaceViewProps {
    content: string;
    statusMessage: string;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({ content, statusMessage }) => {
    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 flex flex-col h-full">
            <div className="p-2 border-b border-gray-700">
                <h3 className="text-sm font-bold text-gray-200">Workspace / Final Output</h3>
                <p className="text-xs text-gray-400">{statusMessage}</p>
            </div>
            <div className="p-2 overflow-y-auto flex-grow font-mono text-xs bg-gray-900/50 rounded-b-lg">
                {content ? (
                    <pre className="whitespace-pre-wrap text-gray-200 text-xs">{content}</pre>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500 italic text-xs">Final output will appear here...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
   