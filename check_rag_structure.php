<?php
/**
 * Ver estructura completa del workflow RAG
 */
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$stmt = $pdo->query("SELECT id, name, nodes, active FROM n8n.workflow_entity WHERE name LIKE '%RAG%'");
$workflow = $stmt->fetch(PDO::FETCH_ASSOC);

echo "📋 Workflow: {$workflow['name']}\n";
echo "📌 ID: {$workflow['id']}\n";
echo "🔘 Estado: " . ($workflow['active'] ? '✅ ACTIVO' : '❌ INACTIVO') . "\n\n";

$nodes = json_decode($workflow['nodes'], true);

echo "📑 NODOS:\n";
foreach ($nodes as $node) {
    echo "─────────────────────────────────────────\n";
    echo "📦 {$node['name']} ({$node['type']})\n";
    
    if (isset($node['credentials'])) {
        echo "   🔐 Credenciales:\n";
        foreach ($node['credentials'] as $type => $cred) {
            echo "      - $type: {$cred['name']} ({$cred['id']})\n";
        }
    }
    
    // Mostrar parámetros relevantes
    if (isset($node['parameters'])) {
        $params = $node['parameters'];
        
        // URL en nodos HTTP
        if (isset($params['url'])) {
            echo "   🌐 URL: {$params['url']}\n";
        }
        
        // Headers con auth
        if (isset($params['sendHeaders']) && $params['sendHeaders']) {
            echo "   📤 Headers configurados\n";
            if (isset($params['headerParameters']['parameters'])) {
                foreach ($params['headerParameters']['parameters'] as $h) {
                    $val = $h['value'] ?? '';
                    if (strpos($val, '{{') !== false) {
                        echo "      - {$h['name']}: [EXPRESION DINAMICA]\n";
                    } elseif (stripos($h['name'], 'auth') !== false) {
                        echo "      - {$h['name']}: [OCULTO]\n";
                    } else {
                        echo "      - {$h['name']}: $val\n";
                    }
                }
            }
        }
        
        // Model en OpenAI
        if (isset($params['modelId'])) {
            echo "   🤖 Modelo: " . json_encode($params['modelId']) . "\n";
        }
    }
}

echo "\n─────────────────────────────────────────\n";
echo "✅ El workflow está listo para procesar documentos\n";
