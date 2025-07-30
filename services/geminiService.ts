import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Agent, AgentSmithDecision } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const agentSmithResponseSchema = {
    type: Type.OBJECT,
    properties: {
        thought: { type: Type.STRING },
        plan: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            optional: true,
        },
        currentGoal: { type: Type.STRING, optional: true },
        suggestedAgentId: { type: Type.STRING, optional: true },
        status: { type: Type.STRING, enum: ["running", "complete"] },
        finalOutput: { type: Type.STRING, optional: true },
        recommendation: { type: Type.STRING, optional: true },
    },
    required: ["thought", "status"]
};

const sanitizeJson = (rawText: string): string => {
    const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
        return match[1].trim();
    }
    return rawText.trim();
}

const generateWithRetry = async (
    prompt: string,
    maxRetries: number = 3
): Promise<GenerateContentResponse> => {
    let lastError: any = null;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    temperature: 0.2,
                    responseMimeType: "application/json",
                    responseSchema: agentSmithResponseSchema,
                },
            });
            return response;
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${i + 1} failed for AgentSmith decision. Retrying...`, error);
            if (i < maxRetries - 1) {
                await new Promise(res => setTimeout(res, 1500 * (i + 1))); // Exponential backoff
            }
        }
    }
    throw new Error(`AgentSmith failed to produce a valid response after ${maxRetries} retries. Last error: ${lastError}`);
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
    `;

    const response = await generateWithRetry(prompt);
    const jsonText = sanitizeJson(response.text);
    
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
    fullHistory: string
): Promise<string> => {
    const prompt = `
        You are ${agent.name}.
        Your defined role is: "${agent.role}".

        You have been assigned the following high-level goal: "${task}".

        For context, here is the full history of the project workspace, including work from other agents. You can use any code or information from this history to complete your task.
        ---
        ${fullHistory}
        ---

        Execute your task based on your role and the provided goal. Provide a concise, clear response with your results. Focus on fulfilling the goal assigned to you.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.4,
            }
        });
        return response.text;
    } catch (error) {
        console.error(`Error executing task for agent ${agent.name}:`, error);
        return `Error: Failed to get a response from the AI for agent ${agent.name}.`;
    }
};

export const askQuestion = async (
    targetName: string,
    targetRole: string,
    question: string,
    contextHistory: string
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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.1, // Be factual for questions
            }
        });
        return response.text;
    } catch (error) {
        console.error(`Error asking question to ${targetName}:`, error);
        return `Error: Failed to get a response from the AI for agent ${targetName}.`;
    }
};