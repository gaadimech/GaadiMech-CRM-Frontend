#!/bin/bash
# Test script for frontend

echo "🧪 Testing Frontend Setup..."
echo "================================"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local file not found!"
    echo "Creating .env.local with default values..."
    echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:5000" > .env.local
    echo "✅ Created .env.local"
else
    echo "✅ .env.local file exists"
    cat .env.local
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo ""
    echo "⚠️  node_modules not found!"
    echo "Please install dependencies: npm install"
else
    echo ""
    echo "✅ node_modules exists"
fi

# Check if Next.js is installed
echo ""
echo "Checking dependencies..."
npm list next 2>/dev/null | grep -q "next@" && echo "✅ Next.js installed" || echo "❌ Next.js not installed - run: npm install"

echo ""
echo "To start the frontend server, run:"
echo "  npm run dev"

