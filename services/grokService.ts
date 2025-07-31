interface GrokMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface GrokRequest {
    messages: GrokMessage[];
    model: string;
    stream: boolean;
}

interface GrokResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class GrokService {
    private apiKey: string;
    private baseUrl: string = 'https://api.x.ai/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async chatCompletion(
        messages: GrokMessage[],
        model: string = 'grok-4',
        stream: boolean = false
    ): Promise<GrokResponse> {
        const requestBody: GrokRequest = {
            messages,
            model,
            stream
        };

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Grok API request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            return await response.json() as GrokResponse;
        } catch (error) {
            console.error('Error calling Grok API:', error);
            throw error;
        }
    }

    async askQuestion(question: string, systemPrompt?: string): Promise<string> {
        const messages: GrokMessage[] = [];
        
        if (systemPrompt) {
            messages.push({
                role: 'system',
                content: systemPrompt
            });
        } else {
            messages.push({
                role: 'system',
                content: 'You are Grok, a highly intelligent, helpful AI assistant.'
            });
        }

        messages.push({
            role: 'user',
            content: question
        });

        const response = await this.chatCompletion(messages);
        return response.choices[0]?.message?.content || 'No response received';
    }
}

// Factory function to create GrokService instance
export const createGrokService = (): GrokService => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
        throw new Error('XAI_API_KEY environment variable not set');
    }
    return new GrokService(apiKey);
}; 