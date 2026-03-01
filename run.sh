#!/bin/bash

# Project HELIOS Premium Setup Script
# ==================================
# This script initializes both Backend and Frontend for local hosting.

echo "🚀 [HELIOS] Initializing Energy Terminal Stack..."

# 1. Environment Check
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ Error: Node.js/npm is not installed."
    exit 1
fi

# 2. Backend Setup
echo "📦 [HELIOS] Installing Python dependencies..."
cd helios-control-room/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ../..

# 3. Frontend Setup
echo "📦 [HELIOS] Installing Node dependencies..."
cd helios-control-room/frontend
npm install
cd ../..

# 4. Starting Servers
echo "⚡ [HELIOS] Starting servers in parallel..."

# Use trap to kill background processes on exit
trap 'kill 0' EXIT

# Start FastAPI
echo "📡 [HELIOS] Starting Analytical Engine on http://localhost:8000"
(cd helios-control-room/backend && source venv/bin/activate && uvicorn main:app --port 8000) &

# Wait a moment for backend
sleep 2

# Start Next.js
echo "🖥️  [HELIOS] Starting Executive Dashboard on http://localhost:3000"
(cd helios-control-room/frontend && npm run dev) &

wait
