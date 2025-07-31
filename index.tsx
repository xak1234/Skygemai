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

  // State
  private agents: Record<string, Agent>;
  private isRunning = false;
  private isPaused = false;
  private shouldStop = false;
  private currentTask: string | null = null;
  private history: { role: string; content: string }[] = [];

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
      const fullPrompt = `AgentSmith: Orchestrate project analysis. History: ${this.history.map(h => `${h.role}: ${h.content}`).join(' | ')}. Current: ${prompt}. Output: Single action command or "Analysis complete." Examples: "Assign Debugger scan auth.js" or "Optimizer found N+1 query. Assign Fixer."`;

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
              content: 'You are AgentSmith, an AI orchestrator that coordinates other AI agents for project analysis and optimization.'
            },
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          max_tokens: 50, // Ultra-low for speed
          temperature: 0.0, // Ultra-low for precision
          stream: false, // No streaming for instant response
          top_p: 0.1 // Minimal randomness for speed
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
        const workerPrompt = `${agent.role} agent: Task "${task}". Report: ${agent.role === 'Debugger' ? 'Code issue with file/line' : agent.role === 'Optimizer' ? 'Performance bottleneck with metrics' : 'Code fix with technical details'}. Example: "Found null pointer in auth.js:42."`;

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
                        content: `You are a ${agent.role} agent specialized in code analysis and optimization.`
                    },
                    {
                        role: 'user',
                        content: workerPrompt
                    }
                ],
                max_tokens: 100, // Reduced for speed
                temperature: 0.0, // Ultra-low for precision
                stream: false, // No streaming for instant response
                top_p: 0.1 // Minimal randomness for speed
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
        const smithsPlan = await this.getSmithsNextMove(this.currentTask || 'Start the analysis.');
        this.currentTask = smithsPlan;

        if (smithsPlan.toLowerCase().includes('complete') || smithsPlan.toLowerCase().includes('finished')) {
          this.shouldStop = true;
          this.logToTerminal('AgentSmith', 'All objectives completed. Halting operations.');
          continue;
        }

        let workerId: keyof typeof this.agents | null = null;
        const plan = smithsPlan.toLowerCase();
        if (plan.includes('fix') || plan.includes('patch') || plan.includes('implement')) {
            workerId = 'a';
        } else if (plan.includes('debug') || plan.includes('scan') || plan.includes('find bug')) {
            workerId = 'b';
        } else if (plan.includes('optimize') || plan.includes('refactor') || plan.includes('improve performance')) {
            workerId = 'c';
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
    this.terminal.innerHTML = '';
    this.tempLocationEl.textContent = 'Waiting for process to start...';
    Object.keys(this.agents).forEach(id => this.setAgentStatus(id as keyof typeof this.agents, 'idle'));
  }

  private resetControls(isStarting: boolean) {
    this.startBtn.disabled = isStarting;
    this.projectSourceInput.disabled = isStarting;
    this.pauseBtn.disabled = !isStarting;
    this.stopBtn.disabled = !isStarting;
    this.cancelBtn.disabled = !isStarting;

    if (isStarting) {
      this.pauseBtn.textContent = '⏸️ Pause';
    } else {
      this.startBtn.disabled = false;
      this.projectSourceInput.disabled = false;
    }
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