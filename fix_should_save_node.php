<?php
/**
 * Actualizar el nodo "Should Save?" del workflow Training Chat en n8n
 * El problema es que la condición strict no está evaluando correctamente el booleano
 */

$n8nUrl = 'https://n8n-production-00dd.up.railway.app';
$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Mjk3OTc3fQ.aCNw5pXWbnyy_JDk24TsYN69T61acaEqoELhrtNtlI0';
$workflowId = 'hAcgcsEzezBJ2HrO';

echo "🔄 ACTUALIZANDO NODO 'Should Save?' EN N8N\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

// 1. Obtener el workflow actual
$ch = curl_init("$n8nUrl/api/v1/workflows/$workflowId");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ["X-N8N-API-KEY: $apiKey"],
    CURLOPT_SSL_VERIFYPEER => false
]);
$response = curl_exec($ch);
curl_close($ch);

$workflow = json_decode($response, true);
echo "✅ Workflow obtenido: " . $workflow['name'] . "\n";

// 2. Encontrar y actualizar el nodo "Should Save?"
$updated = false;
foreach ($workflow['nodes'] as &$node) {
    if ($node['name'] === 'Should Save?') {
        // Cambiar a validación loose en vez de strict para manejar booleanos correctamente
        $node['parameters'] = [
            'conditions' => [
                'options' => [
                    'caseSensitive' => true,
                    'leftValue' => '',
                    'typeValidation' => 'loose'  // Cambiar de strict a loose
                ],
                'conditions' => [
                    [
                        'id' => 'save-condition',
                        'leftValue' => '={{ $json.should_save }}',
                        'rightValue' => true,
                        'operator' => [
                            'type' => 'boolean',
                            'operation' => 'equals'
                        ]
                    ]
                ]
            ]
        ];
        $updated = true;
        echo "✅ Nodo 'Should Save?' actualizado (typeValidation: loose)\n";
        break;
    }
}

if (!$updated) {
    echo "❌ No se encontró el nodo 'Should Save?'\n";
    exit(1);
}

// 3. Enviar actualización a n8n
$updateData = [
    'name' => $workflow['name'],
    'nodes' => $workflow['nodes'],
    'connections' => $workflow['connections'],
    'settings' => $workflow['settings'] ?? new stdClass(),
];

$ch = curl_init("$n8nUrl/api/v1/workflows/$workflowId");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'PUT',
    CURLOPT_HTTPHEADER => [
        "X-N8N-API-KEY: $apiKey",
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode($updateData, JSON_UNESCAPED_UNICODE),
    CURLOPT_SSL_VERIFYPEER => false
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode >= 200 && $httpCode < 300) {
    echo "✅ Workflow actualizado exitosamente\n";
} else {
    echo "❌ Error actualizando: HTTP $httpCode - $response\n";
}
