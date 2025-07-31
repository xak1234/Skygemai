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
  private apiKey: string;
  
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
    if (!process.env.XAI_API_KEY) {
      throw new Error("XAI_API_KEY environment variable not set");
    }
    this.apiKey = process.env.XAI_API_KEY;

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
      const fullPrompt = `You are AgentSmith, a high-speed AI orchestration director. Your goal is to efficiently analyze, debug, and improve a software project by managing three worker agents: Fixer, Debugger, and Optimizer.
      
Previous conversation history:
${this.history.map(h => `${h.role}: ${h.content}`).join('\n')}
      
Current situation: ${prompt}
      
Your task: Analyze the situation and decide the next single, concrete action. Output ONLY a brief, direct command for a worker agent or a concise status update. Be fast and decisive. When the project is fully analyzed and fixed, respond with "Analysis complete. All tasks finished."
Examples:
- "Assign Debugger to scan auth.js for vulnerabilities."
- "Optimizer found an N+1 query. Assign Fixer to refactor."`;

      const response = await fetch('https://api.xai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          max_tokens: 150,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`XAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices[0].message.content.trim();
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
        const workerPrompt = `You are an AI code agent. Your current role is: ${agent.role}.
Your assigned task is: "${task}".
        
Provide a concise, one-sentence response as if you are reporting your findings.
- If you are a Debugger, find a plausible-sounding bug.
- If you are an Optimizer, find a plausible performance issue.
- If you are a Fixer, describe the fix you supposedly implemented.
        
Example response: "Found a critical null pointer exception in auth.js on line 42."`;

        const response = await fetch('https://api.xai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'grok-beta',
                messages: [
                    {
                        role: 'user',
                        content: workerPrompt
                    }
                ],
                max_tokens: 100,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            throw new Error(`XAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.choices[0].message.content.trim();
        
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