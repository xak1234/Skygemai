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
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
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
  
  next();
});

// Note: Static files will be served after API routes

// Simple proxy function
function proxyRequest(targetUrl, req, res) {
  const url = new URL(targetUrl);
  
  // Handle path transformation
  let targetPath = req.url;
  if (req.url.startsWith('/api/xai')) {
    targetPath = req.url.replace('/api/xai', '');
  } else if (req.url.startsWith('/api/deepseek')) {
    targetPath = req.url.replace('/api/deepseek', '');
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
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + targetPath,
    method: req.method,
    headers: {
      ...cleanHeaders,
      host: url.hostname
    }
  };

  const client = url.protocol === 'https:' ? https : http;
  
  const proxyReq = client.request(options, (proxyRes) => {
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
  // Add XAI API key to the request
  if (!req.headers.authorization) {
    req.headers.authorization = `Bearer ${process.env.XAI_API_KEY}`;
  }
  proxyRequest('https://api.x.ai', req, res);
});

// Proxy for DeepSeek API
app.use('/api/deepseek', (req, res) => {
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