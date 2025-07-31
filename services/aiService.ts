import { Agent, AgentSmithDecision, AIModel } from '../types';
import { createGrokClientService } from './grokClientService';
import { generateDeepSeekResponseWithRetry } from './deepSeekService';

// API keys are now handled in the individual services

// Initialize AI providers
let grokService: any = null;

const initializeAIProviders = () => {
    if (!grokService) {
        grokService = createGrokClientService();
    }
    return { grokService };
};

// AgentSmith response schema for JSON parsing
const agentSmithResponseSchema = {
    thought: "string",
    plan: "array of strings (optional)",
    currentGoal: "string (optional)",
    suggestedAgentId: "string (optional)",
    suggestedModel: "string (optional) - one of: grok-4, grok-3-mini, grok-3-mini-fast, deepseek-coder-33b-instruct",
    status: "running or complete",
    finalOutput: "string (optional)",
    recommendation: "string (optional)"
};

const sanitizeJson = (rawText: string): string => {
    const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
        return match[1].trim();
    }
    return rawText.trim();
};

// Model selection logic based on task complexity
const determineModelForTask = (task: string, agentRole: string): AIModel => {
    const taskLower = task.toLowerCase();
    const roleLower = agentRole.toLowerCase();
    
    // Simple tasks that can use faster models
    const simpleTasks = [
        'analyze', 'review', 'check', 'validate', 'test', 'document',
        'read', 'examine', 'inspect', 'verify', 'confirm'
    ];
    
    // Complex tasks that need more powerful models
    const complexTasks = [
        'implement', 'create', 'build', 'develop', 'design', 'architect',
        'refactor', 'optimize', 'debug', 'solve', 'generate', 'write'
    ];
    
    // Check if task is simple
    const isSimpleTask = simpleTasks.some(keyword => taskLower.includes(keyword));
    const isComplexTask = complexTasks.some(keyword => taskLower.includes(keyword));
    
    // Check agent role complexity
    const isComplexRole = roleLower.includes('architect') || 
                         roleLower.includes('engineer') || 
                         roleLower.includes('developer') ||
                         roleLower.includes('coder');
    
    // Model selection logic
    if (isSimpleTask && !isComplexRole) {
        return 'grok-3-mini-fast'; // Fastest for simple tasks
    } else if (isSimpleTask || (!isComplexTask && !isComplexRole)) {
        return 'grok-3-mini'; // Balanced for moderate tasks
    } else if (isComplexTask || isComplexRole) {
        return 'deepseek-coder-33b-instruct'; // Best for coding tasks
    } else {
        return 'grok-4'; // Default for strategic decisions
    }
};

// AgentSmith uses Grok for strategic decision making
const generateAgentSmithDecisionWithRetry = async (
    prompt: string,
    maxRetries: number = 3
): Promise<string> => {
    const { grokService } = initializeAIProviders();
    let lastError: any = null;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const systemPrompt = `You are AgentSmith, a strategic AI coordinator. You must respond with valid JSON in the following format:
{
    "thought": "your reasoning about the situation",
    "plan": ["step1", "step2", "step3"],
    "currentGoal": "current objective",
    "suggestedAgentIds": ["agent_id_1", "agent_id_2"],
    "suggestedModels": ["model_1", "model_2"],
    "status": "running" or "complete",
    "finalOutput": "final result if complete",
    "recommendation": "next steps or recommendations"
}

Choose the model based on task complexity:
- grok-3-mini-fast: Simple analysis, review, or documentation tasks
- grok-3-mini: Moderate tasks, general work
- deepseek-coder-33b-instruct: Complex coding, implementation, or technical tasks
- grok-4: Strategic decisions and complex planning

IMPORTANT: You can assign multiple agents to work simultaneously on different aspects of the same goal. Only use agents that are actually needed.`;
            
            const response = await grokService.askQuestion(prompt, systemPrompt);
            return response;
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${i + 1} failed for AgentSmith decision (Grok). Retrying...`, error);
            if (i < maxRetries - 1) {
                await new Promise(res => setTimeout(res, 1500 * (i + 1))); // Exponential backoff
            }
        }
    }
    throw new Error(`AgentSmith (Grok) failed to produce a valid response after ${maxRetries} retries. Last error: ${lastError}`);
};

// Worker agents use selected models for task execution
const generateWorkerResponseWithRetry = async (
    prompt: string,
    model: AIModel = 'deepseek-coder-33b-instruct',
    maxRetries: number = 3
): Promise<string> => {
    let lastError: any = null;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            if (model.startsWith('grok')) {
                const { grokService } = initializeAIProviders();
                const response = await grokService.askQuestion(prompt, undefined, model);
                return response;
            } else {
                // Use DeepSeek for coding tasks
                const response = await generateDeepSeekResponseWithRetry([
                    { role: "user", content: prompt }
                ], 0.4);
                return response;
            }
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${i + 1} failed for worker task (${model}). Retrying...`, error);
            if (i < maxRetries - 1) {
                await new Promise(res => setTimeout(res, 1500 * (i + 1))); // Exponential backoff
            }
        }
    }
    throw new Error(`Worker (${model}) failed to produce a valid response after ${maxRetries} retries. Last error: ${lastError}`);
};

export const getAgentSmithDecision = async (
    agentSmithPrompt: string,
    agents: Agent[],
    objective: string,
    history: string
): Promise<AgentSmithDecision> => {
    const agentList = agents.map(a => `- ${a.name} (id: ${a.id}): ${a.role}`).join('\n');
    const prompt = `
        ${agentSmithPrompt}

        Your available agents are:
        ${agentList}

        The user's primary objective is: "${objective}"

        Here is the history of the work done so far in the shared workspace. Use it to inform your next move:
        ---
        ${history || "This is the first step. Please create a plan and delegate the first task."}
        ---

        Based on the objective and history, what is the next logical step? Your response MUST be in the specified JSON format.
        
        IMPORTANT: Choose the appropriate model for the suggested agent based on task complexity:
        - grok-3-mini-fast: Simple analysis, review, or documentation tasks
        - grok-3-mini: Moderate tasks, general work  
        - deepseek-coder-33b-instruct: Complex coding, implementation, or technical tasks
        - grok-4: Strategic decisions and complex planning
    `;

    const response = await generateAgentSmithDecisionWithRetry(prompt);
    const jsonText = sanitizeJson(response);
    
    try {
        return JSON.parse(jsonText) as AgentSmithDecision;
    } catch (e) {
        console.error("Failed to parse AgentSmith decision JSON:", e);
        console.error("Raw text from AI:", jsonText);
        throw new Error("AI returned malformed JSON for AgentSmith decision.");
    }
};

export const executeAgentTask = async (
    agent: Agent,
    task: string,
    fullHistory: string,
    model?: AIModel
): Promise<string> => {
    // If no model specified, determine based on task complexity
    const selectedModel = model || determineModelForTask(task, agent.role);
    
    const prompt = `
        You are ${agent.name}.
        Your defined role is: "${agent.role}".

        You have been assigned the following high-level goal: "${task}".

        For context, here is the full history of the project workspace, including work from other agents. You can use any code or information from this history to complete your task.
        ---
        ${fullHistory}
        ---

        Execute your task based on your role and the provided goal. Provide a concise, clear response with your results. Focus on fulfilling the goal assigned to you.

        IMPORTANT: If you need additional information, clarification, or specific details to complete your task, start your response with "NEEDS_INPUT:" followed by what you need. Otherwise, provide your complete response.
    `;

    try {
        const response = await generateWorkerResponseWithRetry(prompt, selectedModel);
        
        // Check if the agent needs input
        if (response.trim().toUpperCase().startsWith('NEEDS_INPUT:')) {
            return response; // This will be handled by the main app to set waiting state
        }
        
        return response;
    } catch (error) {
        console.error(`Error executing task for agent ${agent.name}:`, error);
        return `Error: Failed to get a response from the AI for agent ${agent.name}.`;
    }
};

export const askQuestion = async (
    targetName: string,
    targetRole: string,
    question: string,
    contextHistory: string,
    model: AIModel = 'grok-4'
): Promise<string> => {
    const prompt = `
        You are ${targetName}, an AI agent with the role: "${targetRole}".
        You have received a direct, out-of-band question from the human operator via a terminal.
        Your primary task is still running, but you must answer this question concisely.
        
        Use the following project history for context if needed, but prioritize answering the user's specific question.
        --- PROJECT HISTORY ---
        ${contextHistory}
        --- END HISTORY ---

        The user's question is: "${question}"

        Provide a direct and concise answer.
    `;

    try {
        const response = await generateWorkerResponseWithRetry(prompt, model);
        return response;
    } catch (error) {
        console.error(`Error asking question to ${targetName}:`, error);
        return `Error: Failed to get a response from the AI for agent ${targetName}.`;
    }
}; 