# Dockerfile for WITHMIA-APP
# Updated: 2026-01-30 - Octane + Roadrunner for concurrent requests
FROM php:8.4-cli

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
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) \
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
    sockets

# Install iconv extension (critical for Laravel)
RUN docker-php-ext-install iconv

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Install Roadrunner binary for Octane
RUN curl -sSL https://github.com/roadrunner-server/roadrunner/releases/download/v2024.3.5/roadrunner-2024.3.5-linux-amd64.tar.gz | \
    tar -xz && \
    mv roadrunner-2024.3.5-linux-amd64/rr /usr/local/bin/rr && \
    chmod +x /usr/local/bin/rr && \
    rm -rf roadrunner-2024.3.5-linux-amd64

# Configure PHP for production with OPcache JIT
RUN echo "default_charset = UTF-8" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "opcache.memory_consumption=256" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "opcache.interned_strings_buffer=64" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "opcache.max_accelerated_files=20000" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "opcache.jit=1255" >> /usr/local/etc/php/conf.d/app.ini && \
    echo "opcache.jit_buffer_size=128M" >> /usr/local/etc/php/conf.d/app.ini && \
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

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /bin/bash appuser \
    && chown -R appuser:appuser /app

USER appuser

# Create start script with Octane (4 parallel workers)
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Run migrations\n\
php artisan migrate --force\n\
\n\
# Update Chatwoot media config (enable audio support)\n\
php artisan chatwoot:update-media-config || echo "⚠️ Chatwoot update skipped (non-critical)"\n\
\n\
# Clear caches\n\
php artisan config:clear\n\
php artisan route:clear\n\
php artisan view:clear\n\
\n\
# Cache config for Octane performance\n\
php artisan config:cache\n\
php artisan route:cache\n\
\n\
# Start Horizon queue manager in background (auto-scaling, monitoring, priority queues)\n\
php artisan horizon &\n\
\n\
# Start Octane with Roadrunner (4 workers for concurrent requests)\n\
exec php artisan octane:start --server=roadrunner --host=0.0.0.0 --port=${PORT:-8080} --workers=4 --max-requests=500\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port
EXPOSE 8080

# Start command
CMD ["/bin/bash", "/app/start.sh"]
