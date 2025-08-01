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
import { exec } from 'child_process';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Logger
const logger = winston.createLogger({ /* ... Your logger config ... */ });

// --- Environment and Agent Pool Setup ---
// Your existing Zod validation and agent pool setup is good.
// We'll add a 'cost' metric to help the Director make smarter choices.
const agents = [
  { name: 'xai', type: 'xai', client: new OpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: process.env.XAI_API_KEY }), cost: 3 },
  { name: 'openai', type: 'openai', client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), cost: 4 },
  { name: 'deepseek', type: 'deepseek', cost: 2 }, // No client, uses fetch
  // Add other agents (claude, gemini) here with their clients and relative cost
];


// Middleware
app.use(helmet.contentSecurityPolicy({
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://www.gstatic.com"],
      "connect-src": ["'self'", "https://*.firebaseio.com", "wss://*.firebaseio.com", "https://*"], // Allow all connections for flexibility
    },
}));
app.use(cors({ origin: ['https://skygemaix.onrender.com'], credentials: true }));
app.use(express.json({ limit: '10mb' })); // Increase limit for file transfers
app.use((req, res, next) => {
  logger.info(`Request: ${req.method} ${req.url}`);
  next();
});

// =================================================================================
// API ROUTES
// =================================================================================

// Firebase Config Endpoint (Correctly placed)
app.get('/api/firebase-config', (req, res) => {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };
  res.json(firebaseConfig);
});

// Git Clone Endpoint
app.post('/api/project/clone', (req, res) => {
    const { url } = req.body;
    if (!url || !/^https:\/\/github\.com\/[\w-]+\/[\w-.]+$/.test(url)) {
        return res.status(400).json({ error: 'Invalid or missing GitHub repository URL.' });
    }
    const repoName = url.split('/').pop();
    const localPath = path.join(__dirname, 'clones', repoName);

    fs.remove(localPath, err => {
        if (err) return res.status(500).json({ error: 'Failed to clear old directory.' });
        exec(`git clone ${url} ${localPath}`, async (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ error: `Git clone failed: ${stderr}` });
            }
            try {
                const files = await readFiles(localPath);
                res.json(files);
            } catch (readError) {
                res.status(500).json({ error: `Failed to read repo files: ${readError.message}` });
            }
        });
    });
});

async function readFiles(dir) {
    const structure = [];
    const files = {};
    const readDir = async (currentDir) => {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            const relativePath = path.relative(dir, fullPath);
            if (entry.isDirectory()) {
                if (entry.name !== '.git') {
                    await readDir(fullPath);
                }
            } else {
                structure.push(relativePath);
                files[relativePath] = await fs.readFile(fullPath, 'utf-8');
            }
        }
    };
    await readDir(dir);
    return { structure, files };
}


// **UPGRADED**: Unified LLM Gateway with Strategic Selection
app.post('/api/llm/chat', async (req, res, next) => {
    try {
        const { provider, prompt } = req.body;
        let selectedAgent = agents.find(a => a.name === provider);

        // If no specific provider is requested, or it's unavailable, make a strategic choice.
        if (!selectedAgent) {
            // Simple strategy: use the cheapest available model.
            // A more advanced strategy could analyze the prompt complexity.
            selectedAgent = agents.sort((a,b) => a.cost - b.cost)[0];
        }

        logger.info(`Routing to selected agent: ${selectedAgent.name}`);

        if (selectedAgent.client) { // For SDK-based agents like OpenAI, XAI
            const completion = await selectedAgent.client.chat.completions.create({
                model: selectedAgent.name === 'openai' ? 'gpt-4-turbo' : 'grok-4-0709', // Example models
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_object" }, // Crucial for reliable plans
            });
            res.json({ content: completion.choices[0].message.content });
        } else { // For fetch-based agents like Deepseek
            // ... your existing fetch logic for deepseek ...
            res.status(501).json({ error: 'Fetch-based agent logic not fully implemented in this example.' });
        }
    } catch (error) {
        next(error);
    }
});


// =================================================================================
// STATIC FILE SERVING & SPA FALLBACK (MUST BE LAST)
// =================================================================================

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error Handling Middleware
app.use((err, req, res, next) => { /* ... Your error handling ... */ });

app.listen(PORT, () => {
  logger.info(`Architect-level server running on port ${PORT}`);
});
