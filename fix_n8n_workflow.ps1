# Script PowerShell para modificar el workflow de n8n
# Agrega bloqueo del bot cuando humano envia mensaje desde la app

$headers = @{ 
    "X-N8N-API-KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NTY0MTg1fQ.WqFWOnWwuTLMJHaKme8d3gyfaHNjC2oMqpujb9Xp9tY"
    "Content-Type" = "application/json" 
}
$workflowId = "C1mhxAWt67pfg3BC"
$baseUrl = "https://n8n-production-00dd.up.railway.app"

Write-Host "Obteniendo workflow..."
$workflow = Invoke-RestMethod -Uri "$baseUrl/api/v1/workflows/$workflowId" -Headers $headers
Write-Host "Workflow obtenido: $($workflow.name) con $($workflow.nodes.Count) nodos"

# Crear nuevo nodo: Is Human Outgoing?
$isHumanOutgoing = @{
    parameters = @{
        conditions = @{
            options = @{
                caseSensitive = $true
                leftValue = ""
                typeValidation = "loose"
                version = 2
            }
            conditions = @(
                @{
                    id = "check-event-outgoing"
                    leftValue = '={{ $json.event || $json.body?.event || "" }}'
                    rightValue = "message_created"
                    operator = @{
                        type = "string"
                        operation = "equals"
                    }
                },
                @{
                    id = "check-outgoing"
                    leftValue = '={{ $json.message_type || $json.body?.message_type || "" }}'
                    rightValue = "outgoing"
                    operator = @{
                        type = "string"
                        operation = "equals"
                    }
                },
                @{
                    id = "check-not-private-outgoing"
                    leftValue = '={{ $json.private === true || $json.body?.private === true }}'
                    rightValue = $false
                    operator = @{
                        type = "boolean"
                        operation = "equals"
                    }
                }
            )
            combinator = "and"
        }
        options = @()
    }
    type = "n8n-nodes-base.if"
    typeVersion = 2.2
    position = @(-3100, 1400)
    id = "filter-human-outgoing"
    name = "Is Human Outgoing?"
}

# Crear nuevo nodo: Block Agent on Outgoing
$blockAgent = @{
    parameters = @{
        operation = "set"
        key = '={{ ($json.conversation?.meta?.sender?.phone_number || $json.body?.conversation?.meta?.sender?.phone_number || ($json.conversation?.meta?.sender?.identifier || $json.body?.conversation?.meta?.sender?.identifier || "").split("@")[0] || "").replace("+", "") }}'
        value = "blocked-bot"
        expire = $true
        ttl = 6000
    }
    type = "n8n-nodes-base.redis"
    typeVersion = 1
    position = @(-2860, 1400)
    id = "block-agent-on-outgoing"
    name = "Block Agent on Outgoing"
    credentials = @{
        redis = @{
            id = "CPupX2mFsjZmNBpb"
            name = "Redis Railway"
        }
    }
}

# Agregar nodos al workflow
$newNodes = [System.Collections.ArrayList]@($workflow.nodes)
$newNodes.Add($isHumanOutgoing) | Out-Null
$newNodes.Add($blockAgent) | Out-Null

Write-Host "Nodos agregados. Total: $($newNodes.Count)"

# Modificar conexiones - Agregar rama FALSE de "Is Incoming Message?" a "Is Human Outgoing?"
$connections = $workflow.connections | ConvertTo-Json -Depth 20 | ConvertFrom-Json

# Verificar si ya existe la conexion
if (-not $connections.'Is Incoming Message?'.main[1]) {
    $connections.'Is Incoming Message?'.main += @(
        @(
            @{
                node = "Is Human Outgoing?"
                type = "main"
                index = 0
            }
        )
    )
}

# Agregar nueva conexion: Is Human Outgoing? -> Block Agent on Outgoing
$connections | Add-Member -NotePropertyName "Is Human Outgoing?" -NotePropertyValue @{
    main = @(
        @(
            @{
                node = "Block Agent on Outgoing"
                type = "main"
                index = 0
            }
        )
    )
} -Force

Write-Host "Conexiones actualizadas"

# Preparar payload para actualizar
$updatePayload = @{
    name = $workflow.name
    nodes = $newNodes
    connections = $connections
    settings = $workflow.settings
}

Write-Host "Actualizando workflow..."
$jsonPayload = $updatePayload | ConvertTo-Json -Depth 30 -Compress
$result = Invoke-RestMethod -Uri "$baseUrl/api/v1/workflows/$workflowId" -Method Put -Headers $headers -Body $jsonPayload

Write-Host "Workflow actualizado exitosamente!"
Write-Host "ID: $($result.id)"
Write-Host "Nombre: $($result.name)"
Write-Host "Activo: $($result.active)"
