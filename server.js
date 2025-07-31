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
    ? ['https://skygemaix.onrender.com']
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // Serve index.html for all routes in production
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

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
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + targetPath,
    method: req.method,
    headers: {
      ...req.headers,
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
  proxyRequest('https://api.x.ai', req, res);
});

// Proxy for DeepSeek API
app.use('/api/deepseek', (req, res) => {
  proxyRequest('https://api.deepseek.com/v1', req, res);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 