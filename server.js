import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'httpss';
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
app.use(cors({ origin: ['https://skygemaix.onrender.com'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  logger.info(`Request: ${req.method} ${req.url}`);
  next();
});


// =================================================================================
// API ROUTES (CRITICAL: This section must come BEFORE the static file serving)
// =================================================================================

logger.info('Registering API routes...');

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
app.post('/api/project/clone', (req, res) => {
    logger.info('HIT: /api/project/clone');
    // ... (Your git clone logic)
    res.status(501).json({ error: 'Git clone functionality not yet implemented.' });
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
    logger.error('Application error:', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal Server Error' });
});

// --- Start Server ---
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
