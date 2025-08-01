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
import { promisify } from 'util';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import archiver from 'archiver';
import { pipeline } from 'stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced Winston logger with better formatting
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

// === Enhanced Environment Validation ===
const envSchema = z.object({
    OPENAI_API_KEY: z.string().optional(),
    CLAUDE_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    XAI_API_KEY: z.string().optional(),
    DEEPSEEK_API_KEY: z.string().optional(),
    FIREBASE_API_KEY: z.string().min(1),
    FIREBASE_AUTH_DOMAIN: z.string().min(1),
    FIREBASE_PROJECT_ID: z.string().min(1),
    FIREBASE_STORAGE_BUCKET: z.string().min(1),
    FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
    FIREBASE_APP_ID: z.string().min(1),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    MAX_PROJECT_SIZE_MB: z.string().transform(Number).default('100'),
    RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100')
});

let config;
try {
    config = envSchema.parse(process.env);
    logger.info('Environment configuration validated successfully');
} catch (error) {
    logger.error('Environment validation failed:', error.errors);
    process.exit(1);
}

// === Enhanced AI Provider Configuration ===
const aiProviders = {
    openai: config.OPENAI_API_KEY ? new OpenAI({ apiKey: config.OPENAI_API_KEY }) : null,
    claude: config.CLAUDE_API_KEY ? { apiKey: config.CLAUDE_API_KEY, baseURL: 'https://api.anthropic.com' } : null,
    gemini: config.GEMINI_API_KEY ? { apiKey: config.GEMINI_API_KEY, baseURL: 'https://generativelanguage.googleapis.com' } : null,
    xai: config.XAI_API_KEY ? { apiKey: config.XAI_API_KEY, baseURL: 'https://api.x.ai' } : null,
    deepseek: config.DEEPSEEK_API_KEY ? { apiKey: config.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' } : null
};

// Log available providers
const availableProviders = Object.entries(aiProviders)
    .filter(([_, provider]) => provider !== null)
    .map(([name]) => name);
logger.info(`Available AI providers: ${availableProviders.join(', ')}`);

// === Enhanced Middleware ===
const rateLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: config.MAX_PROJECT_SIZE_MB * 1024 * 1024 // Convert MB to bytes
    }
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "https://www.gstatic.com", "'unsafe-inline'"],
            "connect-src": ["'self'", "https://*.firebaseio.com", "wss://*.firebaseio.com", "https://*"],
            "img-src": ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

app.use(cors({ 
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://skygemaix.onrender.com'] 
        : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true 
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(rateLimiter);

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// === Validation Schemas ===
const llmRequestSchema = z.object({
    provider: z.enum(['openai', 'claude', 'gemini', 'xai', 'deepseek']),
    prompt: z.string().min(1).max(50000),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional().default(0.7),
    maxTokens: z.number().min(1).max(8000).optional().default(2000),
    stream: z.boolean().optional().default(false)
});

const projectAnalysisSchema = z.object({
    files: z.record(z.string()),
    structure: z.array(z.string()),
    analysisType: z.enum(['full', 'security', 'performance', 'architecture']).default('full')
});

// =================================================================================
// ENHANCED API ROUTES
// =================================================================================

logger.info('Registering enhanced API routes...');

// 1. Enhanced Firebase Config Endpoint
app.get('/api/firebase-config', (req, res) => {
    try {
        logger.info('Serving Firebase configuration');
        const firebaseConfig = {
            apiKey: config.FIREBASE_API_KEY,
            authDomain: config.FIREBASE_AUTH_DOMAIN,
            projectId: config.FIREBASE_PROJECT_ID,
            storageBucket: config.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
            appId: config.FIREBASE_APP_ID
        };
        res.json(firebaseConfig);
    } catch (error) {
        logger.error('Firebase config error:', error);
        res.status(500).json({ error: 'Failed to retrieve Firebase configuration' });
    }
});

// 2. Enhanced AI Provider Status Endpoint
app.get('/api/providers/status', (req, res) => {
    try {
        const providerStatus = Object.entries(aiProviders).map(([name, provider]) => ({
            name,
            available: provider !== null,
            status: provider ? 'ready' : 'not_configured'
        }));
        
        res.json({
            providers: providerStatus,
            totalAvailable: availableProviders.length
        });
    } catch (error) {
        logger.error('Provider status error:', error);
        res.status(500).json({ error: 'Failed to get provider status' });
    }
});

// 3. Enhanced Unified LLM Chat Endpoint
app.post('/api/llm/chat', async (req, res) => {
    try {
        const validatedData = llmRequestSchema.parse(req.body);
        const { provider, prompt, model, temperature, maxTokens, stream } = validatedData;

        logger.info(`LLM request: ${provider} model=${model || 'default'}`);

        if (!aiProviders[provider]) {
            return res.status(400).json({ 
                error: `Provider ${provider} is not configured or available` 
            });
        }

        let response;
        
        switch (provider) {
            case 'openai':
                response = await handleOpenAIRequest(aiProviders.openai, {
                    prompt, model: model || 'gpt-4', temperature, maxTokens, stream
                });
                break;
                
            case 'claude':
                response = await handleClaudeRequest(aiProviders.claude, {
                    prompt, model: model || 'claude-3-sonnet-20240229', temperature, maxTokens
                });
                break;
                
            case 'gemini':
                response = await handleGeminiRequest(aiProviders.gemini, {
                    prompt, model: model || 'gemini-pro', temperature, maxTokens
                });
                break;
                
            case 'xai':
                response = await handleXAIRequest(aiProviders.xai, {
                    prompt, model: model || 'grok-beta', temperature, maxTokens
                });
                break;
                
            case 'deepseek':
                response = await handleDeepSeekRequest(aiProviders.deepseek, {
                    prompt, model: model || 'deepseek-coder', temperature, maxTokens
                });
                break;
                
            default:
                return res.status(400).json({ error: 'Unsupported provider' });
        }

        res.json(response);
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ 
                error: 'Invalid request format', 
                details: error.errors 
            });
        }
        
        logger.error('LLM chat error:', error);
        res.status(500).json({ 
            error: 'Failed to process LLM request',
            message: error.message 
        });
    }
});

// 4. Enhanced Project Analysis Endpoint
app.post('/api/project/analyze', async (req, res) => {
    try {
        const validatedData = projectAnalysisSchema.parse(req.body);
        const { files, structure, analysisType } = validatedData;

        logger.info(`Project analysis: ${analysisType} for ${Object.keys(files).length} files`);

        const analysis = await performProjectAnalysis(files, structure, analysisType);
        
        res.json({
            success: true,
            analysis,
            timestamp: new Date().toISOString(),
            filesAnalyzed: Object.keys(files).length
        });
        
    } catch (error) {
        logger.error('Project analysis error:', error);
        res.status(500).json({ 
            error: 'Failed to analyze project',
            message: error.message 
        });
    }
});

// 5. Enhanced Project Clone Endpoint with Git Integration
app.post('/api/project/clone', async (req, res) => {
    try {
        const { repoUrl, branch = 'main', depth = 1 } = req.body;
        
        if (!repoUrl) {
            return res.status(400).json({ error: 'Repository URL is required' });
        }

        logger.info(`Cloning repository: ${repoUrl}`);

        const projectId = generateProjectId();
        const projectPath = path.join(__dirname, 'projects', projectId);
        
        await fs.ensureDir(projectPath);
        
        // Clone the repository
        const cloneCommand = `git clone ${depth ? `--depth ${depth}` : ''} ${branch ? `-b ${branch}` : ''} "${repoUrl}" "${projectPath}"`;
        
        const { stdout, stderr } = await execAsync(cloneCommand, { 
            timeout: 300000 // 5 minutes timeout
        });
        
        if (stderr && !stderr.includes('Cloning into')) {
            throw new Error(`Git clone failed: ${stderr}`);
        }

        // Read project structure and files
        const { structure, files } = await readProjectStructure(projectPath);
        
        // Clean up the cloned repository
        await fs.remove(projectPath);
        
        res.json({
            success: true,
            projectId,
            structure,
            files,
            metadata: {
                repoUrl,
                branch,
                clonedAt: new Date().toISOString(),
                fileCount: Object.keys(files).length
            }
        });
        
    } catch (error) {
        logger.error('Project clone error:', error);
        res.status(500).json({ 
            error: 'Failed to clone project',
            message: error.message 
        });
    }
});

// 6. Code Execution Sandbox (for testing purposes)
app.post('/api/code/execute', async (req, res) => {
    try {
        const { code, language = 'javascript', timeout = 10000 } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        logger.info(`Code execution request: ${language}`);

        const result = await executeCodeSafely(code, language, timeout);
        
        res.json({
            success: true,
            result,
            executedAt: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Code execution error:', error);
        res.status(500).json({ 
            error: 'Code execution failed',
            message: error.message 
        });
    }
});

// 7. Project Export Endpoint
app.post('/api/project/export', async (req, res) => {
    try {
        const { files, projectName = 'exported-project' } = req.body;
        
        if (!files || Object.keys(files).length === 0) {
            return res.status(400).json({ error: 'No files to export' });
        }

        logger.info(`Exporting project: ${projectName}`);

        const archive = archiver('zip', { zlib: { level: 9 } });
        
        res.attachment(`${projectName}.zip`);
        archive.pipe(res);

        // Add files to archive
        Object.entries(files).forEach(([filePath, content]) => {
            archive.append(content, { name: filePath });
        });

        await archive.finalize();
        
    } catch (error) {
        logger.error('Project export error:', error);
        res.status(500).json({ 
            error: 'Failed to export project',
            message: error.message 
        });
    }
});

// === AI Provider Handlers ===

async function handleOpenAIRequest(client, { prompt, model, temperature, maxTokens, stream }) {
    try {
        const completion = await client.chat.completions.create({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: maxTokens,
            stream
        });

        if (stream) {
            return { stream: true, data: completion };
        }

        return {
            success: true,
            content: completion.choices[0].message.content,
            model: completion.model,
            usage: completion.usage
        };
    } catch (error) {
        throw new Error(`OpenAI request failed: ${error.message}`);
    }
}

async function handleClaudeRequest(config, { prompt, model, temperature, maxTokens }) {
    try {
        const response = await fetch(`${config.baseURL}/v1/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                max_tokens: maxTokens,
                messages: [{ role: 'user', content: prompt }],
                temperature
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
            success: true,
            content: data.content[0].text,
            model: data.model,
            usage: data.usage
        };
    } catch (error) {
        throw new Error(`Claude request failed: ${error.message}`);
    }
}

async function handleGeminiRequest(config, { prompt, model, temperature, maxTokens }) {
    try {
        const response = await fetch(`${config.baseURL}/v1beta/models/${model}:generateContent?key=${config.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
            success: true,
            content: data.candidates[0].content.parts[0].text,
            model,
            usage: data.usageMetadata
        };
    } catch (error) {
        throw new Error(`Gemini request failed: ${error.message}`);
    }
}

async function handleXAIRequest(config, { prompt, model, temperature, maxTokens }) {
    try {
        const response = await fetch(`${config.baseURL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature,
                max_tokens: maxTokens
            })
        });

        if (!response.ok) {
            throw new Error(`XAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
            success: true,
            content: data.choices[0].message.content,
            model: data.model,
            usage: data.usage
        };
    } catch (error) {
        throw new Error(`XAI request failed: ${error.message}`);
    }
}

async function handleDeepSeekRequest(config, { prompt, model, temperature, maxTokens }) {
    try {
        const response = await fetch(`${config.baseURL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature,
                max_tokens: maxTokens
            })
        });

        if (!response.ok) {
            throw new Error(`DeepSeek API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
            success: true,
            content: data.choices[0].message.content,
            model: data.model,
            usage: data.usage
        };
    } catch (error) {
        throw new Error(`DeepSeek request failed: ${error.message}`);
    }
}

// === Enhanced Utility Functions ===

async function performProjectAnalysis(files, structure, analysisType) {
    const fileExtensions = Object.keys(files).map(f => path.extname(f)).filter(Boolean);
    const languages = [...new Set(fileExtensions.map(ext => getLanguageFromExtension(ext)))];
    
    const analysis = {
        overview: {
            totalFiles: Object.keys(files).length,
            totalLines: Object.values(files).reduce((sum, content) => sum + content.split('\n').length, 0),
            languages,
            structure: structure.slice(0, 50) // Limit for performance
        },
        complexity: calculateComplexity(files),
        dependencies: extractDependencies(files),
        patterns: detectPatterns(files),
        suggestions: []
    };

    if (analysisType === 'security' || analysisType === 'full') {
        analysis.security = performSecurityAnalysis(files);
    }

    if (analysisType === 'performance' || analysisType === 'full') {
        analysis.performance = performPerformanceAnalysis(files);
    }

    if (analysisType === 'architecture' || analysisType === 'full') {
        analysis.architecture = performArchitectureAnalysis(files, structure);
    }

    return analysis;
}

function calculateComplexity(files) {
    let totalComplexity = 0;
    const fileComplexities = {};

    Object.entries(files).forEach(([filePath, content]) => {
        const lines = content.split('\n');
        let complexity = 0;

        lines.forEach(line => {
            // Simple complexity calculation
            if (line.includes('if ') || line.includes('while ') || line.includes('for ')) complexity += 1;
            if (line.includes('&&') || line.includes('||')) complexity += 1;
            if (line.includes('switch') || line.includes('case')) complexity += 1;
        });

        fileComplexities[filePath] = complexity;
        totalComplexity += complexity;
    });

    return {
        total: totalComplexity,
        average: totalComplexity / Object.keys(files).length,
        byFile: fileComplexities
    };
}

function extractDependencies(files) {
    const dependencies = new Set();
    
    Object.values(files).forEach(content => {
        // Extract import statements
        const importMatches = content.match(/import\s+.*from\s+['"]([^'"]+)['"]/g) || [];
        const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
        
        importMatches.forEach(match => {
            const dep = match.match(/from\s+['"]([^'"]+)['"]/)[1];
            if (!dep.startsWith('.')) dependencies.add(dep);
        });
        
        requireMatches.forEach(match => {
            const dep = match.match(/require\(['"]([^'"]+)['"]\)/)[1];
            if (!dep.startsWith('.')) dependencies.add(dep);
        });
    });
    
    return Array.from(dependencies);
}

function detectPatterns(files) {
    const patterns = {
        mvc: false,
        microservices: false,
        serverless: false,
        spa: false,
        api: false
    };

    const allContent = Object.values(files).join('\n').toLowerCase();
    const fileNames = Object.keys(files).map(f => f.toLowerCase());

    // Detect patterns
    if (fileNames.some(f => f.includes('controller') || f.includes('model') || f.includes('view'))) {
        patterns.mvc = true;
    }
    
    if (allContent.includes('microservice') || allContent.includes('docker') || allContent.includes('kubernetes')) {
        patterns.microservices = true;
    }
    
    if (allContent.includes('lambda') || allContent.includes('serverless') || allContent.includes('azure functions')) {
        patterns.serverless = true;
    }
    
    if (fileNames.some(f => f.includes('app.js') || f.includes('index.html')) && allContent.includes('react')) {
        patterns.spa = true;
    }
    
    if (allContent.includes('api') || allContent.includes('endpoint') || allContent.includes('route')) {
        patterns.api = true;
    }

    return patterns;
}

function performSecurityAnalysis(files) {
    const issues = [];
    
    Object.entries(files).forEach(([filePath, content]) => {
        // Check for common security issues
        if (content.includes('eval(')) {
            issues.push({ file: filePath, issue: 'Use of eval() function', severity: 'high' });
        }
        
        if (content.includes('innerHTML') && !content.includes('sanitize')) {
            issues.push({ file: filePath, issue: 'Potential XSS via innerHTML', severity: 'medium' });
        }
        
        if (content.includes('process.env') && content.includes('console.log')) {
            issues.push({ file: filePath, issue: 'Potential environment variable exposure', severity: 'medium' });
        }
    });
    
    return {
        issues,
        score: Math.max(0, 100 - (issues.length * 10))
    };
}

function performPerformanceAnalysis(files) {
    const issues = [];
    
    Object.entries(files).forEach(([filePath, content]) => {
        const lines = content.split('\n');
        
        // Check for performance issues
        if (content.includes('for') && content.includes('for')) {
            issues.push({ file: filePath, issue: 'Nested loops detected', severity: 'medium' });
        }
        
        if (lines.length > 1000) {
            issues.push({ file: filePath, issue: 'Large file size', severity: 'low' });
        }
        
        if (content.includes('console.log') && !filePath.includes('dev')) {
            issues.push({ file: filePath, issue: 'Console logging in production code', severity: 'low' });
        }
    });
    
    return {
        issues,
        score: Math.max(0, 100 - (issues.length * 5))
    };
}

function performArchitectureAnalysis(files, structure) {
    const analysis = {
        layering: 'unknown',
        modularity: 0,
        coupling: 'unknown',
        testability: 0
    };
    
    // Analyze modularity
    const moduleCount = structure.filter(item => 
        item.includes('module') || item.includes('component') || item.includes('service')
    ).length;
    
    analysis.modularity = Math.min(100, moduleCount * 10);
    
    // Check for test files
    const testFiles = Object.keys(files).filter(f => 
        f.includes('test') || f.includes('spec') || f.includes('.test.') || f.includes('.spec.')
    );
    
    analysis.testability = Math.min(100, (testFiles.length / Object.keys(files).length) * 100);
    
    return analysis;
}

async function readProjectStructure(projectPath) {
    const structure = [];
    const files = {};
    
    async function walkDir(dir, relativePath = '') {
        const items = await fs.readdir(dir);
        
        for (const item of items) {
            if (item.startsWith('.')) continue; // Skip hidden files
            
            const fullPath = path.join(dir, item);
            const relativeItemPath = path.join(relativePath, item);
            const stat = await fs.stat(fullPath);
            
            if (stat.isDirectory()) {
                structure.push(`${relativeItemPath}/`);
                await walkDir(fullPath, relativeItemPath);
            } else {
                structure.push(relativeItemPath);
                
                // Read file content for certain file types
                const ext = path.extname(item).toLowerCase();
                const textExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.html', '.css', '.scss', '.json', '.xml', '.yaml', '.yml', '.md', '.txt'];
                
                if (textExtensions.includes(ext) && stat.size < 1024 * 1024) { // Max 1MB per file
                    try {
                        files[relativeItemPath] = await fs.readFile(fullPath, 'utf8');
                    } catch (error) {
                        logger.warn(`Could not read file ${relativeItemPath}: ${error.message}`);
                    }
                }
            }
        }
    }
    
    await walkDir(projectPath);
    return { structure, files };
}

async function executeCodeSafely(code, language, timeout) {
    // This is a simplified implementation - in production, you'd want proper sandboxing
    if (language === 'javascript') {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Code execution timeout'));
            }, timeout);
            
            try {
                // Create a simple sandbox context
                const sandbox = {
                    console: {
                        log: (...args) => console.log('[SANDBOX]', ...args)
                    }
                };
                
                const result = Function('sandbox', `
                    const console = sandbox.console;
                    ${code}
                `)(sandbox);
                
                clearTimeout(timer);
                resolve({ output: result, type: 'success' });
            } catch (error) {
                clearTimeout(timer);
                resolve({ output: error.message, type: 'error' });
            }
        });
    }
    
    throw new Error(`Language ${language} not supported for execution`);
}

function generateProjectId() {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getLanguageFromExtension(ext) {
    const extMap = {
        '.js': 'JavaScript',
        '.ts': 'TypeScript',
        '.jsx': 'React',
        '.tsx': 'React TypeScript',
        '.py': 'Python',
        '.java': 'Java',
        '.cpp': 'C++',
        '.c': 'C',
        '.html': 'HTML',
        '.css': 'CSS',
        '.scss': 'SCSS',
        '.json': 'JSON',
        '.xml': 'XML',
        '.yaml': 'YAML',
        '.yml': 'YAML',
        '.md': 'Markdown'
    };
    
    return extMap[ext] || 'Unknown';
}

// =================================================================================
// STATIC FILE SERVING & SPA FALLBACK
// =================================================================================

logger.info('Registering static file and SPA fallback routes...');

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV,
        availableProviders: availableProviders.length,
        memory: process.memoryUsage()
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Enhanced AgentSmith API',
        version: '2.0.0',
        endpoints: {
            'GET /api/firebase-config': 'Get Firebase configuration',
            'GET /api/providers/status': 'Get AI provider status',
            'POST /api/llm/chat': 'Send chat request to AI providers',
            'POST /api/project/analyze': 'Analyze project structure and code',
            'POST /api/project/clone': 'Clone Git repository',
            'POST /api/project/export': 'Export project as ZIP',
            'POST /api/code/execute': 'Execute code safely',
            'GET /health': 'Health check endpoint',
            'GET /api': 'This documentation'
        },
        supportedProviders: availableProviders,
        rateLimit: {
            windowMs: config.RATE_LIMIT_WINDOW_MS,
            maxRequests: config.RATE_LIMIT_MAX_REQUESTS
        }
    });
});

// The "catch-all" handler for Single Page Applications (SPA)
app.get('*', (req, res) => {
    // Don't serve index.html for API routes that don't exist
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ 
            error: 'API endpoint not found',
            path: req.path,
            availableEndpoints: '/api'
        });
    }
    
    logger.info(`SPA Fallback: Serving index.html for ${req.path}`);
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// === Enhanced Error Handling Middleware ===
app.use((err, req, res, next) => {
    logger.error('Application error:', { 
        error: err.message, 
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: isDevelopment ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
    });
});

// === Graceful Shutdown Handler ===
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    
    server.close(() => {
        logger.info('HTTP server closed');
        
        // Close any open connections, cleanup resources
        process.exit(0);
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// === Start Enhanced Server ===
const server = app.listen(PORT, () => {
    logger.info(`🚀 Enhanced AgentSmith Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Available AI Providers: ${availableProviders.join(', ')}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API documentation: http://localhost:${PORT}/api`);
    
    // Log some startup statistics
    const memUsage = process.memoryUsage();
    logger.info(`Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memUsage.rss / 1024 / 1024)}MB total`);
});

// === Additional Helper Functions ===

// Function to validate and sanitize file paths
function sanitizePath(filePath) {
    // Remove any path traversal attempts
    const normalized = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    return normalized;
}

// Function to estimate API costs (useful for monitoring)
function estimateAPICost(provider, tokens) {
    const costPerToken = {
        openai: 0.00003, // GPT-4 approximate
        claude: 0.00003, // Claude 3 approximate
        gemini: 0.00001, // Gemini Pro approximate
        xai: 0.00002, // Grok approximate
        deepseek: 0.000014 // DeepSeek approximate
    };
    
    return (costPerToken[provider] || 0) * tokens;
}

// Function to log API usage statistics
function logAPIUsage(provider, model, tokens, cost) {
    logger.info('API Usage:', {
        provider,
        model,
        tokens,
        estimatedCost: `${cost.toFixed(6)}`,
        timestamp: new Date().toISOString()
    });
}

// Function to check system resources
function checkSystemResources() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    
    if (heapUsedMB > 512) { // Warning if heap usage > 512MB
        logger.warn(`High memory usage: ${heapUsedMB}MB heap, ${rssMB}MB total`);
    }
    
    return {
        memoryUsage: memUsage,
        uptime: process.uptime(),
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0]
    };
}

// Periodic system resource monitoring
setInterval(() => {
    checkSystemResources();
}, 300000); // Check every 5 minutes

logger.info('Enhanced AgentSmith Server initialization complete');