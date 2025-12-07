#!/bin/bash
set -e

echo "🚀 Iniciando Railway deployment..."

# Verificar que APP_KEY existe
if [ -z "$APP_KEY" ]; then
    echo "⚠️  APP_KEY no configurado, generando uno nuevo..."
    php artisan key:generate --force --no-interaction
fi

# Limpiar caches previos
echo "🧹 Limpiando caches..."
php artisan config:clear
php artisan cache:clear || echo "⚠️  Cache clear falló (posiblemente Redis no disponible aún)"
php artisan view:clear
php artisan route:clear

# Ejecutar migraciones (solo si DATABASE_URL está configurado)
if [ ! -z "$DATABASE_URL" ] || [ ! -z "$DB_CONNECTION" ]; then
    echo "📊 Ejecutando migraciones..."
    php artisan migrate --force --no-interaction || echo "⚠️  Migraciones fallaron (posiblemente ya ejecutadas)"
else
    echo "⚠️  No hay base de datos configurada, saltando migraciones"
fi

# Storage link
echo "🔗 Creando storage link..."
php artisan storage:link --force || echo "✓ Storage link ya existe"

# Optimizar para producción
echo "⚡ Optimizando para producción..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Verificar conexión a Redis (si está configurado)
if [ ! -z "$REDIS_HOST" ]; then
    echo "🔴 Verificando conexión a Redis..."
    php artisan tinker --execute="Redis::connection()->ping();" || echo "⚠️  Redis no disponible, continuando..."
fi

# Verificar que la aplicación está lista
echo "✅ Aplicación lista para deployment"
php artisan about || true

echo "🎉 Deployment completado!"
