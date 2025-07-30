# 🔑 API Keys Setup Guide

## 📍 **Where to Input API Keys**

Your SkynetAI application uses environment variables for API keys. Here's how to set them up:

### 🏠 **Local Development**

1. **Create a `.env` file** in your project root:
   ```bash
   # Copy the template
   cp env.template .env
   ```

2. **Edit the `.env` file** with your actual API keys:
   ```env
   # Google Gemini API Key
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

3. **Restart your development server**:
   ```bash
   npm run dev
   ```

### ☁️ **Production Deployment (Render)**

For your Render deployment, you need to set environment variables in the Render dashboard:

1. **Go to your Render dashboard**
2. **Select your `skygemai` service**
3. **Go to "Environment" tab**
4. **Add environment variable**:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Your actual Gemini API key
5. **Save and redeploy**

## 🔐 **Getting Your API Keys**

### Google Gemini API Key

1. **Visit**: https://makersuite.google.com/app/apikey
2. **Sign in** with your Google account
3. **Click "Create API Key"**
4. **Copy the generated key**
5. **Paste it** in your `.env` file or Render environment variables

### Firebase API Keys (Optional)

If you're using Firebase features:

1. **Go to**: https://console.firebase.google.com/
2. **Select your project**
3. **Go to Project Settings**
4. **Scroll to "Your apps"**
5. **Copy the config values**

## 🛡️ **Security Best Practices**

### ✅ **Do's**
- ✅ Use environment variables (never hardcode API keys)
- ✅ Add `.env` to your `.gitignore` file
- ✅ Use different API keys for development and production
- ✅ Regularly rotate your API keys

### ❌ **Don'ts**
- ❌ Never commit API keys to version control
- ❌ Don't share API keys in public repositories
- ❌ Don't use the same key for multiple projects
- ❌ Don't expose API keys in client-side code

## 🔍 **Verification**

### Local Development
```bash
# Check if environment variables are loaded
npm run dev
# Look for any "API_KEY environment variable not set" errors
```

### Production Deployment
1. **Check Render logs** for any API key errors
2. **Test the application** to ensure it can make API calls
3. **Monitor usage** in your Google Cloud Console

## 🚨 **Troubleshooting**

### "API_KEY environment variable not set"
- ✅ Check that your `.env` file exists in the project root
- ✅ Verify the variable name is `GEMINI_API_KEY`
- ✅ Restart your development server after adding the `.env` file

### "Invalid API Key" errors
- ✅ Verify your API key is correct
- ✅ Check that you have billing set up for Google Cloud
- ✅ Ensure your API key has the necessary permissions

### Production deployment issues
- ✅ Verify environment variables are set in Render dashboard
- ✅ Check that the variable name matches exactly
- ✅ Redeploy after adding environment variables

## 📋 **Current Configuration**

Your application is configured to use multiple AI providers:

### **Primary AI Providers:**
- **Google Gemini**: `GEMINI_API_KEY` (currently active)
- **OpenAI**: `OPENAI_API_KEY` (available)
- **Claude**: `CLAUDE_KEY` (available)
- **Grok**: `GROK_API_KEY` (available)
- **DeepSeek**: `DEEPSEEK_API_KEY` (available)

### **Infrastructure:**
- **Firebase**: `FIREBASE_CREDS_JSON`, `FIREBASE_DB_URL`
- **Custom Service**: `GENIKIT_URL`
- **Server**: `PORT=10000`, `PYTHON_VERSION=3.11`

### **Service Files:**
- **Primary**: `services/geminiService.ts` (currently active)
- **Environment Variable**: `GEMINI_API_KEY`

## 🎯 **Next Steps**

1. **Get your Gemini API key** from Google AI Studio
2. **Create a `.env` file** with your API key
3. **Test locally** with `npm run dev`
4. **Set environment variables** in Render for production
5. **Deploy and test** your application

Your SkynetAI will be ready to use once the API keys are properly configured! 🚀 