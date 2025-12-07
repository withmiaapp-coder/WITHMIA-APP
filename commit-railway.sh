#!/bin/bash
# Script de Commit para Railway Configuration
# Ejecutar desde Git Bash en la raíz del proyecto

echo "🚀 Iniciando commit de configuración Railway..."

# Verificar que estamos en la raíz del proyecto
if [ ! -d ".git" ]; then
    echo "❌ Error: No estás en la raíz del repositorio Git"
    echo "📁 Navega a la carpeta del proyecto primero"
    exit 1
fi

echo "📋 Verificando archivos cambiados..."

# Agregar todos los archivos
git add .

# Verificar el estado
echo ""
echo "📊 Estado del repositorio:"
git status --short

# Hacer commit
echo ""
echo "💾 Creando commit..."
git commit -m "Update Railway configuration with Redis and custom domain

- Add Redis configuration for sessions, cache and queues
- Update APP_URL to app.withmia.com
- Add comprehensive deployment documentation
- Improve railway-init.sh with Redis verification
- Add TrustProxies middleware for HTTPS support
- Update variables configuration files"

if [ $? -eq 0 ]; then
    echo "✅ Commit creado exitosamente"
    
    # Push a origin
    echo ""
    echo "📤 Subiendo cambios a GitHub..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ ¡Cambios subidos exitosamente a GitHub!"
        echo ""
        echo "🎯 SIGUIENTE PASO:"
        echo "1. Ve a Railway: https://railway.app/dashboard"
        echo "2. Abre tu proyecto y servicio"
        echo "3. Settings → Variables → Raw Editor"
        echo "4. Copia el contenido de RAILWAY_VARIABLES_ACTUALIZADO.txt"
        echo "5. Pégalo en Raw Editor y guarda"
    else
        echo "❌ Error al hacer push. Verifica tu conexión y permisos."
        echo "Intenta manualmente: git push origin main"
    fi
else
    echo "❌ Error al crear commit"
    echo "Puede que no haya cambios para commitear"
fi

read -p "Presiona Enter para salir..."
