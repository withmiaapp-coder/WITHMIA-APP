<?php
// Script to fix the Should Save? node by swapping connections

$n8nHost = 'https://n8n-production-00dd.up.railway.app';
$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Mjk3OTc3fQ.aCNw5pXWbnyy_JDk24TsYN69T61acaEqoELhrtNtlI0';
$workflowId = 'hAcgcsEzezBJ2HrO';

// Get current workflow
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => "X-N8N-API-KEY: $apiKey\r\nContent-Type: application/json\r\n"
    ]
]);

$response = file_get_contents("$n8nHost/api/v1/workflows/$workflowId", false, $context);
$workflow = json_decode($response, true);

if (!$workflow) {
    die("Failed to get workflow: " . json_last_error_msg() . "\n");
}

echo "Got workflow: {$workflow['name']}\n";

// Update Should Save? node condition
foreach ($workflow['nodes'] as $i => $node) {
    if ($node['name'] === 'Should Save?') {
        echo "Found node at index $i\n";
        // Change condition to check should_save == TRUE
        // Output 0 (when true) -> Generate Embedding (SAVE)
        // Output 1 (else/false) -> Return Not Saved (DON'T SAVE)
        $workflow['nodes'][$i]['parameters']['conditions']['conditions'][0]['rightValue'] = true;
        echo "Changed rightValue to TRUE\n";
        break;
    }
}

// Swap connections
$conn = &$workflow['connections']['Should Save?']['main'];
echo "Before swap:\n";
echo "  Output 0 -> " . $conn[0][0]['node'] . "\n";
echo "  Output 1 -> " . $conn[1][0]['node'] . "\n";

// Swap
$temp = $conn[0];
$conn[0] = $conn[1];
$conn[1] = $temp;

echo "After swap:\n";
echo "  Output 0 -> " . $conn[0][0]['node'] . " (when should_save==false -> DON'T save)\n";
echo "  Output 1 -> " . $conn[1][0]['node'] . " (else -> SAVE)\n";

// Prepare minimal update
$update = [
    'name' => $workflow['name'],
    'nodes' => $workflow['nodes'],
    'connections' => $workflow['connections'],
    'settings' => $workflow['settings'] ?? (object)[]
];

// Send update
$putContext = stream_context_create([
    'http' => [
        'method' => 'PUT',
        'header' => "X-N8N-API-KEY: $apiKey\r\nContent-Type: application/json\r\n",
        'content' => json_encode($update),
        'ignore_errors' => true
    ]
]);

$result = file_get_contents("$n8nHost/api/v1/workflows/$workflowId", false, $putContext);
echo "\nUpdate result:\n$result\n";
