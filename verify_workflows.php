<?php
/**
 * Verificar que el workflow RAG ahora use headers en lugar de credenciales n8n
 */

$n8nUrl = 'https://n8n-production-00dd.up.railway.app';
$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Mjk3OTc3fQ.aCNw5pXWbnyy_JDk24TsYN69T61acaEqoELhrtNtlI0';

$ch = curl_init("$n8nUrl/api/v1/workflows");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-N8N-API-KEY: $apiKey"]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$workflows = json_decode($response, true);

echo "=== VERIFICACIÓN DE WORKFLOWS ===\n\n";

foreach ($workflows['data'] ?? [] as $wf) {
    echo "📋 {$wf['name']}\n";
    echo "   ID: {$wf['id']}\n";
    echo "   Estado: " . ($wf['active'] ? '✅ ACTIVO' : '❌ INACTIVO') . "\n";
    
    // Analizar nodos
    foreach ($wf['nodes'] ?? [] as $node) {
        // Buscar nodos HTTP Request
        if ($node['type'] === 'n8n-nodes-base.httpRequest') {
            $url = $node['parameters']['url'] ?? '';
            $hasCredentials = isset($node['credentials']);
            $hasHeaders = isset($node['parameters']['sendHeaders']) && $node['parameters']['sendHeaders'];
            
            if (strpos($url, 'openai') !== false || strpos($url, 'qdrant') !== false) {
                echo "   📦 {$node['name']}:\n";
                echo "      URL: " . substr($url, 0, 60) . "...\n";
                
                if ($hasCredentials) {
                    echo "      ⚠️  Usa CREDENCIALES n8n: " . json_encode($node['credentials']) . "\n";
                }
                
                if ($hasHeaders) {
                    echo "      ✅ Usa HEADERS dinámicos\n";
                }
                
                if (!$hasCredentials && !$hasHeaders) {
                    echo "      ❌ Sin autenticación!\n";
                }
            }
        }
    }
    echo "\n";
}

echo "=== FIN ===\n";
