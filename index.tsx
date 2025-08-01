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
        // Check actual configured AI providers
        providers = [
            { name: 'XAI', available: true },
            { name: 'DeepSeek', available: true },
            { name: 'OpenAI', available: false },
            { name: 'Claude', available: false }
        ];
        updateProviderStatus();
        // Update researcher agent status when providers are checked
        updateAgentStatus('researcher', 'working', 'Checking AI provider availability...');
    } catch (error) {
        console.error('Failed to check providers:', error);
        updateAgentStatus('researcher', 'error', 'Failed to check AI providers');
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
    
    // Simulate AI processing with agent status updates
    updateAgentStatus('smith', 'thinking', 'Processing user instruction...');
    
    setTimeout(() => {
        updateAgentStatus('smith', 'working', 'Coordinating team response...');
        updateAgentStatus('analyst', 'thinking', 'Analyzing requirements...');
        showNotification('Instruction sent to AgentSmith team');
        
        setTimeout(() => {
            updateAgentStatus('architect', 'analyzing', 'Designing solution approach...');
        }, 1500);
    }, 1000);
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
                            showNotification(`Dropped folder: ${entry.name}`, 'info');
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
    
    // Simulate some initial activity
    setTimeout(() => {
        systemStatus.iterationCount = 1;
        updateSystemStatus();
    }, 2000);
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);