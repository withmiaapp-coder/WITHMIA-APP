#!/bin/bash
set -e

echo "=== REVERB STARTUP SCRIPT v2 ==="
echo "Current date: $(date)"

# Railway provides PORT as an environment variable
# Use REVERB_SERVER_PORT if set, otherwise PORT, otherwise default to 8080
if [ -n "$REVERB_SERVER_PORT" ]; then
    REVERB_PORT="$REVERB_SERVER_PORT"
    echo "Using REVERB_SERVER_PORT: $REVERB_PORT"
elif [ -n "$PORT" ]; then
    REVERB_PORT="$PORT"
    echo "Using PORT: $REVERB_PORT"
else
    REVERB_PORT="8080"
    echo "Using default port: $REVERB_PORT"
fi

# Validate that PORT is a valid number
if ! [[ "$REVERB_PORT" =~ ^[0-9]+$ ]]; then
    echo "ERROR: PORT must be a valid number, got: '$REVERB_PORT'"
    echo "Available environment variables:"
    env | grep -i port || echo "No PORT variables found"
    exit 1
fi

echo "PORT is valid: $REVERB_PORT"

# Clear all Laravel caches to ensure fresh config reading
echo "Clearing Laravel caches..."
php artisan config:clear 2>&1 || echo "config:clear failed, continuing..."
php artisan cache:clear 2>&1 || echo "cache:clear failed, continuing..."
php artisan route:clear 2>&1 || echo "route:clear failed, continuing..."

# Export the port for Laravel to pick up
export REVERB_SERVER_PORT="$REVERB_PORT"
echo "Set REVERB_SERVER_PORT=$REVERB_SERVER_PORT"

echo "Starting Laravel Reverb on 0.0.0.0:$REVERB_PORT..."
exec php artisan reverb:start --host=0.0.0.0 --port="$REVERB_PORT"
