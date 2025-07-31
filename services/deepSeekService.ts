import axios from 'axios';

// Configuration for local DeepSeek deployment
const OPENAI_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'http://localhost:8000/v1';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-coder-33b-instruct';

// Initialize DeepSeek client
const createDeepSeekClient = () => {
    const baseURL = OPENAI_BASE_URL;
    
    if (!baseURL) {
        console.error("DEEPSEEK_BASE_URL environment variable not set.");
        throw new Error("DEEPSEEK_BASE_URL environment variable not set.");
    }
    
    return axios.create({
        baseURL,
        headers: {
            'Content-Type': 'application/json'
        }
    });
};

// Generate content using DeepSeek
export const generateDeepSeekResponse = async (
    messages: Array<{ role: "system" | "user" | "assistant", content: string }>,
    temperature: number = 0.2,
    maxTokens: number = 512
): Promise<string> => {
    const client = createDeepSeekClient();
    
    try {
        const response = await client.post('/chat/completions', {
            model: DEEPSEEK_MODEL,
            messages,
            temperature,
            max_tokens: maxTokens,
            do_sample: false
        });
        
        return response.data.choices[0]?.message?.content || "No response generated";
    } catch (error) {
        console.error("Error calling DeepSeek API:", error.response?.data || error.message);
        throw new Error(`DeepSeek API error: ${error.response?.data || error.message}`);
    }
};

// Generate content with retry logic
export const generateDeepSeekResponseWithRetry = async (
    messages: Array<{ role: "system" | "user" | "assistant", content: string }>,
    temperature: number = 0.2,
    maxTokens: number = 512,
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
    temperature: number = 0.2
): Promise<string> => {
    const messages: Array<{ role: "system" | "user" | "assistant", content: string }> = [];
    
    if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
    }
    
    messages.push({ role: "user", content: prompt });
    
    return generateDeepSeekResponseWithRetry(messages, temperature);
};

// Direct function call for simple prompts (like your example)
export const callLocalDeepSeek = async (prompt: string): Promise<string> => {
    try {
        const response = await axios.post(
            `${OPENAI_BASE_URL}/chat/completions`,
            {
                model: DEEPSEEK_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                max_tokens: 512
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        throw new Error(`DeepSeek API error: ${error.response?.data || error.message}`);
    }
}; 