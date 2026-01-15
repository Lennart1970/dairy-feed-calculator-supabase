#!/bin/bash
# Dairy Feed Calculator - Production Startup Script with Supabase

cd /home/ubuntu

# Load environment variables
export NODE_ENV=production
export PORT=3000
export SUPABASE_URL=https://dctxqqfjwzlyqtdwyidm.supabase.co
export SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdHhxcWZqd3pseXF0ZHd5aWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTM2MjksImV4cCI6MjA4NDA2OTYyOX0.tzEYxCHOZ0Q7wu5Qgj1BC76ObEYTMOxC3b2oY8GMMPk
export JWT_SECRET=dairy-calc-supabase-production-2026
export VITE_APP_ID=dairy-feed-calculator

echo "Starting Dairy Feed Calculator with Supabase..."
echo "Port: $PORT"
echo "Supabase URL: $SUPABASE_URL"

# Start the server
node dist/index.js
