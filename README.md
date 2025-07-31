# AgentSmith Ops Hub

A sophisticated AI agent orchestration system that intelligently routes requests across multiple AI providers (X.AI and DeepSeek) with advanced health monitoring, request analysis, and load balancing capabilities.

## 🚀 Features

### **Intelligent Agent Management**
- **Multi-Agent Pool**: Supports X.AI (Grok-4) and DeepSeek AI providers
- **Health Monitoring**: Automatic health checks every 60 seconds
- **Load Balancing**: Intelligent agent selection based on request complexity
- **Failover**: Automatic failover to healthy agents

### **Request Analysis & Routing**
- **Complexity Analysis**: Analyzes request length and content to determine complexity
- **Smart Routing**: Routes requests to appropriate agents based on:
  - Request complexity (low/medium/high)
  - Specific provider requirements
  - Agent health status
- **Parallel Processing**: High-complexity requests use multiple agents simultaneously

### **Security & Monitoring**
- **Comprehensive Logging**: Winston-based logging with file and console output
- **Security Headers**: Helmet.js for enhanced security
- **Input Validation**: Zod schema validation for all requests
- **Error Handling**: Robust error handling with detailed logging

### **Performance Optimizations**
- **Connection Pooling**: Efficient agent connection management
- **Timeout Handling**: Configurable timeouts for all operations
- **Response Caching**: Intelligent response handling and caching

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agentsmith-ops-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Required
   XAI_API_KEY=your_xai_api_key_here
   
   # Optional (for DeepSeek support)
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   
   # Optional
   NODE_ENV=production
   PORT=3001
   ```

4. **Build the frontend**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   npm start
   ```

## 📡 API Usage

### Unified Chat Completions Endpoint

**Endpoint**: `POST /api/chat/completions`

**Request Body**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": false,
  "top_p": 0.9
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "choices": [
      {
        "message": {
          "role": "assistant",
          "content": "Hello! I'm doing well, thank you for asking..."
        }
      }
    ]
  }
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `XAI_API_KEY` | Yes | X.AI API key for Grok-4 access |
| `DEEPSEEK_API_KEY` | No | DeepSeek API key for additional AI provider |
| `NODE_ENV` | No | Environment (development/production) |
| `PORT` | No | Server port (default: 3001) |

### Agent Configuration

The system automatically configures agents based on available API keys:

- **X.AI Agent**: Uses Grok-4 model, configured when `XAI_API_KEY` is present
- **DeepSeek Agent**: Configured when `DEEPSEEK_API_KEY` is present

## 📊 Monitoring & Logs

### Log Files
- `logs/error.log`: Error-level logs
- `logs/combined.log`: All application logs

### Health Monitoring
- Automatic health checks every 60 seconds
- Agent status tracking
- Performance metrics logging

## 🚀 Deployment

### Render.com
The application is configured for deployment on Render.com with the provided `render.yaml` file.

### Environment Setup
1. Set required environment variables in your deployment platform
2. Ensure the `logs` directory is writable
3. Build the application before deployment

## 🔍 Request Analysis Logic

### Complexity Levels
- **Low**: < 500 characters
- **Medium**: 500-1000 characters  
- **High**: > 1000 characters

### Agent Selection
- **Low Complexity**: Single X.AI agent
- **Medium Complexity**: Single X.AI agent
- **High Complexity**: All available agents (parallel processing)
- **DeepSeek Requests**: Routes to DeepSeek when explicitly requested

## 🛡️ Security Features

- **CORS Protection**: Configured for specific origins
- **Security Headers**: Helmet.js implementation
- **Input Validation**: Zod schema validation
- **Error Sanitization**: Safe error responses in production

## 📈 Performance

- **Parallel Processing**: High-complexity requests use multiple agents
- **Connection Pooling**: Efficient HTTP connection management
- **Timeout Handling**: 10-second timeout for external API calls
- **Health Monitoring**: Continuous agent health tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the logs in the `logs/` directory
2. Verify environment variables are set correctly
3. Ensure API keys are valid and have sufficient credits
4. Check agent health status in the application logs
