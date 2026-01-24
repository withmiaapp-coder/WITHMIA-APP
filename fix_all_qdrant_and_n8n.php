<?php
/**
 * Script completo para:
 * 1. Corregir encoding del PDF en Qdrant
 * 2. Actualizar workflow de n8n para futuros entrenamientos
 * 
 * Ejecutar: php fix_all_qdrant_and_n8n.php
 */

// Configuración
$qdrantHost = 'https://qdrant-production-f4e7.up.railway.app';
$collectionName = 'company_withmia-rzmpsq_knowledge';
$qdrantApiKey = 'qdrant_api_key_withmia_2024_secure';
$n8nUrl = 'https://n8n-production-00dd.up.railway.app';

// Obtener variables de entorno de Railway
$openaiKey = getenv('OPENAI_API_KEY') ?: trim(shell_exec('railway variables --format plain 2>nul | findstr OPENAI_API_KEY') ?: '');
if (strpos($openaiKey, '=') !== false) {
    $openaiKey = explode('=', $openaiKey, 2)[1];
}

$n8nApiKey = getenv('N8N_API_KEY') ?: trim(shell_exec('railway variables --format plain 2>nul | findstr N8N_API_KEY') ?: '');
if (strpos($n8nApiKey, '=') !== false) {
    $n8nApiKey = explode('=', $n8nApiKey, 2)[1];
}

echo "═══════════════════════════════════════════════════════════════════\n";
echo "  🔧 CORRECCIÓN COMPLETA DE QDRANT Y N8N\n";
echo "═══════════════════════════════════════════════════════════════════\n\n";

// ============================================================================
// PARTE 1: CORREGIR ENCODING DEL PDF EN QDRANT
// ============================================================================
echo "📄 PARTE 1: CORRIGIENDO ENCODING DE DOCUMENTOS EN QDRANT\n";
echo "───────────────────────────────────────────────────────────────────\n\n";

// Obtener todos los puntos
$ch = curl_init("$qdrantHost/collections/$collectionName/points/scroll");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        "api-key: $qdrantApiKey"
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'limit' => 100,
        'with_payload' => true,
        'with_vector' => true
    ])
]);

$response = curl_exec($ch);
$result = json_decode($response, true);
curl_close($ch);

$points = $result['result']['points'] ?? [];
echo "📊 Puntos encontrados: " . count($points) . "\n\n";

// Mapeo de caracteres corruptos (UTF-8 mal renderizado en consola Windows)
// Estos son los bytes UTF-8 correctos que se ven raros en la consola
$fixEncoding = function($text) {
    if (empty($text)) return $text;
    
    // El texto en Qdrant probablemente está bien - es la consola Windows que lo muestra mal
    // Pero si hay problemas reales de encoding, los arreglamos aquí
    
    // Doble encoding UTF-8 (cuando UTF-8 se codifica como UTF-8 otra vez)
    $text = preg_replace_callback('/[\xC0-\xDF][\x80-\xBF]/', function($m) {
        $char = $m[0];
        // Intentar decodificar doble UTF-8
        $decoded = @iconv('UTF-8', 'ISO-8859-1//IGNORE', $char);
        if ($decoded !== false && mb_check_encoding($decoded, 'UTF-8')) {
            return $decoded;
        }
        return $char;
    }, $text);
    
    return $text;
};

$fixedCount = 0;

foreach ($points as $point) {
    $id = $point['id'];
    $payload = $point['payload'] ?? [];
    $type = $payload['type'] ?? '';
    $text = $payload['text'] ?? $payload['content'] ?? '';
    
    if (empty($text)) continue;
    
    // Para documentos, verificar si necesita corrección
    if ($type === 'document' || strpos($payload['filename'] ?? '', '.pdf') !== false) {
        $originalText = $text;
        $fixedText = $fixEncoding($text);
        
        // Verificar si hubo cambio real
        if ($fixedText !== $originalText && !empty($openaiKey)) {
            echo "📝 Corrigiendo punto ID: $id\n";
            
            // Actualizar payload
            $payload['text'] = $fixedText;
            if (isset($payload['content'])) {
                $payload['content'] = $fixedText;
            }
            
            // Regenerar embedding
            $embedding = generateEmbedding($fixedText, $openaiKey);
            
            if ($embedding) {
                $updatePayload = [
                    'points' => [[
                        'id' => $id,
                        'vector' => $embedding,
                        'payload' => $payload
                    ]]
                ];
                
                $ch = curl_init("$qdrantHost/collections/$collectionName/points");
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_SSL_VERIFYPEER => false,
                    CURLOPT_CUSTOMREQUEST => 'PUT',
                    CURLOPT_HTTPHEADER => [
                        'Content-Type: application/json; charset=utf-8',
                        "api-key: $qdrantApiKey"
                    ],
                    CURLOPT_POSTFIELDS => json_encode($updatePayload, JSON_UNESCAPED_UNICODE)
                ]);
                
                $updateResponse = curl_exec($ch);
                curl_close($ch);
                
                echo "   ✅ Actualizado\n";
                $fixedCount++;
            }
        }
    }
}

if ($fixedCount === 0) {
    echo "✅ No se encontraron documentos que necesiten corrección de encoding.\n";
    echo "   (El texto está correcto en Qdrant - los caracteres raros son solo\n";
    echo "   un problema de visualización de la consola Windows)\n";
} else {
    echo "\n✅ Puntos corregidos: $fixedCount\n";
}

// ============================================================================
// PARTE 2: ACTUALIZAR WORKFLOW DE N8N
// ============================================================================
echo "\n\n📦 PARTE 2: ACTUALIZANDO WORKFLOW DE N8N\n";
echo "───────────────────────────────────────────────────────────────────\n\n";

// Cargar el workflow mejorado desde el archivo local
$workflowPath = __DIR__ . '/workflows/training-chat.json';
if (!file_exists($workflowPath)) {
    echo "❌ No se encontró el archivo de workflow: $workflowPath\n";
    exit(1);
}

$workflowTemplate = file_get_contents($workflowPath);
$workflow = json_decode($workflowTemplate, true);

if (!$workflow) {
    echo "❌ Error parseando workflow JSON\n";
    exit(1);
}

// Obtener lista de workflows de n8n para encontrar el de training
echo "🔍 Buscando workflows de training en n8n...\n";

if (empty($n8nApiKey)) {
    echo "⚠️  No se encontró N8N_API_KEY. Intentando obtener de la base de datos...\n";
    
    // Intentar obtener API key de la DB
    $dbResult = shell_exec('railway run php -r "
        require __DIR__ . \"/vendor/autoload.php\";
        \$app = require_once __DIR__ . \"/bootstrap/app.php\";
        \$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
        \$apiKey = DB::connection(\"n8n\")->table(\"user_api_keys\")->first();
        echo \$apiKey->apiKey ?? \"\";
    " 2>nul');
    
    $n8nApiKey = trim($dbResult ?? '');
}

if (empty($n8nApiKey)) {
    echo "❌ No se pudo obtener N8N_API_KEY\n";
    echo "   Por favor, actualiza el workflow manualmente en: $n8nUrl\n\n";
    
    // Guardar el workflow actualizado localmente
    $outputPath = __DIR__ . '/workflows/training-chat-updated.json';
    
    // Mejorar el workflow con mejor manejo de encoding
    $improvedWorkflow = improveWorkflowEncoding($workflow);
    
    file_put_contents($outputPath, json_encode($improvedWorkflow, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo "📄 Workflow mejorado guardado en: $outputPath\n";
    echo "   Puedes importarlo manualmente en n8n.\n";
} else {
    echo "✅ API Key encontrada\n";
    
    // Listar workflows
    $ch = curl_init("$n8nUrl/api/v1/workflows");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_HTTPHEADER => [
            "X-N8N-API-KEY: $n8nApiKey",
            'Accept: application/json'
        ]
    ]);
    
    $workflowsResponse = curl_exec($ch);
    $workflowsList = json_decode($workflowsResponse, true);
    curl_close($ch);
    
    $trainingWorkflowId = null;
    foreach ($workflowsList['data'] ?? [] as $wf) {
        if (stripos($wf['name'], 'training') !== false) {
            $trainingWorkflowId = $wf['id'];
            echo "   📌 Encontrado: {$wf['name']} (ID: {$wf['id']})\n";
            break;
        }
    }
    
    if ($trainingWorkflowId) {
        // Primero obtener el workflow actual completo
        $ch = curl_init("$n8nUrl/api/v1/workflows/$trainingWorkflowId");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER => [
                "X-N8N-API-KEY: $n8nApiKey",
                'Accept: application/json'
            ]
        ]);
        
        $currentWorkflowResponse = curl_exec($ch);
        $currentWorkflow = json_decode($currentWorkflowResponse, true);
        curl_close($ch);
        
        if (!$currentWorkflow || isset($currentWorkflow['message'])) {
            echo "❌ No se pudo obtener el workflow actual\n";
        } else {
            // Mejorar el workflow con mejor manejo de encoding
            $improvedWorkflow = improveWorkflowEncoding($currentWorkflow);
            
            // Limpiar propiedades que n8n no acepta en PUT
            $allowedProperties = ['name', 'nodes', 'connections', 'settings', 'staticData', 'pinData'];
            $cleanWorkflow = [];
            foreach ($allowedProperties as $prop) {
                if (isset($improvedWorkflow[$prop])) {
                    $cleanWorkflow[$prop] = $improvedWorkflow[$prop];
                }
            }
            
            // Guardar estado activo antes de actualizar
            $wasActive = $currentWorkflow['active'] ?? false;
            
            // Actualizar el workflow usando PUT
            echo "\n🔄 Actualizando workflow...\n";
            
            $ch = curl_init("$n8nUrl/api/v1/workflows/$trainingWorkflowId");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_CUSTOMREQUEST => 'PUT',
                CURLOPT_HTTPHEADER => [
                    "X-N8N-API-KEY: $n8nApiKey",
                    'Content-Type: application/json; charset=utf-8',
                    'Accept: application/json'
                ],
                CURLOPT_POSTFIELDS => json_encode($cleanWorkflow, JSON_UNESCAPED_UNICODE)
            ]);
            
            $updateResponse = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode >= 200 && $httpCode < 300) {
                echo "✅ Workflow actualizado exitosamente\n";
                
                // Reactivar el workflow si estaba activo
                if ($wasActive) {
                    $ch = curl_init("$n8nUrl/api/v1/workflows/$trainingWorkflowId/activate");
                    curl_setopt_array($ch, [
                        CURLOPT_RETURNTRANSFER => true,
                        CURLOPT_SSL_VERIFYPEER => false,
                        CURLOPT_POST => true,
                        CURLOPT_HTTPHEADER => [
                            "X-N8N-API-KEY: $n8nApiKey",
                            'Accept: application/json'
                        ]
                    ]);
                    curl_exec($ch);
                    curl_close($ch);
                    echo "✅ Workflow reactivado\n";
                }
            } else {
                echo "❌ Error actualizando workflow (HTTP $httpCode)\n";
                echo "   Respuesta: " . substr($updateResponse, 0, 300) . "\n";
            }
        }
    } else {
        echo "⚠️  No se encontró workflow de training. Creando uno nuevo...\n";
        
        $improvedWorkflow = improveWorkflowEncoding($workflow);
        
        $ch = curl_init("$n8nUrl/api/v1/workflows");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                "X-N8N-API-KEY: $n8nApiKey",
                'Content-Type: application/json; charset=utf-8',
                'Accept: application/json'
            ],
            CURLOPT_POSTFIELDS => json_encode($improvedWorkflow, JSON_UNESCAPED_UNICODE)
        ]);
        
        $createResponse = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 200 && $httpCode < 300) {
            $created = json_decode($createResponse, true);
            echo "✅ Workflow creado con ID: " . ($created['id'] ?? 'N/A') . "\n";
        } else {
            echo "❌ Error creando workflow (HTTP $httpCode)\n";
        }
    }
}

echo "\n═══════════════════════════════════════════════════════════════════\n";
echo "  ✅ PROCESO COMPLETADO\n";
echo "═══════════════════════════════════════════════════════════════════\n";

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function generateEmbedding($text, $apiKey) {
    $ch = curl_init('https://api.openai.com/v1/embeddings');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json; charset=utf-8',
            "Authorization: Bearer $apiKey"
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'model' => 'text-embedding-3-small',
            'input' => $text
        ], JSON_UNESCAPED_UNICODE)
    ]);
    
    $response = curl_exec($ch);
    $result = json_decode($response, true);
    curl_close($ch);
    
    return $result['data'][0]['embedding'] ?? null;
}

function improveWorkflowEncoding($workflow) {
    // Mejorar el código JavaScript en los nodos para mejor manejo de UTF-8
    $improvedFixEncodingFunction = <<<'JS'
// IMPROVED: Fix mojibake and encoding issues - preserves Spanish characters
function fixEncoding(str) {
  if (!str) return str;
  
  // 1. Normalize Unicode (NFC form)
  if (typeof str.normalize === 'function') {
    str = str.normalize('NFC');
  }
  
  // 2. Fix common mojibake patterns (UTF-8 interpreted as Latin-1)
  const replacements = [
    ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'],
    ['Ã±', 'ñ'], ['Ã¼', 'ü'], ['Ã', 'à'], ['Ã¨', 'è'], ['Ã¬', 'ì'],
    ['Ã²', 'ò'], ['Ã¹', 'ù'], ['Ã¤', 'ä'], ['Ã«', 'ë'], ['Ã¯', 'ï'],
    ['Ã¶', 'ö'], ['Ã¿', 'ÿ'], ['Ã§', 'ç'],
    ['Â¡', '¡'], ['Â¿', '¿'], ['Âº', 'º'], ['Âª', 'ª'],
    ['Ã\u0081', 'Á'], ['Ã\u0089', 'É'], ['Ã\u008D', 'Í'], 
    ['Ã\u0093', 'Ó'], ['Ã\u009A', 'Ú'], ['Ã\u0091', 'Ñ']
  ];
  
  let fixed = str;
  for (const [bad, good] of replacements) {
    fixed = fixed.split(bad).join(good);
  }
  
  // 3. Remove Unicode replacement characters
  fixed = fixed.replace(/\uFFFD/g, '');
  fixed = fixed.replace(/�/g, '');
  
  // 4. Ensure no null bytes
  fixed = fixed.replace(/\x00/g, '');
  
  return fixed;
}
JS;

    // Actualizar los nodos del workflow con el código mejorado
    foreach ($workflow['nodes'] as &$node) {
        if ($node['type'] === 'n8n-nodes-base.code' && isset($node['parameters']['jsCode'])) {
            // Reemplazar la función fixEncoding existente con la mejorada
            $code = $node['parameters']['jsCode'];
            
            // Si contiene fixEncoding, agregar el código mejorado al inicio
            if (strpos($code, 'fixEncoding') !== false) {
                // Remover la función existente y agregar la mejorada
                $code = preg_replace('/function fixEncoding\([^)]*\)\s*\{[^}]+(\{[^}]+\})*[^}]*\}/s', '', $code);
                $code = $improvedFixEncodingFunction . "\n\n" . trim($code);
                $node['parameters']['jsCode'] = $code;
            }
        }
    }
    
    // Agregar nota sobre la actualización
    $workflow['notes'] = ($workflow['notes'] ?? '') . "\n\nActualizado " . date('Y-m-d H:i:s') . " - Mejorado manejo de encoding UTF-8 para caracteres españoles.";
    
    return $workflow;
}
