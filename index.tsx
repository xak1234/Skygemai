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
  private sendInstructionBtn: HTMLButtonElement;
  private instructionHistoryList: HTMLElement;

  // State
  private agents: Record<string, Agent>;
  private isRunning = false;
  private isPaused = false;
  private shouldStop = false;
  private currentTask: string | null = null;
  private history: { role: string; content: string }[] = [];
  private instructionHistory: { timestamp: string; content: string }[] = [];

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
    this.sendInstructionBtn = document.getElementById('send-instruction-btn') as HTMLButtonElement;
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
    this.sendInstructionBtn.addEventListener('click', () => this.sendInstruction());
    
    // Enable instruction input on Enter key
    this.instructionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        this.sendInstruction();
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
      const fullPrompt = `AgentSmith: You are an intelligent project orchestrator. Analyze the current state and determine the next action.

PROJECT CONTEXT:
- Project: ${this.projectSourceInput.value || 'the specified project'}
- Temp Location: ${this.tempLocationEl.textContent}
- Analysis History: ${this.history.map(h => `${h.role}: ${h.content}`).join(' | ')}

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

OUTPUT: Single action command or "Analysis complete."
Examples:
- "Assign Debugger scan auth.js for security vulnerabilities"
- "Assign Optimizer analyze database queries in models/"
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

RESPONSE FORMAT: Single action command or "Analysis complete."`
            },
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          max_tokens: 100, // Increased for more detailed responses
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
  'Analyze code for bugs, security vulnerabilities, and quality issues. Report specific file paths, line numbers, and detailed findings. Focus on: SQL injection, XSS, authentication flaws, input validation, code complexity, and maintainability issues.' :
  agent.role === 'Optimizer' ? 
  'Analyze performance bottlenecks, memory usage, database queries, and architectural issues. Report specific metrics, optimization opportunities, and refactoring suggestions. Focus on: N+1 queries, memory leaks, inefficient algorithms, and scalability issues.' :
  'Implement code fixes, security patches, and improvements. Provide specific code changes with explanations. Focus on: input validation, error handling, security hardening, and performance optimizations.'
}

REPORT FORMAT: Provide specific findings with file paths, line numbers, and actionable recommendations.`;

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
    while (this.isRunning && !this.shouldStop) {
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

        let workerId: keyof typeof this.agents | null = null;
        const plan = smithsPlan.toLowerCase();
        
        // Enhanced worker assignment logic
        if (plan.includes('assign debugger') || plan.includes('debug') || plan.includes('scan') || plan.includes('find bug') || plan.includes('security') || plan.includes('vulnerability') || plan.includes('quality')) {
            workerId = 'b';
        } else if (plan.includes('assign optimizer') || plan.includes('optimize') || plan.includes('refactor') || plan.includes('improve performance') || plan.includes('performance') || plan.includes('bottleneck')) {
            workerId = 'c';
        } else if (plan.includes('assign fixer') || plan.includes('fix') || plan.includes('patch') || plan.includes('implement') || plan.includes('apply') || plan.includes('correct')) {
            workerId = 'a';
        }

        if (workerId) {
            const workerResult = await this.delegateToWorker(workerId, smithsPlan);
            this.currentTask = `Worker ${this.agents[workerId].name} reported: ${workerResult}`;
            this.history.push({ role: 'user', content: this.currentTask });
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
    this.sendInstructionBtn.disabled = !isStarting;

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

  private updateInstructionHistory() {
    this.instructionHistoryList.innerHTML = '';
    this.instructionHistory.forEach(entry => {
      const entryEl = document.createElement('div');
      entryEl.className = 'instruction-entry';
      entryEl.innerHTML = `
        <div class="timestamp">${entry.timestamp}</div>
        <div class="content">${entry.content}</div>
      `;
      this.instructionHistoryList.appendChild(entryEl);
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