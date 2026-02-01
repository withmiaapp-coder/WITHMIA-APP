<?php
/**
 * Script para agregar verificación de palabra clave en mensajes salientes
 */

$n8nUrl = "https://n8n-production-00dd.up.railway.app/api/v1";
$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NTY0MTg1fQ.WqFWOnWwuTLMJHaKme8d3gyfaHNjC2oMqpujb9Xp9tY";

$workflows = [
    'C1mhxAWt67pfg3BC' => 'WITHMIA',
    'DDlf9BNJhNlKiua8' => 'Salud y Belleza'
];

foreach ($workflows as $workflowId => $name) {
    echo "\n=== Procesando: $name ($workflowId) ===\n";
    
    // Obtener workflow actual
    $ch = curl_init("$n8nUrl/workflows/$workflowId");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ["X-N8N-API-KEY: $apiKey"],
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    $response = curl_exec($ch);
    $err = curl_error($ch);
    $workflow = json_decode($response, true);
    curl_close($ch);
    
    if ($err) {
        echo "CURL ERROR: $err\n";
        continue;
    }
    
    if (!$workflow || !isset($workflow['nodes'])) {
        echo "ERROR: No se pudo obtener el workflow\n";
        echo "Response: " . substr($response, 0, 200) . "\n";
        continue;
    }
    
    // Verificar si ya existe el nodo
    $exists = false;
    foreach ($workflow['nodes'] as $node) {
        if ($node['name'] === 'Verifica Palabra Clave Saliente') {
            $exists = true;
            break;
        }
    }
    
    if ($exists) {
        echo "El nodo ya existe, saltando...\n";
        continue;
    }
    
    // Obtener la palabra clave actual del nodo "Verifica Palabra Clave"
    $keyword = "BOT";
    foreach ($workflow['nodes'] as $node) {
        if ($node['name'] === 'Verifica Palabra Clave') {
            $keyword = $node['parameters']['conditions']['conditions'][0]['rightValue'] ?? 'BOT';
            break;
        }
    }
    echo "Palabra clave: $keyword\n";
    
    // Crear nuevo nodo
    $newNode = [
        'id' => 'verifica-palabra-saliente',
        'name' => 'Verifica Palabra Clave Saliente',
        'type' => 'n8n-nodes-base.if',
        'position' => [-2980, 1400],
        'typeVersion' => 2.2,
        'parameters' => [
            'options' => [],
            'conditions' => [
                'options' => [
                    'version' => 2,
                    'typeValidation' => 'loose',
                    'caseSensitive' => false
                ],
                'conditions' => [
                    [
                        'id' => 'check-keyword-outgoing',
                        'operator' => [
                            'type' => 'string',
                            'operation' => 'equals'
                        ],
                        'leftValue' => '={{ ($json.body?.content || $json.content || "").toUpperCase().trim() }}',
                        'rightValue' => $keyword
                    ]
                ],
                'combinator' => 'and'
            ]
        ]
    ];
    
    // Agregar nodo
    $workflow['nodes'][] = $newNode;
    
    // Enviar actualización
    $workflow['nodes'][] = $newNode;
    $workflow['connections']['Is Human Outgoing?']['main'][0] = [
        ['node' => 'Verifica Palabra Clave Saliente', 'type' => 'main', 'index' => 0]
    ];
    $workflow['connections']['Verifica Palabra Clave Saliente'] = [
        'main' => [
            [['node' => 'Activar BOT', 'type' => 'main', 'index' => 0]],
            [['node' => 'Block Agent on Outgoing', 'type' => 'main', 'index' => 0]]
        ]
    ];
    
    $body = json_encode($workflow);
    
    $ch = curl_init("$n8nUrl/workflows/$workflowId");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'PUT',
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => [
            "X-N8N-API-KEY: $apiKey",
            "Content-Type: application/json"
        ],
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    $response = curl_exec($ch);
    $err = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($err) {
        echo "❌ CURL Error: $err\n";
        continue;
    }
    
    if ($httpCode === 200) {
        echo "✅ Workflow actualizado correctamente\n";
    } else {
        echo "❌ Error HTTP $httpCode: " . substr($response, 0, 300) . "\n";
    }
}

echo "\n=== Proceso completado ===\n";
