# Dockerfile for WITHMIA-APP
# Updated: 2026-01-30 - Migrated to FrankenPHP for production performance
# FrankenPHP handles concurrent requests (unlike php artisan serve)
FROM dunglas/frankenphp:1-php8.4

# Install system dependencies (including poppler-utils for pdftotext)
RUN apt-get update && apt-get install -y \
    poppler-utils \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libpq-dev \
    libzip-dev \
    libicu-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libwebp-dev \
    libcurl4-openssl-dev \
    zip \
    unzip \
    nodejs \
    npm \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN install-php-extensions \
    pdo \
    pdo_pgsql \
    pgsql \
    mbstring \
    xml \
    curl \
    zip \
    gd \
    intl \
    bcmath \
    fileinfo \
    exif \
    pcntl \
    opcache \
    iconv \
    redis

# Configure PHP for production
RUN echo "default_charset = UTF-8" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "opcache.memory_consumption=256" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "opcache.interned_strings_buffer=64" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "opcache.max_accelerated_files=20000" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "opcache.jit=1255" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "opcache.jit_buffer_size=256M" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "realpath_cache_size=4096K" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "realpath_cache_ttl=600" >> /usr/local/etc/php/conf.d/app.ini

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /app

# Copy composer files first for better caching
COPY composer.json composer.lock ./

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# Copy package.json for npm
COPY package.json package-lock.json ./

# Install Node dependencies and build
RUN npm ci --prefer-offline --no-audit

# Copy the rest of the application (bust cache with timestamp)
ARG CACHEBUST=2
COPY . .

# Run composer scripts now that all files are present
RUN composer dump-autoload --optimize

# Build frontend assets
RUN npm run build

# Create storage link
RUN php artisan storage:link || true

# Set permissions
RUN chmod -R 775 storage bootstrap/cache

# Create start script for Laravel Octane with FrankenPHP
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Run migrations\n\
php artisan migrate --force\n\
\n\
# Clear caches\n\
php artisan config:clear\n\
php artisan route:clear\n\
php artisan view:clear\n\
\n\
# Start queue worker in background\n\
php artisan queue:work --sleep=3 --tries=3 --max-time=3600 &\n\
\n\
# Start Laravel Octane with FrankenPHP (handles concurrent requests!)\n\
exec php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=${PORT:-8080} --workers=auto --max-requests=1000\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port
EXPOSE 8080

# Start command
CMD ["/bin/bash", "/app/start.sh"]
