#!/bin/bash

# Railway injects PORT as environment variable
# This script ensures proper variable expansion

echo "Starting Reverb on port: $PORT"

if [ -z "$PORT" ]; then
    echo "ERROR: PORT environment variable is not set"
    exit 1
fi

# Export REVERB_SERVER_PORT so Laravel config can use it
export REVERB_SERVER_PORT=$PORT

exec php artisan reverb:start --host=0.0.0.0 --port=$PORT
