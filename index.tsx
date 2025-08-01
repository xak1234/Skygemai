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

// The structured plan AgentSmith will now create
interface AgentPlan {
    thought: string;
    tool: 'Debugger' | 'Optimizer' | 'Fixer' | 'CodeManiac' | 'Finish';
    task: string;
    targetFiles: string[];
}

// =================================================================================
// MAIN ORCHESTRATION CLASS
// =================================================================================

class AgentSmithOpsHub {
  // All UI elements from your original file are preserved
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

  // State variables
  private isRunning = false;
  private isPaused = false;
  private shouldStop = false;
  private history: { role: string; content: string }[] = [];
  private instructionHistory: { timestamp: string; content: string }[] = [];
  private commandHistory: string[] = [];
  private currentHistoryIndex: number = -1;
  
  // The "Mega Coder" Upgrade: A mutable, in-memory filesystem
  private projectFiles: Map<string, string> = new Map();
  private projectStructure: string[] = [];

  constructor() {
    // Bind UI Elements
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
    this.logToTerminal('System', 'Autonomous Coder Engine Ready. Provide a high-level goal and click Start.');
  }

  // =================================================================================
  // CORE AGENT LOGIC (THE "MEGA CODER" ENGINE)
  // =================================================================================

  /**
   * Director Agent (AgentSmith's Brain)
   * Creates a structured plan for which tool to use next.
   */
  private async getSmithsPlan(): Promise<AgentPlan> {
    this.setAgentStatus('smith', 'working');
    this.logToTerminal('AgentSmith', 'Analyzing history and code to form a plan...');
    
    const planningPrompt = `
      You are AgentSmith, the director of an autonomous AI coding team. Your job is to achieve the user's goal by strategically using your specialist agents as tools.

      **USER'S GOAL:**
      ${this.instructionInput.value || 'Analyze and improve the project.'}
      
      **AVAILABLE TOOLS (AGENTS):**
      - Debugger: Scans specified files for bugs, security issues, and quality problems. Returns a text analysis.
      - Optimizer: Analyzes specified files for performance bottlenecks (e.g., N+1 queries, slow algorithms). Returns a text analysis.
      - Fixer: **Rewrites entire files.** Takes a file, analyzes a problem, and returns the complete, new version of the file with the fix. Use this tool to apply changes.
      - CodeManiac: Suggests creative or novel approaches. Returns a text analysis.
      - Finish: Use this tool when the user's goal has been fully achieved.

      **PROJECT FILES:**
      ${this.projectStructure.join(', ')}

      **HISTORY (What has been done so far):**
      ${this.history.map(h => h.content).join('\n') || 'No actions taken yet.'}

      **YOUR TASK:**
      Based on the user's goal and the history, decide the single next action.
      1.  **thought**: Briefly explain your reasoning.
      2.  **tool**: Choose the single best tool for the next step ('Debugger', 'Optimizer', 'Fixer', 'CodeManiac', 'Finish').
      3.  **task**: Write a clear, specific instruction for the chosen agent.
      4.  **targetFiles**: List the file(s) the agent should read to perform the task.

      **OUTPUT MUST BE A VALID JSON OBJECT:**
      {
        "thought": "Your reasoning here.",
        "tool": "ToolName",
        "task": "Specific instruction for the agent.",
        "targetFiles": ["path/to/file.js"]
      }
    `;

    try {
      // This uses your existing backend endpoint for the director model.
      const response = await fetch('/api/xai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4-turbo', // A powerful model is required for good planning
          messages: [{ role: 'user', content: planningPrompt }],
          response_format: { type: "json_object" }, // Enforce JSON output
        }),
      });

      if (!response.ok) throw new Error(`Director API error (${response.status}): ${await response.text()}`);
      
      const data = await response.json();
      const plan = JSON.parse(data.choices[0].message.content) as AgentPlan;
      
      this.history.push({ role: 'Director', content: `Thought: ${plan.thought}` });
      this.logToTerminal('AgentSmith', `Thought: ${plan.thought}`);
      return plan;

    } catch (error) {
      const errorMessage = `Director planning failed: ${(error as Error).message}. Halting.`;
      this.logToTerminal('System', errorMessage);
      this.setAgentStatus('smith', 'error');
      this.shouldStop = true;
      return { thought: errorMessage, tool: 'Finish', task: 'Error occurred', targetFiles: [] };
    } finally {
      this.setAgentStatus('smith', 'idle');
    }
  }
  
  /**
   * Delegates a task to a specialist worker agent.
   */
  private async delegateToWorker(plan: AgentPlan): Promise<string> {
    const agentIdMap = { Fixer: 'a', Debugger: 'b', Optimizer: 'c', CodeManiac: 'd' };
    const agentId = agentIdMap[plan.tool as keyof typeof agentIdMap];
    if (!agentId) return `Unknown tool: ${plan.tool}`;

    const agent = this.agents[agentId];
    this.setAgentStatus(agentId, 'working');
    this.logToTerminal(agent.name, `Executing task: "${plan.task}"`);

    const filesContent = plan.targetFiles.map(path => 
        `--- FILE: ${path} ---\n${this.projectFiles.get(path) || 'File not found.'}`
    ).join('\n\n');

    let workerPrompt = `
      You are a specialist AI agent with the role of **${agent.role}**.
      Your specific task is: **${plan.task}**

      Read the following file(s) to perform your task:
      ${filesContent}
    `;

    // **CRITICAL**: Instruct the Fixer to output ONLY the raw code for the file it's modifying.
    if (plan.tool === 'Fixer') {
        workerPrompt += `
          \n**IMPORTANT INSTRUCTION:**
          Your output must be ONLY the complete, new source code for the file you are fixing.
          Do NOT include any explanation, markdown, or anything else. Just the raw code.
        `;
    }

    try {
        // This uses your existing backend endpoint for worker agents.
        const response = await fetch('/api/deepseek/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                model: 'deepseek-coder',
                messages: [{ role: 'user', content: workerPrompt }],
                temperature: agent.role === 'CodeManiac' ? 0.7 : 0.0,
            })
        });

        if (!response.ok) throw new Error(`Worker API error (${response.status}): ${await response.text()}`);

        const data = await response.json();
        const result = data.choices[0].message.content?.trim() || 'No output.';
        
        this.logToTerminal(agent.name, plan.tool === 'Fixer' ? `Generated new version of ${plan.targetFiles[0]}` : result);
        this.history.push({ role: 'Worker', content: `[${plan.tool} Result]: ${result.substring(0, 200)}...` });
        return result;
    } catch (error) {
        const errorMessage = `Worker agent ${agent.name} failed: ${(error as Error).message}`;
        this.logToTerminal('System', errorMessage);
        this.setAgentStatus(agentId as keyof typeof this.agents, 'error');
        throw new Error(errorMessage);
    } finally {
        this.setAgentStatus(agentId as keyof typeof this.agents, 'idle');
    }
  }

  /**
   * **THE KEY UPGRADE**: This function modifies the in-memory virtual filesystem.
   */
  private applyCodeChange(filePath: string, newContent: string) {
    if (!this.projectFiles.has(filePath)) {
        this.logToTerminal('System Error', `Attempted to modify non-existent file: ${filePath}`);
        return;
    }
    this.projectFiles.set(filePath, newContent);
    this.logToTerminal('System', `✅ Successfully applied changes to ${filePath}.`);
    this.history.push({ role: 'System', content: `Applied new code to ${filePath}.` });
  }

  /**
   * The main orchestration loop, now re-architected for autonomous operation.
   */
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
        // 1. PLAN: AgentSmith decides what to do next.
        const plan = await this.getSmithsPlan();

        if (plan.tool === 'Finish') {
          this.shouldStop = true;
          this.logToTerminal('AgentSmith', plan.task || 'Goal achieved. Halting operations.');
          continue;
        }

        // 2. EXECUTE: Delegate the task to the chosen worker agent.
        const workerResult = await this.delegateToWorker(plan);

        // 3. APPLY: If the tool was the Fixer, apply the code changes.
        if (plan.tool === 'Fixer') {
          // Assume the fixer targets one file at a time for simplicity
          const targetFile = plan.targetFiles[0];
          if (targetFile) {
            this.applyCodeChange(targetFile, workerResult);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // Pause between cycles

      } catch (error) {
          this.logToTerminal('System Error', `Critical error in main loop: ${(error as Error).message}`);
          this.shouldStop = true;
      }
    }
    
    this.logToTerminal('System', this.shouldStop ? 'All operations halted.' : 'Maximum iterations reached.');
    this.displayFinalCode();
    this.resetControls(false);
  }

  private displayFinalCode() {
    this.logToTerminal('System', '--- FINAL CODE STATE ---');
    for (const [filePath, content] of this.projectFiles.entries()) {
        const finalCodeLog = `
        ----------------------------------------
        FILE: ${filePath}
        ----------------------------------------
        ${content}
        `;
        this.logToTerminal('Final Code', finalCodeLog);
    }
  }
  
  // =================================================================================
  // All functions below are preserved from your original file for UI/compatibility
  // =================================================================================

  private createAgent(elementId: string, name: string, role: AgentRole): Agent {
    const element = document.getElementById(elementId)!;
    return { id: elementId, name, role, status: 'idle', element, statusDot: element.querySelector('.status-dot')! };
  }

  private bindEvents() {
    this.startBtn.addEventListener('click', () => this.startOrchestration());
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.stopBtn.addEventListener('click', () => this.stopGracefully());
    this.cancelBtn.addEventListener('click', () => this.cancelImmediately());
    this.instructionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendInstruction(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.navigateHistory('up'); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); this.navigateHistory('down'); }
    });
  }

  private setAgentStatus(agentId: keyof typeof this.agents, status: AgentStatus) {
    const agent = this.agents[agentId];
    if (agent) { agent.status = status; agent.statusDot.className = `status-dot ${status}`; }
  }

  private logToTerminal(sender: string, message: string) {
    const logLine = document.createElement('div');
    logLine.className = 'log-entry';
    const senderEl = document.createElement('strong');
    senderEl.textContent = `[${sender}]`;
    logLine.appendChild(senderEl);
    const messageEl = document.createElement('span');
    messageEl.textContent = `: ${message}`;
    logLine.appendChild(messageEl);
    this.terminal.appendChild(logLine);
    this.terminal.scrollTop = this.terminal.scrollHeight;
  }

  private resetState() {
    this.isRunning = false;
    this.isPaused = false;
    this.shouldStop = false;
    this.history = [];
    this.instructionHistory = [];
    this.commandHistory = [];
    this.currentHistoryIndex = -1;
    this.projectFiles.clear();
    this.projectStructure = [];
    this.terminal.innerHTML = '';
    this.instructionHistoryList.innerHTML = '';
    this.tempLocationEl.textContent = 'N/A - No Active Process';
    Object.values(this.agents).forEach(agent => this.setAgentStatus(agent.id as any, 'idle'));
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
    this.logToTerminal('User', `New Goal Set: ${instruction}`);
    this.instructionInput.value = '';
  }

  private navigateHistory(direction: 'up' | 'down') {
    if (this.commandHistory.length === 0) return;
    if (direction === 'up') {
      if (this.currentHistoryIndex <= 0) this.currentHistoryIndex = this.commandHistory.length;
      this.currentHistoryIndex--;
    } else {
      if (this.currentHistoryIndex >= this.commandHistory.length - 1) {
        this.currentHistoryIndex = -1;
        this.instructionInput.value = '';
        return;
      }
      this.currentHistoryIndex++;
    }
    this.instructionInput.value = this.commandHistory[this.currentHistoryIndex];
  }

  private updateInstructionHistory() {
    this.instructionHistoryList.innerHTML = '';
    this.instructionHistory.forEach(entry => {
      const messageEl = document.createElement('div');
      messageEl.innerHTML = `<div class="message-header"><span>${entry.timestamp}</span></div><div>${entry.content}</div>`;
      this.instructionHistoryList.appendChild(messageEl);
    });
    this.instructionHistoryList.scrollTop = this.instructionHistoryList.scrollHeight;
  }

  public async startOrchestration() {
    if (this.isRunning) return;
    if (!this.instructionInput.value.trim()) {
        alert("Please provide a high-level goal before starting.");
        return;
    }
    this.resetState();
    this.isRunning = true;
    this.resetControls(true);
    const project = this.projectSourceInput.value || 'sample-project';
    this.logToTerminal('System', `Loading project source: ${project}...`);
    const cloneId = (Math.random() + 1).toString(36).substring(7);
    this.tempLocationEl.textContent = `/tmp/project-clone-${cloneId}`;
    await this.loadProjectFiles(project);
    this.history.push({ role: 'User', content: `Initial Goal: ${this.instructionInput.value}` });
    this.mainLoop();
  }

  private async loadProjectFiles(projectName: string): Promise<void> {
    const commonFiles = ['package.json', 'server.js', 'auth.js', 'README.md'];
    for (const filePath of commonFiles) {
      const content = this.generateSampleContent(filePath, projectName);
      this.projectFiles.set(filePath, content);
      this.projectStructure.push(filePath);
    }
    this.logToTerminal('System', `Loaded ${this.projectStructure.length} files into virtual filesystem.`);
  }

  private generateSampleContent(filePath: string, projectName: string): string {
    if (filePath.includes('package.json')) return `{ "name": "${projectName}", "main": "server.js" }`;
    if (filePath.includes('server.js')) return `const express = require('express');\nconst app = express();\n\napp.use('/auth', require('./auth'));\n\napp.listen(3000, () => console.log('Server Ready'));`;
    if (filePath.includes('auth.js')) return `const router = require('express').Router();\n\nrouter.post('/login', (req, res) => {\n  // TODO: Add proper validation and password hashing.\n  const { username, password } = req.body;\n  if (username === 'admin' && password === 'password') {\n    res.send('Login successful!');\n  } else {\n    res.status(401).send('Login failed');\n  }\n});\n\nmodule.exports = router;`;
    return `# ${projectName}\nThis is a sample project.`;
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
  }

  public cancelImmediately() {
    if (!this.isRunning) return;
    this.shouldStop = true;
    this.isRunning = false;
    this.logToTerminal('System', 'Cancelling all operations immediately.');
    this.resetControls(false);
    this.resetState();
  }
}

new AgentSmithOpsHub();
