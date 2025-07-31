# DeepSeek Integration Setup Guide

This guide explains how to set up and use the DeepSeek model integration using a local deployment approach.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install axios
```

### 2. Environment Configuration

Add these variables to your `.env` file:

```env
# DeepSeek Configuration (for local deployment)
# Base URL for your local DeepSeek deployment
DEEPSEEK_BASE_URL=http://localhost:8000/v1
# Model name for DeepSeek (default: deepseek-coder-33b-instruct)
DEEPSEEK_MODEL=deepseek-coder-33b-instruct
```

### 3. Local DeepSeek Deployment

You'll need to deploy DeepSeek locally using one of these methods:

#### Option A: Using Ollama (Recommended)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull and run DeepSeek model
ollama pull deepseek-coder:33b-instruct
ollama serve

# In another terminal, start the OpenAI-compatible API
ollama run llama-cpp-python --server --host 0.0.0.0 --port 8000
```

#### Option B: Using vLLM
```bash
# Install vLLM
pip install vllm

# Start the server
python -m vllm.entrypoints.openai.api_server \
    --model deepseek-ai/deepseek-coder-33b-instruct \
    --host 0.0.0.0 \
    --port 8000
```

#### Option C: Using LM Studio
1. Download LM Studio
2. Download the DeepSeek model
3. Start the local server on port 8000

## 📝 Usage Examples

### Simple Prompt
```javascript
import { callLocalDeepSeek } from './services/deepSeekService.js';

const result = await callLocalDeepSeek('Generate a Node.js Express route that serves a file download.');
console.log(result);
```

### With System Prompt
```javascript
import { askDeepSeek } from './services/deepSeekService.js';

const result = await askDeepSeek(
    'Write a TypeScript function that validates email addresses.',
    'You are a helpful coding assistant. Provide clean, well-documented code.',
    0.2
);
```

### Complex Conversation
```javascript
import { generateDeepSeekResponse } from './services/deepSeekService.js';

const messages = [
    { role: 'system', content: 'You are a Python expert.' },
    { role: 'user', content: 'How do I create a virtual environment?' },
    { role: 'assistant', content: 'You can use the venv module.' },
    { role: 'user', content: 'Show me the exact commands.' }
];

const result = await generateDeepSeekResponse(messages, 0.2, 512);
```

## 🧪 Testing

Run the test file to verify your setup:

```bash
node deepseek-test.js
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DEEPSEEK_BASE_URL` | `http://localhost:8000/v1` | Base URL for your local DeepSeek deployment |
| `DEEPSEEK_MODEL` | `deepseek-coder-33b-instruct` | Model name to use |

### API Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `temperature` | `0.2` | Controls randomness (0.0 = deterministic, 1.0 = very random) |
| `max_tokens` | `512` | Maximum number of tokens to generate |
| `do_sample` | `false` | Whether to use sampling |

## 🚨 Troubleshooting

### Common Issues

1. **Connection Refused**
   - Make sure your local DeepSeek server is running on port 8000
   - Check if the server is accessible at `http://localhost:8000/v1`

2. **Model Not Found**
   - Verify the model name in your deployment
   - Check if the model is properly loaded

3. **Timeout Errors**
   - Increase timeout settings if needed
   - Check server performance and resources

### Debug Mode

Enable debug logging by setting:
```javascript
process.env.DEBUG = 'deepseek:*';
```

## 📚 API Reference

### `callLocalDeepSeek(prompt: string): Promise<string>`
Simple function for single prompts.

### `askDeepSeek(prompt: string, systemPrompt?: string, temperature?: number): Promise<string>`
Function with optional system prompt and temperature control.

### `generateDeepSeekResponse(messages: Message[], temperature?: number, maxTokens?: number): Promise<string>`
Full conversation support with message history.

### `generateDeepSeekResponseWithRetry(messages: Message[], temperature?: number, maxTokens?: number, maxRetries?: number): Promise<string>`
Same as above but with automatic retry logic.

## 🔄 Migration from Hugging Face API

If you were previously using the Hugging Face API approach, the main changes are:

1. **No API Key Required**: Local deployment doesn't need authentication
2. **OpenAI-Compatible Format**: Uses standard chat completion format
3. **Better Performance**: Local deployment is typically faster
4. **More Control**: Full control over model parameters and deployment

## 📈 Performance Tips

1. **Use Appropriate Temperature**: Lower values (0.1-0.3) for coding tasks
2. **Limit Token Count**: Set reasonable `max_tokens` to avoid long responses
3. **Batch Requests**: Group related prompts when possible
4. **Monitor Resources**: Keep an eye on GPU/CPU usage

## 🔗 Related Files

- `services/deepSeekService.ts` - Main service implementation
- `deepseek-test.js` - Test examples
- `env.template` - Environment configuration template 