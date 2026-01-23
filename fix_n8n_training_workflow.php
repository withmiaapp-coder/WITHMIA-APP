<?php
/**
 * Actualizar el workflow de training en n8n con el nombre de colección correcto
 */

$n8nUrl = 'https://n8n-production-00dd.up.railway.app';
$n8nApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5MTc0MzE2fQ.pFMVOWZocEGa8fu2o6JBSB0aXMcdse54VzvPVNxrpoc';

// Obtener el workflow actual
$workflowId = 'E3qXVMsiTo3O1DaL';

$ch = curl_init("$n8nUrl/api/v1/workflows/$workflowId");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'X-N8N-API-KEY: ' . $n8nApiKey,
        'Content-Type: application/json'
    ],
    CURLOPT_SSL_VERIFYPEER => false
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "HTTP Code: $httpCode\n";
$workflow = json_decode($response, true);
curl_close($ch);

if (!$workflow || !isset($workflow['nodes'])) {
    echo "Error obteniendo workflow\n";
    echo "Response: " . substr($response, 0, 500) . "\n";
    exit(1);
}

echo "Workflow obtenido: " . $workflow['name'] . "\n";

// Buscar el nodo "Prepare Training Data" y actualizar el collectionName
$updated = false;
foreach ($workflow['nodes'] as &$node) {
    if ($node['name'] === 'Prepare Training Data') {
        $jsCode = $node['parameters']['jsCode'];
        
        // Reemplazar el nombre de colección incorrecto
        $oldPattern = "const collectionName = 'knowledge_' + companySlug;";
        $newPattern = "const collectionName = 'company_' + companySlug + '_knowledge';";
        
        if (strpos($jsCode, $oldPattern) !== false) {
            $node['parameters']['jsCode'] = str_replace($oldPattern, $newPattern, $jsCode);
            $updated = true;
            echo "✅ Nodo 'Prepare Training Data' actualizado\n";
        } else {
            echo "⚠️ Patrón no encontrado en Prepare Training Data\n";
            echo "Código actual contiene: " . (strpos($jsCode, 'collectionName') !== false ? 'collectionName' : 'no collectionName') . "\n";
        }
    }
    
    // También actualizar Prepare Qdrant Point para usar IDs enteros
    if ($node['name'] === 'Prepare Qdrant Point') {
        $jsCode = $node['parameters']['jsCode'];
        
        // Buscar y reemplazar el pointId de string a entero
        $oldPointId = "const pointId = deduplication.point_id || ('training_' + Date.now() + '_' + Math.random().toString(36).substring(7));";
        $newPointId = "const pointId = deduplication.point_id || Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);";
        
        if (strpos($jsCode, $oldPointId) !== false) {
            $node['parameters']['jsCode'] = str_replace($oldPointId, $newPointId, $jsCode);
            echo "✅ Nodo 'Prepare Qdrant Point' actualizado para usar IDs enteros\n";
        }
    }
}
unset($node);

if (!$updated) {
    echo "No se encontró el patrón a actualizar. Verificando código...\n";
    foreach ($workflow['nodes'] as $node) {
        if ($node['name'] === 'Prepare Training Data') {
            echo "Código del nodo:\n";
            echo substr($node['parameters']['jsCode'], 0, 500) . "...\n";
        }
    }
    exit(1);
}

// Actualizar el workflow
$updateData = [
    'name' => $workflow['name'],
    'nodes' => $workflow['nodes'],
    'connections' => $workflow['connections'],
    'settings' => $workflow['settings'] ?? ['executionOrder' => 'v1']
];

$ch = curl_init("$n8nUrl/api/v1/workflows/$workflowId");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'PUT',
    CURLOPT_HTTPHEADER => [
        'X-N8N-API-KEY: ' . $n8nApiKey,
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode($updateData),
    CURLOPT_SSL_VERIFYPEER => false
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    echo "✅ Workflow actualizado exitosamente!\n";
} else {
    echo "❌ Error actualizando workflow. HTTP $httpCode\n";
    echo "Response: $response\n";
}
