# Script para generar claves de Reverb
# Ejecutar: .\generate-reverb-keys.ps1

Write-Host "🔐 Generando claves de Laravel Reverb..." -ForegroundColor Cyan

# Generar claves aleatorias
$appKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$appSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
$appId = "mia-app"

Write-Host ""
Write-Host "✅ Claves generadas exitosamente:" -ForegroundColor Green
Write-Host ""
Write-Host "# Copiar estas variables al archivo .env o a Railway:" -ForegroundColor Yellow
Write-Host ""
Write-Host "REVERB_APP_ID=$appId"
Write-Host "REVERB_APP_KEY=$appKey"
Write-Host "REVERB_APP_SECRET=$appSecret"
Write-Host ""
Write-Host "# Copiar también al frontend (Vite):" -ForegroundColor Yellow
Write-Host ""
Write-Host "VITE_REVERB_APP_KEY=$appKey"
Write-Host "VITE_PUSHER_APP_KEY=$appKey"
Write-Host ""
Write-Host "📋 Guardado en archivo: .env.reverb" -ForegroundColor Cyan

# Guardar en archivo
$content = @"
# Laravel Reverb Configuration
# Generado el: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Backend
REVERB_APP_ID=$appId
REVERB_APP_KEY=$appKey
REVERB_APP_SECRET=$appSecret

# Frontend (Vite)
VITE_REVERB_APP_KEY=$appKey
VITE_PUSHER_APP_KEY=$appKey
"@

$content | Out-File -FilePath ".env.reverb" -Encoding UTF8

Write-Host ""
Write-Host "🚀 Siguiente paso: Copiar las variables a Railway" -ForegroundColor Magenta
Write-Host "   1. Abrir Railway dashboard" -ForegroundColor White
Write-Host "   2. Ir a Variables de entorno" -ForegroundColor White
Write-Host "   3. Pegar las variables de arriba" -ForegroundColor White
Write-Host "   4. Deploy automático se iniciará" -ForegroundColor White
Write-Host ""
