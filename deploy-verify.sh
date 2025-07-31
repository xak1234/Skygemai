#!/bin/bash

echo "=== Build Verification Script ==="

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ dist directory not found. Running build..."
    npm run build
fi

# Check if index.html exists
if [ -f "dist/index.html" ]; then
    echo "✅ index.html found in dist/"
else
    echo "❌ index.html not found in dist/"
    echo "Running build..."
    npm run build
fi

# Check if main.js exists (compiled from main.tsx)
if [ -f "dist/assets/main-"*".js" ]; then
    echo "✅ Compiled JavaScript files found"
    ls dist/assets/*.js
else
    echo "❌ Compiled JavaScript files not found"
    echo "Running build..."
    npm run build
fi

# Check if CSS files exist
if [ -f "dist/assets/"*".css" ]; then
    echo "✅ CSS files found"
    ls dist/assets/*.css
else
    echo "❌ CSS files not found"
fi

echo "=== Verification Complete ===" 