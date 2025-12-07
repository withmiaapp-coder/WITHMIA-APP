# Script de Commit para Railway Configuration
# Ejecutar desde PowerShell en la raíz del proyecto

Write-Host "🚀 Iniciando commit de configuración Railway..." -ForegroundColor Green

# Verificar que estamos en la raíz del proyecto
if (-not (Test-Path ".git")) {
    Write-Host "❌ Error: No estás en la raíz del repositorio Git" -ForegroundColor Red
    Write-Host "📁 Navega a: C:\Users\angel\OneDrive - UNIVERSIDAD ANDRES BELLO\Documents\WITHMIA\mia-app" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Verificando archivos cambiados..." -ForegroundColor Cyan

# Agregar todos los archivos
git add .

# Verificar el estado
Write-Host "`n📊 Estado del repositorio:" -ForegroundColor Cyan
git status --short

# Hacer commit
Write-Host "`n💾 Creando commit..." -ForegroundColor Cyan
git commit -m "Update Railway configuration with Redis and custom domain

- Add Redis configuration for sessions, cache and queues
- Update APP_URL to app.withmia.com
- Add comprehensive deployment documentation
- Improve railway-init.sh with Redis verification
- Add TrustProxies middleware for HTTPS support
- Update variables configuration files"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Commit creado exitosamente" -ForegroundColor Green
    
    # Push a origin
    Write-Host "`n📤 Subiendo cambios a GitHub..." -ForegroundColor Cyan
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ ¡Cambios subidos exitosamente a GitHub!" -ForegroundColor Green
        Write-Host "`n🎯 SIGUIENTE PASO:" -ForegroundColor Yellow
        Write-Host "1. Ve a Railway: https://railway.app/dashboard" -ForegroundColor White
        Write-Host "2. Abre tu proyecto y servicio" -ForegroundColor White
        Write-Host "3. Settings → Variables → Raw Editor" -ForegroundColor White
        Write-Host "4. Copia el contenido de RAILWAY_VARIABLES_ACTUALIZADO.txt" -ForegroundColor White
        Write-Host "5. Pégalo en Raw Editor y guarda" -ForegroundColor White
    } else {
        Write-Host "❌ Error al hacer push. Verifica tu conexión y permisos." -ForegroundColor Red
        Write-Host "Intenta manualmente: git push origin main" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Error al crear commit" -ForegroundColor Red
    Write-Host "Puede que no haya cambios para commitear" -ForegroundColor Yellow
}

Write-Host "`nPresiona cualquier tecla para salir..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
