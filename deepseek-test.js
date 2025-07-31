// Test file for DeepSeek integration using local deployment
import { callLocalDeepSeek, askDeepSeek, generateDeepSeekResponse } from './services/deepSeekService.js';

// Example 1: Simple prompt using callLocalDeepSeek
async function testSimplePrompt() {
    try {
        console.log('Testing simple prompt...');
        const result = await callLocalDeepSeek('Generate a Node.js Express route that serves a file download.');
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Example 2: Using askDeepSeek with system prompt
async function testWithSystemPrompt() {
    try {
        console.log('\nTesting with system prompt...');
        const result = await askDeepSeek(
            'Write a TypeScript function that validates email addresses.',
            'You are a helpful coding assistant. Provide clean, well-documented code.',
            0.2
        );
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Example 3: Complex conversation
async function testComplexConversation() {
    try {
        console.log('\nTesting complex conversation...');
        const messages = [
            { role: 'system', content: 'You are a Python expert. Provide clear explanations with code examples.' },
            { role: 'user', content: 'How do I create a virtual environment in Python?' },
            { role: 'assistant', content: 'To create a virtual environment in Python, you can use the `venv` module.' },
            { role: 'user', content: 'Can you show me the exact commands?' }
        ];
        
        const result = await generateDeepSeekResponse(messages, 0.2, 512);
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run all tests
async function runTests() {
    console.log('🚀 Testing DeepSeek Integration...\n');
    
    await testSimplePrompt();
    await testWithSystemPrompt();
    await testComplexConversation();
    
    console.log('\n✅ Tests completed!');
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}

export { testSimplePrompt, testWithSystemPrompt, testComplexConversation }; 