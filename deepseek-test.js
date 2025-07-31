// DeepSeek API Test using OpenAI SDK
// Make sure to set your DEEPSEEK_API_KEY environment variable

import OpenAI from "openai";

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

async function testDeepSeek() {
    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: "You are a helpful assistant." }],
            model: "deepseek-chat",
        });

        console.log("DeepSeek Response:", completion.choices[0].message.content);
    } catch (error) {
        console.error("Error:", error);
    }
}

// Test with a more complex prompt
async function testComplexPrompt() {
    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "You are a coding assistant. Provide clear, concise answers." },
                { role: "user", content: "Write a simple JavaScript function to calculate the factorial of a number." }
            ],
            model: "deepseek-chat",
            temperature: 0.4,
        });

        console.log("Complex Prompt Response:", completion.choices[0].message.content);
    } catch (error) {
        console.error("Error:", error);
    }
}

// Run tests
console.log("Testing DeepSeek API...");
testDeepSeek();
testComplexPrompt(); 