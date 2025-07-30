# Skygemai

A React-based AI assistant application built with Vite and TypeScript.

## Features

- Modern React 19 with TypeScript
- Vite for fast development and building
- Custom CSS styling (no Tailwind CDN)
- Proper MIME type handling for production
- Multiple deployment options

## Development

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key

3. Run the app:
   ```bash
   npm run dev
   ```

## Deployment Options

### Option 1: Render (Recommended)

1. Push your code to GitHub
2. Connect your repository to Render
3. Use the following settings:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Environment**: Static Site

The `render.yaml` file is included for automatic configuration.

### Option 2: Express Server

1. Build the application: `npm run build`
2. Start the server: `npm start`
3. The server will run on port 3000 (or `$PORT` environment variable)

### Option 3: Docker

1. Build the Docker image:
   ```bash
   docker build -t skygemai .
   ```

2. Run the container:
   ```bash
   docker run -p 80:80 skygemai
   ```

### Option 4: Nginx

1. Build the application: `npm run build`
2. Copy the `dist` folder to your nginx server
3. Use the provided `nginx.conf` configuration

## Troubleshooting

### MIME Type Issues

If you're experiencing MIME type errors:

1. Ensure you're using one of the deployment options above
2. Check that your server is configured to serve files with proper Content-Type headers
3. For static hosting, use the provided configuration files

### Build Issues

1. Make sure all dependencies are installed: `npm install`
2. Clear the build cache: `rm -rf dist`
3. Rebuild: `npm run build`

## Project Structure

```
skygemai/
├── components/          # React components
├── services/           # API services
├── index.html          # Main HTML file
├── index.tsx           # React entry point
├── index.css           # Custom CSS styles
├── vite.config.ts      # Vite configuration
├── server.js           # Express server for production
├── nginx.conf          # Nginx configuration
├── Dockerfile          # Docker configuration
└── render.yaml         # Render deployment config
```
