<?php
// FIX: Cambiar la condición a "exists" en lugar de "equals true"
// Esto debería funcionar mejor con booleanos

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

// Find and REPLACE Should Save? node with a Code node that handles routing
foreach ($workflow['nodes'] as $i => $node) {
    if ($node['name'] === 'Should Save?') {
        echo "Found Should Save? at index $i\n";
        
        // Change to use "notEmpty" check on should_save
        // This way: if should_save is truthy (true) -> Output 0 (save)
        //           if should_save is falsy (false/null/undefined) -> Output 1 (no save)
        
        $workflow['nodes'][$i]['parameters'] = [
            'conditions' => [
                'options' => [
                    'caseSensitive' => true,
                    'leftValue' => '',
                    'typeValidation' => 'loose'
                ],
                'conditions' => [
                    [
                        'id' => 'save-condition',
                        'leftValue' => '={{ $json.should_save }}',
                        'rightValue' => '',
                        'operator' => [
                            'type' => 'boolean',
                            'operation' => 'true'  // Check if truthy
                        ]
                    ]
                ]
            ]
        ];
        
        echo "Changed to: operator.operation = 'true' (check if truthy)\n";
        break;
    }
}

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
    echo "\n✅ Workflow updated!\n";
} else {
    echo "\n❌ Error: $result\n";
}
