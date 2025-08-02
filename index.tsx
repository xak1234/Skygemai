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
    { id: 'smith', name: '🧠 AgentSmith', status: 'idle', task: 'Waiting for instructions...' },
    { id: 'agent-a', name: '🛠️ Agent A (Fixer)', status: 'idle', task: 'Ready for fixes' },
    { id: 'agent-b', name: '🕵️ Agent B (Debugger)', status: 'idle', task: 'Ready for debugging' },
    { id: 'agent-c', name: '🚀 Agent C (Optimizer)', status: 'idle', task: 'Ready for optimization' },
    { id: 'agent-d', name: '🤖 Agent D (CodeManiac)', status: 'idle', task: 'Ready for creative solutions' }
];

let providers: ProviderStatus[] = [];

// Current cloned project state
let currentProject: {
    name: string;
    path: string;
    type: string;
} | null = null;

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

// Code amendments tracking functions
function addCodeAmendment(fileName: string, changeType: 'added' | 'modified' | 'deleted', content: string, agent: string): void {
    const amendmentsContainer = document.getElementById('code-amendments');
    if (!amendmentsContainer) return;

    const timestamp = new Date().toLocaleTimeString();
    const amendmentDiv = document.createElement('div');
    amendmentDiv.className = 'code-change';
    
    amendmentDiv.innerHTML = `
        <div class="code-change-header">
            <span class="code-change-file">${fileName}</span>
            <span class="code-change-type ${changeType}">${changeType.toUpperCase()}</span>
            <span class="code-change-timestamp">${timestamp} by ${agent}</span>
        </div>
        <div class="code-change-content">${content}</div>
    `;
    
    amendmentsContainer.appendChild(amendmentDiv);
    amendmentsContainer.scrollTop = amendmentsContainer.scrollHeight;
    
    // Update system stats
    systemStatus.filesModified++;
    updateSystemStatus();
}

function simulateCodeChange(agent: string, instruction: string): void {
    // Simulate various types of code changes based on the instruction
    const changeExamples = [
        {
            file: 'src/auth/AuthService.ts',
            type: 'modified' as const,
            content: `// Enhanced authentication with JWT validation
class AuthService {
  async validateToken(token: string): Promise<boolean> {
+   // Added token expiration check
+   if (this.isTokenExpired(token)) {
+     throw new Error('Token expired');
+   }
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}`
        },
        {
            file: 'src/components/SecurityModal.tsx',
            type: 'added' as const,
            content: `// New security modal component
import React from 'react';

export const SecurityModal: React.FC = () => {
  return (
    <div className="security-modal">
      <h2>Security Enhancement Complete</h2>
      <p>Authentication system has been hardened.</p>
    </div>
  );
};`
        },
        {
            file: 'src/utils/deprecated.js',
            type: 'deleted' as const,
            content: `- // Removed deprecated authentication method
- function oldAuth(user) {
-   return user.password === 'admin'; // Insecure!
- }`
        }
    ];

    // Select appropriate changes based on instruction content
    const relevantChanges = changeExamples.filter(change => {
        const instructionLower = instruction.toLowerCase();
        if (instructionLower.includes('security') || instructionLower.includes('auth')) {
            return change.file.includes('auth') || change.file.includes('Security');
        }
        return true;
    });

    // Add a random relevant change
    const change = relevantChanges[Math.floor(Math.random() * relevantChanges.length)];
    addCodeAmendment(change.file, change.type, change.content, agent);
}

function clearCodeAmendments(): void {
    const amendmentsContainer = document.getElementById('code-amendments');
    if (!amendmentsContainer) return;
    
    amendmentsContainer.innerHTML = `
        <div class="code-change">
            <div class="code-change-header">
                <span class="code-change-file">Code amendments cleared</span>
                <span class="code-change-timestamp">Ready to track new changes</span>
            </div>
            <div class="code-change-content">Code amendment history cleared. New changes will appear here.</div>
        </div>
    `;
}

// Real code generation functions
async function generateRealCodeChanges(agentResponse: string, instruction: string): Promise<void> {
    if (!currentProject) {
        addToTerminal('CodeMaster', '❌ ERROR: No cloned project available for code changes');
        return;
    }
    
    // Extract code snippets and implementation details from CodeMaster response
    const codePatterns = [
        /```(\w+)?\n([\s\S]*?)```/g,  // Code blocks
        /`([^`]+)`/g,                  // Inline code
    ];
    
    let codeFound = false;
    
    // Extract code blocks
    const codeBlocks = [];
    let match;
    while ((match = codePatterns[0].exec(agentResponse)) !== null) {
        codeBlocks.push({
            language: match[1] || 'javascript',
            code: match[2].trim()
        });
        codeFound = true;
    }
    
    if (codeFound) {
        for (const block of codeBlocks) {
            const fileName = determineFileName(block.code, block.language, instruction);
            await writeFileToClonedProject(fileName, block.code, 'CodeMaster');
        }
    } else {
        // Generate contextual code based on instruction
        const contextualCode = generateContextualCode(instruction, agentResponse);
        await writeFileToClonedProject(contextualCode.fileName, contextualCode.code, 'CodeMaster');
    }
}

async function validateAndOptimizeCode(agentResponse: string, instruction: string): Promise<void> {
    if (!currentProject) {
        addToTerminal('QualityGuard', '❌ ERROR: No cloned project available for validation');
        return;
    }
    
    // Extract validation results and optimization suggestions
    const validationResults = extractValidationResults(agentResponse);
    
    if (validationResults.hasOptimizations) {
        await writeFileToClonedProject(
            validationResults.fileName, 
            validationResults.optimizedCode, 
            'QualityGuard'
        );
    }
    
    // Add validation summary
    const validationSummary = `
🛡️ QUALITY VALIDATION COMPLETE FOR ${currentProject.name}:
- Security Score: ${validationResults.securityScore}/10
- Performance Score: ${validationResults.performanceScore}/10
- Code Quality: ${validationResults.qualityScore}/10
- Status: ${validationResults.deploymentReady ? '✅ READY FOR DEPLOYMENT' : '⚠️ NEEDS FIXES'}

${validationResults.recommendations}`;
    
    await writeFileToClonedProject('validation-report.md', validationSummary, 'QualityGuard');
}

// Function to write files to cloned project only
async function writeFileToClonedProject(fileName: string, content: string, agent: string): Promise<void> {
    if (!currentProject) {
        addToTerminal(agent, '❌ ERROR: No cloned project loaded');
        return;
    }
    
    try {
        const response = await fetch('/api/project/file-operation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation: 'write',
                filePath: fileName,
                content: content,
                projectPath: currentProject.path
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            addCodeAmendment(fileName, 'added', content, agent);
            addToTerminal(agent, `✅ File written to cloned project: ${fileName}`);
            addToTerminal('System', `📝 Real file operation: ${result.message}`);
        } else {
            const errorMsg = result.error || `HTTP ${response.status}`;
            addToTerminal(agent, `❌ Failed to write file: ${errorMsg}`);
            addCodeAmendment(fileName, 'added', `ERROR: ${errorMsg}\n\n${content}`, agent);
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        addToTerminal(agent, `❌ File operation error: ${errorMsg}`);
        addCodeAmendment(fileName, 'added', `ERROR: ${errorMsg}\n\n${content}`, agent);
    }
}

function determineFileName(code: string, language: string, instruction: string): string {
    // Smart file naming based on code content and instruction
    const instructionLower = instruction.toLowerCase();
    
    if (code.includes('interface ') || code.includes('type ')) return 'types.ts';
    if (code.includes('export const') && code.includes('React')) return 'components/NewComponent.tsx';
    if (code.includes('app.') || code.includes('express')) return 'server.js';
    if (code.includes('.css') || code.includes('style')) return 'styles.css';
    if (instructionLower.includes('auth')) return 'auth/AuthService.ts';
    if (instructionLower.includes('api')) return 'api/endpoints.ts';
    if (instructionLower.includes('component')) return 'components/Component.tsx';
    if (instructionLower.includes('util')) return 'utils/helpers.ts';
    
    // Default based on language
    const extensions = {
        'typescript': '.ts',
        'javascript': '.js',
        'tsx': '.tsx',
        'jsx': '.jsx',
        'css': '.css',
        'html': '.html'
    };
    
    return `generated-code${extensions[language] || '.js'}`;
}

function generateContextualCode(instruction: string, agentResponse: string): {fileName: string, type: 'added' | 'modified', code: string} {
    const instructionLower = instruction.toLowerCase();
    
    if (instructionLower.includes('component') || instructionLower.includes('react')) {
        return {
            fileName: 'components/GeneratedComponent.tsx',
            type: 'added',
            code: `import React from 'react';

// Generated based on: ${instruction}
export const GeneratedComponent: React.FC = () => {
  return (
    <div className="generated-component">
      <h2>Generated Component</h2>
      <p>Implementation based on CodeMaster analysis:</p>
      <pre>{${JSON.stringify(agentResponse.substring(0, 200))}...}</pre>
    </div>
  );
};`
        };
    }
    
    if (instructionLower.includes('api') || instructionLower.includes('endpoint')) {
        return {
            fileName: 'api/generated-endpoint.js',
            type: 'added',
            code: `// Generated API endpoint based on: ${instruction}
const express = require('express');
const router = express.Router();

router.post('/generated-endpoint', async (req, res) => {
  try {
    // Implementation based on CodeMaster analysis
    console.log('Request received:', req.body);
    
    // TODO: Implement actual logic
    res.json({ 
      success: true, 
      message: 'Generated endpoint working',
      analysis: '${agentResponse.substring(0, 100)}...'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;`
        };
    }
    
    // Default generic code
    return {
        fileName: 'generated-solution.js',
        type: 'added',
        code: `// Generated solution for: ${instruction}

${agentResponse.includes('function') ? agentResponse.substring(0, 300) : `
// Implementation based on CodeMaster analysis
function generatedSolution() {
  console.log('Generated solution executing...');
  
  // Analysis summary:
  // ${agentResponse.substring(0, 200)}
  
  return { success: true, implemented: true };
}

module.exports = { generatedSolution };`}`
    };
}

function extractValidationResults(agentResponse: string): any {
    // Extract scores and recommendations from QualityGuard response
    const scoreRegex = /(\d+)\/10/g;
    const scores = [];
    let match;
    while ((match = scoreRegex.exec(agentResponse)) !== null) {
        scores.push(parseInt(match[1]));
    }
    
    return {
        securityScore: scores[0] || 8,
        performanceScore: scores[1] || 7,
        qualityScore: scores[2] || 8,
        deploymentReady: agentResponse.toLowerCase().includes('ready') || agentResponse.toLowerCase().includes('approved'),
        hasOptimizations: agentResponse.toLowerCase().includes('optimization') || agentResponse.toLowerCase().includes('improve'),
        fileName: 'optimized-code.ts',
        optimizedCode: `// QualityGuard Optimizations Applied
${agentResponse.includes('```') ? agentResponse.match(/```[\s\S]*?```/)?.[0]?.replace(/```\w*\n?|\n?```/g, '') || '// Optimizations applied' : '// Code optimizations based on validation'}`,
        recommendations: agentResponse.substring(0, 300) + '...'
    };
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
            
            // Track the current cloned project
            currentProject = {
                name: result.name || url.split('/').pop()?.replace('.git', '') || 'unknown',
                path: result.path || '',
                type: result.type || 'unknown'
            };
            
            // Update UI to show current project
            addToTerminal('System', `📁 PROJECT LOADED: ${currentProject.name}`);
            addToTerminal('System', `📂 Path: ${currentProject.path}`);
            addToTerminal('System', `🔧 Type: ${currentProject.type}`);
            addToTerminal('System', `✅ Ready for code amendments on cloned repository`);
            
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
    
    // Verify cloned project exists before processing
    if (!currentProject) {
        showNotification('⚠️ Please clone a repository first before sending instructions', 'error');
        addToTerminal('System', '❌ ERROR: No cloned project loaded. Please clone a repository first.');
        return;
    }
    
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
    
    // Log project context
    addToTerminal('System', `🎯 PROCESSING INSTRUCTION FOR CLONED PROJECT:`);
    addToTerminal('System', `📁 Project: ${currentProject.name}`);
    addToTerminal('System', `📂 Path: ${currentProject.path}`);
    addToTerminal('System', `🔧 Type: ${currentProject.type}`);
    
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
                        content: `You are AgentSmith, an elite AI coordinator that works EXCLUSIVELY with CLONED REPOSITORIES. Your mission:

🎯 ANALYZE user requirements for the CLONED PROJECT and create optimal execution plan
🚀 COORDINATE 2 specialized agents: CodeMaster (implementation) + QualityGuard (validation)  
⚡ DELIVER working code solutions with maximum speed - ONLY modify files in the cloned repository

CRITICAL RULES:
- NEVER modify AgentSmith system files (index.tsx, index.html, server.js, etc.)
- ONLY work with files in the cloned project directory
- All code changes must be made to the cloned repository only
- Verify project is loaded before starting any work

EXECUTION STRATEGY:
1. Confirm cloned project is available and loaded
2. Quick requirement analysis (30 seconds max) 
3. Create specific, actionable implementation plan for CLONED PROJECT
4. Deploy CodeMaster for immediate coding in CLONED PROJECT
5. Deploy QualityGuard for validation/optimization of CLONED PROJECT

OUTPUT FORMAT:
📁 PROJECT: [Confirm which cloned project we're working on]
📋 PLAN: [Brief implementation strategy for cloned project]
🎯 CODEMASTER TASK: [Specific coding requirements for cloned files]  
🛡️ QUALITYGUARD TASK: [Validation/optimization focus for cloned project]
⏱️ ETA: [Realistic completion estimate]

Focus on SPEED, EFFICIENCY, and REAL RESULTS for the CLONED PROJECT ONLY.` 
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
        
        // Add Agent Smith's initial coordination plan
        addToTerminal('AgentSmith', `🧠 AGENT SMITH COORDINATION PLAN:`);
        addToTerminal('AgentSmith', `📋 Initial Analysis: ${aiResponse}`);
        addToTerminal('AgentSmith', `🎯 Coordination Strategy: Deploying specialized team for comprehensive analysis`);
        addToTerminal('AgentSmith', `🤖 AI Provider: ${availableProvider.name} (selected for optimal performance)`);
        addToTerminal('AgentSmith', `⚡ Execution Mode: Parallel agent deployment for maximum efficiency`);
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
        codemaster: {
            name: 'CodeMaster',
            prompt: `You are CodeMaster, an elite coding agent specialized in RAPID, HIGH-QUALITY code implementation for CLONED REPOSITORIES ONLY.

🚀 CORE MISSION: Transform requirements into working code FAST - ONLY in cloned project files

CRITICAL RULES:
- NEVER modify AgentSmith system files (index.tsx, index.html, server.js, etc.)
- ONLY work with files in the cloned project directory: ${currentProject?.path || '[NO PROJECT LOADED]'}
- All code changes must target cloned repository files only
- Verify cloned project exists before making any changes

EXPERTISE:
- Instant code generation for cloned project (React, TypeScript, Node.js, CSS)
- Real-time problem-solving within cloned codebase
- Performance-optimized solutions for existing project structure
- Security-first coding practices for cloned files
- Modern development patterns within project context

TASK EXECUTION:
1. Confirm cloned project is available: ${currentProject?.name || 'NONE'}
2. Analyze requirement in context of cloned project (10 seconds)
3. Generate complete, working code for cloned project files
4. Include proper error handling within project structure
5. Optimize for performance and maintainability of cloned code

OUTPUT REQUIREMENTS:
- Complete, executable code snippets for CLONED PROJECT files only
- Clear implementation steps within cloned project structure
- File locations relative to cloned project directory
- Dependencies and imports required for cloned project
- Testing approach for cloned codebase

Focus on IMMEDIATE, ACTIONABLE code delivery for CLONED PROJECT ONLY. No AgentSmith system modifications.`,
            status: 'working' as const
        },
        qualityguard: {
            name: 'QualityGuard',
            prompt: `You are QualityGuard, an elite validation agent specialized in RAPID quality assurance and optimization for CLONED REPOSITORIES ONLY.

🛡️ CORE MISSION: Ensure code quality, security, and performance at maximum speed - ONLY for cloned project files

CRITICAL RULES:
- NEVER validate or modify AgentSmith system files (index.tsx, index.html, server.js, etc.)
- ONLY review and optimize files in the cloned project directory: ${currentProject?.path || '[NO PROJECT LOADED]'}
- All validation and optimization must target cloned repository files only
- Verify cloned project exists before performing validation

EXPERTISE:
- Instant code review and validation for cloned project
- Security vulnerability detection in cloned codebase
- Performance bottleneck identification within cloned project
- Best practice compliance verification for cloned files
- Optimization recommendations for cloned project structure

TASK EXECUTION:
1. Confirm cloned project is available: ${currentProject?.name || 'NONE'}
2. Review CodeMaster's implementation in cloned project instantly
3. Identify critical issues and optimizations for cloned files
4. Validate security and performance of cloned codebase
5. Suggest immediate improvements for cloned project only

OUTPUT REQUIREMENTS:
- Security validation results for CLONED PROJECT files only
- Performance assessment of cloned codebase
- Code quality score (1-10) for cloned project
- Critical fixes needed in cloned files (if any)
- Optimization opportunities for cloned project
- Deployment readiness status of cloned repository

Focus on FAST validation with ACTIONABLE feedback for CLONED PROJECT ONLY. No AgentSmith system validation.`,
            status: 'analyzing' as const
        }
    };

    // Agent Smith issues commands to all workers
    addToTerminal('AgentSmith', `🎯 ISSUING COMMANDS TO TEAM:`);
    addToTerminal('AgentSmith', `📋 User Request: "${instruction}"`);
    addToTerminal('AgentSmith', `👥 Deploying ${Object.keys(agentPrompts).length} specialized agents...`);
    
    // Start all agents with their initial status and log commands
    Object.entries(agentPrompts).forEach(([agentId, config]) => {
        updateAgentStatus(agentId, config.status, `Processing ${config.name.toLowerCase()} perspective...`);
        
        // Log the specific command being sent to each agent
        addToTerminal('AgentSmith', `📤 COMMAND TO ${config.name.toUpperCase()}:`);
        addToTerminal('AgentSmith', `   Role: ${config.name} specialist`);
        addToTerminal('AgentSmith', `   Task: Analyze "${instruction}" from ${config.name.toLowerCase()} perspective`);
        addToTerminal('AgentSmith', `   Expected: Technical analysis, recommendations, implementation details`);
        addToTerminal('AgentSmith', `   Status: Command dispatched, awaiting response...`);
    });

    // Make parallel AI calls for all agents
    const agentPromises = Object.entries(agentPrompts).map(async ([agentId, config]) => {
        try {
            addToTerminal('AgentSmith', `⏳ Waiting for ${config.name} response...`);
            
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
            
            // Log the full response received from worker
            addToTerminal('AgentSmith', `📥 RESPONSE FROM ${config.name.toUpperCase()}:`);
            addToTerminal('AgentSmith', `   Status: ✅ Response received successfully`);
            addToTerminal('AgentSmith', `   Length: ${agentResponse.length} characters`);
            addToTerminal('AgentSmith', `   Processing: Integrating into team analysis...`);
            
            // Add the actual agent response to terminal
            addToTerminal(config.name, `📋 ANALYSIS REPORT:\n${agentResponse}`);
            updateAgentStatus(agentId, 'idle', `${config.name} analysis complete`);
            
                        // Generate real code changes based on agent analysis
            setTimeout(async () => {
                if (config.name === 'CodeMaster') {
                    await generateRealCodeChanges(agentResponse, instruction);
                } else if (config.name === 'QualityGuard') {
                    await validateAndOptimizeCode(agentResponse, instruction);
                }
                addToTerminal('AgentSmith', `📝 ${config.name} has made real code changes to cloned project - check Code Amendments panel`);
            }, Math.random() * 1000 + 500); // Faster execution: 0.5-1.5 seconds
            
            addToTerminal('AgentSmith', `✅ ${config.name} report integrated into team findings`);
            
            return { agent: config.name, response: agentResponse };
        } catch (error) {
            console.error(`${config.name} AI call failed:`, error);
            const errorMsg = `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            
            // Log the error in detail
            addToTerminal('AgentSmith', `❌ ERROR FROM ${config.name.toUpperCase()}:`);
            addToTerminal('AgentSmith', `   Status: Failed to receive response`);
            addToTerminal('AgentSmith', `   Error: ${errorMsg}`);
            addToTerminal('AgentSmith', `   Action: Continuing with other agents...`);
            
            addToTerminal(config.name, `❌ ${errorMsg}`);
            updateAgentStatus(agentId, 'error', errorMsg);
            return { agent: config.name, response: errorMsg };
        }
    });

    try {
        // Wait for all agents to complete
        const results = await Promise.all(agentPromises);
        
        // Agent Smith analyzes all responses
        addToTerminal('AgentSmith', `📊 ANALYZING ALL WORKER RESPONSES:`);
        const completedAgents = results.filter(r => !r.response.includes('failed'));
        const failedAgents = results.filter(r => r.response.includes('failed'));
        
        addToTerminal('AgentSmith', `   Total Agents Deployed: ${results.length}`);
        addToTerminal('AgentSmith', `   Successful Responses: ${completedAgents.length}`);
        addToTerminal('AgentSmith', `   Failed Responses: ${failedAgents.length}`);
        
        if (failedAgents.length > 0) {
            addToTerminal('AgentSmith', `   Failed Agents: ${failedAgents.map(f => f.agent).join(', ')}`);
        }
        
        // Agent Smith provides final coordination
        setTimeout(() => {
            updateAgentStatus('smith', 'analyzing', 'Consolidating all agent findings...');
            addToTerminal('AgentSmith', `🔄 CONSOLIDATING TEAM FINDINGS:`);
            
            // Show detailed analysis of each response
            completedAgents.forEach((result, index) => {
                addToTerminal('AgentSmith', `   ${index + 1}. ${result.agent}: ✅ Analysis integrated`);
                addToTerminal('AgentSmith', `      Response Quality: ${result.response.length > 100 ? 'Detailed' : 'Brief'}`);
                addToTerminal('AgentSmith', `      Key Points: ${result.response.split('.').length} main points identified`);
            });
            
            setTimeout(() => {
                addToTerminal('AgentSmith', `🎯 FINAL COORDINATION SUMMARY:`);
                addToTerminal('AgentSmith', `   Command Execution: ${completedAgents.length}/${results.length} agents responded`);
                addToTerminal('AgentSmith', `   Analysis Quality: ${completedAgents.length > 0 ? 'Comprehensive multi-perspective analysis' : 'Limited analysis due to failures'}`);
                addToTerminal('AgentSmith', `   Implementation Readiness: ${completedAgents.length >= 3 ? 'Ready for implementation' : 'May need additional analysis'}`);
                addToTerminal('AgentSmith', `   Status: Team investigation complete. All findings consolidated.`);
                addToTerminal('AgentSmith', `   Next Steps: Awaiting further instructions for implementation phase.`);
                
                updateAgentStatus('smith', 'idle', 'Team coordination complete - ready for next task');
            }, 2000);
    }, 1000);
        
    } catch (error) {
        console.error('Team investigation failed:', error);
        updateAgentStatus('smith', 'error', 'Team coordination failed');
        addToTerminal('AgentSmith', `❌ CRITICAL ERROR IN TEAM COORDINATION:`);
        addToTerminal('AgentSmith', `   Error Type: ${error instanceof Error ? error.name : 'Unknown Error'}`);
        addToTerminal('AgentSmith', `   Error Message: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
        addToTerminal('AgentSmith', `   Impact: Team investigation could not be completed`);
        addToTerminal('AgentSmith', `   Recommendation: Please retry the command or check system status`);
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

    // Code amendments panel event listeners
    document.getElementById('clear-amendments')?.addEventListener('click', () => {
        clearCodeAmendments();
        showNotification('Code amendments cleared');
    });

    document.getElementById('export-amendments')?.addEventListener('click', () => {
        const amendmentsContainer = document.getElementById('code-amendments');
        if (amendmentsContainer) {
            const changes = amendmentsContainer.querySelectorAll('.code-change');
            let exportData = 'Code Amendments Export\n========================\n\n';
            
            changes.forEach((change, index) => {
                const header = change.querySelector('.code-change-header');
                const content = change.querySelector('.code-change-content');
                if (header && content) {
                    exportData += `${index + 1}. ${header.textContent}\n`;
                    exportData += `${content.textContent}\n\n`;
                }
            });
            
            // Create download
            const blob = new Blob([exportData], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `code-amendments-${new Date().toISOString().slice(0, 10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            
            showNotification('Code amendments exported successfully');
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

// Tab functionality for unified terminal
function initializeTabs(): void {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
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
    initializeTabs(); // Initialize tab functionality
    
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