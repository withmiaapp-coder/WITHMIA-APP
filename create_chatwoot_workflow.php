<?php
// Script para crear workflow de Chatwoot en n8n

$n8nApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Mjk3OTc3fQ.aCNw5pXWbnyy_JDk24TsYN69T61acaEqoELhrtNtlI0';
$n8nUrl = 'https://n8n-production-00dd.up.railway.app';

// Leer template
$template = file_get_contents(__DIR__ . '/workflows/chatwoot-bot-template.json');

// Reemplazar placeholders
$replacements = [
    '{{COMPANY_SLUG}}' => 'withmia-nfudrg',
    '{{COMPANY_NAME}}' => 'WITHMIA',
    '{{APP_URL}}' => 'https://app.withmia.com',
    '{{EVOLUTION_API_URL}}' => 'https://evolution-api-production-a7b5.up.railway.app',
    '{{EVOLUTION_API_KEY}}' => 'withmia_evo_2026_xK9mP2vL8nQr4tYw',
    '{{CHATWOOT_API_TOKEN}}' => '60318c5bd2a42b3b41a368851afca25bd1d7267c952abe87360dfbee79f65ea8',
    '{{N8N_OPENAI_CREDENTIAL_ID}}' => 'G5yV74Y2bH5UPxXm',
    '{{N8N_OPENAI_CREDENTIAL_NAME}}' => 'OpenAI Account',
    '{{N8N_QDRANT_CREDENTIAL_ID}}' => 'irLYcaNHzHrWcZ3Z',
    '{{N8N_QDRANT_CREDENTIAL_NAME}}' => 'Qdrant',
];

foreach ($replacements as $key => $value) {
    $template = str_replace($key, $value, $template);
}

$workflow = json_decode($template, true);
$workflow['name'] = 'Chatwoot Bot - withmia-nfudrg';

// Crear workflow via API usando file_get_contents con stream context
$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => [
            'Content-Type: application/json',
            "X-N8N-API-KEY: $n8nApiKey"
        ],
        'content' => json_encode($workflow),
        'ignore_errors' => true
    ],
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false
    ]
]);

$response = @file_get_contents("$n8nUrl/api/v1/workflows", false, $context);

echo "Response: $response\n";

$result = json_decode($response, true);
if (isset($result['id'])) {
    $workflowId = $result['id'];
    echo "Workflow created: $workflowId\n";
    
    // Activar workflow
    $activateContext = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => [
                'Content-Type: application/json',
                "X-N8N-API-KEY: $n8nApiKey"
            ],
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ]);
    
    $activateResponse = @file_get_contents("$n8nUrl/api/v1/workflows/$workflowId/activate", false, $activateContext);
    
    echo "Activation response: $activateResponse\n";
}
