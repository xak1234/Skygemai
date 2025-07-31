import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { StatusView } from './components/StatusView';
import { WorkspaceView } from './components/WorkspaceView';
import { HistoryPanel } from './components/HistoryPanel';
import { Terminal } from './components/Terminal';
import { Agent, Message, AgentSmithDecision } from './types';
import { getAgentSmithDecision, executeAgentTask, askQuestion } from './services/aiService';
import * as firebaseService from './services/firebaseService';
import { INITIAL_AGENTS, AGENT_SMITH_PROMPT, TERMINAL_HELP_TEXT } from './constants';
import { BrainIcon, HistoryIcon } from './components/icons';

type View = 'config' | 'history';

const App: React.FC = () => {
    // UI State
    const [activeView, setActiveView] = useState<View>('config');

    // Configuration State
    const [githubUrl, setGithubUrl] = useState<string>('https://github.com/reactjs/reactjs.org');
    const [objective, setObjective] = useState<string>('Analyze the repo structure, identify the main documentation rendering logic, and write a basic unit test for it.');
    const [agentSmithPrompt, setAgentSmithPrompt] = useState<string>(AGENT_SMITH_PROMPT);
    const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
    const [useFirebase, setUseFirebase] = useState<boolean>(true);

    // Process State
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [currentMissionId, setCurrentMissionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [workspaceContent, setWorkspaceContent] = useState<string>('');
    const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

    // Terminal State
    const [terminalLines, setTerminalLines] = useState<string[]>(['<span class="text-green-400">Welcome to the SkynetAI Direct Command Interface.</span>', 'Type `help` for a list of commands.']);
    const [isTerminalProcessing, setIsTerminalProcessing] = useState<boolean>(false);

    const addMessage = useCallback((source: string, sourceName: string, type: Message['type'], content: string) => {
        const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random()}`,
            source,
            sourceName: source === 'master' ? 'AgentSmith' : sourceName,
            type,
            content,
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, newMessage]);
        if (useFirebase && firebaseService.isConfigured() && currentMissionId) {
            firebaseService.addLogMessage(currentMissionId, newMessage);
        }
    }, [useFirebase, currentMissionId]);

    const resetState = () => {
        setMessages([]);
        setWorkspaceContent('');
        setCurrentMissionId(null);
    };

    const getHistoryAsString = (): string => {
        return messages.map(msg => `[${msg.sourceName} - ${msg.type}]: ${msg.content}`).join('\n\n');
    };
    
    const handleStart = useCallback(async () => {
        if (!objective || !githubUrl) return;
        
        setIsRunning(true);
        resetState();
        
        if (useFirebase && firebaseService.isConfigured()) {
            try {
                const missionId = await firebaseService.createMission({ objective, githubUrl, agents });
                setCurrentMissionId(missionId);
            } catch (error) {
                console.error("Failed to create mission in Firebase:", error);
                // Optionally, inform the user
            }
        }

        let loopCount = 0;
        const maxLoops = 20; // Increased loop limit for more complex tasks

        try {
            while (loopCount < maxLoops) {
                loopCount++;

                setActiveAgentId('master');
                addMessage('master', 'AgentSmith', 'info', 'Thinking...');

                const agentSmithDecision: AgentSmithDecision = await getAgentSmithDecision(agentSmithPrompt, agents, objective, getHistoryAsString());

                if (agentSmithDecision.thought) {
                    addMessage('master', 'AgentSmith', 'thought', agentSmithDecision.thought);
                }
                if (agentSmithDecision.plan) {
                    addMessage('master', 'AgentSmith', 'plan', `Plan Updated:\n- ${agentSmithDecision.plan.join('\n- ')}`);
                }
                 if (agentSmithDecision.recommendation) {
                    addMessage('master', 'AgentSmith', 'recommendation', agentSmithDecision.recommendation);
                }

                if (agentSmithDecision.status === 'complete' || !agentSmithDecision.suggestedAgentId || !agentSmithDecision.currentGoal) {
                    setWorkspaceContent(agentSmithDecision.finalOutput || 'Process complete. No final output provided.');
                    addMessage('master', 'AgentSmith', 'result', 'Mission accomplished.');
                    if (useFirebase && firebaseService.isConfigured() && currentMissionId) {
                        await firebaseService.updateMissionStatus(currentMissionId, 'completed', agentSmithDecision.finalOutput);
                    }
                    break;
                }

                const { suggestedAgentId, currentGoal } = agentSmithDecision;
                const agent = agents.find(a => a.id === suggestedAgentId);

                if (!agent) {
                    throw new Error(`AgentSmith tried to delegate to a non-existent agent (ID: ${suggestedAgentId})`);
                }

                setActiveAgentId(agent.id);
                addMessage('master', 'AgentSmith', 'goal', `New Goal for ${agent.name}: ${currentGoal}`);
                addMessage(agent.id, agent.name, 'info', `Received goal: ${currentGoal}`);

                const agentResult = await executeAgentTask(agent, currentGoal, getHistoryAsString());
                
                addMessage(agent.id, agent.name, 'result', agentResult);
            }

            if (loopCount >= maxLoops) {
                 const finalMessage = `Process stopped after reaching the maximum of ${maxLoops} iterations.`;
                 setWorkspaceContent(finalMessage);
                 addMessage('master', 'AgentSmith', 'error', finalMessage);
                 if (useFirebase && firebaseService.isConfigured() && currentMissionId) {
                    await firebaseService.updateMissionStatus(currentMissionId, 'error', finalMessage);
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setWorkspaceContent(`An error occurred: ${errorMessage}`);
            addMessage('master', 'AgentSmith', 'error', errorMessage);
            if (useFirebase && firebaseService.isConfigured() && currentMissionId) {
                await firebaseService.updateMissionStatus(currentMissionId, 'error', errorMessage);
            }
            console.error(error);
        } finally {
            setIsRunning(false);
            setActiveAgentId(null);
        }
    }, [objective, githubUrl, agentSmithPrompt, agents, useFirebase, currentMissionId, addMessage]);

    const loadMission = useCallback(async (missionId: string) => {
        if (!firebaseService.isConfigured()) return;
        const missionData = await firebaseService.getMission(missionId);
        const missionLogs = await firebaseService.getMissionLogs(missionId);

        if (missionData) {
            setGithubUrl(missionData.githubUrl);
            setObjective(missionData.objective);
            setAgents(missionData.agents);
            setWorkspaceContent(missionData.finalOutput || `Mission ended with status: ${missionData.status}`);
            setMessages(missionLogs);
            setCurrentMissionId(missionId);
            setActiveView('config'); // Switch view to see the loaded config
        }
    }, []);

    const addTerminalLine = (html: string) => {
        setTerminalLines(prev => [...prev, html]);
    };

    const handleCommand = useCallback(async (command: string) => {
        setIsTerminalProcessing(true);
        const sanitizedCommand = command.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        addTerminalLine(`<span class="text-cyan-400">CMD&gt;</span> ${sanitizedCommand}`);

        const [cmd, ...args] = command.trim().split(' ');
        const restOfCommand = args.join(' ');

        try {
            switch (cmd.toLowerCase()) {
                case 'help':
                    addTerminalLine(TERMINAL_HELP_TEXT);
                    break;
                
                case 'status': {
                    let statusText = `Mission Status: <span class="text-yellow-300">${isRunning ? 'Running' : 'Idle'}</span>`;
                    if(isRunning) {
                        const activeName = activeAgentId === 'master' ? 'AgentSmith' : agents.find(a => a.id === activeAgentId)?.name || 'Unknown';
                        statusText += `\nActive Actor: <span class="text-green-300">${activeName}</span>`;
                        const masterLogLatest = messages.filter(m => m.source === 'master' && m.type === 'goal').pop();
                        if(masterLogLatest) {
                            statusText += `\nCurrent Goal: ${masterLogLatest.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}`;
                        }
                    }
                    addTerminalLine(statusText);
                    break;
                }
                case 'history': {
                    const targetId = args[0];
                    let logSource = messages;
                    let title = "Recent History (last 10)";
                    let limit = 10;

                    if (targetId) {
                        const targetLower = targetId.toLowerCase();
                        const agent = agents.find(a => a.id === targetId || a.name.toLowerCase() === targetLower);
                        limit = 5;
                        if (targetLower === 'master' || targetLower === 'agentsmith') {
                            logSource = messages.filter(m => m.source === 'master');
                            title = "AgentSmith History (last 5)";
                        } else if (agent) {
                            logSource = messages.filter(m => m.source === agent.id);
                            title = `${agent.name} History (last 5)`;
                        } else {
                           throw new Error(`Invalid history target: '${targetId}'. Use 'agentsmith', an agent name, or a valid agent ID.`);
                        }
                    }
                    
                    const historyLines = logSource
                        .slice(-limit)
                        .map(m => {
                            const content = m.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                            return `<span class="text-fuchsia-400">[${m.sourceName}]</span> <span class="text-gray-400">(${m.type})</span>: ${content.substring(0, 100)}...`;
                        });
                    
                    addTerminalLine(`${title}\n` + (historyLines.length > 0 ? historyLines.join('\n') : 'No history found.'));
                    break;
                }
                case 'ask': {
                    const askTarget = args[0];
                    const questionMatch = restOfCommand.match(/"(.*?)"/);
                    if (!askTarget || !questionMatch) {
                        throw new Error(`Invalid format. Use: ask [target] "[question]"`);
                    }
                    const question = questionMatch[1];
                    const askTargetLower = askTarget.toLowerCase();
                    const targetAgent = agents.find(a => a.id === askTarget || a.name.toLowerCase() === askTargetLower);
                    
                    let targetName: string;
                    let targetRole: string;

                    if (askTargetLower === 'master' || askTargetLower === 'agentsmith') {
                        targetName = 'AgentSmith';
                        targetRole = agentSmithPrompt;
                    } else if (targetAgent) {
                        targetName = targetAgent.name;
                        targetRole = targetAgent.role;
                    } else {
                        throw new Error(`Invalid ask target: '${askTarget}'. Use 'agentsmith', an agent name, or a valid agent ID.`);
                    }
                    
                    const sanitizedQuestion = question.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    addTerminalLine(`Asking ${targetName}: "${sanitizedQuestion}"...`);
                    const answer = await askQuestion(targetName, targetRole, question, getHistoryAsString());
                    const sanitizedAnswer = answer.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    addTerminalLine(`<span class="text-green-300">[${targetName} Response]</span>: ${sanitizedAnswer}`);
                    break;
                }
                case 'clear':
                    setTerminalLines([]);
                    break;

                default:
                    throw new Error(`Unknown command: '${cmd}'. Type 'help' for a list of commands.`);
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            addTerminalLine(`<span class="text-red-500">Error:</span> ${errorMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;")}`);
        } finally {
            setIsTerminalProcessing(false);
        }
    }, [agents, messages, isRunning, activeAgentId, agentSmithPrompt, getHistoryAsString]);


    const agentSmithLog = useMemo(() => messages.filter(m => m.source === 'master'), [messages]);
    const agentLogs = useMemo(() => {
        return agents.reduce((acc, agent) => {
            acc[agent.id] = messages.filter(m => m.source === agent.id);
            return acc;
        }, {} as Record<string, Message[]>);
    }, [messages, agents]);

    const statusMessage = useMemo(() => {
        if (!isRunning) {
            if (workspaceContent) return "Mission complete.";
            return "Ready to start.";
        }
        if (activeAgentId) {
            const activeName = activeAgentId === 'master' ? 'AgentSmith' : agents.find(a => a.id === activeAgentId)?.name;
            return `${activeName} is working...`;
        }
        return 'Processing...';
    }, [isRunning, activeAgentId, agents, workspaceContent]);


    return (
        <div className="h-screen bg-gray-900 text-gray-100 flex flex-col">
            <header className="flex-shrink-0 bg-gray-900/50 border-b border-gray-700 px-3 py-1">
                <h1 className="text-lg font-bold text-violet-400 tracking-wider">SkynetAI</h1>
            </header>
            <div className="flex-grow flex flex-col lg:flex-row p-2 gap-2 min-h-0">
                <div className="p-2 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 space-y-2 flex-shrink-0 w-full lg:w-[400px] flex flex-col">
                    <div className="flex-shrink-0">
                        <div className="flex items-center border-b border-gray-700 mb-2">
                            <button onClick={() => setActiveView('config')} className={`flex items-center gap-1 py-2 px-3 font-bold text-sm transition ${activeView === 'config' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-400 hover:text-white'}`}>
                                <BrainIcon /> Mission Control
                            </button>
                            <button onClick={() => setActiveView('history')} className={`flex items-center gap-1 py-2 px-3 font-bold text-sm transition ${activeView === 'history' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-400 hover:text-white'}`} disabled={!firebaseService.isConfigured()}>
                                <HistoryIcon /> Missions
                            </button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto pr-1">
                        {activeView === 'config' ? (
                             <ConfigPanel
                                githubUrl={githubUrl}
                                setGithubUrl={setGithubUrl}
                                objective={objective}
                                setObjective={setObjective}
                                agentSmithPrompt={agentSmithPrompt}
                                setAgentSmithPrompt={setAgentSmithPrompt}
                                agents={agents}
                                setAgents={setAgents}
                                onStart={handleStart}
                                isRunning={isRunning}
                                useFirebase={useFirebase}
                                setUseFirebase={setUseFirebase}
                                isFirebaseConfigured={firebaseService.isConfigured()}
                            />
                        ) : (
                            <HistoryPanel onSelectMission={loadMission} />
                        )}
                    </div>
                </div>

                <main className="flex-grow flex flex-col gap-2 min-w-0 h-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-shrink-0 h-1/3 min-h-[200px]">
                        <StatusView title="AgentSmith Status" messages={agentSmithLog} isActive={isRunning && activeAgentId === 'master'} />
                        <WorkspaceView content={workspaceContent} statusMessage={statusMessage} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 flex-grow h-2/3 min-h-[300px]">
                        {agents.map(agent => (
                           <div key={agent.id} className="flex flex-col h-full">
                                <StatusView
                                    title={agent.name}
                                    messages={agentLogs[agent.id] || []}
                                    isActive={isRunning && activeAgentId === agent.id}
                                />
                            </div>
                        ))}
                    </div>
                </main>
            </div>
            
            <div className="flex-shrink-0 h-[20%] bg-gray-900">
                 <Terminal 
                    lines={terminalLines} 
                    onCommand={handleCommand}
                    isProcessing={isTerminalProcessing}
                />
            </div>
        </div>
    );
};

export default App;