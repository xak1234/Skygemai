# DeepSeek API Integration

This project now uses the DeepSeek API via the OpenAI SDK for AI-powered features.

## Setup

1. **Install Dependencies**
   ```bash
   npm install openai
   ```

2. **Environment Variables**
   Set your DeepSeek API key in your environment:
   ```bash
   export DEEPSEEK_API_KEY="your-deepseek-api-key-here"
   ```
   
   Or add it to your `.env` file:
   ```
   DEEPSEEK_API_KEY=your-deepseek-api-key-here
   ```

## Usage

### Basic Usage

```javascript
import OpenAI from "openai";

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

async function main() {
    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: "You are a helpful assistant." }],
        model: "deepseek-chat",
    });

    console.log(completion.choices[0].message.content);
}
```

### Using the DeepSeek Service

The project includes a dedicated DeepSeek service (`services/deepSeekService.ts`) that provides:

- **`generateDeepSeekResponse`**: Basic API call
- **`generateDeepSeekResponseWithRetry`**: API call with retry logic
- **`askDeepSeek`**: Simple helper function

```javascript
import { askDeepSeek } from './services/deepSeekService';

// Simple usage
const response = await askDeepSeek(
    "What is the capital of France?",
    "You are a helpful assistant.",
    0.4
);

// Advanced usage with custom messages
import { generateDeepSeekResponseWithRetry } from './services/deepSeekService';

const response = await generateDeepSeekResponseWithRetry([
    { role: "system", content: "You are a coding assistant." },
    { role: "user", content: "Write a function to sort an array." }
], 0.4, 1000);
```

## Integration with AI Service

The main AI service (`services/aiService.ts`) has been updated to use DeepSeek for:

- **Worker Agent Tasks**: Individual agent task execution
- **Question Answering**: Direct questions to agents
- **AgentSmith Decisions**: Strategic coordination (still uses Grok)

## Testing

Run the test file to verify your setup:

```bash
node deepseek-test.js
```

Make sure your `DEEPSEEK_API_KEY` environment variable is set before running the test.

## API Parameters

- **Model**: `deepseek-chat`
- **Base URL**: `https://api.deepseek.com`
- **Temperature**: Default 0.4 (configurable)
- **Max Tokens**: Optional, configurable per request

## Error Handling

The service includes comprehensive error handling with:
- Retry logic with exponential backoff
- Detailed error messages
- Graceful fallbacks

## Migration from Google GenAI

The project has been migrated from the Google GenAI SDK to the OpenAI SDK for DeepSeek integration. The main changes:

1. **New Service**: `services/deepSeekService.ts`
2. **Updated AI Service**: `services/aiService.ts` now uses the new DeepSeek service
3. **Dependencies**: Added `openai` package, kept `@google/genai` for other features
4. **API Calls**: Simplified message format using OpenAI SDK conventions 