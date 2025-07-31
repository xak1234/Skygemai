// Test script for XAI API integration
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testXAI() {
  // Try to load .env.local
  const envPath = path.join(__dirname, '.env.local');
  let apiKey = process.env.XAI_API_KEY;
  
  if (!apiKey && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/XAI_API_KEY=(.+)/);
    if (match) {
      apiKey = match[1].trim();
    }
  }
  
  if (!apiKey) {
    console.log('No XAI_API_KEY found in environment or .env.local');
    return false;
  }
  
  console.log('Testing XAI REST API integration...');
  
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message. Please respond with "XAI API is working!"'
          }
        ],
        max_tokens: 50,
        temperature: 0.1,
        stream: false
      })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`XAI API test failed: ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log('XAI API test successful!');
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    // Extract response text
    let responseText = '';
    if (data.choices && data.choices[0] && data.choices[0].message) {
      responseText = data.choices[0].message.content;
    } else if (data.response) {
      responseText = data.response;
    } else if (data.content) {
      responseText = data.content;
    } else {
      responseText = 'No text found in response';
    }
    
    console.log('Extracted response text:', responseText);
    return true;
  } catch (error) {
    console.log('XAI API test error:', error.message);
    return false;
  }
}

// Run the test
testXAI(); 