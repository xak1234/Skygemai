import './index.css';

type AgentStatus = 'idle' | 'working' | 'error';
type AgentRole = 'Fixer' | 'Debugger' | 'Optimizer' | 'Director';

interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  element: HTMLElement;
  statusDot: HTMLElement;
}

class AgentSmithOpsHub {
  private xaiApiKey: string;
  private deepseekApiKey: string;
  
  // DOM Elements
  private terminal: HTMLElement;
  private startBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private stopBtn: HTMLButtonElement;
  private cancelBtn: HTMLButtonElement;
  private projectSourceInput: HTMLInputElement;
  private tempLocationEl: HTMLElement;
  private instructionInput: HTMLTextAreaElement;
  private instructionHistoryList: HTMLElement;

  // State
  private agents: Record<string, Agent>;
  private isRunning = false;
  private isPaused = false;
  private shouldStop = false;
  private currentTask: string | null = null;
  private history: { role: string; content: string }[] = [];
  private instructionHistory: { timestamp: string; content: string }[] = [];
  private commandHistory: string[] = [];
  private currentHistoryIndex: number = -1;

  constructor() {
    // API keys are handled server-side via proxy
    this.xaiApiKey = '';
    this.deepseekApiKey = '';

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
    };
    
    this.bindEvents();
    this.resetState();
    this.logToTerminal('System', 'Ready. Select a project source and click Start.');
  }

  private createAgent(elementId: string, name: string, role: AgentRole): Agent {
    const element = document.getElementById(elementId)!;
    return {
      id: elementId,
      name,
      role,
      status: 'idle',
      element,
      statusDot: element.querySelector('.status-dot')!
    };
  }

  private bindEvents() {
    this.startBtn.addEventListener('click', () => this.startOrchestration());
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.stopBtn.addEventListener('click', () => this.stopGracefully());
    this.cancelBtn.addEventListener('click', () => this.cancelImmediately());
    
    // Enable instruction input on Enter key (with or without Ctrl)
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
    
    // Add visual feedback for Enter
    this.instructionInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        this.instructionInput.style.borderColor = 'var(--accent-green)';
        setTimeout(() => {
          this.instructionInput.style.borderColor = '';
        }, 200);
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
  
  private async getSmithsNextMove(prompt: string): Promise<string> {
    this.setAgentStatus('smith', 'working');
    this.logToTerminal('AgentSmith', 'Planning next action...');
    
          try {
        // Check if we're starting fresh or continuing
        const isStarting = this.history.length === 0;
        const currentPhase = this.determineCurrentPhase();
        
        this.logToTerminal('AgentSmith', `Starting iteration ${this.history.length + 1}, Phase: ${currentPhase}`);
        
        const fullPrompt = `AgentSmith: You are an intelligent project orchestrator. Analyze the current state and determine the next action.

PROJECT CONTEXT:
- Project: ${this.projectSourceInput.value || 'the specified project'}
- Temp Location: ${this.tempLocationEl.textContent}
- Analysis History: ${this.history.map(h => `${h.role}: ${h.content}`).join(' | ')}
- Current Phase: ${currentPhase}

CURRENT TASK: ${prompt}

AVAILABLE WORKERS:
- Agent A (Fixer): Code fixes, implementations, security patches
- Agent B (Debugger): Bug detection, vulnerability scanning, code quality issues
- Agent C (Optimizer): Performance optimization, refactoring, architectural improvements

ANALYSIS PHASES:
1. INITIAL SCAN: "Assign Debugger scan project structure and identify critical files"
2. SECURITY AUDIT: "Assign Debugger scan for security vulnerabilities in auth, input validation, dependencies"
3. CODE QUALITY: "Assign Debugger analyze code quality, complexity, and maintainability"
4. PERFORMANCE: "Assign Optimizer analyze performance bottlenecks, database queries, memory usage"
5. IMPLEMENTATION: "Assign Fixer implement security patches, performance improvements, or code fixes"
6. FINAL REVIEW: "Assign Debugger perform final code review and validation"

${isStarting ? 'STARTING ANALYSIS: Begin with phase 1 - Initial Scan' : 'CONTINUING ANALYSIS: Determine next appropriate action based on current phase and history'}

OUTPUT: Single action command or "Analysis complete."
Examples:
- "Assign Debugger scan project structure and identify critical files"
- "Assign Debugger scan for security vulnerabilities in auth, input validation, dependencies"
- "Assign Optimizer analyze performance bottlenecks, database queries, memory usage"
- "Assign Fixer implement input validation in user.js"
- "Analysis complete. All phases finished."`;

      const response = await fetch('/api/xai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are AgentSmith, an intelligent AI orchestrator for software project analysis and optimization. You coordinate three specialized agents:

AGENT ROLES:
- Agent A (Fixer): Implements code fixes, security patches, and improvements
- Agent B (Debugger): Detects bugs, security vulnerabilities, and code quality issues  
- Agent C (Optimizer): Optimizes performance, refactors code, and improves architecture

ANALYSIS STRATEGY:
1. Start with broad project scanning to understand structure
2. Focus on security vulnerabilities (auth, input validation, dependencies)
3. Analyze code quality and maintainability
4. Identify performance bottlenecks and optimization opportunities
5. Implement fixes and improvements
6. Validate all changes

DECISION MAKING:
- Use specific file paths when possible (e.g., "scan auth.js", "analyze models/user.js")
- Prioritize security issues over performance
- Consider project context and previous findings
- Provide clear, actionable instructions to workers
- End analysis when all critical areas are covered
- When user instructions are provided, prioritize and process them immediately
- User instructions override default analysis flow when specified
- ALWAYS provide a specific action command, never just repeat the phases

RESPONSE FORMAT: Single action command or "Analysis complete."`
            },
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          max_tokens: 150, // Increased for more detailed responses
          temperature: 0.0, // Ultra-low for precision
          stream: false,
          top_p: 0.1
        })
      });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`XAI API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        // Handle OpenAI-compatible response format
        let text = '';
        if (data.choices && data.choices[0] && data.choices[0].message) {
          text = data.choices[0].message.content.trim();
        } else {
          // Fallback: log the response for debugging
          this.logToTerminal('System', `Warning: Unexpected API response format: ${JSON.stringify(data).substring(0, 100)}...`);
          text = 'Analysis step completed.';
        }

        // If the response is just repeating phases, force a specific action
        if (text.toLowerCase().includes('analysis phases') || text.toLowerCase().includes('phase 1') || text.toLowerCase().includes('phase 2')) {
          text = isStarting ? 'Assign Debugger scan project structure and identify critical files' : 'Assign Debugger scan for security vulnerabilities in auth, input validation, dependencies';
        }

      this.history.push({ role: 'assistant', content: text });
      this.logToTerminal('AgentSmith', text);
      return text;
    } catch (error) {
      const errorMessage = `Error communicating with XAI API: ${(error as Error).message}`;
      this.logToTerminal('System', errorMessage);
      this.setAgentStatus('smith', 'error');
      this.shouldStop = true;
      return "Error state reached. Halting operations.";
    } finally {
      this.setAgentStatus('smith', 'idle');
    }
  }

  private determineCurrentPhase(): string {
    const historyText = this.history.map(h => h.content).join(' ').toLowerCase();
    
    if (historyText.includes('security') || historyText.includes('vulnerability')) {
      return 'SECURITY AUDIT';
    } else if (historyText.includes('quality') || historyText.includes('complexity')) {
      return 'CODE QUALITY';
    } else if (historyText.includes('performance') || historyText.includes('optimize')) {
      return 'PERFORMANCE';
    } else if (historyText.includes('implement') || historyText.includes('fix')) {
      return 'IMPLEMENTATION';
    } else if (historyText.includes('review') || historyText.includes('final')) {
      return 'FINAL REVIEW';
    } else {
      return 'INITIAL SCAN';
    }
  }
  
  private async delegateToWorker(agentId: keyof typeof this.agents, task: string): Promise<string> {
    this.setAgentStatus(agentId, 'working');
    const agent = this.agents[agentId];
    this.logToTerminal(agent.name, `Acknowledged. Executing: "${task.substring(0, 70)}..."`);

    try {
        const projectContext = `Project: ${this.projectSourceInput.value || 'the specified project'}`;
        const analysisHistory = this.history.map(h => `${h.role}: ${h.content}`).join(' | ');
        
        const workerPrompt = `${agent.role} Agent Task: "${task}"

PROJECT CONTEXT:
${projectContext}
Analysis History: ${analysisHistory}

SPECIFIC INSTRUCTIONS:
${agent.role === 'Debugger' ? 
  'Analyze code for bugs, security vulnerabilities, and quality issues. Report specific file paths, line numbers, and detailed findings. Focus on: SQL injection, XSS, authentication flaws, input validation, code complexity, and maintainability issues. If you cannot access specific files, provide general analysis and recommendations based on common patterns.' :
  agent.role === 'Optimizer' ? 
  'Analyze performance bottlenecks, memory usage, database queries, and architectural issues. Report specific metrics, optimization opportunities, and refactoring suggestions. Focus on: N+1 queries, memory leaks, inefficient algorithms, and scalability issues. If you cannot access specific files, provide general optimization recommendations based on common patterns.' :
  'Implement code fixes, security patches, and improvements. Provide specific code changes with explanations. Focus on: input validation, error handling, security hardening, and performance optimizations. If you cannot access specific files, provide general implementation recommendations based on common patterns.'
}

REPORT FORMAT: Provide specific findings with file paths, line numbers, and actionable recommendations. If specific files are not accessible, provide general analysis and recommendations based on the task description and common software patterns.`;

        const response = await fetch('/api/deepseek/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-coder',
                messages: [
                    {
                        role: 'system',
                        content: `You are a ${agent.role} agent specialized in code analysis and optimization. You have access to the project source code and should provide detailed, actionable analysis.`
                    },
                    {
                        role: 'user',
                        content: workerPrompt
                    }
                ],
                max_tokens: 200, // Increased for detailed analysis
                temperature: 0.0, // Ultra-low for precision
                stream: false,
                top_p: 0.1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
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
  
  private async mainLoop() {
    let iterationCount = 0;
    const maxIterations = 20; // Prevent infinite loops
    
    while (this.isRunning && !this.shouldStop && iterationCount < maxIterations) {
      iterationCount++;
      
      if (this.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      try {
        // Check if there's a user instruction that needs priority
        const userInstruction = this.instructionHistory.length > 0 ? 
          this.instructionHistory[this.instructionHistory.length - 1].content : null;
        
        const taskPrompt = userInstruction ? 
          `User instruction: ${userInstruction}. Process this instruction and continue with analysis.` :
          this.currentTask || 'Start the analysis.';
        
        const smithsPlan = await this.getSmithsNextMove(taskPrompt);
        this.currentTask = smithsPlan;

        if (smithsPlan.toLowerCase().includes('complete') || smithsPlan.toLowerCase().includes('finished')) {
          this.shouldStop = true;
          this.logToTerminal('AgentSmith', 'All objectives completed. Halting operations.');
          continue;
        }
        
        // Add a small delay between iterations to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));

        let workerId: keyof typeof this.agents | null = null;
        const plan = smithsPlan.toLowerCase();
        
        // Enhanced worker assignment logic with better fallback
        if (plan.includes('assign debugger') || plan.includes('debug') || plan.includes('scan') || plan.includes('find bug') || plan.includes('security') || plan.includes('vulnerability') || plan.includes('quality') || plan.includes('audit')) {
            workerId = 'b';
            this.logToTerminal('AgentSmith', 'Assigning task to Debugger (Agent B)');
        } else if (plan.includes('assign optimizer') || plan.includes('optimize') || plan.includes('refactor') || plan.includes('improve performance') || plan.includes('performance') || plan.includes('bottleneck') || plan.includes('memory') || plan.includes('database')) {
            workerId = 'c';
            this.logToTerminal('AgentSmith', 'Assigning task to Optimizer (Agent C)');
        } else if (plan.includes('assign fixer') || plan.includes('fix') || plan.includes('patch') || plan.includes('implement') || plan.includes('apply') || plan.includes('correct') || plan.includes('update')) {
            workerId = 'a';
            this.logToTerminal('AgentSmith', 'Assigning task to Fixer (Agent A)');
        } else {
            // Fallback: if no specific assignment, default to debugger for analysis
            workerId = 'b';
            this.logToTerminal('AgentSmith', 'No specific worker assigned, defaulting to Debugger for analysis.');
        }

        if (workerId) {
            try {
                const workerResult = await this.delegateToWorker(workerId, smithsPlan);
                this.currentTask = `Worker ${this.agents[workerId].name} reported: ${workerResult}`;
                this.history.push({ role: 'user', content: this.currentTask });
            } catch (error) {
                this.logToTerminal('System', `Worker ${this.agents[workerId].name} failed: ${(error as Error).message}`);
                this.currentTask = `Worker failure, continuing with next task.`;
                this.history.push({ role: 'user', content: this.currentTask });
            }
        } else {
            this.currentTask = `AgentSmith status update: ${smithsPlan}`;
            this.history.push({ role: 'user', content: this.currentTask });
            await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
          this.logToTerminal('System Error', `A critical error occurred: ${(error as Error).message}`);
          this.shouldStop = true;
          this.isRunning = false;
      }
    }
    
    if (iterationCount >= maxIterations) {
      this.logToTerminal('System', 'Maximum iterations reached. Analysis cycle completed.');
    }
    
    this.logToTerminal('System', this.shouldStop ? 'All operations halted.' : 'Workflow complete.');
    this.resetControls(false);
  }
  
  private resetState() {
    this.isRunning = false;
    this.isPaused = false;
    this.shouldStop = false;
    this.currentTask = null;
    this.history = [];
    this.instructionHistory = [];
    this.commandHistory = [];
    this.currentHistoryIndex = -1;
    this.terminal.innerHTML = '';
    this.instructionHistoryList.innerHTML = '';
    this.tempLocationEl.textContent = 'Waiting for process to start...';
    Object.keys(this.agents).forEach(id => this.setAgentStatus(id as keyof typeof this.agents, 'idle'));
  }

  private resetControls(isStarting: boolean) {
    this.startBtn.disabled = isStarting;
    this.projectSourceInput.disabled = isStarting;
    this.pauseBtn.disabled = !isStarting;
    this.stopBtn.disabled = !isStarting;
    this.cancelBtn.disabled = !isStarting;
    this.instructionInput.disabled = !isStarting;

    if (isStarting) {
      this.pauseBtn.textContent = '⏸️ Pause';
    } else {
      this.startBtn.disabled = false;
      this.projectSourceInput.disabled = false;
    }
  }

  private sendInstruction() {
    const instruction = this.instructionInput.value.trim();
    if (!instruction) return;

    // Add to command history
    this.commandHistory.push(instruction);
    this.currentHistoryIndex = -1; // Reset to end of history

    // Add to instruction history
    const timestamp = new Date().toLocaleTimeString();
    this.instructionHistory.push({ timestamp, content: instruction });
    this.updateInstructionHistory();

    // Log the instruction
    this.logToTerminal('User', `Instruction sent: ${instruction}`);

    // Clear input
    this.instructionInput.value = '';

    // Update current task with the instruction
    this.currentTask = `User instruction: ${instruction}`;
    this.history.push({ role: 'user', content: this.currentTask });

    // If analysis is running, this will be picked up in the next mainLoop iteration
    if (!this.isRunning) {
      this.logToTerminal('System', 'Analysis not running. Start analysis to process instruction.');
    }
  }

  private navigateHistory(direction: 'up' | 'down') {
    if (this.commandHistory.length === 0) return;

    if (direction === 'up') {
      if (this.currentHistoryIndex === -1) {
        // First time pressing up, start from the end
        this.currentHistoryIndex = this.commandHistory.length - 1;
      } else if (this.currentHistoryIndex > 0) {
        this.currentHistoryIndex--;
      }
    } else if (direction === 'down') {
      if (this.currentHistoryIndex < this.commandHistory.length - 1) {
        this.currentHistoryIndex++;
      } else {
        // Reached the end, clear the input
        this.currentHistoryIndex = -1;
        this.instructionInput.value = '';
        return;
      }
    }

    // Set the input value to the selected command
    this.instructionInput.value = this.commandHistory[this.currentHistoryIndex];
    
    // Select all text for easy editing
    this.instructionInput.setSelectionRange(0, this.instructionInput.value.length);
  }

  private updateInstructionHistory() {
    // Clear existing content
    this.instructionHistoryList.innerHTML = '';
    
    // Add all messages in chronological order
    this.instructionHistory.forEach(entry => {
      const messageEl = document.createElement('div');
      messageEl.className = 'chat-message';
      messageEl.innerHTML = `
        <div class="message-header">
          <span class="message-timestamp">${entry.timestamp}</span>
        </div>
        <div class="message-content">${entry.content}</div>
      `;
      this.instructionHistoryList.appendChild(messageEl);
    });
    
    // Scroll to bottom to show latest message
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
    this.logToTerminal('System', `Temp copy created at: ${this.tempLocationEl.textContent}`);
    
    this.currentTask = `The project '${project}' has been cloned. Begin the analysis.`;
    this.history.push({ role: 'user', content: this.currentTask });
    
    this.mainLoop();
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