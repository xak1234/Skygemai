import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { StatusView } from './components/StatusView';
import { WorkspaceView } from './components/WorkspaceView';
import { HistoryPanel } from './components/HistoryPanel';
import { Terminal } from './components/Terminal';
import { Agent, Message, AgentSmithDecision, AIModel } from './types';
import { getAgentSmithDecision, executeAgentTask, askQuestion } from './services/aiService';
import * as firebaseService from './services/firebaseService';
import { INITIAL_AGENTS, AGENT_SMITH_PROMPT, TERMINAL_HELP_TEXT } from './constants';
import { BrainIcon, HistoryIcon } from './components/icons';

type View = 'config' | 'history';

const App: React.FC = () => {
    // UI State
    const [activeView, setActiveView] = useState<View>('config');

    // Configuration State
    const [sourcePath, setSourcePath] = useState<string>('https://github.com/reactjs/reactjs.org');
    const [objective, setObjective] = useState<string>('Analyze the repo structure, identify the main documentation rendering logic, and write a basic unit test for it.');
    const [agentSmithPrompt, setAgentSmithPrompt] = useState<string>(AGENT_SMITH_PROMPT);
    const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
    const [useFirebase, setUseFirebase] = useState<boolean>(true);

    // Process State
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [isWaitingForInput, setIsWaitingForInput] = useState<boolean>(false);
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
        setIsWaitingForInput(false);
        setIsPaused(false);
    };

    const stopMission = () => {
        setIsRunning(false);
        setIsPaused(false);
        setIsWaitingForInput(false);
        setActiveAgentId(null);
        addMessage('master', 'AgentSmith', 'info', 'Mission stopped by user.');
    };

    const pauseMission = () => {
        setIsPaused(true);
        addMessage('master', 'AgentSmith', 'info', 'Mission paused by user.');
    };

    const resumeMission = () => {
        setIsPaused(false);
        addMessage('master', 'AgentSmith', 'info', 'Mission resumed by user.');
    };

    const getHistoryAsString = (): string => {
        return messages.map(msg => `[${msg.sourceName} - ${msg.type}]: ${msg.content}`).join('\n\n');
    };
    
    const handleStart = useCallback(async () => {
        if (!objective || !sourcePath) return;
        
        setIsRunning(true);
        setIsPaused(false);
        setIsWaitingForInput(false);
        resetState();
        
        if (useFirebase && firebaseService.isConfigured()) {
            try {
                const missionId = await firebaseService.createMission({ objective, githubUrl: sourcePath, agents });
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

                // Check if mission was stopped
                if (!isRunning) {
                    addMessage('master', 'AgentSmith', 'info', 'Mission execution stopped.');
                    break;
                }

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

                if (agentSmithDecision.status === 'complete' || !agentSmithDecision.suggestedAgentIds || !agentSmithDecision.currentGoal) {
                    setWorkspaceContent(agentSmithDecision.finalOutput || 'Process complete. No final output provided.');
                    addMessage('master', 'AgentSmith', 'result', 'Mission accomplished.');
                    if (useFirebase && firebaseService.isConfigured() && currentMissionId) {
                        await firebaseService.updateMissionStatus(currentMissionId, 'completed', agentSmithDecision.finalOutput);
                    }
                    break;
                }

                const { suggestedAgentIds, suggestedModels, currentGoal } = agentSmithDecision;
                const validModels: AIModel[] = ['grok-4', 'grok-3-mini', 'grok-3-mini-fast', 'deepseek-coder-33b-instruct'];
                
                // Validate agents exist
                const selectedAgents = agents.filter(a => suggestedAgentIds?.includes(a.id));
                if (selectedAgents.length === 0) {
                    throw new Error(`AgentSmith tried to delegate to non-existent agents (IDs: ${suggestedAgentIds?.join(', ')})`);
                }

                // Validate and prepare models
                const selectedModels: AIModel[] = (suggestedModels || []).map(model => 
                    validModels.includes(model as AIModel) ? (model as AIModel) : 'deepseek-coder-33b-instruct'
                );

                // Ensure we have enough models for all agents
                while (selectedModels.length < selectedAgents.length) {
                    selectedModels.push('deepseek-coder-33b-instruct');
                }

                addMessage('master', 'AgentSmith', 'goal', `New Goal for ${selectedAgents.length} agent(s): ${currentGoal}`);
                
                // Execute tasks for all selected agents simultaneously
                const agentPromises = selectedAgents.map((agent, index) => {
                    const model = selectedModels[index];
                    addMessage(agent.id, agent.name, 'info', `Received goal: ${currentGoal} (using ${model})`);
                    return executeAgentTask(agent, currentGoal, getHistoryAsString(), model);
                });

                const agentResults = await Promise.all(agentPromises);
                
                // Check if any agent needs input
                let needsInput = false;
                let inputAgentId: string | null = null;
                
                for (let i = 0; i < selectedAgents.length; i++) {
                    const agent = selectedAgents[i];
                    const result = agentResults[i];
                    
                    if (result.trim().toUpperCase().startsWith('NEEDS_INPUT:')) {
                        addMessage(agent.id, agent.name, 'info', result);
                        needsInput = true;
                        inputAgentId = agent.id;
                    } else {
                        addMessage(agent.id, agent.name, 'result', result);
                    }
                }
                
                if (needsInput) {
                    setIsWaitingForInput(true);
                    setActiveAgentId(inputAgentId);
                    break; // Stop the loop and wait for input
                }

                // Check for pause condition
                if (isPaused) {
                    addMessage('master', 'AgentSmith', 'info', 'Mission paused. Waiting for resume...');
                    // Wait for resume
                    while (isPaused && isRunning) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    if (!isRunning) {
                        addMessage('master', 'AgentSmith', 'info', 'Mission stopped while paused.');
                        break;
                    }
                    addMessage('master', 'AgentSmith', 'info', 'Mission resumed. Continuing...');
                }
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
            setIsPaused(false);
            setActiveAgentId(null);
        }
    }, [objective, sourcePath, agentSmithPrompt, agents, useFirebase, currentMissionId, addMessage, isRunning, isPaused]);

    const loadMission = useCallback(async (missionId: string) => {
        if (!firebaseService.isConfigured()) return;
        const missionData = await firebaseService.getMission(missionId);
        const missionLogs = await firebaseService.getMissionLogs(missionId);

        if (missionData) {
            setSourcePath(missionData.githubUrl);
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

    const sendDetailsToAgent = useCallback(async (targetId: string, details: string) => {
        const targetLower = targetId.toLowerCase();
        const agent = agents.find(a => a.id === targetId || a.name.toLowerCase() === targetLower);
        
        if (!agent) {
            throw new Error(`Invalid target: '${targetId}'. Use an agent name or valid agent ID.`);
        }

        addMessage(agent.id, agent.name, 'info', `Received additional details: ${details}`);
        
        // Continue the agent's work with the new details
        const agentResult = await executeAgentTask(agent, `Continue with these additional details: ${details}`, getHistoryAsString());
        
        // Check if agent still needs input
        if (agentResult.trim().toUpperCase().startsWith('NEEDS_INPUT:')) {
            addMessage(agent.id, agent.name, 'info', agentResult);
            setIsWaitingForInput(true);
            setActiveAgentId(agent.id);
        } else {
            addMessage(agent.id, agent.name, 'result', agentResult);
            setIsWaitingForInput(false);
            setActiveAgentId(null);
            
            // Continue the mission
            setActiveAgentId('master');
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
        }
    }, [agents, addMessage, getHistoryAsString, agentSmithPrompt, objective]);

    const continueMission = useCallback(async () => {
        if (!isRunning) {
            throw new Error("Mission is not running.");
        }

        setIsWaitingForInput(false);
        addMessage('master', 'AgentSmith', 'info', 'Continuing mission with available information...');
        
        // Trigger AgentSmith to continue
        setActiveAgentId('master');
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
    }, [isRunning, agentSmithPrompt, agents, objective, addMessage, getHistoryAsString]);

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
                        if (isPaused) {
                            statusText += `\n<span class="text-orange-300">Mission is PAUSED</span>`;
                        }
                        const activeName = activeAgentId === 'master' ? 'AgentSmith' : agents.find(a => a.id === activeAgentId)?.name || 'Unknown';
                        statusText += `\nActive Actor: <span class="text-green-300">${activeName}</span>`;
                        const masterLogLatest = messages.filter(m => m.source === 'master' && m.type === 'goal').pop();
                        if(masterLogLatest) {
                            statusText += `\nCurrent Goal: ${masterLogLatest.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}`;
                        }
                    }
                    if (isWaitingForInput) {
                        statusText += `\n<span class="text-orange-300">Waiting for input...</span>`;
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
                case 'send': {
                    const sendTarget = args[0];
                    const detailsMatch = restOfCommand.match(/"(.*?)"/);
                    if (!sendTarget || !detailsMatch) {
                        throw new Error(`Invalid format. Use: send [target] "[details]"`);
                    }
                    const details = detailsMatch[1];
                    
                    addTerminalLine(`Sending details to ${sendTarget}...`);
                    await sendDetailsToAgent(sendTarget, details);
                    addTerminalLine(`<span class="text-green-300">Details sent successfully.</span>`);
                    break;
                }
                case 'continue': {
                    addTerminalLine(`Continuing mission...`);
                    await continueMission();
                    addTerminalLine(`<span class="text-green-300">Mission continued.</span>`);
                    break;
                }
                case 'stop': {
                    addTerminalLine(`Stopping mission...`);
                    stopMission();
                    addTerminalLine(`<span class="text-red-300">Mission stopped.</span>`);
                    break;
                }
                case 'pause': {
                    addTerminalLine(`Pausing mission...`);
                    pauseMission();
                    addTerminalLine(`<span class="text-orange-300">Mission paused.</span>`);
                    break;
                }
                case 'resume': {
                    addTerminalLine(`Resuming mission...`);
                    resumeMission();
                    addTerminalLine(`<span class="text-green-300">Mission resumed.</span>`);
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
    }, [agents, messages, isRunning, activeAgentId, agentSmithPrompt, getHistoryAsString, isWaitingForInput, sendDetailsToAgent, continueMission, stopMission, pauseMission, resumeMission]);


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
        if (isPaused) {
            return "Mission paused.";
        }
        if (isWaitingForInput) {
            return "Waiting for input...";
        }
        if (activeAgentId) {
            const activeName = activeAgentId === 'master' ? 'AgentSmith' : agents.find(a => a.id === activeAgentId)?.name;
            return `${activeName} is working...`;
        }
        return 'Processing...';
    }, [isRunning, activeAgentId, agents, workspaceContent, isWaitingForInput, isPaused]);


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
                                githubUrl={sourcePath}
                                setGithubUrl={setSourcePath}
                                objective={objective}
                                setObjective={setObjective}
                                agentSmithPrompt={agentSmithPrompt}
                                setAgentSmithPrompt={setAgentSmithPrompt}
                                agents={agents}
                                setAgents={setAgents}
                                onStart={handleStart}
                                onStop={stopMission}
                                onPause={pauseMission}
                                onResume={resumeMission}
                                isRunning={isRunning}
                                isPaused={isPaused}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-shrink-0 h-1/4 min-h-[150px]">
                        <StatusView title="AgentSmith Status" messages={agentSmithLog} isActive={isRunning && activeAgentId === 'master'} isWaiting={isWaitingForInput} isPaused={isPaused} />
                        <WorkspaceView content={workspaceContent} statusMessage={statusMessage} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 flex-grow h-3/4 min-h-[400px]">
                        {agents.map(agent => (
                           <div key={agent.id} className="flex flex-col h-full">
                                <StatusView
                                    title={agent.name}
                                    messages={agentLogs[agent.id] || []}
                                    isActive={isRunning && activeAgentId === agent.id}
                                    isWaiting={isWaitingForInput && activeAgentId === agent.id}
                                    isPaused={isPaused && activeAgentId === agent.id}
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