// Test script for XAI API integration
async function testXAI() {
  const apiKey = process.env.XAI_API_KEY || 'test_key';
  
  console.log('Testing XAI API integration...');
  
  try {
    const response = await fetch('https://api.xai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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
        temperature: 0.1
      })
    });

    if (!response.ok) {
      console.log(`XAI API test failed: ${response.status} ${response.statusText}`);
      console.log('This is expected if no valid API key is provided');
      return false;
    }

    const data = await response.json();
    console.log('XAI API test successful!');
    console.log('Response:', data.choices[0].message.content);
    return true;
  } catch (error) {
    console.log('XAI API test error:', error.message);
    console.log('This is expected if no valid API key is provided');
    return false;
  }
}

// Run the test
testXAI(); 