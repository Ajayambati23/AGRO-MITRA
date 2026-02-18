#!/bin/bash

echo "🚀 Starting AgroMitra Project..."
echo "================================"

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port $1 is already in use"
        return 1
    else
        echo "✅ Port $1 is available"
        return 0
    fi
}

# Check if ports are available
if ! check_port 3000; then
    echo "Please stop the process using port 3000 and try again"
    exit 1
fi

if ! check_port 3001; then
    echo "Please stop the process using port 3001 and try again"
    exit 1
fi

# Start backend server
echo "🔧 Starting Backend Server (Port 3001)..."
cd "$(dirname "$0")"
PORT=3001 npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend started successfully
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend server started successfully"
else
    echo "❌ Backend server failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend server
echo "🎨 Starting Frontend Server (Port 3000)..."
cd frontend
PORT=3000 npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

# Check if frontend started successfully
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend server started successfully"
else
    echo "❌ Frontend server failed to start"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 AgroMitra is now running!"
echo "================================"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001/api"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
