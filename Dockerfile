# Dockerfile for WITHMIA-APP
# Updated: 2026-01-23 - Added poppler-utils for PDF extraction
FROM php:8.4-cli

# Install system dependencies (including poppler-utils for pdftotext)
RUN apt-get update && apt-get install -y \
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
    poppler-utils \
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
    opcache

# Install iconv extension (critical for Laravel)
RUN docker-php-ext-install iconv

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

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

# Copy the rest of the application
COPY . .

# Run composer scripts now that all files are present
RUN composer dump-autoload --optimize

# Build frontend assets
RUN npm run build

# Create storage link and cache views
RUN php artisan storage:link || true
RUN php artisan view:cache || true

# Set permissions
RUN chmod -R 775 storage bootstrap/cache

# Create start script
RUN echo '#!/bin/bash\n\
php artisan migrate --force\n\
php artisan config:clear\n\
php artisan route:clear\n\
php artisan view:clear\n\
\n\
# Start queue worker in background\n\
php artisan queue:work --sleep=3 --tries=3 --max-time=3600 &\n\
\n\
# Start web server\n\
php artisan serve --host=0.0.0.0 --port=${PORT:-8080}\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port
EXPOSE 8080

# Start command
CMD ["/bin/bash", "/app/start.sh"]
