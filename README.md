# AgentSmith Ops Hub

A multi-agent AI orchestration system for analyzing, debugging, and improving software projects using XAI (Grok) API.

## Features

- **Multi-Agent System**: Three specialized agents (Fixer, Debugger, Optimizer) managed by AgentSmith
- **Real-time Terminal**: Live monitoring of agent activities and project analysis
- **XAI Integration**: Powered by Grok-beta model for intelligent code analysis
- **Interactive Controls**: Start, pause, stop, and cancel operations

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your XAI API key:
   - Create a `.env.local` file in the project root
   - Add your XAI API key: `XAI_API_KEY=your_api_key_here`
   - Get your API key from [XAI Console](https://console.x.ai/)

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

The app uses XAI's Grok-beta model for:
- **AgentSmith**: Orchestration and decision-making
- **Worker Agents**: Specialized code analysis tasks

## Deployment

The app is configured for deployment on Render with environment variables already set up.
