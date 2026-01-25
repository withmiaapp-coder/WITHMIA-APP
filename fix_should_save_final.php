<?php
/**
 * Fix final para el nodo Should Save? - cambiar las conexiones
 * El problema es que el Output 0 va a guardar y Output 1 no guarda
 * Pero la condición should_save==true no está funcionando correctamente
 * 
 * SOLUCIÓN: Intercambiar las conexiones para que:
 * - Output 0 (condición true) -> Return Not Saved (NO guardar)
 * - Output 1 (else) -> Generate Embedding (guardar)
 * 
 * Y cambiar la condición a: should_save == false
 */

$n8nHost = 'https://n8n-production-00dd.up.railway.app';
$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Mjk3OTc3fQ.aCNw5pXWbnyy_JDk24TsYN69T61acaEqoELhrtNtlI0';
$workflowId = 'hAcgcsEzezBJ2HrO';

// Get workflow
$ch = curl_init("$n8nHost/api/v1/workflows/$workflowId");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "X-N8N-API-KEY: $apiKey",
        'Content-Type: application/json'
    ]
]);
$response = curl_exec($ch);
curl_close($ch);

$workflow = json_decode($response, true);

if (!$workflow || !isset($workflow['nodes'])) {
    die("Error getting workflow\n");
}

echo "Got workflow: {$workflow['name']}\n\n";

// Find Should Save? node and update condition
foreach ($workflow['nodes'] as &$node) {
    if ($node['name'] === 'Should Save?') {
        echo "Found Should Save? node\n";
        echo "Current condition:\n";
        print_r($node['parameters']['conditions']);
        
        // Change to: should_save == false -> Output 0 (no guardar)
        //            else -> Output 1 (guardar)
        $node['parameters']['conditions']['conditions'][0]['rightValue'] = false;
        $node['parameters']['conditions']['conditions'][0]['operator']['operation'] = 'equals';
        
        echo "\nNew condition: should_save == false\n";
    }
}

// Swap connections for Should Save?
// Current: Output 0 -> Generate Embedding (save), Output 1 -> Return Not Saved
// New:     Output 0 -> Return Not Saved, Output 1 -> Generate Embedding (save)
if (isset($workflow['connections']['Should Save?']['main'])) {
    $connections = $workflow['connections']['Should Save?']['main'];
    
    echo "\nCurrent connections:\n";
    echo "Output 0 -> " . ($connections[0][0]['node'] ?? 'none') . "\n";
    echo "Output 1 -> " . ($connections[1][0]['node'] ?? 'none') . "\n";
    
    // Swap
    $temp = $connections[0];
    $workflow['connections']['Should Save?']['main'][0] = $connections[1];
    $workflow['connections']['Should Save?']['main'][1] = $temp;
    
    echo "\nNew connections:\n";
    echo "Output 0 -> " . $workflow['connections']['Should Save?']['main'][0][0]['node'] . " (NO guardar)\n";
    echo "Output 1 -> " . $workflow['connections']['Should Save?']['main'][1][0]['node'] . " (guardar)\n";
}

// Prepare update payload - only include required fields
$updatePayload = [
    'name' => $workflow['name'],
    'nodes' => $workflow['nodes'],
    'connections' => $workflow['connections'],
    'settings' => $workflow['settings'] ?? new stdClass(),
];

// Update workflow
$ch = curl_init("$n8nHost/api/v1/workflows/$workflowId");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'PUT',
    CURLOPT_POSTFIELDS => json_encode($updatePayload),
    CURLOPT_HTTPHEADER => [
        "X-N8N-API-KEY: $apiKey",
        'Content-Type: application/json'
    ]
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "\n\nUpdate response (HTTP $httpCode):\n";
$result = json_decode($response, true);

if ($httpCode === 200) {
    echo "✅ Workflow updated successfully!\n";
    echo "Now should_save==false goes to 'Return Not Saved' (no guardar)\n";
    echo "And should_save==true goes to 'Generate Embedding' (guardar)\n";
} else {
    echo "❌ Error: $response\n";
}
