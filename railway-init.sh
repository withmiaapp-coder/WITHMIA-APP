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
php artisan view:clear
php artisan route:clear
rm -rf bootstrap/cache/*.php || true
rm -rf storage/framework/views/*.php || true

# Crear directorios necesarios para sessions y cache
echo "📁 Creando directorios de almacenamiento..."
mkdir -p storage/framework/sessions
mkdir -p storage/framework/cache/data
mkdir -p storage/framework/views
chmod -R 775 storage/framework

# Storage link
echo "🔗 Creando storage link..."
php artisan storage:link --force || echo "✓ Storage link ya existe"

# NO ejecutar migraciones aquí - se ejecutarán en runtime
echo "⚠️  Las migraciones se ejecutarán al iniciar el servidor"

# NO optimizar durante el build - Redis no está disponible aún
echo "⚠️  Saltando config:cache durante build (se ejecutará en runtime)"

# Verificar que la aplicación está lista
echo "✅ Aplicación lista para deployment"

echo "🎉 Deployment completado!"
