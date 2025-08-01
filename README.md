# AgentSmith Operations Hub

A sophisticated multi-agent system for automated code analysis, optimization, and improvement.

## Recent Improvements (Latest Update)

### Fixed Repetitive Security Audit Issue
- **Problem**: AGENT smith was getting stuck in loops, repeatedly recommending security audits instead of assigning different agents to complete coding tasks.
- **Solution**: Implemented enhanced decision logic with better agent diversity and anti-repetition mechanisms.

### Key Improvements Made:

1. **Enhanced Decision Logic**: 
   - Replaced AI-based decision making with deterministic logic to prevent repetitive patterns
   - Added phase-based progression system (FORCE_PROGRESSION, FORCE_IMPLEMENTATION, FORCE_CREATIVE)
   - Implemented smart agent rotation based on usage history

2. **Anti-Repetition Mechanisms**:
   - Tracks recent agent usage (last 5 actions)
   - Forces progression when Debugger is overused (≥2 times)
   - Prioritizes least-used agents for better diversity
   - Prevents getting stuck in security audit loops

3. **Improved Agent Assignment**:
   - Smart fallback system that chooses least recently used agents
   - Better detection of repetitive patterns
   - Forced assignment to different agents when overuse is detected

4. **Phase Progression**:
   - INITIAL SCAN → SECURITY AUDIT → CODE QUALITY → PERFORMANCE → IMPLEMENTATION → CREATIVE SOLUTIONS → FINAL REVIEW
   - Automatic phase detection and forced progression
   - Maximum iteration limit (20) to prevent infinite loops

### Agent Roles:
- **Agent A (Fixer)**: Implements code fixes, security patches, and improvements
- **Agent B (Debugger)**: Detects bugs, security vulnerabilities, and code quality issues
- **Agent C (Optimizer)**: Optimizes performance, refactors code, and improves architecture
- **Agent D (CodeManiac)**: Provides creative, innovative, and novel solutions

## Features

- **Multi-Agent Orchestration**: Coordinates four specialized AI agents
- **Real-time Analysis**: Live terminal output showing agent activities
- **Project Cloning**: Automatic project source handling
- **Interactive Controls**: Start, pause, stop, and cancel operations
- **Instruction History**: Track and manage user instructions
- **Security Focus**: Comprehensive security vulnerability scanning
- **Performance Optimization**: Database and code performance analysis
- **Creative Solutions**: Innovative approaches and novel patterns

## Usage

1. Enter your project source in the input field
2. Click "Start" to begin the analysis
3. Monitor real-time progress in the terminal
4. Use the instruction input to provide specific guidance
5. Control the workflow with pause/stop/cancel buttons

## Technical Stack

- **Frontend**: TypeScript, Vite, Modern CSS
- **Backend**: Node.js, Express, Helmet (security)
- **AI Integration**: XAI API, DeepSeek API
- **Logging**: Winston for comprehensive logging
- **Validation**: Zod for request validation

## Environment Variables

- `XAI_API_KEY`: Required for XAI API access
- `DEEPSEEK_API_KEY`: Required for DeepSeek API access
- `NODE_ENV`: Environment mode (development/production)
- `PORT`: Server port (default: 3001)

## Installation

```bash
npm install
npm run build
npm start
```

## Development

```bash
npm run dev
```

The system now provides much better agent diversity and prevents the repetitive security audit recommendations that were previously occurring.
