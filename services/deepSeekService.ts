import OpenAI from "openai";

// Initialize DeepSeek client
const createDeepSeekClient = () => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
        console.error("DEEPSEEK_API_KEY environment variable not set.");
        throw new Error("DEEPSEEK_API_KEY environment variable not set.");
    }
    
    return new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey
    });
};

// Generate content using DeepSeek
export const generateDeepSeekResponse = async (
    messages: Array<{ role: "system" | "user" | "assistant", content: string }>,
    temperature: number = 0.4,
    maxTokens?: number
): Promise<string> => {
    const deepSeek = createDeepSeekClient();
    
    try {
        const completion = await deepSeek.chat.completions.create({
            messages,
            model: "deepseek-chat",
            temperature,
            max_tokens: maxTokens,
        });
        
        return completion.choices[0]?.message?.content || "No response generated";
    } catch (error) {
        console.error("Error calling DeepSeek API:", error);
        throw new Error(`DeepSeek API error: ${error}`);
    }
};

// Generate content with retry logic
export const generateDeepSeekResponseWithRetry = async (
    messages: Array<{ role: "system" | "user" | "assistant", content: string }>,
    temperature: number = 0.4,
    maxTokens?: number,
    maxRetries: number = 3
): Promise<string> => {
    let lastError: any = null;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await generateDeepSeekResponse(messages, temperature, maxTokens);
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${i + 1} failed for DeepSeek. Retrying...`, error);
            if (i < maxRetries - 1) {
                await new Promise(res => setTimeout(res, 1500 * (i + 1))); // Exponential backoff
            }
        }
    }
    
    throw new Error(`DeepSeek failed to produce a valid response after ${maxRetries} retries. Last error: ${lastError}`);
};

// Helper function to create a simple prompt
export const askDeepSeek = async (
    prompt: string,
    systemPrompt?: string,
    temperature: number = 0.4
): Promise<string> => {
    const messages: Array<{ role: "system" | "user" | "assistant", content: string }> = [];
    
    if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
    }
    
    messages.push({ role: "user", content: prompt });
    
    return generateDeepSeekResponseWithRetry(messages, temperature);
}; 