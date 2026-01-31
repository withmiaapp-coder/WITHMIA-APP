<?php
/**
 * Script para modificar el workflow de n8n y agregar bloqueo del bot cuando humano envía mensaje
 * 
 * PROBLEMA: Cuando el humano envía mensaje desde la app:
 * - Chatwoot webhook dispara con message_type: outgoing
 * - El workflow n8n solo procesa message_type: incoming
 * - Por lo tanto, NO se activa el bloqueo del bot
 * 
 * SOLUCIÓN: Agregar una rama que procese mensajes outgoing y bloquee el bot
 */

$n8nApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NTY0MTg1fQ.WqFWOnWwuTLMJHaKme8d3gyfaHNjC2oMqpujb9Xp9tY';
$n8nBaseUrl = 'https://n8n-production-00dd.up.railway.app';
$workflowId = 'C1mhxAWt67pfg3BC'; // WITHMIA Bot

// Obtener el workflow actual
$ch = curl_init("$n8nBaseUrl/api/v1/workflows/$workflowId");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "X-N8N-API-KEY: $n8nApiKey",
    "Content-Type: application/json"
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    die("Error al obtener workflow: HTTP $httpCode\n");
}

$workflow = json_decode($response, true);
echo "✅ Workflow obtenido: " . $workflow['name'] . "\n";

// Nuevo nodo: "Is Human Outgoing?" - Detecta si es un mensaje outgoing de humano
$isHumanOutgoingNode = [
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
                    'operator' => [
                        'type' => 'string',
                        'operation' => 'equals'
                    ]
                ],
                [
                    'id' => 'check-outgoing',
                    'leftValue' => '={{ $json.message_type || $json.body?.message_type || \'\' }}',
                    'rightValue' => 'outgoing',
                    'operator' => [
                        'type' => 'string',
                        'operation' => 'equals'
                    ]
                ],
                [
                    'id' => 'check-not-private-outgoing',
                    'leftValue' => '={{ $json.private === true || $json.body?.private === true }}',
                    'rightValue' => false,
                    'operator' => [
                        'type' => 'boolean',
                        'operation' => 'equals'
                    ]
                ],
                [
                    'id' => 'check-not-bot',
                    // El sender en outgoing es el agente/humano que envía, no hay que verificar que no sea bot
                    // Lo importante es que sea un mensaje saliente que no sea privado
                    'leftValue' => '={{ ($json.content || $json.body?.content || \'\').length > 0 }}',
                    'rightValue' => true,
                    'operator' => [
                        'type' => 'boolean',
                        'operation' => 'equals'
                    ]
                ]
            ],
            'combinator' => 'and'
        ],
        'options' => []
    ],
    'type' => 'n8n-nodes-base.if',
    'typeVersion' => 2.2,
    'position' => [-3100, 1400], // Debajo del nodo "Is Incoming Message?"
    'id' => 'filter-human-outgoing',
    'name' => 'Is Human Outgoing?'
];

// Nuevo nodo: "Block Agent on Outgoing" - Redis SET para bloquear el bot
// En mensajes outgoing, el número del cliente está en:
// - conversation.meta.sender.phone_number o
// - conversation.meta.sender.identifier (formato: 56975235071@s.whatsapp.net)
$blockAgentOnOutgoingNode = [
    'parameters' => [
        'operation' => 'set',
        'key' => '={{ (() => { 
            const phone = $json.conversation?.meta?.sender?.phone_number || $json.body?.conversation?.meta?.sender?.phone_number;
            if (phone) return phone.replace(\'+\', \'\');
            const identifier = $json.conversation?.meta?.sender?.identifier || $json.body?.conversation?.meta?.sender?.identifier || \'\';
            return identifier.replace(/@.*$/, \'\').replace(\'+\', \'\');
        })() }}',
        'value' => 'blocked-bot',
        'expire' => true,
        'ttl' => 6000 // 100 minutos
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

// Agregar los nuevos nodos al workflow
$workflow['nodes'][] = $isHumanOutgoingNode;
$workflow['nodes'][] = $blockAgentOnOutgoingNode;

// Modificar las conexiones
// 1. La rama FALSE del nodo "Is Incoming Message?" debe conectar a "Is Human Outgoing?"
// 2. La rama TRUE de "Is Human Outgoing?" debe conectar a "Block Agent on Outgoing"

// Buscar la conexión existente de "Is Incoming Message?" y agregar la rama FALSE
if (!isset($workflow['connections']['Is Incoming Message?']['main'][1])) {
    $workflow['connections']['Is Incoming Message?']['main'][1] = [];
}
$workflow['connections']['Is Incoming Message?']['main'][1][] = [
    'node' => 'Is Human Outgoing?',
    'type' => 'main',
    'index' => 0
];

// Agregar conexión: Is Human Outgoing? TRUE -> Block Agent on Outgoing
$workflow['connections']['Is Human Outgoing?'] = [
    'main' => [
        [
            [
                'node' => 'Block Agent on Outgoing',
                'type' => 'main',
                'index' => 0
            ]
        ]
    ]
];

echo "✅ Nodos y conexiones agregados\n";

// Actualizar el workflow en n8n
$updatePayload = [
    'nodes' => $workflow['nodes'],
    'connections' => $workflow['connections']
];

$ch = curl_init("$n8nBaseUrl/api/v1/workflows/$workflowId");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($updatePayload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "X-N8N-API-KEY: $n8nApiKey",
    "Content-Type: application/json"
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    echo "❌ Error al actualizar workflow: HTTP $httpCode\n";
    echo "Respuesta: $response\n";
    exit(1);
}

$result = json_decode($response, true);
echo "✅ Workflow actualizado exitosamente!\n";
echo "   - ID: " . $result['id'] . "\n";
echo "   - Nombre: " . $result['name'] . "\n";
echo "   - Activo: " . ($result['active'] ? 'Sí' : 'No') . "\n";
echo "\n📝 NOTA: Ahora cuando un humano envíe mensaje desde la app, el bot será bloqueado.\n";
