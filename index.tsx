import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, getDocs } from "firebase/firestore";
import './index.css';

// --- Type Definitions ---
type AgentStatus = 'idle' | 'working' | 'error' | 'paused';
type AgentRole = 'Fixer' | 'Debugger' | 'Optimizer' | 'CodeManiac' | 'Researcher' | 'Tester' | 'Director';
type ModelProvider = 'claude' | 'deepseek' | 'gemini' | 'grok' | 'openai' | 'xai';
interface Agent { id: string; name: string; role: AgentRole; status: AgentStatus; element: HTMLElement; statusDot: HTMLElement; }
interface AgentPlan {
    thought: string;
    tool: 'Debugger' | 'Optimizer' | 'Fixer' | 'CodeManiac' | 'Researcher' | 'Tester' | 'Finish' | 'ask_user';
    model: ModelProvider;
    task: string; // For 'ask_user', this is the question for the user
    targetFiles: string[];
}
interface Learning { problem: string; solution: string; keywords: string[]; heuristic: string; }
interface ClonedProject { structure: string[]; files: { [key: string]: string }; }

// --- Main Application Class ---
class AgentSmithOpsHub {
    // UI elements
    private terminal: HTMLElement;
    private startBtn: HTMLButtonElement;
    private instructionInput: HTMLTextAreaElement;
    // ... other UI elements
    private agents: Record<string, Agent>;
    
    // State
    private isRunning = false;
    private isPaused = false;
    private projectFiles: Map<string, string> = new Map();
    private projectStructure: string[] = [];
    private history: { role: string; content: string }[] = [];
    private db: any;
    private learnings: Learning[] = [];

    constructor() {
        this.bindUIElements();
        this.initializeFirebaseAndApp();
        this.bindEvents();
    }

    private bindUIElements() {
        this.terminal = document.getElementById('terminal')!;
        this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
        this.instructionInput = document.getElementById('instruction-input') as HTMLTextAreaElement;
        // ... bind other elements
        this.agents = { /* ... agent definitions ... */ };
    }

    private async initializeFirebaseAndApp() { /* ... same as before ... */ }

    private bindEvents() {
        this.startBtn.addEventListener('click', () => this.startOrchestration());
        // **NEW**: Handle user response after being asked a question
        this.instructionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (this.isPaused && this.isRunning) {
                    this.handleUserResponse();
                }
            }
        });
        // ... other event bindings
    }
    
    // --- Core Logic ---

    private async getSmithsPlan(): Promise<AgentPlan> {
        this.setAgentStatus('smith', 'working');
        this.logToTerminal('AgentSmith', 'Consulting memory and available AIs to form a plan...');
        
        const formattedLearnings = this.learnings.length > 0
            ? this.learnings.map(l => `- Heuristic: ${l.heuristic}`).join('\n')
            : "No past learnings found.";

        const planningPrompt = `
          You are AgentSmith, an Architect-level AI director. Your goal is to fulfill the user's request with maximum intelligence and efficiency.

          **USER'S GOAL:**
          ${this.instructionInput.value}
          
          **YOUR PAST LEARNINGS (HEURISTICS):**
          ${formattedLearnings}

          **AVAILABLE TOOLS:**
          - Debugger, Optimizer, CodeManiac, Researcher, Tester: Analytical tools.
          - Fixer: Rewrites files to apply changes.
          - ask_user: **CRITICAL TOOL**. If the user's goal is ambiguous or you need more information to proceed, use this tool. The 'task' field should be the question you want to ask the user.
          - Finish: Use when the goal is fully achieved and tested.

          **AVAILABLE AI MODELS:** 'openai', 'claude', 'gemini', 'xai', 'deepseek'.

          **YOUR TASK:**
          Based on your heuristics, the goal, and history, decide the single next action.
          1.  **thought**: Explain your reasoning. If the goal is vague, your first thought should be to use 'ask_user'.
          2.  **tool**: Choose the best tool.
          3.  **model**: Choose the best AI model for the task (e.g., 'openai' for coding, 'gemini' for research).
          4.  **task**: Write a clear instruction or the question for the user.
          5.  **targetFiles**: List relevant file(s).

          **OUTPUT MUST BE A VALID JSON OBJECT.**
        `;

        const response = await this.callLLM({ provider: 'openai', prompt: planningPrompt }) as AgentPlan;
        return {
            thought: response.thought || '',
            tool: response.tool || '',
            model: response.model || '',
            task: response.task || '',
            targetFiles: response.targetFiles || []
        };
    }
    
    private async mainLoop() {
        while (this.isRunning && !this.isPaused) {
            try {
                const plan = await this.getSmithsPlan();

                if (plan.tool === 'Finish') {
                    this.logToTerminal('AgentSmith', 'Goal achieved. Operations complete.');
                    this.isRunning = false;
                    break;
                }

                if (plan.tool === 'ask_user') {
                    this.handleAgentQuestion(plan.task);
                    break; // Pause the loop and wait for user input
                }

                const workerResult = await this.delegateToWorker(plan);

                if (plan.tool === 'Fixer') {
                    const targetFile = plan.targetFiles[0];
                    if (targetFile) {
                        const originalContent = this.projectFiles.get(targetFile);
                        this.projectFiles.set(targetFile, workerResult); // Apply fix
                        this.logToTerminal('System', `✅ Applied fix to ${targetFile}.`);
                        // **NEW**: Trigger learning after a successful fix
                        await this.reflectAndLearn(plan.task, originalContent!, workerResult);
                    }
                }
            } catch (error) {
                this.logToTerminal('System Error', `Main loop failed: ${(error as Error).message}`);
                this.isRunning = false;
            }
        }
        if (!this.isRunning) this.resetControls(false);
    }

    // **NEW**: Handles the 'ask_user' tool
    private handleAgentQuestion(question: string) {
        this.logToTerminal('AgentSmith', `Question for you: ${question}`);
        this.isPaused = true;
        this.setAgentStatus('smith', 'paused');
        this.instructionInput.disabled = false;
        this.instructionInput.placeholder = 'Type your answer here and press Enter...';
        this.instructionInput.focus();
    }

    // **NEW**: Resumes the loop after the user answers
    private handleUserResponse() {
        const response = this.instructionInput.value.trim();
        if (!response) return;

        this.logToTerminal('User', response);
        this.history.push({ role: 'User', content: `Response to question: ${response}` });
        
        this.instructionInput.value = '';
        this.instructionInput.disabled = true;
        this.instructionInput.placeholder = 'Agent is working...';
        
        this.isPaused = false;
        this.setAgentStatus('smith', 'idle');
        this.mainLoop(); // Resume the loop
    }

    // **UPGRADED**: The reflection prompt is now much deeper
    private async reflectAndLearn(task: string, originalCode: string, fixedCode: string) {
        this.logToTerminal('AgentSmith', 'Reflecting on fix to generate new heuristic...');
        const prompt = `
            Analyze the following code change. Your goal is to create a general programming heuristic from it.
            
            **TASK:** ${task}
            **ORIGINAL CODE:**\n\`\`\`\n${originalCode}\n\`\`\`
            **FIXED CODE:**\n\`\`\`\n${fixedCode}\n\`\`\`

            Based on this, generate a JSON object with:
            1. "problem": A short, general description of the problem category (e.g., "Unsanitized database query").
            2. "solution": A short, general description of the solution pattern (e.g., "Use prepared statements or ORM methods").
            3. "heuristic": A single, powerful, reusable rule for future projects. (e.g., "Always validate and sanitize external data before it interacts with critical systems like databases or command lines.").
            4. "keywords": An array of 3-5 relevant keywords.

            **OUTPUT MUST BE A VALID JSON OBJECT.**
        `;
        try {
            const learning = await this.callLLM({ provider: 'claude', prompt }); // Use a model good at reasoning
            await this.saveLearning(learning);
        } catch (error) {
            this.logToTerminal('System Error', `Could not generate learning: ${(error as Error).message}`);
        }
    }

    // ... other functions (startOrchestration, delegateToWorker, saveLearning, UI handlers, etc.) ...
    private setAgentStatus(id: any, status: AgentStatus) { /* ... */ }
    private logToTerminal(sender: string, message: string) { /* ... */ }
    private resetControls(isStarting: boolean) { /* ... */ }
    private async saveLearning(learning: Learning) { /* ... */ }
    private async callLLM(args: {provider: string, prompt: string}) { /* ... */ return {}; }
    private async delegateToWorker(plan: AgentPlan) { /* ... */ return ""; }
    private async startOrchestration() { /* ... */ }
}

new AgentSmithOpsHub();
