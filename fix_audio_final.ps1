$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NTY0MTg1fQ.WqFWOnWwuTLMJHaKme8d3gyfaHNjC2oMqpujb9Xp9tY"
$baseUrl = "https://n8n-production-00dd.up.railway.app/api/v1"
$workflowId = "C1mhxAWt67pfg3BC"

Write-Host "Obteniendo workflow..."
$workflow = Invoke-RestMethod -Uri "$baseUrl/workflows/$workflowId" -Headers @{"X-N8N-API-KEY"=$apiKey}

# Buscar el nodo Get Audio y cambiar sus opciones para retornar como binario correcto
for ($i = 0; $i -lt $workflow.nodes.Count; $i++) {
    if ($workflow.nodes[$i].name -eq "Get Audio") {
        Write-Host "Get Audio encontrado"
        # Configurar para que retorne RESPUESTA como archivo binario
        $workflow.nodes[$i].parameters = @{
            url = "={{ `$('Normalize Data').item.json.message.audio_url }}"
            method = "GET"
            options = @{
                response = @{
                    response = @{
                        responseFormat = "file"
                    }
                }
            }
        }
        Write-Host "Get Audio configurado para descargar como archivo"
    }
    
    # Buscar Convert Audio y cambiarlo a un nodo NoOp (pasar datos)
    # En realidad, mejor usamos un enfoque diferente: si responseFormat=file,
    # el item ya tiene datos binarios, entonces podemos ir directo a Transcribe
    if ($workflow.nodes[$i].name -eq "Convert Audio") {
        Write-Host "Convert Audio encontrado"
        # Cambiarlo para que simplemente pase los datos binarios sin tocar
        # Usamos extractKey para pasar los datos binarios como están
        $workflow.nodes[$i].parameters = @{
            mode = "passthrough"
        }
        # Cambiamos el tipo a noOp (no operation) para pasar los datos
        $workflow.nodes[$i].type = "n8n-nodes-base.noOp"
        $workflow.nodes[$i].typeVersion = 1
        Write-Host "Convert Audio cambiado a NoOp (pasar datos)"
    }
}

# Actualizar el workflow
$updateBody = @{
    name = $workflow.name
    nodes = $workflow.nodes
    connections = $workflow.connections
    settings = $workflow.settings
}

Write-Host "`nActualizando workflow..."
$jsonBody = $updateBody | ConvertTo-Json -Depth 30 -Compress
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/workflows/$workflowId" -Method Put -Headers @{"X-N8N-API-KEY"=$apiKey; "Content-Type"="application/json"} -Body $jsonBody
    Write-Host "Workflow actualizado! ID: $($response.id)"
} catch {
    Write-Host "Error: $_"
    Write-Host $_.Exception.Response.StatusCode
}
