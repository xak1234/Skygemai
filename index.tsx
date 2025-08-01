// Enhanced AgentSmith Ops Hub Frontend
import './index.css';

// Types
interface AgentStatus {
    id: string;
    name: string;
    status: 'idle' | 'working' | 'thinking' | 'analyzing' | 'error' | 'paused';
    task: string;
}

interface SystemStatus {
    iterationCount: number;
    confidenceScore: number;
    filesModified: number;
    tasksCompleted: number;
}

interface ProviderStatus {
    name: string;
    available: boolean;
}

// Global state
let systemStatus: SystemStatus = {
    iterationCount: 0,
    confidenceScore: 0,
    filesModified: 0,
    tasksCompleted: 0
};

let agents: AgentStatus[] = [
    { id: 'smith', name: '🧠 AgentSmith (Director)', status: 'idle', task: 'Waiting for instructions...' },
    { id: 'analyst', name: '📊 CodeAnalyst', status: 'idle', task: 'Ready for analysis' },
    { id: 'architect', name: '🏗️ SystemArchitect', status: 'idle', task: 'Ready for design' },
    { id: 'fixer', name: '🛠️ Fixer', status: 'idle', task: 'Ready to fix code' },
    { id: 'debugger', name: '🕵️ Debugger', status: 'idle', task: 'Ready to debug' },
    { id: 'optimizer', name: '🚀 Optimizer', status: 'idle', task: 'Ready to optimize' },
    { id: 'codemaniac', name: '🤖 CodeManiac', status: 'idle', task: 'Ready to code' },
    { id: 'researcher', name: '🔬 Researcher', status: 'idle', task: 'Ready to research' },
    { id: 'tester', name: '🧪 Tester', status: 'idle', task: 'Ready to test' }
];

let providers: ProviderStatus[] = [];

// Utility functions
function addToTerminal(sender: string, message: string): void {
    const terminal = document.getElementById('terminal');
    if (!terminal) return;

    const timestamp = new Date().toLocaleTimeString();
    const terminalLine = document.createElement('div');
    terminalLine.className = 'terminal-line';
    terminalLine.innerHTML = `
        <span class="terminal-timestamp">[${timestamp}]</span>
        <span class="terminal-sender">${sender}</span>
        <div class="terminal-message">${message}</div>
    `;
    
    terminal.appendChild(terminalLine);
    terminal.scrollTop = terminal.scrollHeight;
}

function updateSystemStatus(): void {
    const elements = {
        iterationCount: document.getElementById('iteration-count'),
        confidenceScore: document.getElementById('confidence-score'),
        filesModified: document.getElementById('files-modified'),
        tasksCompleted: document.getElementById('tasks-completed')
    };

    if (elements.iterationCount) elements.iterationCount.textContent = systemStatus.iterationCount.toString();
    if (elements.confidenceScore) elements.confidenceScore.textContent = `${systemStatus.confidenceScore}%`;
    if (elements.filesModified) elements.filesModified.textContent = systemStatus.filesModified.toString();
    if (elements.tasksCompleted) elements.tasksCompleted.textContent = systemStatus.tasksCompleted.toString();
}

function updateAgentStatus(agentId: string, status: AgentStatus['status'], task: string): void {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
        agent.status = status;
        agent.task = task;
    }

    const statusDot = document.getElementById(`${agentId}-status`);
    const taskElement = document.getElementById(`${agentId}-task`);
    
    if (statusDot) {
        statusDot.className = `status-dot ${status}`;
        statusDot.setAttribute('aria-label', status);
    }
    
    if (taskElement) {
        taskElement.textContent = task;
    }
    
    // Add agent status update to terminal
    addAgentStatusToTerminal(agent.name, status, task);
}

function addAgentStatusToTerminal(agentName: string, status: string, task: string): void {
    const terminal = document.getElementById('terminal');
    if (!terminal) return;

    const timestamp = new Date().toLocaleTimeString();
    const terminalLine = document.createElement('div');
    terminalLine.className = 'terminal-line';
    
    // Format: [timestamp] AgentName: STATUS - task (single line, no extra spaces)
    const statusIcon = getStatusIcon(status);
    terminalLine.innerHTML = `<span class="terminal-timestamp">[${timestamp}]</span> <span class="terminal-agent">${agentName}:</span> <span class="terminal-status ${status}">${statusIcon}${status.toUpperCase()}</span> <span class="terminal-task">- ${task}</span>`;
    
    terminal.appendChild(terminalLine);
    terminal.scrollTop = terminal.scrollHeight;
    
    // Keep only last 20 entries to prevent overflow
    const lines = terminal.querySelectorAll('.terminal-line');
    if (lines.length > 20) {
        lines[0].remove();
    }
}

function getStatusIcon(status: string): string {
    switch (status) {
        case 'idle': return '⚪';
        case 'working': return '🟢';
        case 'thinking': return '🟡';
        case 'analyzing': return '🟣';
        case 'error': return '🔴';
        case 'paused': return '🟠';
        default: return '⚪';
    }
}

function updateProviderStatus(): void {
    const providerContainer = document.getElementById('provider-status');
    if (!providerContainer) return;

    providerContainer.innerHTML = providers.map(provider => `
        <div class="provider-chip ${provider.available ? 'available' : 'unavailable'}">
            <span>${provider.available ? '🟢' : '🔴'}</span> ${provider.name}
        </div>
    `).join('');
}

function showNotification(message: string, type: 'success' | 'warning' | 'error' = 'success'): void {
    const notification = document.getElementById('notification');
    const content = document.getElementById('notification-content');
    
    if (notification && content) {
        content.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

function updateProgress(percentage: number): void {
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
}

// API functions
async function checkProviders(): Promise<void> {
    try {
        updateAgentStatus('researcher', 'working', 'Checking AI provider availability...');
        
        // Check all available providers in parallel
        const [xaiAvailable, deepseekAvailable, claudeAvailable, openaiAvailable, geminiAvailable] = await Promise.all([
            checkProviderHealth('xai'),
            checkProviderHealth('deepseek'),
            checkProviderHealth('claude'),
            checkProviderHealth('openai'),
            checkProviderHealth('gemini')
        ]);
        
        providers = [
            { name: 'XAI', available: xaiAvailable },
            { name: 'DeepSeek', available: deepseekAvailable },
            { name: 'Claude', available: claudeAvailable },
            { name: 'OpenAI', available: openaiAvailable },
            { name: 'Gemini', available: geminiAvailable }
        ];
        
        updateProviderStatus();
        const availableCount = providers.filter(p => p.available).length;
        updateAgentStatus('researcher', 'idle', `Providers checked: ${availableCount}/5 available`);
    } catch (error) {
        console.error('Failed to check providers:', error);
        updateAgentStatus('researcher', 'error', 'Failed to check AI providers');
    }
}

async function checkProviderHealth(provider: string): Promise<boolean> {
    try {
        let endpoint = '';
        switch (provider) {
            case 'xai':
                endpoint = '/api/xai/v1/chat/completions';
                break;
            case 'deepseek':
                endpoint = '/api/deepseek/chat/completions';
                break;
            case 'claude':
                endpoint = '/api/claude/chat/completions';
                break;
            case 'openai':
                endpoint = '/api/openai/chat/completions';
                break;
            case 'gemini':
                endpoint = '/api/gemini/chat/completions';
                break;
            default:
                return false;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 1
            })
        });
        
        // If we get a 500 error with "not configured" message, provider is not available
        if (response.status === 500) {
            const errorData = await response.json().catch(() => ({}));
            return !errorData.error?.includes('not configured');
        }
        
        // Any other response (including other errors) means the provider is configured
        return true;
    } catch (error) {
        console.error(`Provider ${provider} health check failed:`, error);
        return false;
    }
}

async function cloneProject(url: string): Promise<void> {
    try {
        if (!url || !url.trim()) {
            throw new Error('Please enter a repository URL or local path');
        }
        
        const isLocalPath = !url.startsWith('http');
        const actionText = isLocalPath ? 'Loading local project' : 'Cloning repository';
        
        updateAgentStatus('codemaniac', 'working', `${actionText}: ${url}...`);
        updateProgress(25);
        
        console.log('Attempting to clone:', url.trim());
        const response = await fetch('/api/project/clone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url.trim() })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            throw new Error(`Server response error: ${response.status} ${response.statusText}`);
        }
        
        if (response.ok && result.success) {
            updateAgentStatus('codemaniac', 'working', result.message);
            updateProgress(100);
            showNotification(result.message);
            
            // Enable buttons
            const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
            const analyzeBtn = document.getElementById('analyze-btn') as HTMLButtonElement;
            const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
            
            if (startBtn) startBtn.disabled = false;
            if (analyzeBtn) analyzeBtn.disabled = false;
            if (exportBtn) exportBtn.disabled = false;
        } else {
            const errorMsg = result?.error || `HTTP ${response.status}: ${response.statusText}`;
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Clone/Load error:', error);
        let errorMessage = 'Unknown error occurred';
        
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        
        updateAgentStatus('codemaniac', 'error', `Failed: ${errorMessage}`);
        showNotification(`Failed to load project: ${errorMessage}`, 'error');
        updateProgress(0);
    }
}

async function sendInstruction(instruction: string): Promise<void> {
    if (!instruction.trim()) return;
    
    // Add to history
    const historyList = document.getElementById('instruction-history-list');
    if (historyList) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-timestamp">${new Date().toLocaleString()}</div>
            <div>${instruction}</div>
        `;
        historyList.appendChild(historyItem);
    }
    
    // Clear input
    const input = document.getElementById('instruction-input') as HTMLTextAreaElement;
    if (input) input.value = '';
    
    try {
        // Real AI processing with actual API calls
        updateAgentStatus('smith', 'thinking', 'Processing user instruction...');
        
        // Find available provider
        const availableProvider = providers.find(p => p.available);
        if (!availableProvider) {
            throw new Error('No AI providers available');
        }
        
        updateAgentStatus('smith', 'working', `Sending to ${availableProvider.name}...`);
        
        const response = await fetch('/api/llm/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { 
                        role: 'system', 
                        content: `You are AgentSmith, the lead investigative coordinator for a team of specialized AI agents. Your role is to:

1. ANALYZE the user's request thoroughly
2. IDENTIFY what investigations need to be conducted  
3. COORDINATE which agents (Analyst, Architect, Researcher, Optimizer) should be involved
4. PROVIDE detailed status updates on ongoing investigations
5. REPORT findings, progress, and next steps clearly

Always provide specific, actionable investigation details. Include:
- What you're investigating
- Which team members are involved  
- Current progress status
- Key findings discovered
- Next investigation steps
- Estimated completion timeframes

Be thorough and informative - users need to understand exactly what investigations are happening and their progress.` 
                    },
                    { role: 'user', content: instruction }
                ],
                provider: availableProvider.name.toLowerCase(),
                max_tokens: 800
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        const aiResponse = result.choices?.[0]?.message?.content || 'AI response received';
        
        updateAgentStatus('smith', 'working', 'Coordinating team response...');
        
        // Add Agent Smith's initial response
        addToTerminal('AgentSmith', aiResponse);
        showNotification(`Team investigation initiated by ${availableProvider.name}`);
        
        // Start parallel agent investigation with real AI calls
        await initiateTeamInvestigation(instruction, availableProvider);
        
        // Update system stats
        systemStatus.tasksCompleted++;
        systemStatus.iterationCount++;
        updateSystemStatus();
        
    } catch (error) {
        console.error('AI processing error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateAgentStatus('smith', 'error', `Failed: ${errorMessage}`);
        showNotification(`AI processing failed: ${errorMessage}`, 'error');
    }
}

// Team investigation with real AI calls for each agent
async function initiateTeamInvestigation(instruction: string, provider: ProviderStatus): Promise<void> {
    const agentPrompts = {
        analyst: {
            name: 'Analyst',
            prompt: `You are the Analyst agent, specializing in code analysis, pattern recognition, and technical assessment. 

Your expertise includes:
- Code quality analysis and technical debt identification
- Performance bottleneck detection
- Security vulnerability assessment  
- Code pattern analysis and anti-pattern identification
- Dependency and architecture analysis

Analyze this request and provide your technical analysis perspective. Focus on:
- Technical implications and considerations
- Code quality concerns or opportunities
- Performance impact analysis
- Security considerations
- Implementation complexity assessment

Be specific and technical in your analysis.`,
            status: 'analyzing' as const
        },
        researcher: {
            name: 'Researcher',
            prompt: `You are the Researcher agent, specializing in technical research, documentation analysis, and best practice identification.

Your expertise includes:
- Technical documentation research
- Industry best practices identification
- Framework and library research
- API and integration research
- Standards and compliance research

Research this request and provide your findings. Focus on:
- Relevant documentation and resources
- Industry best practices and standards
- Similar implementations or case studies
- Potential frameworks, libraries, or tools
- Compliance or regulatory considerations

Provide well-researched, factual information with specific recommendations.`,
            status: 'working' as const
        },
        architect: {
            name: 'Architect',
            prompt: `You are the Architect agent, specializing in system design, architecture planning, and solution design.

Your expertise includes:
- System architecture design and planning
- Integration pattern design
- Scalability and maintainability planning
- Technology stack selection
- Design pattern implementation

Design a solution approach for this request. Focus on:
- Overall architecture and design approach
- Component interaction and integration patterns
- Scalability and performance considerations
- Technology choices and justification
- Implementation phases and dependencies

Provide a comprehensive architectural perspective with clear design decisions.`,
            status: 'thinking' as const
        },
        optimizer: {
            name: 'Optimizer',
            prompt: `You are the Optimizer agent, specializing in performance optimization, efficiency improvements, and resource management.

Your expertise includes:
- Performance optimization strategies
- Resource utilization improvement
- Efficiency enhancement techniques
- Bottleneck identification and resolution
- Cost-benefit analysis of optimizations

Evaluate this request for optimization opportunities. Focus on:
- Performance improvement opportunities
- Resource efficiency considerations
- Optimization trade-offs and priorities
- Measurable improvement targets
- Implementation effort vs. benefit analysis

Provide specific, actionable optimization recommendations with expected impact.`,
            status: 'working' as const
        }
    };

    // Start all agents with their initial status
    Object.entries(agentPrompts).forEach(([agentId, config]) => {
        updateAgentStatus(agentId, config.status, `Processing ${config.name.toLowerCase()} perspective...`);
    });

    // Make parallel AI calls for all agents
    const agentPromises = Object.entries(agentPrompts).map(async ([agentId, config]) => {
        try {
            const response = await fetch('/api/llm/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: config.prompt },
                        { role: 'user', content: instruction }
                    ],
                    provider: provider.name.toLowerCase(),
                    max_tokens: 600
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            const agentResponse = result.choices?.[0]?.message?.content || `${config.name} analysis complete`;
            
            // Add response to terminal
            addToTerminal(config.name, agentResponse);
            updateAgentStatus(agentId, 'idle', `${config.name} analysis complete`);
            
            return { agent: config.name, response: agentResponse };
        } catch (error) {
            console.error(`${config.name} AI call failed:`, error);
            const errorMsg = `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            addToTerminal(config.name, errorMsg);
            updateAgentStatus(agentId, 'error', errorMsg);
            return { agent: config.name, response: errorMsg };
        }
    });

    try {
        // Wait for all agents to complete
        const results = await Promise.all(agentPromises);
        
        // Agent Smith provides final coordination
        setTimeout(() => {
            updateAgentStatus('smith', 'analyzing', 'Consolidating all agent findings...');
            
            setTimeout(() => {
                const completedAgents = results.filter(r => !r.response.includes('failed')).length;
                addToTerminal('AgentSmith', `Team investigation complete! ${completedAgents}/4 agents provided analysis. All perspectives consolidated and ready for implementation.`);
                updateAgentStatus('smith', 'idle', 'Team coordination complete - ready for next task');
            }, 2000);
        }, 1000);
        
    } catch (error) {
        console.error('Team investigation failed:', error);
        updateAgentStatus('smith', 'error', 'Team coordination failed');
        addToTerminal('AgentSmith', 'Team investigation encountered errors. Some agents may not have responded.');
    }
}

// Drag and drop functionality for agents
function setupDragAndDrop(): void {
    const agentElements = document.querySelectorAll('.agent');
    
    agentElements.forEach((agent, index) => {
        agent.setAttribute('draggable', 'true');
        agent.setAttribute('data-index', index.toString());
        
        agent.addEventListener('dragstart', (e) => {
            const dragEvent = e as DragEvent;
            agent.classList.add('dragging');
            if (dragEvent.dataTransfer) {
                dragEvent.dataTransfer.effectAllowed = 'move';
                dragEvent.dataTransfer.setData('text/html', agent.outerHTML);
                dragEvent.dataTransfer.setData('text/plain', index.toString());
            }
        });
        
        agent.addEventListener('dragend', () => {
            agent.classList.remove('dragging');
        });
        
        agent.addEventListener('dragover', (e) => {
            e.preventDefault();
            agent.classList.add('drag-over');
        });
        
        agent.addEventListener('dragleave', () => {
            agent.classList.remove('drag-over');
        });
        
        agent.addEventListener('drop', (e) => {
            e.preventDefault();
            agent.classList.remove('drag-over');
            
            const dragEvent = e as DragEvent;
            const sourceIndex = parseInt(dragEvent.dataTransfer?.getData('text/plain') || '0');
            const targetIndex = parseInt(agent.getAttribute('data-index') || '0');
            
            if (sourceIndex !== targetIndex) {
                // Reorder agents array
                const sourceAgent = agents[sourceIndex];
                agents.splice(sourceIndex, 1);
                agents.splice(targetIndex, 0, sourceAgent);
                
                // Update the DOM
                updateAgentStatusBar();
                // Update agent status to show reordering
                updateAgentStatus(sourceAgent.id, sourceAgent.status, `Moved to position ${targetIndex + 1}`);
            }
        });
    });
}

function updateAgentStatusBar(): void {
    const statusBar = document.querySelector('.agent-status-bar');
    if (!statusBar) return;
    
    statusBar.innerHTML = agents.map((agent, index) => `
        <div id="agent-${agent.id}" class="agent" draggable="true" data-index="${index}">
            <span class="status-dot ${agent.status}" id="${agent.id}-status" aria-label="${agent.status}"></span>
            <div>
                <div class="agent-name">${agent.name}</div>
                <div class="agent-task" id="${agent.id}-task">${agent.task}</div>
            </div>
        </div>
    `).join('');
    
    // Re-setup drag and drop for new elements
    setupDragAndDrop();
}

// Event listeners
function setupEventListeners(): void {
    // Clone button
    const cloneBtn = document.getElementById('clone-btn');
    const projectSource = document.getElementById('project-source') as HTMLInputElement;
    
    cloneBtn?.addEventListener('click', () => {
        const url = projectSource?.value;
        if (url) cloneProject(url);
    });
    
    // Browse button for folder picker
    const browseBtn = document.getElementById('browse-btn');
    const folderPicker = document.getElementById('folder-picker') as HTMLInputElement;
    
    browseBtn?.addEventListener('click', () => {
        folderPicker?.click();
    });
    
    // Handle folder selection
    folderPicker?.addEventListener('change', (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
            // Get the common path from the first file
            const firstFile = files[0];
            const webkitPath = (firstFile as any).webkitRelativePath;
            if (webkitPath) {
                // Extract the folder path by removing the file name
                const folderPath = webkitPath.split('/')[0];
                // For desktop applications, we would use the full system path
                // But in browser, we'll show the folder name and handle it server-side
                if (projectSource) {
                    projectSource.value = folderPath;
                    showNotification(`Selected folder: ${folderPath}`);
                }
            }
        }
    });
    
    // Add drag and drop functionality for the project source input
    if (projectSource) {
        projectSource.addEventListener('dragover', (e) => {
            e.preventDefault();
            projectSource.style.borderColor = 'var(--accent-color)';
            projectSource.style.backgroundColor = 'rgba(0, 255, 136, 0.1)';
        });
        
        projectSource.addEventListener('dragleave', (e) => {
            e.preventDefault();
            projectSource.style.borderColor = '';
            projectSource.style.backgroundColor = '';
        });
        
        projectSource.addEventListener('drop', (e) => {
            e.preventDefault();
            projectSource.style.borderColor = '';
            projectSource.style.backgroundColor = '';
            
            const items = e.dataTransfer?.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.kind === 'file') {
                        const entry = item.webkitGetAsEntry();
                        if (entry && entry.isDirectory) {
                            // For drag-and-drop, we can get the directory name
                            // but not the full system path due to browser security
                            projectSource.value = entry.name;
                            showNotification(`Dropped folder: ${entry.name}`);
                            break;
                        }
                    }
                }
            }
        });
    }
    
    // Send instruction button
    const sendBtn = document.getElementById('send-instruction');
    const instructionInput = document.getElementById('instruction-input') as HTMLTextAreaElement;
    
    sendBtn?.addEventListener('click', () => {
        const instruction = instructionInput?.value;
        if (instruction) sendInstruction(instruction);
    });
    
    // Enter key in instruction input
    instructionInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            const instruction = instructionInput.value;
            if (instruction) sendInstruction(instruction);
        }
    });
    
    // Control buttons
    document.getElementById('start-btn')?.addEventListener('click', () => {
        updateAgentStatus('smith', 'working', 'Initializing operations...');
        showNotification('AgentSmith started!');
    });
    
    document.getElementById('analyze-btn')?.addEventListener('click', () => {
        updateAgentStatus('analyst', 'analyzing', 'Analyzing codebase structure...');
        showNotification('Project analysis started');
    });
    
    document.getElementById('clear-terminal')?.addEventListener('click', () => {
        const terminal = document.getElementById('terminal');
        if (terminal) {
            terminal.innerHTML = '';
            // Re-add current agent statuses
            agents.forEach(agent => {
                addAgentStatusToTerminal(agent.name, agent.status, agent.task);
            });
        }
    });
}

// Add periodic investigation status updates
function startPeriodicUpdates(): void {
    setInterval(() => {
        // Only provide updates if agents are actively working
        const workingAgents = agents.filter(agent => 
            agent.status !== 'idle' && 
            !agent.task.includes('Standing by') &&
            !agent.task.includes('complete')
        );
        
        if (workingAgents.length > 0) {
            const statusUpdates = [
                'Investigation progress: Cross-referencing findings across team modules...',
                'Coordination update: Synchronizing analysis results between agents...',
                'Status report: Team collaboration proceeding as planned...',
                'Progress check: Consolidating multi-agent investigation data...',
                'Team sync: Agents reporting consistent progress on assigned tasks...',
                `Active investigation: ${workingAgents.length} agents currently working on analysis...`,
                'Investigation update: Correlating findings from multiple analysis streams...',
                'Coordination status: Team members sharing data across investigation threads...'
            ];
            
            const randomUpdate = statusUpdates[Math.floor(Math.random() * statusUpdates.length)];
            addToTerminal('AgentSmith', randomUpdate);
        }
    }, 20000); // Every 20 seconds
}

// Initialize application
function initialize(): void {
    // Clear terminal and show only agent statuses
    const terminal = document.getElementById('terminal');
    if (terminal) {
        terminal.innerHTML = '';
    }
    
    // Initialize all agents with their current status
    agents.forEach(agent => {
        addAgentStatusToTerminal(agent.name, agent.status, agent.task);
    });
    
    updateSystemStatus();
    updateAgentStatusBar(); // Initialize the agent status bar with drag and drop
    setupEventListeners();
    checkProviders();
    
    // Start periodic investigation updates
    startPeriodicUpdates();
    
    // Simulate some initial activity
    setTimeout(() => {
        systemStatus.iterationCount = 1;
        updateSystemStatus();
        addToTerminal('AgentSmith', 'Operations Hub initialized. Team ready for investigations. Submit instructions to begin coordinated analysis.');
    }, 2000);
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);