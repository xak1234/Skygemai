#!/bin/bash

# Build the application
echo "Building application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "Build successful!"
    echo "Ready for deployment to Render"
    echo ""
    echo "Next steps:"
    echo "1. Push to GitHub"
    echo "2. Connect to Render"
    echo "3. Set environment variables:"
    echo "   - XAI_API_KEY"
    echo "   - DEEPSEEK_API_KEY"
    echo "   - NODE_ENV=production"
else
    echo "Build failed!"
    exit 1
fi 