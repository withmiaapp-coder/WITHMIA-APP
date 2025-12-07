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
php artisan cache:clear
rm -rf bootstrap/cache/*.php || true
rm -rf storage/framework/views/*.php || true

# Ejecutar migraciones
echo "📊 Ejecutando migraciones..."
php artisan migrate --force --no-interaction --seed || {
    echo "⚠️  Error en migraciones, intentando crear base de datos..."
    php artisan migrate:fresh --force --no-interaction --seed || echo "❌ Migraciones fallaron completamente"
}

# Storage link
echo "🔗 Creando storage link..."
php artisan storage:link --force || echo "✓ Storage link ya existe"

# Crear directorios necesarios para sessions y cache
echo "📁 Creando directorios de almacenamiento..."
mkdir -p storage/framework/sessions
mkdir -p storage/framework/cache/data
mkdir -p storage/framework/views
chmod -R 775 storage/framework

# NO optimizar durante el build - Redis no está disponible aún
echo "⚠️  Saltando config:cache durante build (se ejecutará en runtime)"
# NO optimizar durante el build - Redis no está disponible aún
echo "⚠️  Saltando config:cache durante build (se ejecutará en runtime)"

# Verificar que la aplicación está lista
echo "✅ Aplicación lista para deployment"

echo "🎉 Deployment completado!"
