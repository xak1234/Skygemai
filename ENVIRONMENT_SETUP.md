# Environment Variables Setup for Render

## Required Environment Variables

Your application requires these environment variables to be set in your Render dashboard:

### 1. GROK_API_KEY
- **Description:** Your Grok API key for strategic decision making
- **Required:** Yes
- **Usage:** Used by AgentSmith for high-level planning

### 2. DEEPSEEK_API_KEY  
- **Description:** Your DeepSeek API key for task execution
- **Required:** Yes
- **Usage:** Used by worker agents for detailed task completion

### 3. GEMINI_API_KEY
- **Description:** Your Gemini API key (optional fallback)
- **Required:** No
- **Usage:** Optional fallback provider

## How to Set Environment Variables in Render

### Step 1: Access Your Service
1. Go to your Render dashboard
2. Click on your `skygemai` service
3. Go to the "Environment" tab

### Step 2: Add Environment Variables
1. Click "Add Environment Variable"
2. Add each variable:
   - **Key:** `GROK_API_KEY`
   - **Value:** Your actual Grok API key
   - **Key:** `DEEPSEEK_API_KEY` 
   - **Value:** Your actual DeepSeek API key
   - **Key:** `GEMINI_API_KEY`
   - **Value:** Your actual Gemini API key (optional)

### Step 3: Deploy
1. Save the environment variables
2. Render will automatically redeploy your service
3. Monitor the build logs to ensure success

## Verification

After deployment, you can verify the environment variables are working by:

1. **Check the browser console** for any API key errors
2. **Test the application** - try using the AI features
3. **Check Render logs** for any environment variable errors

## Troubleshooting

### Common Issues:

1. **"API key not set" errors:**
   - Verify environment variables are set in Render dashboard
   - Check that the variable names match exactly (case-sensitive)
   - Ensure the service has been redeployed after adding variables

2. **Build failures:**
   - Check that all required environment variables are set
   - Verify the API keys are valid and have proper permissions

3. **Runtime errors:**
   - Check the Render logs for detailed error messages
   - Verify the API keys are working by testing them separately

## Security Notes

- ✅ Environment variables in Render are encrypted
- ✅ They are not exposed in client-side code
- ✅ They are only accessible server-side during build
- ✅ The Vite configuration properly injects them into the build

## Testing Locally

To test locally, create a `.env` file in your project root:

```env
GROK_API_KEY=your_grok_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

Then run:
```bash
npm run dev
``` 