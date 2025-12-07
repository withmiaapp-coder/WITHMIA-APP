#!/bin/bash
set -e

echo "🚀 Running post-deploy script..."

# Run migrations
php artisan migrate --force --no-interaction

# Clear and cache config
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Create storage link if doesn't exist
php artisan storage:link

# Restart queue workers (Railway will handle this)
php artisan queue:restart

echo "✅ Deployment completed successfully!"
