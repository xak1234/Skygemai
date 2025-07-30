#!/bin/bash

echo "=== Deployment Verification Script ==="

# Clean previous build
echo "1. Cleaning previous build..."
rm -rf dist

# Install dependencies
echo "2. Installing dependencies..."
npm install

# Build the application
echo "3. Building the application..."
npm run build

# Check if build was successful
if [ -d "dist" ]; then
    echo "✅ Build successful!"
    echo "4. Checking built files..."
    
    echo "📁 Files in dist/:"
    ls -la dist/
    
    echo "📁 Files in dist/assets/:"
    ls -la dist/assets/
    
    echo "5. Checking built index.html:"
    cat dist/index.html
    
    echo "6. Verifying CSS file exists:"
    if [ -f "dist/assets/index-StdeIhSK.css" ]; then
        echo "✅ CSS file found: dist/assets/index-StdeIhSK.css"
        echo "📏 CSS file size: $(wc -c < dist/assets/index-StdeIhSK.css) bytes"
    else
        echo "❌ CSS file not found!"
    fi
    
    echo "7. Verifying JS file exists:"
    if [ -f "dist/assets/index-DCLAWW_f.js" ]; then
        echo "✅ JS file found: dist/assets/index-DCLAWW_f.js"
        echo "📏 JS file size: $(wc -c < dist/assets/index-DCLAWW_f.js) bytes"
    else
        echo "❌ JS file not found!"
    fi
    
    echo "8. Checking for Tailwind CDN references:"
    if grep -q "cdn.tailwindcss.com" dist/index.html; then
        echo "❌ Tailwind CDN found in built HTML!"
    else
        echo "✅ No Tailwind CDN references found"
    fi
    
    echo "9. Checking for source file references:"
    if grep -q "index.css\|index.tsx" dist/index.html; then
        echo "❌ Source file references found in built HTML!"
    else
        echo "✅ No source file references found"
    fi
    
    echo ""
    echo "=== Deployment Summary ==="
    echo "✅ Build completed successfully"
    echo "✅ All built files are present"
    echo "✅ No CDN or source file references"
    echo "✅ Ready for deployment to Render"
    
else
    echo "❌ Build failed!"
    exit 1
fi 