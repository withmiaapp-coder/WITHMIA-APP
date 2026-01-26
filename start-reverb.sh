#!/bin/bash
set -e

echo "=== REVERB STARTUP SCRIPT ==="
echo "Current date: $(date)"
echo "Checking PORT variable..."
echo "PORT = '$PORT'"

if [ -z "$PORT" ]; then
    echo "ERROR: PORT environment variable is not set!"
    echo "Available environment variables:"
    env | grep -i port || echo "No PORT variables found"
    exit 1
fi

echo "PORT is set to: $PORT"

# Clear all Laravel caches to ensure fresh config reading
echo "Clearing Laravel caches..."
php artisan config:clear 2>&1 || echo "config:clear failed, continuing..."
php artisan cache:clear 2>&1 || echo "cache:clear failed, continuing..."
php artisan route:clear 2>&1 || echo "route:clear failed, continuing..."

# Check current REVERB_SERVER_PORT
echo "Current REVERB_SERVER_PORT env: ${REVERB_SERVER_PORT:-not set}"

# Export the port for Laravel to pick up
export REVERB_SERVER_PORT=$PORT
echo "Set REVERB_SERVER_PORT=$REVERB_SERVER_PORT"

echo "Starting Laravel Reverb on 0.0.0.0:$PORT..."
exec php artisan reverb:start --host=0.0.0.0 --port=$PORT
