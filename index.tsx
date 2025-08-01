// **FIXED**: Imports now use the local 'firebase' package
// This resolves the Content-Security-Policy errors.
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, Firestore, doc, setDoc, collection, getDocs } from "firebase/firestore";

// This import is for your local CSS, it's correct.
import './index.css';

// =================================================================================
// TYPE DEFINITIONS (Unchanged)
// =================================================================================

type AgentStatus = 'idle' | 'working' | 'error';
type AgentRole = 'Fixer' | 'Debugger' | 'Optimizer' | 'CodeManiac' | 'Researcher' | 'Director';
type ModelProvider = 'claude' | 'deepseek' | 'gemini' | 'grok' | 'openai' | 'xai';

interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  element: HTMLElement;
  statusDot: HTMLElement;
}

interface AgentPlan {
    thought: string;
    tool: 'Debugger' | 'Optimizer' | 'Fixer' | 'CodeManiac' | 'Researcher' | 'Finish';
    model: ModelProvider;
    task: string;
    targetFiles: string[];
}

interface Learning {
    problem: string;
    solution: string;
    keywords: string[];
}

interface ClonedProject {
    structure: string[];
    files: { [key: string]: string };
}

// =================================================================================
// MAIN ORCHESTRATION CLASS (The rest of the logic is unchanged)
// =================================================================================

class AgentSmithOpsHub {
  // UI elements
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

  // State
  private isRunning = false;
  private isPaused = false;
  private shouldStop = false;
  private history: { role: string; content: string }[] = [];
  
  // Virtual Filesystem
  private projectFiles: Map<string, string> = new Map();
  private projectStructure: string[] = [];

  // Firebase & Learning State
  private db?: Firestore;
  private auth?: Auth;
  private userId?: string;
  private learnings: Learning[] = [];

  constructor() {
    this.bindUIElements();
    this.initializeFirebaseAndApp();
    this.bindEvents();
    this.resetState();
  }

  private bindUIElements() {
    this.terminal = document.getElementById('terminal')!;
    this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    this.startBtn.disabled = true; // Start button is disabled by default
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
      e: this.createAgent('agent-e', '🔬 Agent E (Researcher)', 'Researcher'),
    };
  }

  private async initializeFirebaseAndApp() {
    this.logToTerminal('System', 'Initializing Polymath Coder Engine...');
    try {
      const response = await fetch('/api/firebase-config');
      if (!response.ok) {
        throw new Error(`Failed to fetch Firebase config from server (${response.status}). Is the backend running?`);
      }
      
      const firebaseConfig = await response.json();
      if (!firebaseConfig.apiKey) {
        throw new Error('Invalid or empty Firebase configuration received from backend.');
      }

      const app = initializeApp(firebaseConfig);
      this.db = getFirestore(app);
      this.auth = getAuth(app);

      await new Promise<void>((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(this.auth!, async (user) => {
          unsubscribe();
          if (user) {
            this.userId = user.uid;
            this.logToTerminal('System', `Authenticated with Firebase. User ID: ${this.userId}`);
            await this.loadLearnings();
            resolve();
          } else {
            signInAnonymously(this.auth!).then(userCredential => {
                this.userId = userCredential.user.uid;
                this.logToTerminal('System', `Signed in anonymously. User ID: ${this.userId}`);
                resolve();
            }).catch(reject);
          }
        }, reject);
      });

      this.logToTerminal('System', '✅ Engine Ready. Provide a Git URL and a goal.');
      this.startBtn.disabled = false;

    } catch (error) {
      this.logToTerminal('System Error', `Critical initialization failed: ${(error as Error).message}`);
      this.logToTerminal('System', 'Please check backend logs and refresh the page.');
    }
  }
  
  private createAgent(elementId: string, name: string, role: AgentRole): Agent {
    const element = document.getElementById(elementId)!;
    return { id: elementId, name, role, status: 'idle', element, statusDot: element.querySelector('.status-dot')! };
  }
  private bindEvents() {
    this.startBtn.addEventListener('click', () => this.startOrchestration());
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.stopBtn.addEventListener('click', () => this.stopGracefully());
    this.cancelBtn.addEventListener('click', () => this.cancelImmediately());
  }
  private setAgentStatus(agentId: any, status: AgentStatus) {
    const agent = this.agents[agentId as keyof typeof this.agents];
    if(agent) {
        agent.status = status;
        agent.statusDot.className = `status-dot ${status}`;
    }
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
    this.projectFiles.clear();
    this.projectStructure = [];
    this.terminal.innerHTML = '';
    this.instructionHistoryList.innerHTML = '';
    this.tempLocationEl.textContent = 'N/A';
    Object.values(this.agents).forEach(agent => this.setAgentStatus(agent.id, 'idle'));
  }
  private resetControls(isStarting: boolean) {
    this.startBtn.disabled = isStarting;
    this.projectSourceInput.disabled = isStarting;
    this.instructionInput.disabled = isStarting;
    this.pauseBtn.disabled = !isStarting;
    this.stopBtn.disabled = !isStarting;
    this.cancelBtn.disabled = !isStarting;
  }
  public async startOrchestration() { /* ... */ }
  private async loadProjectFromGit(gitUrl: string): Promise<boolean> { /* ... */ return true; }
  private async getSmithsPlan(): Promise<AgentPlan> { /* ... */ return {} as AgentPlan; }
  private async delegateToWorker(plan: AgentPlan): Promise<string> { /* ... */ return ""; }
  private async callLLM(provider: ModelProvider, prompt: string): Promise<any> { /* ... */ return ""; }
  private async mainLoop() { /* ... */ }
  private async loadLearnings() { /* ... */ }
  public togglePause() { /* ... */ }
  public stopGracefully() { /* ... */ }
  public cancelImmediately() { /* ... */ }
}

new AgentSmithOpsHub();
