import React from 'react';
import { Agent } from '../types';
import { PlusIcon, TrashIcon, PlayIcon, LoadingSpinner } from './icons';

interface ConfigPanelProps {
    githubUrl: string; // Now supports both GitHub URLs and local folder paths
    setGithubUrl: (url: string) => void;
    objective: string;
    setObjective: (objective: string) => void;
    agentSmithPrompt: string;
    setAgentSmithPrompt: (prompt: string) => void;
    agents: Agent[];
    setAgents: (agents: Agent[]) => void;
    onStart: () => void;
    onStop: () => void;
    onPause: () => void;
    onResume: () => void;
    isRunning: boolean;
    isPaused: boolean;
    useFirebase: boolean;
    setUseFirebase: (use: boolean) => void;
    isFirebaseConfigured: boolean;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
    githubUrl,
    setGithubUrl,
    objective,
    setObjective,
    agentSmithPrompt,
    setAgentSmithPrompt,
    agents,
    setAgents,
    onStart,
    onStop,
    onPause,
    onResume,
    isRunning,
    isPaused,
    useFirebase,
    setUseFirebase,
    isFirebaseConfigured,
}) => {
    const addAgent = () => {
        const newAgent: Agent = {
            id: `agent-${Date.now()}`,
            name: 'New Agent',
            role: 'You are a helpful assistant.',
        };
        setAgents([...agents, newAgent]);
    };

    const removeAgent = (id: string) => {
        setAgents(agents.filter(agent => agent.id !== id));
    };

    const updateAgent = (id: string, field: 'name' | 'role', value: string) => {
        setAgents(agents.map(agent => agent.id === id ? { ...agent, [field]: value } : agent));
    };

    // Extract source name for display
    const getSourceName = (url: string): string => {
        if (!url) return '';
        
        // Handle GitHub URLs
        if (url.includes('github.com')) {
            const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
            return match ? match[1] : url;
        }
        
        // Handle local folder paths
        if (url.startsWith('/') || url.includes(':\\') || url.startsWith('./') || url.startsWith('../')) {
            const parts = url.split(/[\/\\]/);
            return parts[parts.length - 1] || parts[parts.length - 2] || url;
        }
        
        return url;
    };

    const sourceName = getSourceName(githubUrl);

    return (
        <div className="p-1 space-y-3 h-full overflow-y-auto">
            {/* Source Display */}
            {sourceName && (
                <div className="bg-violet-900/20 border border-violet-700 rounded-lg p-2">
                    <div className="text-xs text-violet-300 font-semibold mb-1">Current Source</div>
                    <div className="text-sm text-violet-200 font-mono break-all">{sourceName}</div>
                </div>
            )}

            {/* Main Objective */}
            <div className="space-y-1">
                <label htmlFor="githubUrl" className="font-semibold text-gray-300 text-xs">Repository URL or Local Folder Path</label>
                <input
                    id="githubUrl"
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/user/repo or /path/to/local/folder"
                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
                    disabled={isRunning}
                />
                <div className="text-xs text-gray-500">
                    Supports GitHub URLs or local folder paths (e.g., /home/user/project or C:\Users\user\project)
                </div>
            </div>
            <div className="space-y-1">
                <label htmlFor="objective" className="font-semibold text-gray-300 text-xs">Primary Objective</label>
                <textarea
                    id="objective"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="e.g., 'Refactor the main component for better performance.'"
                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-2 py-1 h-16 text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
                    disabled={isRunning}
                />
            </div>
            
            <button
                onClick={onStart}
                disabled={isRunning || !githubUrl || !objective}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-violet-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 text-sm"
            >
                {isRunning ? (
                    <>
                        <LoadingSpinner /> Processing...
                    </>
                ) : (
                    <>
                        <PlayIcon /> Start Mission
                    </>
                )}
            </button>

            {/* Control Buttons */}
            {isRunning && (
                <div className="flex gap-2">
                    <button
                        onClick={onStop}
                        className="flex-1 flex items-center justify-center gap-1 bg-red-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-red-700 transition-all duration-200 text-xs"
                    >
                        <TrashIcon className="w-3 h-3" /> Stop
                    </button>
                    {isPaused ? (
                        <button
                            onClick={onResume}
                            className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-700 transition-all duration-200 text-xs"
                        >
                            <PlayIcon className="w-3 h-3" /> Resume
                        </button>
                    ) : (
                        <button
                            onClick={onPause}
                            className="flex-1 flex items-center justify-center gap-1 bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-yellow-700 transition-all duration-200 text-xs"
                        >
                            <span className="text-xs">⏸</span> Pause
                        </button>
                    )}
                </div>
            )}

            {/* Accordion for Advanced Settings */}
            <details className="bg-gray-900/50 p-2 rounded-lg border border-gray-700">
                <summary className="font-semibold text-gray-300 cursor-pointer text-xs">Advanced Settings</summary>
                <div className="mt-2 space-y-3">
                     <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-300">Persistence</h3>
                        <div
                            title={!isFirebaseConfigured ? "Firebase is not configured. Persistence is disabled." : ""}
                            className="flex items-center justify-between bg-gray-800 p-2 rounded-lg"
                        >
                            <label htmlFor="firebase-toggle" className="font-medium text-gray-300 text-xs">
                                Save mission data to Firebase
                            </label>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="firebase-toggle"
                                    className="sr-only peer"
                                    checked={useFirebase && isFirebaseConfigured}
                                    onChange={(e) => setUseFirebase(e.target.checked)}
                                    disabled={!isFirebaseConfigured || isRunning}
                                />
                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-violet-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600 peer-disabled:opacity-50"></div>
                            </div>
                        </div>
                         {!isFirebaseConfigured && <p className="text-xs text-yellow-400">Firebase credentials are not set in firebaseService.ts. Persistence is disabled.</p>}
                    </div>
                    {/* AgentSmith Config */}
                    <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-gray-300">AgentSmith Role</h3>
                        <textarea
                            value={agentSmithPrompt}
                            onChange={(e) => setAgentSmithPrompt(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-2 py-1 h-24 text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
                            disabled={isRunning}
                        />
                    </div>

                    {/* Agent Config */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-gray-300">Agent Roster</h3>
                            <button
                                onClick={addAgent}
                                disabled={isRunning}
                                className="flex items-center gap-1 bg-green-600/20 text-green-400 px-2 py-1 rounded-md hover:bg-green-600/40 transition text-xs"
                            >
                                <PlusIcon className="w-3 h-3" /> Add
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 -mt-1">Customize your team. Add more specialists or remove agents as needed for the mission.</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {agents.map((agent) => (
                                <div key={agent.id} className="bg-gray-800 p-2 rounded-lg border border-gray-700 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <input
                                            type="text"
                                            value={agent.name}
                                            onChange={(e) => updateAgent(agent.id, 'name', e.target.value)}
                                            className="font-bold bg-transparent focus:outline-none text-violet-400 text-xs"
                                            disabled={isRunning}
                                        />
                                        <button onClick={() => removeAgent(agent.id)} disabled={isRunning} className="text-red-500 hover:text-red-400">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <textarea
                                        value={agent.role}
                                        onChange={(e) => updateAgent(agent.id, 'role', e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-md px-2 py-1 h-16 text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
                                        placeholder="Agent's role/prompt..."
                                        disabled={isRunning}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </details>
        </div>
    );
};