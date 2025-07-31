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

## How to Advise AgentSmith

AgentSmith is an intelligent orchestrator that follows a structured analysis approach. Here's how to guide its analysis:

### **Analysis Phases**

AgentSmith follows these phases automatically:

1. **INITIAL SCAN**: Project structure analysis and critical file identification
2. **SECURITY AUDIT**: Vulnerability scanning (auth, input validation, dependencies)
3. **CODE QUALITY**: Complexity analysis and maintainability assessment
4. **PERFORMANCE**: Bottleneck identification and optimization opportunities
5. **IMPLEMENTATION**: Code fixes and improvements
6. **FINAL REVIEW**: Validation and verification

### **AgentSmith Decision Logic**

AgentSmith makes decisions based on:

- **Project Context**: Current project and analysis history
- **Analysis Phases**: Structured progression through different analysis types
- **Worker Capabilities**: Understanding of each agent's specialization
- **Priority Order**: Security > Quality > Performance > Implementation

### **Worker Agent Specializations**

**Agent A (Fixer)**
- Code fixes and implementations
- Security patches and hardening
- Input validation improvements
- Error handling enhancements

**Agent B (Debugger)**
- Security vulnerability detection
- Code quality analysis
- Bug identification
- Maintainability assessment

**Agent C (Optimizer)**
- Performance bottleneck analysis
- Database query optimization
- Memory usage optimization
- Architectural improvements

### **Customizing AgentSmith's Strategy**

To modify AgentSmith's behavior, you can:

1. **Update System Prompt**: Modify the system message in `getSmithsNextMove()`
2. **Adjust Analysis Phases**: Change the phase descriptions in the prompt
3. **Modify Worker Assignment**: Update the keyword matching logic in `mainLoop()`
4. **Enhance Context**: Add more project-specific information to the prompt

### **Direct Communication with AgentSmith**

You can now directly communicate with AgentSmith using the communication panel:

#### **How to Use:**
1. **Start Analysis**: Begin the analysis process
2. **Enter Instructions**: Type your specific requirements in the instruction textarea
3. **Send Instructions**: Click "Send Instruction" or press `Ctrl+Enter`
4. **Monitor Progress**: Watch AgentSmith process your instructions in real-time

#### **Example Instructions:**
- `"Focus on security vulnerabilities in auth.js"`
- `"Analyze performance bottlenecks in database queries"`
- `"Implement input validation for user forms"`
- `"Scan for SQL injection vulnerabilities"`
- `"Optimize memory usage in image processing"`
- `"Check for XSS vulnerabilities in user input"`
- `"Analyze code complexity in the main module"`
- `"Implement proper error handling in API endpoints"`

#### **Instruction History:**
- All sent instructions are stored in the instruction history
- Instructions are timestamped for reference
- AgentSmith considers instruction history when making decisions

### **Example AgentSmith Responses**

AgentSmith responds to these types of commands:
- `"Assign Debugger scan auth.js for security vulnerabilities"`
- `"Assign Optimizer analyze database queries in models/"`
- `"Assign Fixer implement input validation in user.js"`
- `"Analysis complete. All phases finished."`

### **Advanced Configuration**

For custom analysis strategies, modify the system prompt in `index.tsx`:

```typescript
// In getSmithsNextMove() method
content: `You are AgentSmith, an intelligent AI orchestrator for software project analysis and optimization. You coordinate three specialized agents:

AGENT ROLES:
- Agent A (Fixer): Implements code fixes, security patches, and improvements
- Agent B (Debugger): Detects bugs, security vulnerabilities, and code quality issues  
- Agent C (Optimizer): Optimizes performance, refactors code, and improves architecture

ANALYSIS STRATEGY:
1. Start with broad project scanning to understand structure
2. Focus on security vulnerabilities (auth, input validation, dependencies)
3. Analyze code quality and maintainability
4. Identify performance bottlenecks and optimization opportunities
5. Implement fixes and improvements
6. Validate all changes

DECISION MAKING:
- Use specific file paths when possible (e.g., "scan auth.js", "analyze models/user.js")
- Prioritize security issues over performance
- Consider project context and previous findings
- Provide clear, actionable instructions to workers
- End analysis when all critical areas are covered

RESPONSE FORMAT: Single action command or "Analysis complete."`
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
