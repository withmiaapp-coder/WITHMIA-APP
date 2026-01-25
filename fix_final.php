<?php
// FIX FINAL: Cambiar rightValue a TRUE
// should_save == true -> Output 0 -> Generate Embedding (SAVE)
// should_save != true -> Output 1 -> Return Not Saved (DON'T SAVE)

$n8nHost = 'https://n8n-production-00dd.up.railway.app';
$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Mjk3OTc3fQ.aCNw5pXWbnyy_JDk24TsYN69T61acaEqoELhrtNtlI0';
$workflowId = 'hAcgcsEzezBJ2HrO';

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => "X-N8N-API-KEY: $apiKey\r\nContent-Type: application/json\r\n"
    ]
]);

$response = file_get_contents("$n8nHost/api/v1/workflows/$workflowId", false, $context);
$workflow = json_decode($response, true);

if (!$workflow) {
    die("Failed to get workflow\n");
}

echo "Got workflow: {$workflow['name']}\n";

// Find and fix Should Save? node
foreach ($workflow['nodes'] as $i => $node) {
    if ($node['name'] === 'Should Save?') {
        echo "Current rightValue: " . var_export($workflow['nodes'][$i]['parameters']['conditions']['conditions'][0]['rightValue'], true) . "\n";
        
        // Set to TRUE so:
        // should_save == true -> Output 0 -> SAVE
        // should_save != true -> Output 1 -> DON'T SAVE
        $workflow['nodes'][$i]['parameters']['conditions']['conditions'][0]['rightValue'] = true;
        
        echo "New rightValue: TRUE\n";
        break;
    }
}

echo "\nConnections:\n";
echo "Output 0 -> " . $workflow['connections']['Should Save?']['main'][0][0]['node'] . " (SAVE when true)\n";
echo "Output 1 -> " . $workflow['connections']['Should Save?']['main'][1][0]['node'] . " (NO SAVE when false)\n";

// Update
$update = [
    'name' => $workflow['name'],
    'nodes' => $workflow['nodes'],
    'connections' => $workflow['connections'],
    'settings' => $workflow['settings'] ?? (object)[]
];

$putContext = stream_context_create([
    'http' => [
        'method' => 'PUT',
        'header' => "X-N8N-API-KEY: $apiKey\r\nContent-Type: application/json\r\n",
        'content' => json_encode($update),
        'ignore_errors' => true
    ]
]);

$result = file_get_contents("$n8nHost/api/v1/workflows/$workflowId", false, $putContext);
$decoded = json_decode($result, true);

if (isset($decoded['id'])) {
    echo "\n✅ FIXED! Workflow updated.\n";
    echo "Now when should_save=false, it goes to 'Return Not Saved' (no guarda)\n";
} else {
    echo "\n❌ Error: $result\n";
}
