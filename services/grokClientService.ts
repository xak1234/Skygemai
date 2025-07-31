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

export class GrokClientService {
    private baseUrl: string = '/api';

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
            const response = await fetch(`${this.baseUrl}/grok-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
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

    // Simple test method
    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/test-grok`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question: "Hello Grok! Can you confirm you're working?" })
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    message: errorData.message || 'API test failed'
                };
            }

            const data = await response.json();
            return {
                success: true,
                message: data.message
            };
        } catch (error) {
            return {
                success: false,
                message: `Connection error: ${error.message}`
            };
        }
    }
}

// Factory function to create GrokClientService instance
export const createGrokClientService = (): GrokClientService => {
    return new GrokClientService();
}; 