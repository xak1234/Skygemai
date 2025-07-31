import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // Serve index.html for all routes in production
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Proxy for XAI API
app.use('/api/xai', createProxyMiddleware({
  target: 'https://api.x.ai',
  changeOrigin: true,
  pathRewrite: {
    '^/api/xai': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward the Authorization header
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
  }
}));

// Proxy for DeepSeek API
app.use('/api/deepseek', createProxyMiddleware({
  target: 'https://api.deepseek.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/deepseek': '/v1'
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward the Authorization header
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
  }
}));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 