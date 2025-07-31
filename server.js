import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://skygemaix.onrender.com', 'https://*.onrender.com']
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Parse JSON bodies
app.use(express.json());

// Add security headers and handle cookies
app.use((req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Handle cookie domain issues
  if (req.headers.cookie) {
    // Clean up problematic cookies
    const cookies = req.headers.cookie.split(';').filter(cookie => {
      const [name] = cookie.trim().split('=');
      return !name.includes('__cf_bm') && !name.includes('__cf_clearance');
    });
    req.headers.cookie = cookies.join(';');
  }
  
  // Set SameSite cookie policy
  res.setHeader('Set-Cookie', 'SameSite=Strict');
  
  next();
});

// Note: Static files will be served after API routes

// Simple proxy function
function proxyRequest(targetUrl, req, res) {
  const url = new URL(targetUrl);
  
  // Handle path transformation
  let targetPath = req.url;
  if (req.url.startsWith('/api/deepseek')) {
    targetPath = req.url.replace('/api/deepseek', '');
  }
  
  // For XAI API, we need to handle the path differently since we're already pointing to /v1
  if (req.url.startsWith('/api/xai')) {
    // Remove the /api/xai prefix
    targetPath = req.url.replace('/api/xai', '');
    // If the path starts with /v1/, remove the /v1/ prefix since we're already pointing to /v1
    if (targetPath.startsWith('/v1/')) {
      targetPath = targetPath.replace('/v1/', '/');
    }
  }
  
  // Clean headers for proxy
  const cleanHeaders = { ...req.headers };
  delete cleanHeaders.host;
  delete cleanHeaders.origin;
  delete cleanHeaders.referer;
  
  // Remove problematic cookies
  if (cleanHeaders.cookie) {
    const cookies = cleanHeaders.cookie.split(';').filter(cookie => {
      const [name] = cookie.trim().split('=');
      return !name.includes('__cf_bm') && !name.includes('__cf_clearance');
    });
    cleanHeaders.cookie = cookies.join(';');
  }
  
  // Fix double slash issue
  const fullPath = url.pathname + targetPath;
  const cleanPath = fullPath.replace(/\/+/g, '/'); // Replace multiple slashes with single slash
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: cleanPath,
    method: req.method,
    headers: {
      ...cleanHeaders,
      host: url.hostname
    }
  };

  // Debug logging
  console.log(`Proxying to: ${url.protocol}//${url.hostname}${cleanPath}`);
  console.log(`API Key length: ${process.env.XAI_API_KEY ? process.env.XAI_API_KEY.length : 0}`);

  const client = url.protocol === 'https:' ? https : http;
  
  const proxyReq = client.request(options, (proxyRes) => {
    console.log(`Proxy response status: ${proxyRes.statusCode}`);
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error' });
  });

  if (req.body) {
    proxyReq.write(JSON.stringify(req.body));
  }
  
  req.pipe(proxyReq);
}

// Proxy for XAI API
app.use('/api/xai', (req, res) => {
  // Check if API key is available
  if (!process.env.XAI_API_KEY) {
    console.log('XAI_API_KEY environment variable not set');
    return res.status(500).json({ 
      error: 'XAI API key not configured. Please set XAI_API_KEY environment variable.' 
    });
  }
  
  // Add XAI API key to the request
  if (!req.headers.authorization) {
    req.headers.authorization = `Bearer ${process.env.XAI_API_KEY}`;
  }
  
  // Debug logging
  console.log(`XAI API request: ${req.method} ${req.url}`);
  console.log(`XAI API key present: ${!!process.env.XAI_API_KEY}`);
  
  proxyRequest('https://api.x.ai/v1', req, res);
});

// Proxy for DeepSeek API
app.use('/api/deepseek', (req, res) => {
  // Check if API key is available
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log('DEEPSEEK_API_KEY environment variable not set');
    return res.status(500).json({ 
      error: 'DeepSeek API key not configured. Please set DEEPSEEK_API_KEY environment variable.' 
    });
  }
  
  // Add DeepSeek API key to the request
  if (!req.headers.authorization) {
    req.headers.authorization = `Bearer ${process.env.DEEPSEEK_API_KEY}`;
  }
  proxyRequest('https://api.deepseek.com/v1', req, res);
});

// Handle Cloudflare cookie issues
app.get('/__cf_bm', (req, res) => {
  res.status(200).json({ message: 'Cookie handled' });
});

// Handle other Cloudflare-related paths
app.get('/__cf_clearance', (req, res) => {
  res.status(200).json({ message: 'Clearance handled' });
});

// Serve static files (after API routes)
app.use(express.static(path.join(__dirname, 'dist')));

// Serve index.html for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 