// Test script for dual API integration (XAI + DeepSeek)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAPIs() {
  // Load environment variables
  const envPath = path.join(__dirname, '.env.local');
  let xaiApiKey = process.env.XAI_API_KEY;
  let deepseekApiKey = process.env.DEEPSEEK_API_KEY;
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const xaiMatch = envContent.match(/XAI_API_KEY=(.+)/);
    const deepseekMatch = envContent.match(/DEEPSEEK_API_KEY=(.+)/);
    
    if (xaiMatch) xaiApiKey = xaiMatch[1].trim();
    if (deepseekMatch) deepseekApiKey = deepseekMatch[1].trim();
  }
  
  console.log('Testing dual API integration...\n');
  
  // Test XAI API (AgentSmith)
  console.log('=== Testing XAI API (AgentSmith) ===');
  if (!xaiApiKey) {
    console.log('❌ No XAI_API_KEY found');
  } else {
    try {
             const response = await fetch('http://localhost:3001/api/xai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${xaiApiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [{ role: 'user', content: 'Hello, AgentSmith test' }],
          max_tokens: 30, // Ultra-low for speed
          temperature: 0.0, // Ultra-low for precision
          stream: false, // No streaming for instant response
          top_p: 0.1 // Minimal randomness for speed
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ XAI API working');
        console.log('Response:', data.choices?.[0]?.message?.content || 'No content');
      } else {
        const errorText = await response.text();
        console.log(`❌ XAI API error: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ XAI API error: ${error.message}`);
    }
  }
  
  // Test DeepSeek API (Worker Agents)
  console.log('\n=== Testing DeepSeek API (Worker Agents) ===');
  if (!deepseekApiKey) {
    console.log('❌ No DEEPSEEK_API_KEY found');
  } else {
    try {
             const response = await fetch('http://localhost:3001/api/deepseek/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekApiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-coder',
          messages: [{ role: 'user', content: 'Write a simple Python function to add two numbers.' }],
          max_tokens: 100, // Reduced for speed
          temperature: 0.0, // Ultra-low for precision
          stream: false, // No streaming for instant response
          top_p: 0.1 // Minimal randomness for speed
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ DeepSeek API working');
        console.log('Response:', data.choices[0].message.content);
      } else {
        const errorText = await response.text();
        console.log(`❌ DeepSeek API error: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ DeepSeek API error: ${error.message}`);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`XAI API: ${xaiApiKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`DeepSeek API: ${deepseekApiKey ? '✅ Configured' : '❌ Missing'}`);
}

// Run the test
testAPIs(); 