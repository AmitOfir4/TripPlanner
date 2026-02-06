#!/bin/bash

echo "🚀 Setting up TripPlanner Backend API Proxy..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo "⚠️  IMPORTANT: Edit .env and add your API keys!"
    echo ""
else
    echo "✅ .env file exists"
fi

# Check if GEMINI_API_KEY is in .env
if ! grep -q "GEMINI_API_KEY" .env 2>/dev/null; then
    echo "⚠️  GEMINI_API_KEY not found in .env"
    echo "   Please add: GEMINI_API_KEY=your_key_here"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
    echo ""
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create server directory if it doesn't exist
mkdir -p server

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your GEMINI_API_KEY"
echo "2. Run: npm run dev:all (to start both frontend and backend)"
echo "3. Or run separately:"
echo "   - Frontend: npm run dev"
echo "   - Backend: npm run dev:backend"
echo ""
echo "📖 For more details, see BACKEND_SETUP.md"
echo ""
