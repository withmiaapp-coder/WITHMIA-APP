<?php
/**
 * Arreglar workflow n8n - Corregir estructura de conexiones
 */

$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NTY0MTg1fQ.WqFWOnWwuTLMJHaKme8d3gyfaHNjC2oMqpujb9Xp9tY';
$baseUrl = 'https://n8n-production-00dd.up.railway.app';
$workflowId = 'DDlf9BNJhNlKiua8'; // Salud y Belleza

// Leer el archivo guardado y limpiar BOM
$workflowJson = file_get_contents(__DIR__ . '/wf_salud.json');
$workflowJson = preg_replace('/^\xEF\xBB\xBF/', '', $workflowJson); // Remove UTF-8 BOM
$workflowJson = preg_replace('/^\xFE\xFF/', '', $workflowJson); // Remove UTF-16 BE BOM
$workflowJson = preg_replace('/^\xFF\xFE/', '', $workflowJson); // Remove UTF-16 LE BOM
$workflow = json_decode($workflowJson, true);

if (!$workflow) {
    echo "❌ Error al parsear JSON: " . json_last_error_msg() . "\n";
    exit(1);
}

echo "📁 Workflow cargado: " . $workflow['name'] . "\n";
echo "📊 Nodos: " . count($workflow['nodes']) . "\n";
echo "⚡ Activo: " . ($workflow['active'] ? 'Sí' : 'No') . "\n\n";

// Asegurar que todos los nodos tengan parameters como objeto
foreach ($workflow['nodes'] as $i => $node) {
    if (!isset($node['parameters']) || !is_array($node['parameters'])) {
        $workflow['nodes'][$i]['parameters'] = new stdClass();
    }
}

// Arreglar la conexión de "Is Human Outgoing?"
// Debe ser: main: [ [ {node...} ] ] en lugar de main: [ {node...} ]
if (isset($workflow['connections']['Is Human Outgoing?'])) {
    $main = $workflow['connections']['Is Human Outgoing?']['main'];
    
    // Verificar si necesita corrección
    if (isset($main[0]['node'])) {
        echo "🔧 Corrigiendo estructura de 'Is Human Outgoing?'...\n";
        // Está mal - el primer elemento es un objeto, no un array
        $workflow['connections']['Is Human Outgoing?']['main'] = [
            [ // Array para output TRUE (index 0)
                [
                    'node' => 'Block Agent on Outgoing',
                    'type' => 'main',
                    'index' => 0
                ]
            ]
        ];
        echo "✅ Conexión corregida\n";
    } else {
        echo "✅ La conexión ya tiene el formato correcto\n";
    }
}

// También verificar la conexión de "Is Incoming Message?" FALSE -> "Is Human Outgoing?"
if (isset($workflow['connections']['Is Incoming Message?']['main'])) {
    $main = $workflow['connections']['Is Incoming Message?']['main'];
    echo "\n📋 Conexiones de 'Is Incoming Message?':\n";
    
    // Asegurar que la primera salida esté bien formada
    if (isset($main[0]) && isset($main[0]['node'])) {
        // La estructura está mal, hay que anidar en array
        $workflow['connections']['Is Incoming Message?']['main'][0] = [$main[0]];
    }
    
    // Verificar que tenga 2 salidas y la segunda esté bien formada
    if (!isset($main[1])) {
        echo "⚠️ Falta la conexión FALSE, agregando...\n";
        $workflow['connections']['Is Incoming Message?']['main'][1] = [
            [
                'node' => 'Is Human Outgoing?',
                'type' => 'main', 
                'index' => 0
            ]
        ];
    } else if (isset($main[1]['node'])) {
        // La estructura está mal - es un objeto directo en lugar de array
        echo "🔧 Corrigiendo estructura de salida FALSE (objeto -> array)...\n";
        $workflow['connections']['Is Incoming Message?']['main'][1] = [
            [
                'node' => 'Is Human Outgoing?',
                'type' => 'main',
                'index' => 0
            ]
        ];
    } else if (is_array($main[1]) && !isset($main[1][0])) {
        // Es un array pero vacío o mal formado
        echo "🔧 Corrigiendo estructura de salida FALSE (array vacío)...\n";
        $workflow['connections']['Is Incoming Message?']['main'][1] = [
            [
                'node' => 'Is Human Outgoing?',
                'type' => 'main',
                'index' => 0
            ]
        ];
    }
    
    echo "   TRUE -> Get Company Config\n";
    echo "   FALSE -> Is Human Outgoing?\n";
}

// Guardar el workflow corregido
$fixedJson = json_encode($workflow, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
file_put_contents(__DIR__ . '/wf_fixed.json', $fixedJson);
echo "\n💾 Workflow corregido guardado en wf_fixed.json\n";

// Preparar payload para actualizar
// Usar JSON_FORCE_OBJECT para arrays vacíos
$updatePayload = [
    'name' => $workflow['name'],
    'nodes' => $workflow['nodes'],
    'connections' => $workflow['connections'],
    'settings' => $workflow['settings']
];

// Convertir arrays vacíos en objetos vacíos para los parameters
$jsonStr = json_encode($updatePayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
// Reemplazar "parameters":[] por "parameters":{}
$jsonStr = preg_replace('/"parameters"\s*:\s*\[\s*\]/', '"parameters":{}', $jsonStr);
// Reemplazar "options":[] por "options":{}  
$jsonStr = preg_replace('/"options"\s*:\s*\[\s*\]/', '"options":[]', $jsonStr);

echo "\n🚀 Actualizando workflow en n8n...\n";

$ch = curl_init("$baseUrl/api/v1/workflows/$workflowId");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonStr);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "X-N8N-API-KEY: $apiKey",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $result = json_decode($response, true);
    echo "✅ Workflow actualizado exitosamente\n";
    echo "   ID: " . $result['id'] . "\n";
    echo "   Activo: " . ($result['active'] ? 'Sí' : 'No') . "\n";
    
    // Ahora activar el workflow
    echo "\n🔌 Activando workflow...\n";
    $ch = curl_init("$baseUrl/api/v1/workflows/$workflowId/activate");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "X-N8N-API-KEY: $apiKey",
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $activateResponse = curl_exec($ch);
    $activateCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($activateCode === 200) {
        $activateResult = json_decode($activateResponse, true);
        echo "✅ Workflow ACTIVADO: " . ($activateResult['active'] ? 'Sí' : 'No') . "\n";
    } else {
        echo "❌ Error al activar: HTTP $activateCode\n";
        echo "   Respuesta: $activateResponse\n";
    }
} else {
    echo "❌ Error al actualizar: HTTP $httpCode\n";
    echo "   Respuesta: $response\n";
}
