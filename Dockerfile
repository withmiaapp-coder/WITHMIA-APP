# Dockerfile for WITHMIA-APP
# Updated: 2026-02-11 - Optimized build: skip built-in exts + disable JIT compile

# Stage 1: Build frontend assets with Node
FROM node:20-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit
COPY resources/ resources/
COPY vite.config.ts tsconfig.json components.json ./
COPY public/ public/
RUN npm run build

# Stage 2: PHP application
FROM php:8.4-cli

# System deps + dev libs for PHP extensions
# --no-install-recommends prevents bloat
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils git curl zip unzip ca-certificates \
    libpng-dev libonig-dev libxml2-dev libpq-dev libzip-dev \
    libicu-dev libjpeg-dev libfreetype6-dev libwebp-dev libcurl4-openssl-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# PHP extensions - ONLY those NOT already in php:8.4-cli
# Built-in (skip): pdo, mbstring, xml, curl, fileinfo, iconv
# JIT disabled via INI (opcache.jit=disable), not at compile time
# cache-bust: v2
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) \
       pdo_pgsql pgsql zip gd intl bcmath exif pcntl opcache sockets \
    && pecl install redis && docker-php-ext-enable redis

# ffmpeg from Debian repos (stable, no external release dependency)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Roadrunner binary
RUN curl -sSL --retry 3 --retry-delay 5 \
    https://github.com/roadrunner-server/roadrunner/releases/download/v2024.3.5/roadrunner-2024.3.5-linux-amd64.tar.gz \
    | tar -xz \
    && mv roadrunner-2024.3.5-linux-amd64/rr /usr/local/bin/rr && chmod +x /usr/local/bin/rr \
    && rm -rf roadrunner-2024.3.5-linux-amd64

# PHP runtime config
RUN printf 'default_charset=UTF-8\nopcache.enable=1\nopcache.memory_consumption=64\nopcache.interned_strings_buffer=16\nopcache.max_accelerated_files=10000\nopcache.validate_timestamps=0\nopcache.jit=disable\nrealpath_cache_size=2048K\nrealpath_cache_ttl=600\nmemory_limit=256M\npost_max_size=55M\nupload_max_filesize=50M\n' > /usr/local/etc/php/conf.d/app.ini

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Composer deps (cached when composer.json/lock unchanged)
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# Copy app code
COPY . .

# Copy frontend build from stage 1
COPY --from=frontend /app/public/build public/build

# Finalize (env overrides prevent broadcaster init during build where env vars are unavailable)
RUN BROADCAST_DRIVER=null BROADCAST_CONNECTION=log \
    REVERB_APP_KEY=buildkey REVERB_APP_SECRET=buildsecret REVERB_APP_ID=build \
    composer dump-autoload --optimize \
    && (BROADCAST_DRIVER=null BROADCAST_CONNECTION=log \
        REVERB_APP_KEY=buildkey REVERB_APP_SECRET=buildsecret REVERB_APP_ID=build \
        php artisan storage:link || true) \
    && chmod -R 775 storage bootstrap/cache

# Non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /bin/bash appuser \
    && chown -R appuser:appuser /app

USER appuser

# Start script
RUN echo '#!/bin/bash\n\
set -e\n\
php artisan migrate --force\n\
php artisan config:clear\n\
php artisan route:clear\n\
php artisan view:clear\n\
php artisan config:cache\n\
php artisan route:cache\n\
php artisan queue:work --sleep=3 --tries=3 --max-jobs=500 --memory=64 --queue=high,default,low &\n\
exec php artisan octane:start --server=roadrunner --host=0.0.0.0 --port=${PORT:-8080} --workers=2 --max-requests=500 --log-level=info\n\
' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 8080
CMD ["/bin/bash", "/app/start.sh"]
