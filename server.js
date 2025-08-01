import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import OpenAI from 'openai';
import helmet from 'helmet';
import winston from 'winston';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
});

// Environment Validation
const envSchema = z.object({
  XAI_API_KEY: z.string().min(1, 'XAI_API_KEY is required'),
  DEEPSEEK_API_KEY: z.string().min(1, 'DEEPSEEK_API_KEY is required').optional(),
  NODE_ENV: z.enum(['development', 'production']).default('production'),
  PORT: z.string().optional()
});

try {
  envSchema.parse(process.env);
} catch (error) {
  logger.error('Environment variable validation failed:', error);
  process.exit(1);
}

// Agent Pool
const agents = [
  {
    name: 'xai-primary',
    type: 'xai',
    url: 'https://api.x.ai/v1',
    health: true,
    lastUsed: 0,
    client: process.env.XAI_API_KEY ? new OpenAI({
      baseURL: 'https://api.x.ai/v1',
      apiKey: process.env.XAI_API_KEY
    }) : null
  },
  {
    name: 'deepseek',
    type: 'deepseek',
    url: 'https://api.deepseek.com/v1',
    health: process.env.DEEPSEEK_API_KEY ? true : false,
    lastUsed: 0,
    client: null
  }
];

// Health Check for Agents
async function checkAgentHealth(agent) {
  try {
    const url = new URL(agent.url);
    const client = url.protocol === 'https:' ? https : http;
    await new Promise((resolve) => {
      const req = client.request(
        {
          method: 'HEAD',
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname,
          timeout: 5000
        },
        (res) => {
          agent.health = res.statusCode < 500;
          resolve();
        }
      );
      req.on('error', () => {
        agent.health = false;
        resolve();
      });
      req.end();
    });
  } catch {
    agent.health = false;
  }
  logger.info('Agent health check', { agent: agent.name, health: agent.health });
}

// Periodically check agent health
setInterval(async () => {
  for (const agent of agents) {
    await checkAgentHealth(agent);
  }
}, 60000);

// Request Analysis
function analyzeRequest(reqBody) {
  const schema = z.object({
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().min(1)
    })).min(1),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    stream: z.boolean().optional(),
    top_p: z.number().min(0).max(1).optional()
  });

  try {
    const validated = schema.parse(reqBody);
    const totalLength = validated.messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return {
      isValid: true,
      complexity: totalLength > 1000 ? 'high' : totalLength > 500 ? 'medium' : 'low',
      requiresDeepseek: validated.messages.some(msg => msg.content.toLowerCase().includes('deepseek')),
      validated
    };
  } catch (error) {
    return { isValid: false, error };
  }
}

// Select Agents
function selectAgents(analysis) {
  const availableAgents = agents.filter(agent => agent.health && (agent.client || agent.type === 'deepseek'));
  if (!availableAgents.length) {
    throw new Error('No healthy agents available');
  }

  if (analysis.complexity === 'high') {
    return availableAgents; // Use all agents for high complexity
  } else if (analysis.requiresDeepseek && availableAgents.some(a => a.type === 'deepseek')) {
    return availableAgents.filter(a => a.type === 'deepseek');
  } else {
    return availableAgents.filter(a => a.type === 'xai').slice(0, 1); // Default to one XAI agent
  }
}

// Execute Task
async function executeTask(agent, reqBody, validatedBody) {
  try {
    if (agent.type === 'xai' && agent.client) {
      const completion = await agent.client.chat.completions.create({
        model: 'grok-4-0709',
        messages: validatedBody.messages,
        temperature: validatedBody.temperature || 0,
        max_tokens: validatedBody.max_tokens,
        stream: validatedBody.stream || false,
        top_p: validatedBody.top_p
      });
      agent.lastUsed = Date.now();
      return { agent: agent.name, result: completion, success: true };
    } else if (agent.type === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
      return new Promise((resolve, reject) => {
        const url = new URL(agent.url);
        const cleanPath = new URL('/chat/completions', agent.url).pathname;
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Host': url.hostname
        };

        const options = {
          hostname: url.hostname,
          port: url.port || 443,
          path: cleanPath,
          method: 'POST',
          headers,
          timeout: 10000
        };

        const proxyReq = https.request(options, (proxyRes) => {
          let data = '';
          proxyRes.on('data', chunk => data += chunk);
          proxyRes.on('end', () => {
            agent.lastUsed = Date.now();
            resolve({ agent: agent.name, result: JSON.parse(data), success: true });
          });
        });

        proxyReq.on('error', (err) => reject(err));
        proxyReq.write(JSON.stringify(reqBody));
        proxyReq.end();
      });
    }
    throw new Error(`Unsupported or unconfigured agent: ${agent.name}`);
  } catch (error) {
    return { agent: agent.name, success: false, error: error.message };
  }
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"]
    }
  }
}));
app.use(cors({
  origin: ['https://skygemaix.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());

// Request Logging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  next();
});

// Unified API Endpoint
app.post('/api/chat/completions', async (req, res, next) => {
  try {
    const analysis = analyzeRequest(req.body);
    if (!analysis.isValid) {
      throw analysis.error;
    }

    logger.info('Request analysis', {
      complexity: analysis.complexity,
      requiresDeepseek: analysis.requiresDeepseek
    });

    const selectedAgents = selectAgents(analysis);
    logger.info('Selected agents', { agents: selectedAgents.map(a => a.name) });

    // Execute tasks in parallel
    const results = await Promise.all(
      selectedAgents.map(agent => executeTask(agent, req.body, analysis.validated))
    );

    // Filter successful results
    const successfulResults = results.filter(r => r.success);
    if (!successfulResults.length) {
      throw new Error('All agents failed to process the request');
    }

    logger.info('Task results', {
      results: results.map(r => ({
        agent: r.agent,
        success: r.success,
        choices: r.result?.choices?.length
      }))
    });

    // Return first successful result
    res.json({ status: 'success', data: successfulResults[0].result });
  } catch (error) {
    next(error);
  }
});

// Serve Static Files
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error('Application error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Invalid request data', details: err.errors });
  }

  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'production'
  });
}); 