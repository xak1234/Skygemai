# Grok API Setup Guide

This guide explains how to set up and use the X.AI Grok API in your Skygemai application.

## Prerequisites

1. **X.AI Account**: You need an account at [console.x.ai](https://console.x.ai/)
2. **API Key**: Generate an API key from the X.AI console

## Setup Instructions

### 1. Get Your X.AI API Key

1. Go to [console.x.ai](https://console.x.ai/)
2. Sign up or log in to your account
3. Navigate to the API section
4. Generate a new API key
5. Copy the API key (it starts with `xai_`)

### 2. Configure Environment Variables

1. Copy the `env.template` file to `.env`:
   ```bash
   cp env.template .env
   ```

2. Edit the `.env` file and add your X.AI API key:
   ```env
   XAI_API_KEY=your_xai_api_key_here
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Test the Integration

Run the test script to verify your API key works:

```bash
node test-grok.js
```

You should see output like:
```
Testing Grok API...
✅ Grok API test successful!
📝 Grok's answer:
[Grok's response to the test question]
```

## API Usage

The Grok API is now integrated into your application through the `GrokService` class in `services/grokService.ts`.

### Basic Usage

```typescript
import { createGrokService } from './services/grokService';

const grokService = createGrokService();

// Ask a simple question
const answer = await grokService.askQuestion("What is the meaning of life?");

// Use custom system prompt
const response = await grokService.askQuestion(
    "Explain quantum computing",
    "You are a quantum physics expert. Explain concepts simply."
);
```

### Advanced Usage

```typescript
import { GrokService } from './services/grokService';

const grokService = new GrokService('your_api_key');

const messages = [
    {
        role: 'system',
        content: 'You are a helpful coding assistant.'
    },
    {
        role: 'user',
        content: 'Write a Python function to calculate fibonacci numbers.'
    }
];

const response = await grokService.chatCompletion(messages, 'grok-4', false);
console.log(response.choices[0].message.content);
```

## API Endpoints

The Grok API supports the following models:
- `grok-4`: Latest Grok model (recommended)
- `grok-beta`: Beta version

## Error Handling

The service includes built-in error handling:
- Invalid API keys
- Network errors
- Rate limiting
- Malformed requests

## Rate Limits

X.AI has rate limits on API usage. Check the [X.AI documentation](https://docs.x.ai/) for current limits.

## Troubleshooting

### Common Issues

1. **"XAI_API_KEY environment variable not set"**
   - Make sure you've added your API key to the `.env` file
   - Restart your development server after adding the key

2. **"API request failed: 401 Unauthorized"**
   - Check that your API key is correct
   - Ensure the key starts with `xai_`

3. **"API request failed: 429 Too Many Requests"**
   - You've hit the rate limit
   - Wait a moment and try again

### Testing

Use the test script to verify your setup:
```bash
node test-grok.js
```

## Integration with AgentSmith

The Grok API is used by AgentSmith for strategic decision making. The system automatically:

1. Uses Grok for high-level planning
2. Delegates specific tasks to other AI models
3. Coordinates multi-agent workflows

## Security Notes

- Never commit your API key to version control
- Use environment variables for all API keys
- Rotate your API keys regularly
- Monitor your API usage in the X.AI console 