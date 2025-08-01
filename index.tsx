import { initializeApp, FirebaseApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, Auth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, Firestore, doc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import './index.css';

// =================================================================================
// TYPE DEFINITIONS
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

// Represents the data structure returned from your backend after cloning a repo
interface ClonedProject {
    structure: string[];
    files: { [key: string]: string };
}

// =================================================================================
// MAIN ORCHESTRATION CLASS
// =================================================================================

class AgentSmithOpsHub {
  // All UI and State variables are preserved
  private terminal: HTMLElement;
  private startBtn: HTMLButtonElement;
  // ... other UI elements
  private agents: Record<string, Agent>;
  private isRunning = false;
  // ... other state variables

  // Virtual Filesystem - now populated from a REAL project
  private projectFiles: Map<string, string> = new Map();
  private projectStructure: string[] = [];

  // Firebase & Learning State
  private db?: Firestore;
  private auth?: Auth;
  private userId?: string;
  private learnings: Learning[] = [];

  constructor() {
    this.bindUIElements();
    this.initializeFirebase();
    this.bindEvents();
    this.resetState();
    this.logToTerminal('System', 'Live Project Coder Engine Initialized. Provide a Git URL and a goal.');
  }

  // ... bindUIElements, initializeFirebase, and other setup functions are unchanged ...

  // =================================================================================
  // CORE AGENT LOGIC (UNCHANGED - ALREADY POWERFUL)
  // =================================================================================
  
  // The getSmithsPlan, delegateToWorker, and callLLM functions are the same as the
  // "Polymath Coder" version, as they are already designed for this advanced workflow.
  private async getSmithsPlan(): Promise<AgentPlan> { /* ... same as before ... */ return {} as AgentPlan; }
  private async delegateToWorker(plan: AgentPlan): Promise<string> { /* ... same as before ... */ return ""; }
  private async callLLM(provider: ModelProvider, prompt: string): Promise<any> { /* ... same as before ... */ return ""; }
  private async mainLoop() { /* ... same as before ... */ }


  // =================================================================================
  // PROJECT LOADING (THE KEY UPGRADE)
  // =================================================================================

  public async startOrchestration() {
    if (this.isRunning) return;

    const projectUrl = this.projectSourceInput.value.trim();
    const userGoal = this.instructionInput.value.trim();

    if (!projectUrl) {
        alert("Please provide a Git repository URL in the 'Project Source' field.");
        return;
    }
    if (!userGoal) {
        alert("Please provide a high-level goal in the communications box.");
        return;
    }

    this.resetState();
    this.isRunning = true;
    this.resetControls(true);
    
    this.logToTerminal('User', `New Goal Set: ${userGoal}`);
    this.history.push({ role: 'User', content: `Initial Goal: ${userGoal}` });

    // **NEW**: Load the project from the provided Git URL
    const success = await this.loadProjectFromGit(projectUrl);

    if (success) {
        this.mainLoop();
    } else {
        // Loading failed, reset the UI
        this.resetControls(false);
        this.isRunning = false;
    }
  }

  /**
   * Fetches project files from a backend endpoint that clones a Git repo.
   * @param gitUrl The URL of the public Git repository to clone.
   * @returns boolean indicating success or failure.
   */
  private async loadProjectFromGit(gitUrl: string): Promise<boolean> {
    this.logToTerminal('System', `Attempting to clone project from: ${gitUrl}`);
    this.tempLocationEl.textContent = `Cloning...`;

    try {
        // This new backend endpoint is responsible for the git clone operation
        const response = await fetch('/api/project/clone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: gitUrl }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend failed to clone repo (${response.status}): ${errorText}`);
        }

        const projectData: ClonedProject = await response.json();

        if (!projectData.structure || !projectData.files) {
            throw new Error("Invalid project data received from backend.");
        }

        // Clear any previous file data
        this.projectFiles.clear();
        this.projectStructure = [];

        // Populate the virtual filesystem with the REAL project data
        this.projectStructure = projectData.structure;
        for (const filePath in projectData.files) {
            this.projectFiles.set(filePath, projectData.files[filePath]);
        }
        
        this.logToTerminal('System', `✅ Successfully cloned and loaded ${this.projectStructure.length} files.`);
        this.tempLocationEl.textContent = `Cloned to remote worker`;
        return true;

    } catch (error) {
        this.logToTerminal('System Error', `Failed to load project: ${(error as Error).message}`);
        this.tempLocationEl.textContent = `Error cloning`;
        return false;
    }
  }

  // =================================================================================
  // All other helper functions (Firebase, UI handlers, etc.) remain unchanged
  // =================================================================================
  private bindUIElements() { /* ... */ }
  private async initializeFirebase() { /* ... */ }
  private createAgent(elementId: string, name: string, role: AgentRole): Agent { /* ... */ return {} as Agent; }
  private bindEvents() { /* ... */ }
  private setAgentStatus(agentId: any, status: AgentStatus) { /* ... */ }
  private logToTerminal(sender: string, message: string) { /* ... */ }
  private resetState() { /* ... */ }
  private resetControls(isStarting: boolean) { /* ... */ }
  private navigateHistory(direction: 'up' | 'down') { /* ... */ }
  private updateInstructionHistory() { /* ... */ }
  public togglePause() { /* ... */ }
  public stopGracefully() { /* ... */ }
  public cancelImmediately() { /* ... */ }
  private async loadLearnings() { /* ... */ }
  private async saveLearning(learning: Learning) { /* ... */ }
  private async reflectAndLearn(problem: string, solution: string) { /* ... */ }
}

new AgentSmithOpsHub();
