import './index.css';

// =================================================================================
// TYPE DEFINITIONS
// =================================================================================

type AgentStatus = 'idle' | 'working' | 'error';
type AgentRole = 'Fixer' | 'Debugger' | 'Optimizer' | 'CodeManiac' | 'Director';

interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  element: HTMLElement;
  statusDot: HTMLElement;
}

interface Task {
  id: string;
  description: string;
  completed: boolean;
  agent?: string;
}

// =================================================================================
// MAIN ORCHESTRATION CLASS
// =================================================================================

class AgentSmithOpsHub {
  private terminal: HTMLElement;
  private startBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private stopBtn: HTMLButtonElement;
  private cancelBtn: HTMLButtonElement;
  private projectSourceInput: HTMLInputElement;
  private tempLocationEl: HTMLElement;
  private instructionInput: HTMLTextAreaElement;
  private instructionHistoryList: HTMLElement;
  private agents: Record<string, Agent>;

  private isRunning = false;
  private isPaused = false;
  private shouldStop = false;
  
  private currentTask: string | null = null;
  private history: { role: string; content: string }[] = [];
  private instructionHistory: { timestamp: string; content: string }[] = [];
  private commandHistory: string[] = [];
  private currentHistoryIndex: number = -1;
  
  private projectFiles: Map<string, string> = new Map();
  private projectStructure: string[] = [];
  private taskList: Task[] = [];
  private currentTaskId: number = 0;

  constructor() {
    // Bind UI Elements from your original HTML structure
    this.terminal = document.getElementById('terminal')!;
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
    this.stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
    this.cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
    this.projectSourceInput = document.getElementById('project-source') as HTMLInputElement;
    this.tempLocationEl = document.getElementById('temp-location')!;
    this.instructionInput = document.getElementById('instruction-input') as HTMLTextAreaElement;
    this.instructionHistoryList = document.getElementById('instruction-history-list')!;

    this.agents = {
      smith: this.createAgent('agent-smith', '🧠 AgentSmith', 'Director'),
      a: this.createAgent('agent-a', '🛠️ Agent A (Fixer)', 'Fixer'),
      b: this.createAgent('agent-b', '🕵️ Agent B (Debugger)', 'Debugger'),
      c: this.createAgent('agent-c', '🚀 Agent C (Optimizer)', 'Optimizer'),
      d: this.createAgent('agent-d', '🤖 Agent D (CodeManiac)', 'CodeManiac'),
    };
    
    this.bindEvents();
    this.resetState();
    this.logToTerminal('System', 'Ready. Select a project source and click Start.');
  }

  private createAgent(elementId: string, name: string, role: AgentRole): Agent {
    const element = document.getElementById(elementId)!;
    return {
      id: elementId, name, role, status: 'idle', element,
      statusDot: element.querySelector('.status-dot')!
    };
  }

  private bindEvents() {
    this.startBtn.addEventListener('click', () => this.startOrchestration());
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.stopBtn.addEventListener('click', () => this.stopGracefully());
    this.cancelBtn.addEventListener('click', () => this.cancelImmediately()); // Restored cancel button functionality
    
    this.instructionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendInstruction();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory('down');
      }
    });
  }

  private setAgentStatus(agentId: keyof typeof this.agents, status: AgentStatus) {
    const agent = this.agents[agentId];
    if (agent) {
      agent.status = status;
      agent.statusDot.className = `status-dot ${status}`;
      agent.statusDot.setAttribute('aria-label', status);
    }
  }

  private logToTerminal(sender: string, message: string) {
    // This function is preserved from your original code to maintain logging style
    let type = 'system';
    if (sender.includes('AgentSmith')) type = 'smith';
    else if (sender.startsWith('Agent')) type = 'worker';
    else if (sender.toLowerCase().includes('error')) type = 'error';

    const logLine = document.createElement('div');
    logLine.className = 'log-entry';
    const senderEl = document.createElement('strong');
    senderEl.textContent = `[${sender}]`;
    logLine.appendChild(senderEl);
    const messageEl = document.createElement('span');
    messageEl.textContent = `: ${message}`;
    messageEl.className = `log-${type}`;
    logLine.appendChild(messageEl);
    this.terminal.appendChild(logLine);
    this.terminal.scrollTop = this.terminal.scrollHeight;
  }
  
  /**
   * This is the Director's logic. It's now a simplified planner that uses an LLM
   * to decide the next step, rather than complex hardcoded rules.
   * This function now calls your existing backend for decisions.
   */
  private async getSmithsNextMove(prompt: string): Promise<string> {
    this.setAgentStatus('smith', 'working');
    this.logToTerminal('AgentSmith', 'Planning next action...');
    
    try {
      // This prompt is designed to be more robust for an LLM to decide the next step.
      const planningPrompt = `
        You are AgentSmith, a director of AI agents. Your goal is to analyze a codebase.
        The user's overall instruction is: "${this.instructionInput.value || 'Analyze the project.'}"
        
        Analysis History (what has been done so far):
        ${this.history.map(h => `${h.role}: ${h.content}`).join('\n') || 'No actions taken yet.'}

        Available Agents:
        - Debugger: Finds bugs, security vulnerabilities.
        - Optimizer: Finds performance bottlenecks.
        - Fixer: Implements fixes and patches.
        - CodeManiac: Provides creative, innovative solutions.

        Based on the history, what is the single most logical next step?
        Respond with a concise instruction for the next agent, like "Assign Debugger to scan for security flaws in auth.js" or "Assign Optimizer to check for N+1 queries in api.js".
        If the analysis seems complete, respond with "Analysis complete. All phases finished.".
      `;

      // **IMPORTANT**: This now calls your backend. I've assumed the endpoint is '/api/xai/chat/completions'
      // as that was in my previous suggestion. If your director model is at a different endpoint, change it here.
      // If you do NOT have a director model, this will fail.
      const response = await fetch('/api/xai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4-turbo', // Or any powerful model you use for planning
          messages: [{ role: 'user', content: planningPrompt }],
          max_tokens: 100,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`Director API error (${response.status}): ${await response.text()}`);
      }
      
      const data = await response.json();
      const nextAction = data.choices[0].message.content.trim();

      this.history.push({ role: 'assistant', content: nextAction });
      this.logToTerminal('AgentSmith', nextAction);
      return nextAction;

    } catch (error) {
      const errorMessage = `Error communicating with Director API: ${(error as Error).message}. Halting operations.`;
      this.logToTerminal('System', errorMessage);
      this.setAgentStatus('smith', 'error');
      this.shouldStop = true;
      return "Error state reached. Halting operations.";
    } finally {
      this.setAgentStatus('smith', 'idle');
    }
  }
  
  private async delegateToWorker(agentId: keyof typeof this.agents, task: string): Promise<string> {
    this.setAgentStatus(agentId, 'working');
    const agent = this.agents[agentId];
    this.logToTerminal(agent.name, `Acknowledged. Executing: "${task.substring(0, 70)}..."`);

    try {
        const fileContent = this.formatFileContent(this.projectStructure); // Provide all files for context
        
        const workerPrompt = `
          You are a ${agent.role} Agent.
          Your task is: "${task}"

          Here is the full project context. Base your analysis on these files:
          ${fileContent}

          Provide a concise report with your findings or the changes you implemented.
        `;

        // This uses your existing deepseek endpoint.
        const response = await fetch('/api/deepseek/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                model: 'deepseek-coder',
                messages: [{ role: 'user', content: workerPrompt }],
                max_tokens: 800,
                temperature: agent.role === 'CodeManiac' ? 0.7 : 0.0,
            })
        });

        if (!response.ok) {
            throw new Error(`DeepSeek API error (${response.status}): ${await response.text()}`);
        }

        const data = await response.json();
        const result = data.choices[0].message.content?.trim() || 'Task completed successfully.';
        
        this.logToTerminal(agent.name, result);
        this.setAgentStatus(agentId, 'idle');
        return result;
    } catch (error) {
        const errorMessage = `Worker agent ${agent.name} failed: ${(error as Error).message}`;
        this.logToTerminal('System', errorMessage);
        this.setAgentStatus(agentId, 'error');
        throw new Error(errorMessage);
    }
  }

  private formatFileContent(filePaths: string[]): string {
    return filePaths.map(filePath => {
        const fileContent = this.projectFiles.get(filePath) || '// File content not found';
        return `--- FILE: ${filePath} ---\n${fileContent}\n--- END FILE ---\n`;
    }).join('\n');
  }
  
  private async mainLoop() {
    let iterationCount = 0;
    const maxIterations = 20;
    
    while (this.isRunning && !this.shouldStop && iterationCount < maxIterations) {
      iterationCount++;
      
      if (this.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      try {
        const smithsPlan = await this.getSmithsNextMove(this.currentTask || 'Start the analysis.');
        this.currentTask = smithsPlan;

        if (smithsPlan.toLowerCase().includes('complete') || smithsPlan.toLowerCase().includes('finished')) {
          this.shouldStop = true;
          this.logToTerminal('AgentSmith', 'All objectives completed. Halting operations.');
          continue;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));

        const plan = smithsPlan.toLowerCase();
        let workerId: keyof typeof this.agents | null = null;

        // Simple keyword-based assignment from the Director's plan
        if (plan.includes('debugger')) workerId = 'b';
        else if (plan.includes('optimizer')) workerId = 'c';
        else if (plan.includes('fixer')) workerId = 'a';
        else if (plan.includes('codemaniac')) workerId = 'd';
        
        if (workerId) {
            const result = await this.delegateToWorker(workerId, smithsPlan);
            this.currentTask = `Worker ${this.agents[workerId].name} reported: ${result}`;
            this.history.push({ role: 'user', content: this.currentTask });
        } else {
            this.logToTerminal('AgentSmith', 'No specific agent assigned in the plan. Re-evaluating on next loop.');
            this.currentTask = `AgentSmith status update: ${smithsPlan}`;
            this.history.push({ role: 'user', content: this.currentTask });
            await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
          this.logToTerminal('System Error', `A critical error occurred: ${(error as Error).message}`);
          this.shouldStop = true;
      }
    }
    
    this.logToTerminal('System', this.shouldStop ? 'All operations halted.' : 'Workflow complete.');
    this.resetControls(false);
  }
  
  // =================================================================================
  // All functions below this line are restored from your original file for compatibility
  // =================================================================================

  private resetState() {
    this.isRunning = false;
    this.isPaused = false;
    this.shouldStop = false;
    this.currentTask = null;
    this.history = [];
    this.instructionHistory = [];
    this.commandHistory = [];
    this.currentHistoryIndex = -1;
    this.projectFiles.clear();
    this.projectStructure = [];
    this.terminal.innerHTML = '';
    this.instructionHistoryList.innerHTML = '';
    this.tempLocationEl.textContent = 'N/A - No Active Process';
    this.taskList = [];
    this.currentTaskId = 0;
    Object.keys(this.agents).forEach(id => this.setAgentStatus(id as keyof typeof this.agents, 'idle'));
  }

  private resetControls(isStarting: boolean) {
    this.startBtn.disabled = isStarting;
    this.projectSourceInput.disabled = isStarting;
    this.pauseBtn.disabled = !isStarting;
    this.stopBtn.disabled = !isStarting;
    this.cancelBtn.disabled = !isStarting;
    this.instructionInput.disabled = !isStarting;
    if (isStarting) this.pauseBtn.textContent = '⏸️ Pause';
  }

  private sendInstruction() {
    const instruction = this.instructionInput.value.trim();
    if (!instruction) return;
    this.commandHistory.push(instruction);
    this.currentHistoryIndex = -1;
    const timestamp = new Date().toLocaleTimeString();
    this.instructionHistory.push({ timestamp, content: instruction });
    this.updateInstructionHistory();
    this.logToTerminal('User', `Instruction sent: ${instruction}`);
    this.instructionInput.value = '';
    this.currentTask = `User instruction: ${instruction}`;
    this.history.push({ role: 'user', content: this.currentTask });
  }

  private navigateHistory(direction: 'up' | 'down') {
    if (this.commandHistory.length === 0) return;
    if (direction === 'up') {
      if (this.currentHistoryIndex === -1) this.currentHistoryIndex = this.commandHistory.length - 1;
      else if (this.currentHistoryIndex > 0) this.currentHistoryIndex--;
    } else {
      if (this.currentHistoryIndex < this.commandHistory.length - 1) this.currentHistoryIndex++;
      else {
        this.currentHistoryIndex = -1;
        this.instructionInput.value = '';
        return;
      }
    }
    this.instructionInput.value = this.commandHistory[this.currentHistoryIndex];
  }

  private updateInstructionHistory() {
    this.instructionHistoryList.innerHTML = '';
    this.instructionHistory.forEach(entry => {
      const messageEl = document.createElement('div');
      messageEl.className = 'chat-message';
      messageEl.innerHTML = `<div class="message-header"><span class="message-timestamp">${entry.timestamp}</span></div><div class="message-content">${entry.content}</div>`;
      this.instructionHistoryList.appendChild(messageEl);
    });
    this.instructionHistoryList.scrollTop = this.instructionHistoryList.scrollHeight;
  }

  public async startOrchestration() {
    if (this.isRunning) return;
    this.resetState();
    this.isRunning = true;
    this.resetControls(true);
    const project = this.projectSourceInput.value || 'the specified project';
    this.logToTerminal('System', `Cloning source: ${project}...`);
    const cloneId = (Math.random() + 1).toString(36).substring(7);
    this.tempLocationEl.textContent = `/tmp/project-clone-${cloneId}`;
    await this.loadProjectFiles(project);
    this.currentTask = `The project '${project}' has been cloned. The user instruction is: "${this.instructionInput.value || 'Begin the analysis.'}".`;
    this.history.push({ role: 'user', content: this.currentTask });
    this.mainLoop();
  }

  private async loadProjectFiles(projectName: string): Promise<void> {
    this.logToTerminal('System', 'Loading project files for analysis...');
    const commonFiles = ['package.json', 'server.js', 'auth.js', 'models/user.js', 'routes/api.js', 'README.md'];
    for (const filePath of commonFiles) {
      const content = this.generateSampleContent(filePath, projectName);
      this.projectFiles.set(filePath, content);
      this.projectStructure.push(filePath);
    }
    this.logToTerminal('System', `Loaded ${this.projectStructure.length} files for analysis`);
  }

  private generateSampleContent(filePath: string, projectName: string): string {
    // This function is preserved from your original code
    if (filePath.includes('package.json')) return `{ "name": "${projectName}", "dependencies": { "express": "4.18.0" } }`;
    if (filePath.includes('server.js')) return `const express = require('express');\nconst app = express();\napp.listen(3000);`;
    if (filePath.includes('auth.js')) return `// VULNERABILITY: SQL injection possible here`;
    return `# ${projectName}\nSample project for analysis.`;
  }

  public togglePause() {
    if (!this.isRunning) return;
    this.isPaused = !this.isPaused;
    this.pauseBtn.textContent = this.isPaused ? '▶️ Resume' : '⏸️ Pause';
    this.logToTerminal('System', this.isPaused ? 'Workflow paused.' : 'Workflow resumed.');
  }

  public stopGracefully() {
    if (!this.isRunning) return;
    this.shouldStop = true;
    this.logToTerminal('System', 'Stopping... waiting for current task to complete.');
    this.pauseBtn.disabled = true;
    this.stopBtn.disabled = true;
  }

  public cancelImmediately() {
    if (!this.isRunning) return;
    this.shouldStop = true;
    this.isRunning = false;
    this.logToTerminal('System', 'Cancelling all operations immediately.');
    this.resetControls(false);
    this.resetState();
    this.tempLocationEl.textContent = 'N/A - Process Canceled';
    this.logToTerminal('System', 'Operation cancelled. Temp clone cleared. Ready for new task.');
  }
}

new AgentSmithOpsHub();
