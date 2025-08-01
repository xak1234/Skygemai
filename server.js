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

// FIXED: Simplified Winston logger for Render environment
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console() // Log only to the console
    ]
});

// --- Environment and Agent Pool Setup (Your logic is preserved) ---
// ... (Your existing Zod validation and agent pool setup)

// --- Middleware ---
app.use(helmet.contentSecurityPolicy({
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://www.gstatic.com"],
      "connect-src": ["'self'", "https://*.firebaseio.com", "wss://*.firebaseio.com", "https://*"],
    },
}));
app.use(cors({ 
    origin: ['https://skygemaix.onrender.com', 'http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:5173', 'http://localhost:5174'], 
    credentials: true 
}));
app.use(express.json({ 
    limit: '10mb',
    strict: true,
    type: 'application/json'
}));
app.use((req, res, next) => {
  logger.info(`Request: ${req.method} ${req.url}`);
  next();
});


// =================================================================================
// API ROUTES (CRITICAL: This section must come BEFORE the static file serving)
// =================================================================================

logger.info('Registering API routes...');

// 0. Health Check Endpoint
app.get('/api/health', (req, res) => {
    logger.info('HIT: /api/health');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. Firebase Config Endpoint
app.get('/api/firebase-config', (req, res) => {
  logger.info('HIT: /api/firebase-config');
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };
  // Check if all required keys are present
  if (Object.values(firebaseConfig).some(value => !value)) {
    logger.error('Firebase environment variables are not fully set on the server.');
    return res.status(500).json({ error: 'Server-side Firebase configuration is incomplete.' });
  }
  res.json(firebaseConfig);
});

// 2. Project Clone Endpoint
app.post('/api/project/clone', async (req, res) => {
    logger.info('HIT: /api/project/clone');
    logger.info('Request body:', req.body);
    
    try {
        const { url } = req.body;
        
        if (!url) {
            logger.error('No URL provided in request body');
            return res.status(400).json({ error: 'Repository URL or local path is required' });
        }
        
        logger.info(`Processing source: ${url}`);
        
        // Create projects directory if it doesn't exist
        const projectsDir = path.join(__dirname, 'projects');
        await fs.ensureDir(projectsDir);
        
        // Check if it's a local file path
        const isLocalPath = !url.startsWith('http') && (path.isAbsolute(url) || url.includes('\\') || url.includes('/'));
        
        if (isLocalPath) {
            // Handle local file path
            const sourcePath = path.resolve(url);
            
            // Check if source path exists
            if (!await fs.pathExists(sourcePath)) {
                return res.status(400).json({ error: 'Local path does not exist' });
            }
            
            // Get stats to check if it's a directory
            const stats = await fs.stat(sourcePath);
            if (!stats.isDirectory()) {
                return res.status(400).json({ error: 'Local path must be a directory' });
            }
            
            // Extract directory name for destination
            const sourceName = path.basename(sourcePath);
            const destinationPath = path.join(projectsDir, sourceName);
            
            try {
                // Copy the directory
                await fs.copy(sourcePath, destinationPath, { overwrite: true });
                
                logger.info(`Local project ${sourceName} copied successfully to ${destinationPath}`);
                res.json({ 
                    success: true, 
                    message: `Local project ${sourceName} loaded successfully`,
                    path: destinationPath,
                    type: 'local'
                });
                
            } catch (copyError) {
                logger.error(`Copy error: ${copyError.message}`);
                return res.status(500).json({ error: 'Failed to copy local project' });
            }
            
        } else {
            // Handle GitHub URL
            const githubPattern = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+(?:\.git)?$/;
            const gitPattern = /^https?:\/\/[\w\-\.]+\/[\w\-\.\/]+(?:\.git)?$/;
            
            if (!githubPattern.test(url) && !gitPattern.test(url)) {
                return res.status(400).json({ error: 'Invalid repository URL format. Use GitHub URLs or local file paths.' });
            }
            
            // Extract repo name from URL
            const repoName = url.split('/').pop().replace('.git', '');
            const clonePath = path.join(projectsDir, repoName);
            
            // Check if directory already exists
            if (await fs.pathExists(clonePath)) {
                logger.info(`Repository ${repoName} already exists, updating...`);
                // Pull latest changes instead of cloning
                exec(`cd "${clonePath}" && git pull`, (error, stdout, stderr) => {
                    if (error) {
                        logger.error(`Git pull error: ${error.message}`);
                        logger.error(`Git pull stderr: ${stderr}`);
                        
                        let errorMessage = 'Failed to update existing repository';
                        if (stderr.includes('network') || stderr.includes('timeout')) {
                            errorMessage = 'Network error during update. Please check your connection.';
                        } else if (stderr.includes('Permission denied') || stderr.includes('authentication')) {
                            errorMessage = 'Permission denied during update.';
                        }
                        
                        return res.status(500).json({ error: errorMessage });
                    }
                    logger.info(`Repository ${repoName} updated successfully`);
                    res.json({ 
                        success: true, 
                        message: `Repository ${repoName} updated successfully`,
                        path: clonePath,
                        type: 'git'
                    });
                });
            } else {
                // Clone the repository
                exec(`git clone "${url}" "${clonePath}"`, (error, stdout, stderr) => {
                    if (error) {
                        logger.error(`Git clone error: ${error.message}`);
                        logger.error(`Git stderr: ${stderr}`);
                        
                        let errorMessage = 'Failed to clone repository';
                        if (stderr.includes('not found') || stderr.includes('does not exist')) {
                            errorMessage = 'Repository not found. Please check the URL.';
                        } else if (stderr.includes('Permission denied') || stderr.includes('authentication')) {
                            errorMessage = 'Permission denied. Repository may be private.';
                        } else if (stderr.includes('network') || stderr.includes('timeout')) {
                            errorMessage = 'Network error. Please check your connection.';
                        } else if (stderr.includes('fatal')) {
                            errorMessage = `Git error: ${stderr.split('\n')[0]}`;
                        }
                        
                        return res.status(500).json({ error: errorMessage });
                    }
                    
                    logger.info(`Repository ${repoName} cloned successfully to ${clonePath}`);
                    res.json({ 
                        success: true, 
                        message: `Repository ${repoName} cloned successfully`,
                        path: clonePath,
                        type: 'git'
                    });
                });
            }
        }
        
    } catch (error) {
        logger.error(`Clone endpoint error: ${error.message}`);
        logger.error(`Clone endpoint stack: ${error.stack}`);
        res.status(500).json({ 
            error: 'Internal server error during clone operation',
            details: error.message 
        });
    }
});

// 3. Unified LLM Chat Endpoint
app.post('/api/llm/chat', (req, res) => {
    logger.info('HIT: /api/llm/chat');
    // ... (Your LLM routing logic)
    res.status(501).json({ error: 'Unified LLM chat endpoint not yet implemented.' });
});

// ... (Your other existing API routes like /api/xai/v1/chat/completions)


// =================================================================================
// STATIC FILE SERVING & SPA FALLBACK (CRITICAL: This section must come LAST)
// =================================================================================

logger.info('Registering static file and SPA fallback routes...');

// Serve Static Files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// The "catch-all" handler for Single Page Applications (SPA)
// It sends the main index.html file for any request that doesn't match an API route or a static file.
app.get('*', (req, res) => {
  logger.info(`SPA Fallback: Serving index.html for ${req.path}`);
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        logger.error('JSON Parse Error:', err.message);
        return res.status(400).json({ error: 'Invalid JSON in request body' });
    }
    
    logger.error('Application error:', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal Server Error' });
});

// --- Start Server ---
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
