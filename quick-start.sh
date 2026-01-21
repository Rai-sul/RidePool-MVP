#!/bin/bash
# Quick Start Script for CarPool Project
# Usage: ./quick-start.sh

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           CarPool Project - Quick Start                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
echo "1. Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

echo "   ✅ Node.js $(node --version)"
echo "   ✅ npm $(npm --version)"
echo ""

# Setup Server
echo "2. Setting up Server..."
cd Server

if [ ! -f ".env" ]; then
    echo "   Creating .env from .env.example..."
    cp .env.example .env
    echo "   ⚠️  IMPORTANT: Edit Server/.env with your credentials!"
    echo "   Required: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    read -p "   Press Enter after editing .env file..."
fi

if [ ! -d "node_modules" ]; then
    echo "   Installing server dependencies..."
    npm install
fi

echo "   Building server..."
npm run build

echo "   ✅ Server ready"
echo ""

# Setup Client
echo "3. Setting up Client..."
cd ../Client/CarPoolApp

if [ ! -f ".env" ]; then
    echo "   Creating .env from .env.example..."
    cp .env.example .env
    echo "   ⚠️  Edit Client/CarPoolApp/.env if needed"
fi

if [ ! -d "node_modules" ]; then
    echo "   Installing client dependencies..."
    npm install
fi

echo "   ✅ Client ready"
echo ""

# Verify Supabase
echo "4. Verifying Supabase connection..."
cd ../../Server
if npm test -- supabase-connection.test.ts > /tmp/supabase-test.log 2>&1; then
    echo "   ✅ Supabase connected"
else
    echo "   ❌ Supabase connection failed. Check Server/.env"
    echo "   See /tmp/supabase-test.log for details"
    exit 1
fi
echo ""

# Instructions
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                Setup Complete - Ready to Run!                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Open TWO terminals and run:"
echo ""
echo "Terminal 1 (Server):"
echo "  cd Server"
echo "  npm run dev"
echo ""
echo "Terminal 2 (Client):"
echo "  cd Client/CarPoolApp"
echo "  npx expo start"
echo ""
echo "Then:"
echo "  • Press 'w' for web version (fastest)"
echo "  • Scan QR with Expo Go app for mobile"
echo "  • Press 'a' for Android emulator"
echo "  • Press 'i' for iOS simulator (macOS only)"
echo ""
echo "Server will run at: http://localhost:3000"
echo "Client web at: http://localhost:8081"
echo ""
echo "For details, see: RUN_PROJECT.md"
echo ""
