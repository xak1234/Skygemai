import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Add JSON parsing middleware
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.ico')) {
      res.setHeader('Content-Type', 'image/x-icon');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Test endpoint for Grok API
app.post('/api/test-grok', async (req, res) => {
  try {
    const apiKey = process.env.XAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'XAI_API_KEY not configured',
        message: 'Please set the XAI_API_KEY environment variable on Render'
      });
    }
    
    const { question = "Hello Grok! Can you confirm you're working?" } = req.body;
    
    const requestBody = {
      messages: [
        {
          role: "system",
          content: "You are Grok, a highly intelligent, helpful AI assistant. Keep responses concise."
        },
        {
          role: "user",
          content: question
        }
      ],
      model: "grok-4",
      stream: false
    };

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: 'Grok API request failed',
        status: response.status,
        details: errorText
      });
    }

    const data = await response.json();
    
    res.json({
      success: true,
      message: data.choices[0].message.content,
      usage: data.usage,
      model: data.model
    });
    
  } catch (error) {
    console.error('Grok API test error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Handle SPA routing - serve index.html for all routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  // Check if index.html exists
  if (!fs.existsSync(indexPath)) {
    console.error('index.html not found in dist directory');
    res.status(500).send('Build files not found. Please ensure the application is built correctly.');
    return;
  }
  
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Serving static files from: ${path.join(__dirname, 'dist')}`);
  
  // Log available files for debugging
  if (fs.existsSync(path.join(__dirname, 'dist'))) {
    console.log('Available files in dist:');
    const files = fs.readdirSync(path.join(__dirname, 'dist'));
    files.forEach(file => {
      console.log(`  - ${file}`);
    });
  }
}); 