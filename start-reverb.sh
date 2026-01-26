#!/bin/bash

# Railway injects PORT as environment variable
# This script ensures proper variable expansion

echo "Starting Reverb WebSocket Server"
echo "PORT environment variable: $PORT"

if [ -z "$PORT" ]; then
    echo "ERROR: PORT environment variable is not set"
    exit 1
fi

# Clear any cached config to ensure fresh env reading
php artisan config:clear 2>/dev/null || true

# Export REVERB_SERVER_PORT so Laravel config can use it
export REVERB_SERVER_PORT=$PORT

echo "Starting Reverb on 0.0.0.0:$PORT"
exec php artisan reverb:start --host=0.0.0.0 --port=$PORT
