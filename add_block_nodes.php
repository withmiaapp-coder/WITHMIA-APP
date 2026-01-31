<?php
/**
 * Agregar nodos de bloqueo a cualquier workflow
 */

$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NTY0MTg1fQ.WqFWOnWwuTLMJHaKme8d3gyfaHNjC2oMqpujb9Xp9tY';
$baseUrl = 'https://n8n-production-00dd.up.railway.app';
$workflowId = $argv[1] ?? 'DDlf9BNJhNlKiua8'; // Salud y Belleza por defecto

// Obtener workflow actual
echo "📥 Obteniendo workflow $workflowId...\n";
$ch = curl_init("$baseUrl/api/v1/workflows/$workflowId");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-N8N-API-KEY: $apiKey"]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
curl_close($ch);

$workflow = json_decode($response, true);
if (!$workflow) {
    die("Error al obtener workflow\n");
}

echo "📁 Workflow: " . $workflow['name'] . "\n";
echo "📊 Nodos: " . count($workflow['nodes']) . "\n";
echo "⚡ Activo: " . ($workflow['active'] ? 'Sí' : 'No') . "\n\n";

// Verificar si ya tiene los nodos
$hasIsHumanOutgoing = false;
$hasBlockAgent = false;
foreach ($workflow['nodes'] as $node) {
    if ($node['name'] === 'Is Human Outgoing?') $hasIsHumanOutgoing = true;
    if ($node['name'] === 'Block Agent on Outgoing') $hasBlockAgent = true;
}

if (!$hasIsHumanOutgoing) {
    echo "➕ Agregando nodo: Is Human Outgoing?\n";
    $workflow['nodes'][] = [
        'parameters' => [
            'conditions' => [
                'options' => [
                    'caseSensitive' => true,
                    'leftValue' => '',
                    'typeValidation' => 'loose',
                    'version' => 2
                ],
                'conditions' => [
                    [
                        'id' => 'check-event-outgoing',
                        'leftValue' => '={{ $json.event || $json.body?.event || \'\' }}',
                        'rightValue' => 'message_created',
                        'operator' => ['type' => 'string', 'operation' => 'equals']
                    ],
                    [
                        'id' => 'check-outgoing',
                        'leftValue' => '={{ $json.message_type || $json.body?.message_type || \'\' }}',
                        'rightValue' => 'outgoing',
                        'operator' => ['type' => 'string', 'operation' => 'equals']
                    ],
                    [
                        'id' => 'check-not-private-outgoing',
                        'leftValue' => '={{ $json.private === true || $json.body?.private === true }}',
                        'rightValue' => false,
                        'operator' => ['type' => 'boolean', 'operation' => 'equals']
                    ]
                ],
                'combinator' => 'and'
            ],
            'options' => new stdClass()
        ],
        'type' => 'n8n-nodes-base.if',
        'typeVersion' => 2.2,
        'position' => [-3100, 1400],
        'id' => 'filter-human-outgoing',
        'name' => 'Is Human Outgoing?'
    ];
}

if (!$hasBlockAgent) {
    echo "➕ Agregando nodo: Block Agent on Outgoing\n";
    $workflow['nodes'][] = [
        'parameters' => [
            'operation' => 'set',
            'key' => '={{ ($json.conversation?.meta?.sender?.phone_number || $json.body?.conversation?.meta?.sender?.phone_number || ($json.conversation?.meta?.sender?.identifier || $json.body?.conversation?.meta?.sender?.identifier || "").split("@")[0] || "").replace("+", "") }}',
            'value' => 'blocked-bot',
            'expire' => true,
            'ttl' => 6000
        ],
        'type' => 'n8n-nodes-base.redis',
        'typeVersion' => 1,
        'position' => [-2860, 1400],
        'id' => 'block-agent-on-outgoing',
        'name' => 'Block Agent on Outgoing',
        'credentials' => [
            'redis' => [
                'id' => 'CPupX2mFsjZmNBpb',
                'name' => 'Redis Railway'
            ]
        ]
    ];
}

// Asegurar conexiones
echo "\n🔗 Configurando conexiones...\n";

// Is Incoming Message? FALSE -> Is Human Outgoing?
if (!isset($workflow['connections']['Is Incoming Message?']['main'][1])) {
    $workflow['connections']['Is Incoming Message?']['main'][1] = [
        ['node' => 'Is Human Outgoing?', 'type' => 'main', 'index' => 0]
    ];
    echo "   ✅ Is Incoming Message? FALSE -> Is Human Outgoing?\n";
}

// Is Human Outgoing? -> Block Agent on Outgoing
if (!isset($workflow['connections']['Is Human Outgoing?'])) {
    $workflow['connections']['Is Human Outgoing?'] = [
        'main' => [
            [['node' => 'Block Agent on Outgoing', 'type' => 'main', 'index' => 0]]
        ]
    ];
    echo "   ✅ Is Human Outgoing? -> Block Agent on Outgoing\n";
}

// Preparar payload
$updatePayload = [
    'name' => $workflow['name'],
    'nodes' => $workflow['nodes'],
    'connections' => $workflow['connections'],
    'settings' => $workflow['settings']
];

$jsonStr = json_encode($updatePayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$jsonStr = preg_replace('/"parameters"\s*:\s*\[\s*\]/', '"parameters":{}', $jsonStr);
$jsonStr = preg_replace('/"options"\s*:\s*\{\s*\}/', '"options":{}', $jsonStr);

echo "\n🚀 Actualizando workflow...\n";
$ch = curl_init("$baseUrl/api/v1/workflows/$workflowId");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonStr);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-N8N-API-KEY: $apiKey", "Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $result = json_decode($response, true);
    echo "✅ Workflow actualizado - Nodos: " . count($result['nodes']) . "\n";
    
    // Activar
    echo "🔌 Activando...\n";
    $ch = curl_init("$baseUrl/api/v1/workflows/$workflowId/activate");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-N8N-API-KEY: $apiKey"]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $activateResponse = curl_exec($ch);
    $activateCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($activateCode === 200) {
        echo "✅ Workflow ACTIVO\n";
    } else {
        echo "❌ Error al activar: HTTP $activateCode\n";
        echo $activateResponse . "\n";
    }
} else {
    echo "❌ Error: HTTP $httpCode\n";
    echo $response . "\n";
}
