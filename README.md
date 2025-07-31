# AgentSmith Ops Hub

A multi-agent AI orchestration system for intelligent software project analysis and optimization.

## 🚀 Live Demo

**Live Demo**: [https://skygemaix.onrender.com](https://skygemaix.onrender.com)

## 🧠 Features

### **Intelligent Agent Orchestration**
- **AgentSmith (Controller)**: Uses XAI (Grok) for strategic decision-making
- **Debugger Agent**: Security vulnerability scanning and code quality analysis
- **Optimizer Agent**: Performance optimization and architectural improvements  
- **Fixer Agent**: Code implementation and security patches
- **CodeManiac Agent**: Creative solutions, novel approaches, and innovative patterns

### **Smart File Access System**
- **Project Cloning**: Simulates repository cloning for analysis
- **File Content Access**: Agents receive actual code files for detailed analysis
- **Relevant File Detection**: Automatically identifies files related to specific tasks
- **Security & Performance Issues**: Pre-built sample files with real vulnerabilities

### **Anti-Repetition Intelligence**
- **FORCE_PROGRESSION**: Prevents agents from getting stuck in loops
- **Balanced Agent Usage**: Ensures all three agents are utilized effectively
- **Smart Phase Detection**: Tracks analysis progress and forces progression
- **Maximum Iteration Limits**: Prevents infinite analysis loops

## 🛠️ Setup

### **Environment Variables**
Create a `.env.local` file with your API keys:

```bash
XAI_API_KEY=your_xai_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

### **Installation**
```bash
npm install
npm run dev
```

### **Development Server**
```bash
npm run dev
```

### **Production Build**
```bash
npm run build
npm start
```

## 🏗️ Architecture

### **Dual AI System**
- **XAI (Grok)**: AgentSmith controller for strategic decisions
- **DeepSeek**: Worker agents for detailed code analysis

### **File Access Layer**
- **Project Files**: 10+ sample files with real security/performance issues
- **Smart Detection**: Automatically selects relevant files for each task
- **Content Formatting**: Provides structured file content to agents

### **Agent Intelligence**
- **Phase Detection**: Tracks analysis progress (Initial → Security → Performance → Implementation → Creative → Review)
- **Anti-Repetition**: Forces progression when agents get stuck
- **Context Awareness**: Provides file content and analysis history to agents
- **Creative Solutions**: CodeManiac provides innovative approaches with higher temperature (0.7)

## 📊 Sample Project Files

The system includes sample files with real issues for analysis:

- **`auth.js`**: SQL injection vulnerability, weak validation
- **`models/user.js`**: Missing database indexes
- **`routes/api.js`**: No authentication, N+1 query issues
- **`middleware/validation.js`**: Weak input validation
- **`config/database.js`**: No connection pooling
- **`utils/helpers.js`**: Inefficient algorithms, O(n²) complexity

## 🚀 Deployment

### **Render Deployment**
1. **Connect to Render**: Push code to GitHub and connect to Render
2. **Environment Variables**: Set `XAI_API_KEY` and `DEEPSEEK_API_KEY`
3. **Build Command**: `npm ci && npm run build`
4. **Start Command**: `npm start`

### **Environment Variables for Render**
- `NODE_ENV`: `production`
- `XAI_API_KEY`: Your XAI API key
- `DEEPSEEK_API_KEY`: Your DeepSeek API key

## 🔧 Technical Details

### **API Integration**
- **XAI Proxy**: `/api/xai/v1/chat/completions`
- **DeepSeek Proxy**: `/api/deepseek/chat/completions`
- **Custom Proxy Server**: Handles CORS and API routing

### **Agent Communication**
- **Ultra-Fast**: Low `max_tokens`, `temperature: 0.0`, no streaming
- **Precise**: Optimized prompts for speed and accuracy
- **Contextual**: File content and analysis history provided

### **File System Simulation**
- **Project Cloning**: Simulates git clone operation
- **File Loading**: Loads sample files with real issues
- **Content Access**: Provides actual code to agents for analysis

## 🎯 Use Cases

### **Security Analysis**
- SQL injection detection
- XSS vulnerability scanning
- Authentication flaw identification
- Input validation assessment

### **Performance Optimization**
- N+1 query detection
- Memory leak identification
- Algorithm complexity analysis
- Database optimization

### **Code Quality**
- Maintainability assessment
- Complexity analysis
- Best practice validation
- Architectural review

### **Creative Solutions**
- Innovative architectural patterns
- Novel security approaches
- Experimental optimizations
- Futuristic programming paradigms

## 📈 Recent Improvements

### **AgentSmith Intelligence**
- ✅ Enhanced phase detection with FORCE_PROGRESSION
- ✅ Anti-repetition logic prevents Debugger loops
- ✅ Better worker assignment with fallback to Optimizer
- ✅ Improved context awareness in decision making
- ✅ Maximum iteration limits prevent infinite loops

### **File Access System**
- ✅ Project files loaded for agent analysis
- ✅ Relevant file detection based on task type
- ✅ File content formatting for detailed analysis
- ✅ Security and performance issues in sample files
- ✅ Agents now have access to actual code content

### **CodeManiac Agent (New)**
- ✅ **Creative Temperature**: Higher temperature (0.7) for innovative responses
- ✅ **Novel Approaches**: Unconventional solutions and cutting-edge patterns
- ✅ **Experimental Optimizations**: WebAssembly, blockchain, zero-knowledge proofs
- ✅ **Futuristic Patterns**: Reactive programming, microservices, GraphQL federation
- ✅ **Four-Agent System**: Complete coverage from debugging to creativity

## 🔗 Links

- **Live Demo**: [https://skygemaix.onrender.com](https://skygemaix.onrender.com)
- **Repository**: Your GitHub repository
- **Render Dashboard**: Your Render service dashboard
