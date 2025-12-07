# Script de limpieza del proyecto MIA
# Elimina archivos de backup, temporales y documentación obsoleta

Write-Host "🧹 Iniciando limpieza del proyecto..." -ForegroundColor Cyan

# Backup folders
Write-Host "`n📦 Eliminando carpetas de backup..." -ForegroundColor Yellow
Remove-Item -Path "backups" -Recurse -Force -ErrorAction SilentlyContinue

# Backup files
Write-Host "`n📄 Eliminando archivos .backup, .original..." -ForegroundColor Yellow
Get-ChildItem -Path . -Include *.backup,*.original,*.before-auth-fix,*.old -Recurse | Remove-Item -Force -ErrorAction SilentlyContinue

# Debug/Test PHP files
Write-Host "`n🔧 Eliminando archivos PHP de debug/test..." -ForegroundColor Yellow
$phpFilesToRemove = @(
    "composer-setup.php",
    "configure-inbox.php",
    "debug_user.php",
    "diagnose_chatwoot_auth.php",
    "generate-key.php",
    "show_complete_data.php",
    "test_auth_final.php",
    "test_disconnect.php",
    "update_user_token.php",
    "update-companies-inbox.php",
    "WHATSAPP_FIX_INSTRUCTIONS.php",
    "storage/reconfigure_chatwoot.php",
    "routes/web-fix-columns.php"
)
foreach ($file in $phpFilesToRemove) {
    Remove-Item -Path $file -Force -ErrorAction SilentlyContinue
}

# Temporary JS files
Write-Host "`n📋 Eliminando archivos JS temporales..." -ForegroundColor Yellow
$jsFilesToRemove = @(
    "temp_generateqr.js",
    "generate-key.js",
    "new_filtered_conversations.js"
)
foreach ($file in $jsFilesToRemove) {
    Remove-Item -Path $file -Force -ErrorAction SilentlyContinue
}

# Temporary text/json files
Write-Host "`n📝 Eliminando archivos temporales..." -ForegroundColor Yellow
$tempFilesToRemove = @(
    "cookies.txt",
    "RAILWAY_VARIABLES.txt",
    "RAILWAY_VARIABLES_ACTUALIZADO.txt",
    "RAILWAY_VARIABLES_DIAGNOSTICO.txt",
    "RAILWAY_VARIABLES_SIN_REDIS.txt",
    "create_instance.json",
    "instance_create.json"
)
foreach ($file in $tempFilesToRemove) {
    Remove-Item -Path $file -Force -ErrorAction SilentlyContinue
}

# Redundant markdown files
Write-Host "`n📚 Eliminando documentación redundante..." -ForegroundColor Yellow
$mdFilesToRemove = @(
    "DIAGNOSTICO_ERROR_500.md",
    "DIAGNOSTICO_HEALTHCHECK.md",
    "SOLUCION_404_RAILWAY.md",
    "SOLUCION_FINAL_ERROR_500.md",
    "SOLUCION_URGENTE.md",
    "HAZLO_AHORA.md",
    "QUE_HACER_AHORA.md",
    "PASOS_RAPIDOS.md",
    "ACTUALIZACION_VARIABLES.md",
    "COMO_HACER_COMMIT.md",
    "ESTADO_FUNCIONAL.md",
    "README_FINAL.md",
    "README_MASTER_DEFINITIVO.md",
    "RAILWAY_DEPLOYMENT.md",
    "VERIFICACION_MYSQL_REDIS.md"
)
foreach ($file in $mdFilesToRemove) {
    Remove-Item -Path $file -Force -ErrorAction SilentlyContinue
}

# Duplicate deployment scripts
Write-Host "`n🚀 Eliminando scripts de deployment duplicados..." -ForegroundColor Yellow
$scriptsToRemove = @(
    "commit-railway.sh",
    "railway-init.sh",
    "railway-deploy.sh"
)
foreach ($file in $scriptsToRemove) {
    Remove-Item -Path $file -Force -ErrorAction SilentlyContinue
}

Write-Host "`n✅ Limpieza completada!" -ForegroundColor Green
Write-Host "📊 Revisa los cambios antes de hacer commit" -ForegroundColor Cyan
