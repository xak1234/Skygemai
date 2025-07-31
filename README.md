# AgentSmith Ops Hub

A multi-agent AI orchestration system for analyzing, debugging, and improving software projects using dual AI APIs:
- **AgentSmith (Controller)**: Powered by X.AI (Grok-4-0709) for orchestration
- **Worker Agents**: Powered by DeepSeek for specialized tasks

## Features

- **Multi-Agent System**: Three specialized agents (Fixer, Debugger, Optimizer) managed by AgentSmith
- **Real-time Terminal**: Live monitoring of agent activities and project analysis
- **Dual AI Integration**: XAI for orchestration, DeepSeek for worker tasks
- **Interactive Controls**: Start, pause, stop, and cancel operations

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your API keys:
   - Create a `.env.local` file in the project root
   - Add your API keys:
     ```
     XAI_API_KEY=your_xai_api_key_here
     DEEPSEEK_API_KEY=your_deepseek_api_key_here
     ```
   - Get your API keys from:
     - [XAI Console](https://console.x.ai/) for AgentSmith orchestration
     - [DeepSeek Platform](https://platform.deepseek.com/) for worker agents

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

## Usage

1. Enter a GitHub repository URL or local project path
2. Click "Start" to begin the analysis
3. Watch as AgentSmith orchestrates the three worker agents
4. Monitor progress in the real-time terminal
5. Use pause/stop controls as needed

## API Configuration

The app uses dual AI APIs for optimal performance:
- **AgentSmith (X.AI)**: Orchestration and decision-making using Grok-4-0709 model via OpenAI-compatible client
- **Worker Agents (DeepSeek)**: Specialized code analysis tasks using DeepSeek Coder model
  - **Agent A (Fixer)**: Code fixing and implementation
  - **Agent B (Debugger)**: Code debugging and vulnerability scanning
  - **Agent C (Optimizer)**: Performance optimization and refactoring

### X.AI Integration

AgentSmith now uses the OpenAI-compatible client for X.AI API calls:

```javascript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: "<YOUR_XAI_API_KEY_HERE>",
});

const completion = await client.chat.completions.create({
  model: "grok-4-0709",
  messages: [...],
  temperature: 0,
});
```

## Deployment

### Render Deployment

**Live Demo**: [https://skygemaix.onrender.com](https://skygemaix.onrender.com)

1. **Connect to Render**:
   - Push your code to GitHub
   - Connect your repository to Render
   - Set environment variables in Render dashboard:
     - `XAI_API_KEY`: Your XAI API key
     - `DEEPSEEK_API_KEY`: Your DeepSeek API key
     - `NODE_ENV`: `production`

2. **Build Configuration**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - The app will be available at your Render URL

3. **Environment Variables**:
   - Add your API keys in the Render dashboard
   - The app will automatically use the production server

### Local Development

```bash
# Start the proxy server
node server.js

# Start the development server
npm run dev
```
