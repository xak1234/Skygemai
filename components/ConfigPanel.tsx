import React from 'react';
import { Agent } from '../types';
import { PlusIcon, TrashIcon, PlayIcon, LoadingSpinner } from './icons';

interface ConfigPanelProps {
    githubUrl: string;
    setGithubUrl: (url: string) => void;
    objective: string;
    setObjective: (objective: string) => void;
    agentSmithPrompt: string;
    setAgentSmithPrompt: (prompt: string) => void;
    agents: Agent[];
    setAgents: (agents: Agent[]) => void;
    onStart: () => void;
    isRunning: boolean;
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
    isRunning,
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

    return (
        <div className="p-1 space-y-6 h-full overflow-y-auto">
            {/* Main Objective */}
            <div className="space-y-2">
                <label htmlFor="githubUrl" className="font-semibold text-gray-300">GitHub Repository URL</label>
                <input
                    id="githubUrl"
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/user/repo"
                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
                    disabled={isRunning}
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="objective" className="font-semibold text-gray-300">Primary Objective</label>
                <textarea
                    id="objective"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="e.g., 'Refactor the main component for better performance.'"
                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 h-24 focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
                    disabled={isRunning}
                />
            </div>
            
            <button
                onClick={onStart}
                disabled={isRunning || !githubUrl || !objective}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-violet-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 text-lg"
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

            {/* Accordion for Advanced Settings */}
            <details className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <summary className="font-semibold text-gray-300 cursor-pointer">Advanced Settings</summary>
                <div className="mt-4 space-y-6">
                     <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-300">Persistence</h3>
                        <div
                            title={!isFirebaseConfigured ? "Firebase is not configured. Persistence is disabled." : ""}
                            className="flex items-center justify-between bg-gray-800 p-3 rounded-lg"
                        >
                            <label htmlFor="firebase-toggle" className="font-medium text-gray-300">
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
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-gray-300">AgentSmith Role</h3>
                        <textarea
                            value={agentSmithPrompt}
                            onChange={(e) => setAgentSmithPrompt(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 h-40 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
                            disabled={isRunning}
                        />
                    </div>

                    {/* Agent Config */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-300">Agent Roster</h3>
                            <button
                                onClick={addAgent}
                                disabled={isRunning}
                                className="flex items-center gap-1 bg-green-600/20 text-green-400 px-3 py-1 rounded-md hover:bg-green-600/40 transition"
                            >
                                <PlusIcon className="w-4 h-4" /> Add
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 -mt-3">Customize your team. Add more specialists or remove agents as needed for the mission.</p>
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {agents.map((agent) => (
                                <div key={agent.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <input
                                            type="text"
                                            value={agent.name}
                                            onChange={(e) => updateAgent(agent.id, 'name', e.target.value)}
                                            className="font-bold bg-transparent focus:outline-none text-violet-400"
                                            disabled={isRunning}
                                        />
                                        <button onClick={() => removeAgent(agent.id)} disabled={isRunning} className="text-red-500 hover:text-red-400">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <textarea
                                        value={agent.role}
                                        onChange={(e) => updateAgent(agent.id, 'role', e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 h-28 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
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