import './index.css';

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

class AgentSmithOpsHub {
  private xaiApiKey: string;
  private deepseekApiKey: string;
  private tempLocationEl: HTMLElement;
  private terminal: HTMLElement;
  private startBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private stopBtn: HTMLButtonElement;
  private cancelBtn: HTMLButtonElement;
  private projectSourceInput: HTMLInputElement;
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
  private projectFiles: Map<string, string> = new Map(); // Store project files
  private projectStructure: string[] = []; // Store file paths

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
      d: this.createAgent('agent-d', '🤖 Agent D (CodeManiac)', 'CodeManiac'),
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
      
      // Analyze recent activity to prevent repetition
      const recentActions = this.history.slice(-5).map(h => h.role);
      const debuggerCount = recentActions.filter(role => role.includes('Debugger')).length;
      const optimizerCount = recentActions.filter(role => role.includes('Optimizer')).length;
      const fixerCount = recentActions.filter(role => role.includes('Fixer')).length;
      const codeManiacCount = recentActions.filter(role => role.includes('CodeManiac')).length;
      
      this.logToTerminal('AgentSmith', `Starting iteration ${this.history.length + 1}, Phase: ${currentPhase}`);
      this.logToTerminal('AgentSmith', `Recent activity - Debugger: ${debuggerCount}, Optimizer: ${optimizerCount}, Fixer: ${fixerCount}, CodeManiac: ${codeManiacCount}`);
      
      // Enhanced decision logic to prevent repetitive patterns
      let nextAction = '';
      
      if (isStarting) {
        nextAction = 'Assign Debugger scan project structure and identify critical files';
      } else if (currentPhase === 'FORCE_PROGRESSION') {
        // Force assignment to non-debugger agents
        if (optimizerCount === 0) {
          nextAction = 'Assign Optimizer analyze performance bottlenecks, database queries, memory usage';
        } else if (fixerCount === 0) {
          nextAction = 'Assign Fixer implement security patches and code improvements';
        } else {
          nextAction = 'Assign CodeManiac provide innovative solutions and creative refactoring';
        }
      } else if (currentPhase === 'FORCE_IMPLEMENTATION') {
        nextAction = 'Assign Fixer implement critical fixes and security improvements';
      } else if (currentPhase === 'FORCE_CREATIVE') {
        nextAction = 'Assign CodeManiac explore novel architectural patterns and creative solutions';
      } else if (debuggerCount >= 2 && optimizerCount === 0) {
        nextAction = 'Assign Optimizer analyze performance bottlenecks, database queries, memory usage';
      } else if (debuggerCount >= 1 && fixerCount === 0) {
        nextAction = 'Assign Fixer implement security patches and code improvements';
      } else if (codeManiacCount === 0 && this.history.length >= 3) {
        nextAction = 'Assign CodeManiac provide innovative solutions and creative refactoring';
      } else if (optimizerCount >= 1 && fixerCount === 0) {
        nextAction = 'Assign Fixer implement performance optimizations and code fixes';
      } else if (fixerCount >= 1 && codeManiacCount === 0) {
        nextAction = 'Assign CodeManiac explore novel architectural patterns and creative solutions';
      } else if (this.history.length >= 8) {
        nextAction = 'Analysis complete. All phases finished.';
      } else {
        // Smart rotation: prioritize agents that haven't been used recently
        const agentUsage = { debugger: debuggerCount, optimizer: optimizerCount, fixer: fixerCount, codemaniac: codeManiacCount };
        const leastUsed = Object.entries(agentUsage).sort(([,a], [,b]) => a - b)[0][0];
        
        switch (leastUsed) {
          case 'optimizer':
            nextAction = 'Assign Optimizer analyze code quality, performance, and architectural improvements';
            break;
          case 'fixer':
            nextAction = 'Assign Fixer implement critical fixes and security improvements';
            break;
          case 'codemaniac':
            nextAction = 'Assign CodeManiac provide innovative approaches and creative solutions';
            break;
          default:
            // Only use debugger if it's truly the least used
            if (debuggerCount < 2) {
              nextAction = 'Assign Debugger perform comprehensive security and quality analysis';
            } else {
              nextAction = 'Assign Optimizer analyze code quality, performance, and architectural improvements';
            }
        }
      }
      
      this.history.push({ role: 'assistant', content: nextAction });
      this.logToTerminal('AgentSmith', nextAction);
      return nextAction;
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
    const recentHistory = this.history.slice(-3).map(h => h.role).join(' ').toLowerCase();
    
    // Check for specific patterns in recent history to avoid getting stuck
    const hasRecentDebugger = recentHistory.includes('debugger');
    const hasRecentOptimizer = recentHistory.includes('optimizer');
    const hasRecentFixer = recentHistory.includes('fixer');
    const hasRecentCodeManiac = recentHistory.includes('codemaniac');
    
    // Count recent agent usage
    const recentActions = this.history.slice(-5).map(h => h.role);
    const debuggerCount = recentActions.filter(role => role.includes('Debugger')).length;
    const optimizerCount = recentActions.filter(role => role.includes('Optimizer')).length;
    const fixerCount = recentActions.filter(role => role.includes('Fixer')).length;
    const codeManiacCount = recentActions.filter(role => role.includes('CodeManiac')).length;
    
    // If we've had multiple recent debugger calls, force progression
    if (debuggerCount >= 2 && (optimizerCount === 0 || fixerCount === 0)) {
      return 'FORCE_PROGRESSION';
    }
    
    // If we've used all agents but haven't moved to implementation, force it
    if (debuggerCount >= 1 && optimizerCount >= 1 && fixerCount === 0) {
      return 'FORCE_IMPLEMENTATION';
    }
    
    // If we've done implementation but haven't explored creative solutions
    if (fixerCount >= 1 && codeManiacCount === 0) {
      return 'FORCE_CREATIVE';
    }
    
    // Normal phase detection
    if (historyText.includes('security') || historyText.includes('vulnerability')) {
      return 'SECURITY AUDIT';
    } else if (historyText.includes('quality') || historyText.includes('complexity')) {
      return 'CODE QUALITY';
    } else if (historyText.includes('performance') || historyText.includes('optimize')) {
      return 'PERFORMANCE';
    } else if (historyText.includes('implement') || historyText.includes('fix')) {
      return 'IMPLEMENTATION';
    } else if (historyText.includes('creative') || historyText.includes('novel') || historyText.includes('innovative')) {
      return 'CREATIVE SOLUTIONS';
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
        
        // Get relevant files for analysis
        const relevantFiles = this.getRelevantFiles(task);
        const fileContent = this.formatFileContent(relevantFiles);
        
        const workerPrompt = `${agent.role} Agent Task: "${task}"

PROJECT CONTEXT:
${projectContext}
Analysis History: ${analysisHistory}

PROJECT FILES AVAILABLE:
${fileContent}

SPECIFIC INSTRUCTIONS:
${agent.role === 'Debugger' ? 
  'Analyze the provided code files for bugs, security vulnerabilities, and code quality issues. Report specific file paths, line numbers, and detailed findings. Focus on: SQL injection, XSS, authentication flaws, input validation, code complexity, and maintainability issues. Use the actual file content provided above for your analysis.' :
  agent.role === 'Optimizer' ? 
  'Analyze the provided code files for performance bottlenecks, memory usage, database queries, and architectural issues. Report specific metrics, optimization opportunities, and refactoring suggestions. Focus on: N+1 queries, memory leaks, inefficient algorithms, and scalability issues. Use the actual file content provided above for your analysis.' :
  agent.role === 'Fixer' ? 
  'Implement code fixes, security patches, and improvements based on the provided code files. Provide specific code changes with explanations. Focus on: input validation, error handling, security hardening, and performance optimizations. Use the actual file content provided above for your implementation.' :
  'Provide creative, innovative, and novel solutions to the identified problems. Think outside the box and suggest unconventional approaches, modern patterns, and cutting-edge techniques. Focus on: creative refactoring, innovative architectures, novel security approaches, and experimental optimizations. Be bold and imaginative while maintaining code quality and security. Use the actual file content provided above for your creative analysis.'
}

REPORT FORMAT: Provide specific findings with file paths, line numbers, and actionable recommendations based on the actual code files provided.`;

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
                        content: `You are a ${agent.role} agent specialized in code analysis and optimization. You have access to the project source code files and should provide detailed, actionable analysis based on the actual code content provided.`
                    },
                    {
                        role: 'user',
                        content: workerPrompt
                    }
                ],
                max_tokens: 300, // Increased for detailed analysis with file content
                temperature: agent.role === 'CodeManiac' ? 0.7 : 0.0, // Higher temperature for creative solutions
                stream: false,
                top_p: agent.role === 'CodeManiac' ? 0.9 : 0.1 // Higher top_p for creativity
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

  private getRelevantFiles(task: string): string[] {
    // Determine which files are relevant based on the task
    const taskLower = task.toLowerCase();
    const relevantFiles: string[] = [];
    
    for (const filePath of this.projectStructure) {
      const fileName = filePath.toLowerCase();
      
      // Security-related files
      if (taskLower.includes('security') || taskLower.includes('vulnerability') || taskLower.includes('auth')) {
        if (fileName.includes('auth') || fileName.includes('login') || fileName.includes('user') || 
            fileName.includes('security') || fileName.includes('validation') || fileName.includes('middleware')) {
          relevantFiles.push(filePath);
        }
      }
      
      // Performance-related files
      if (taskLower.includes('performance') || taskLower.includes('optimize') || taskLower.includes('bottleneck')) {
        if (fileName.includes('query') || fileName.includes('database') || fileName.includes('api') || 
            fileName.includes('service') || fileName.includes('model')) {
          relevantFiles.push(filePath);
        }
      }
      
      // General code quality
      if (taskLower.includes('quality') || taskLower.includes('complexity') || taskLower.includes('maintainability')) {
        if (fileName.includes('.js') || fileName.includes('.ts') || fileName.includes('.py') || 
            fileName.includes('.java') || fileName.includes('.cpp')) {
          relevantFiles.push(filePath);
        }
      }
      
      // Default: include main project files
      if (relevantFiles.length === 0 && (fileName.includes('index') || fileName.includes('main') || 
          fileName.includes('app') || fileName.includes('package.json'))) {
        relevantFiles.push(filePath);
      }
    }
    
    // Limit to top 5 most relevant files to avoid token limits
    return relevantFiles.slice(0, 5);
  }

  private formatFileContent(filePaths: string[]): string {
    if (filePaths.length === 0) {
      return 'No specific files available. Provide general analysis based on common patterns.';
    }
    
    let content = 'Available files for analysis:\n\n';
    
    for (const filePath of filePaths) {
      const fileContent = this.projectFiles.get(filePath);
      if (fileContent) {
        content += `=== ${filePath} ===\n${fileContent}\n\n`;
      }
    }
    
    return content;
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
        
        // Add anti-repetition logic
        const recentActions = this.history.slice(-3).map(h => h.role);
        const debuggerCount = recentActions.filter(role => role.includes('Debugger')).length;
        const optimizerCount = recentActions.filter(role => role.includes('Optimizer')).length;
        const fixerCount = recentActions.filter(role => role.includes('Fixer')).length;
        const codeManiacCount = recentActions.filter(role => role.includes('CodeManiac')).length;
        
        let enhancedTaskPrompt = taskPrompt;
        if (debuggerCount >= 2) {
          this.logToTerminal('AgentSmith', 'Detected repetitive Debugger usage. Forcing progression to other agents.');
          enhancedTaskPrompt += ' NOTE: Avoid Debugger assignment. Prioritize Optimizer or Fixer for next action.';
        }
        
        const smithsPlan = await this.getSmithsNextMove(enhancedTaskPrompt);
        this.currentTask = smithsPlan;

        if (smithsPlan.toLowerCase().includes('complete') || smithsPlan.toLowerCase().includes('finished')) {
          this.shouldStop = true;
          this.logToTerminal('AgentSmith', 'All objectives completed. Halting operations.');
          continue;
        }
        
        // Add a small delay between iterations to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));

        const plan = smithsPlan.toLowerCase();

        // Enhanced worker assignment logic with better diversity
        const recentWorkerUsage = this.history.slice(-3).map(h => h.role).join(' ').toLowerCase();
        const workerIds: (keyof typeof this.agents)[] = [];

        const addWorker = (id: keyof typeof this.agents, message: string) => {
          if (!workerIds.includes(id)) {
            workerIds.push(id);
            this.logToTerminal('AgentSmith', message);
          }
        };

        if (
          plan.includes('assign debugger') || plan.includes('debug') || plan.includes('scan') ||
          plan.includes('find bug') || plan.includes('security') || plan.includes('vulnerability') ||
          plan.includes('quality') || plan.includes('audit')
        ) {
          if (debuggerCount < 2 && !recentWorkerUsage.includes('debugger')) {
            addWorker('b', 'Assigning task to Debugger (Agent B)');
          } else {
            if (optimizerCount === 0) {
              addWorker('c', 'Debugger overused. Forcing Optimizer assignment.');
            } else if (fixerCount === 0) {
              addWorker('a', 'Debugger overused. Forcing Fixer assignment.');
            } else {
              addWorker('d', 'Debugger overused. Forcing CodeManiac assignment.');
            }
          }
        }

        if (
          plan.includes('assign optimizer') || plan.includes('optimize') || plan.includes('refactor') ||
          plan.includes('improve performance') || plan.includes('performance') || plan.includes('bottleneck') ||
          plan.includes('memory') || plan.includes('database')
        ) {
          addWorker('c', 'Assigning task to Optimizer (Agent C)');
        }

        if (
          plan.includes('assign fixer') || plan.includes('fix') || plan.includes('patch') ||
          plan.includes('implement') || plan.includes('apply') || plan.includes('correct') ||
          plan.includes('update')
        ) {
          addWorker('a', 'Assigning task to Fixer (Agent A)');
        }

        if (
          plan.includes('assign codemaniac') || plan.includes('creative') || plan.includes('novel') ||
          plan.includes('innovative') || plan.includes('experimental') || plan.includes('unconventional')
        ) {
          addWorker('d', 'Assigning task to CodeManiac (Agent D) for creative solutions');
        }

        if (workerIds.length === 0) {
          // Smart fallback: choose the least recently used agent
          const agentUsage = { debugger: debuggerCount, optimizer: optimizerCount, fixer: fixerCount, codemaniac: codeManiacCount };
          const leastUsed = Object.entries(agentUsage).sort(([, a], [, b]) => a - b)[0][0];

          switch (leastUsed) {
            case 'optimizer':
              addWorker('c', 'No specific assignment. Defaulting to Optimizer (least used).');
              break;
            case 'fixer':
              addWorker('a', 'No specific assignment. Defaulting to Fixer (least used).');
              break;
            case 'codemaniac':
              addWorker('d', 'No specific assignment. Defaulting to CodeManiac (least used).');
              break;
            default:
              addWorker('c', 'No specific assignment. Defaulting to Optimizer.');
          }
        }

        if (workerIds.length > 0) {
          const results = await Promise.all(
            workerIds.map(id =>
              this.delegateToWorker(id, smithsPlan)
                .then(res => ({ id, res }))
                .catch(err => ({ id, res: `Worker failed: ${(err as Error).message}` }))
            )
          );

          this.currentTask = results
            .map(r => `Worker ${this.agents[r.id].name} reported: ${r.res}`)
            .join(' ');
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
    this.projectFiles.clear();
    this.projectStructure = [];
    this.terminal.innerHTML = '';
    this.instructionHistoryList.innerHTML = '';
    this.tempLocationEl.textContent = 'N/A - No Active Process';
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
    
    // Load project files for analysis
    await this.loadProjectFiles(project);
    
    this.currentTask = `The project '${project}' has been cloned and files loaded. Begin the analysis.`;
    this.history.push({ role: 'user', content: this.currentTask });
    
    this.mainLoop();
  }

  private async loadProjectFiles(projectName: string): Promise<void> {
    this.logToTerminal('System', 'Loading project files for analysis...');
    
    // Simulate loading common project files
    const commonFiles = [
      'package.json',
      'index.js',
      'server.js',
      'auth.js',
      'models/user.js',
      'routes/api.js',
      'middleware/validation.js',
      'config/database.js',
      'utils/helpers.js',
      'README.md'
    ];
    
    // Generate sample content for each file
    for (const filePath of commonFiles) {
      const content = this.generateSampleContent(filePath, projectName);
      this.projectFiles.set(filePath, content);
      this.projectStructure.push(filePath);
    }
    
    this.logToTerminal('System', `Loaded ${this.projectStructure.length} files for analysis`);
  }

  private generateSampleContent(filePath: string, projectName: string): string {
    const fileName = filePath.toLowerCase();
    
    if (fileName.includes('package.json')) {
      return `{
  "name": "${projectName}",
  "version": "1.0.0",
  "description": "Sample project for analysis",
  "main": "index.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "bcrypt": "^5.0.1",
    "jsonwebtoken": "^8.5.1",
    "mongoose": "^6.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.15",
    "jest": "^27.0.0"
  }
}`;
    }
    
    if (fileName.includes('index.js')) {
      return `const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to ${projectName}' });
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});`;
    }
    
    if (fileName.includes('server.js')) {
      return `const express = require('express');
const authRoutes = require('./auth');
const apiRoutes = require('./routes/api');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});`;
    }
    
    if (fileName.includes('auth.js')) {
      return `const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

// SECURITY ISSUE: No input validation
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // VULNERABILITY: SQL injection possible
  const user = await db.query(\`SELECT * FROM users WHERE username = '\${username}'\`);
  
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ userId: user.id }, 'secret_key');
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

module.exports = router;`;
    }
    
    if (fileName.includes('user.js')) {
      return `const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// PERFORMANCE ISSUE: No indexes on frequently queried fields
module.exports = mongoose.model('User', userSchema);`;
    }
    
    if (fileName.includes('api.js')) {
      return `const express = require('express');
const router = express.Router();

// SECURITY ISSUE: No authentication middleware
router.get('/users', async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

// PERFORMANCE ISSUE: N+1 query problem
router.get('/users/:id/posts', async (req, res) => {
  const user = await User.findById(req.params.id);
  const posts = await Post.find({ userId: user._id });
  res.json(posts);
});

module.exports = router;`;
    }
    
    if (fileName.includes('validation.js')) {
      return `const express = require('express');

// SECURITY ISSUE: Weak validation
const validateUser = (req, res, next) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // VULNERABILITY: No email format validation
  // VULNERABILITY: No password strength requirements
  
  next();
};

module.exports = { validateUser };`;
    }
    
    if (fileName.includes('database.js')) {
      return `const mongoose = require('mongoose');

// PERFORMANCE ISSUE: No connection pooling
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

module.exports = db;`;
    }
    
    if (fileName.includes('helpers.js')) {
      return `// PERFORMANCE ISSUE: Inefficient helper functions
function findUserById(id) {
  return User.findById(id); // No caching
}

function processData(data) {
  // COMPLEXITY ISSUE: Nested loops causing O(n²) complexity
  const result = [];
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].items.length; j++) {
      result.push(data[i].items[j]);
    }
  }
  return result;
}

module.exports = { findUserById, processData };`;
    }
    
    if (fileName.includes('readme.md')) {
      return `# ${projectName}

A sample project for analysis.

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`bash
npm start
\`\`\`

## Features
- User authentication
- API endpoints
- Database integration`;
    }
    
    // Default content for other files
    return `// ${filePath}
// Sample content for analysis
console.log('Hello from ${filePath}');`;
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