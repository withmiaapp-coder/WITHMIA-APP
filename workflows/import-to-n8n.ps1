# Script para importar workflows a n8n vía API REST
# Uso: .\import-to-n8n.ps1

$N8N_URL = "https://n8n-production-8f14.up.railway.app"
$API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZDBkOTA2My0zMjE2LTRkNTUtOWY0NS1lZTc4OGJjNDQ1OWMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4MTgwNTAyfQ.m3vbRAtpMVdbIFB4akC4rrx65NvOldTVCnN4dyffUAk"

$headers = @{
    "X-N8N-API-KEY" = $API_KEY
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

Write-Host "`n🚀 IMPORTADOR DE WORKFLOWS A N8N`n" -ForegroundColor Cyan

# Función para importar un workflow
function Import-Workflow {
    param(
        [string]$FilePath,
        [string]$Name
    )
    
    Write-Host "📁 Importando: $Name..." -ForegroundColor Yellow
    
    try {
        # Leer el archivo JSON
        $workflowContent = Get-Content $FilePath -Raw | ConvertFrom-Json
        
        # Preparar el payload para la API
        $payload = @{
            name = $workflowContent.name
            nodes = $workflowContent.nodes
            connections = $workflowContent.connections
            active = $false  # Importar desactivado por defecto
            settings = $workflowContent.settings
            tags = $workflowContent.tags
        } | ConvertTo-Json -Depth 100
        
        # Crear el workflow vía API
        $response = Invoke-RestMethod -Uri "$N8N_URL/api/v1/workflows" `
            -Method Post `
            -Headers $headers `
            -Body $payload `
            -ContentType "application/json"
        
        Write-Host "  ✅ Importado exitosamente (ID: $($response.id))" -ForegroundColor Green
        return $response.id
    }
    catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "  Detalles: $responseBody" -ForegroundColor Red
        }
        return $null
    }
}

# Función para listar workflows existentes
function Get-ExistingWorkflows {
    try {
        $response = Invoke-RestMethod -Uri "$N8N_URL/api/v1/workflows" `
            -Method Get `
            -Headers $headers
        
        Write-Host "`n📋 Workflows existentes en n8n:" -ForegroundColor Cyan
        foreach ($workflow in $response.data) {
            $status = if ($workflow.active) { "🟢 Activo" } else { "⚪ Inactivo" }
            Write-Host "  $status - $($workflow.name) (ID: $($workflow.id))"
        }
        Write-Host ""
        
        return $response.data
    }
    catch {
        Write-Host "❌ Error al obtener workflows: $($_.Exception.Message)" -ForegroundColor Red
        return @()
    }
}

# Función para activar un workflow
function Enable-Workflow {
    param([string]$WorkflowId)
    
    try {
        $payload = @{ active = $true } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$N8N_URL/api/v1/workflows/$WorkflowId" `
            -Method Patch `
            -Headers $headers `
            -Body $payload `
            -ContentType "application/json"
        
        Write-Host "  ✅ Workflow activado" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "  ❌ Error al activar: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Menú principal
Write-Host "Selecciona una opción:`n"
Write-Host "1. Listar workflows existentes"
Write-Host "2. Importar workflow de RAG (rag-documents-updated.json)"
Write-Host "3. Importar workflow de WhatsApp (whatsapp-bot-updated.json)"
Write-Host "4. Importar AMBOS workflows"
Write-Host "5. Activar workflow por ID"
Write-Host "0. Salir`n"

$choice = Read-Host "Opción"

switch ($choice) {
    "1" {
        Get-ExistingWorkflows
    }
    "2" {
        $id = Import-Workflow -FilePath ".\rag-documents-updated.json" -Name "RAG Documents"
        if ($id) {
            $activate = Read-Host "`n¿Activar workflow ahora? (s/n)"
            if ($activate -eq "s") {
                Enable-Workflow -WorkflowId $id
            }
        }
    }
    "3" {
        $id = Import-Workflow -FilePath ".\whatsapp-bot-updated.json" -Name "WhatsApp Bot"
        if ($id) {
            $activate = Read-Host "`n¿Activar workflow ahora? (s/n)"
            if ($activate -eq "s") {
                Enable-Workflow -WorkflowId $id
            }
        }
    }
    "4" {
        Write-Host "`n📦 Importando workflows...`n"
        
        $ragId = Import-Workflow -FilePath ".\rag-documents-updated.json" -Name "RAG Documents"
        $whatsappId = Import-Workflow -FilePath ".\whatsapp-bot-updated.json" -Name "WhatsApp Bot"
        
        Write-Host "`n✅ Importación completa!" -ForegroundColor Green
        Write-Host "  RAG ID: $ragId"
        Write-Host "  WhatsApp ID: $whatsappId"
        
        $activateAll = Read-Host "`n¿Activar ambos workflows? (s/n)"
        if ($activateAll -eq "s") {
            if ($ragId) { Enable-Workflow -WorkflowId $ragId }
            if ($whatsappId) { Enable-Workflow -WorkflowId $whatsappId }
        }
    }
    "5" {
        $workflowId = Read-Host "ID del workflow"
        Enable-Workflow -WorkflowId $workflowId
    }
    "0" {
        Write-Host "`n👋 Saliendo...`n"
        exit
    }
    default {
        Write-Host "`n❌ Opción inválida`n" -ForegroundColor Red
    }
}

Write-Host "`n✨ Proceso completado!`n" -ForegroundColor Green
