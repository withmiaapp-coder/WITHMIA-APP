<?php
/**
 * Actualizar el workflow RAG para usar las credenciales correctas
 */
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Obtener el ID de la credencial OpenAI
$stmt = $pdo->query("SELECT id, name FROM n8n.credentials_entity WHERE type = 'openAiApi'");
$openaiCred = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$openaiCred) {
    echo "❌ No se encontró credencial OpenAI\n";
    exit(1);
}

echo "✅ Credencial OpenAI encontrada: {$openaiCred['name']} (ID: {$openaiCred['id']})\n";

// Obtener el workflow RAG
$stmt = $pdo->query("SELECT id, name, nodes FROM n8n.workflow_entity WHERE name LIKE '%RAG%'");
$workflow = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$workflow) {
    echo "❌ No se encontró workflow RAG\n";
    exit(1);
}

echo "📋 Workflow: {$workflow['name']} (ID: {$workflow['id']})\n";

// Parsear y actualizar los nodos
$nodes = json_decode($workflow['nodes'], true);
$updated = false;

foreach ($nodes as &$node) {
    // Actualizar nodos que usen OpenAI credentials
    if (isset($node['credentials']['openAiApi'])) {
        echo "🔄 Actualizando credenciales de: {$node['name']}\n";
        $node['credentials']['openAiApi'] = [
            'id' => $openaiCred['id'],
            'name' => $openaiCred['name']
        ];
        $updated = true;
    }
    
    // Si es el nodo de embeddings que usa HTTP Request, también verificar
    if ($node['name'] === 'Generate Embeddings' && $node['type'] === 'n8n-nodes-base.httpRequest') {
        // Este nodo usa HTTP directo con API key en el body, no necesita credencial
        echo "ℹ️  Nodo '{$node['name']}' usa API key directa del payload (OK)\n";
    }
}

if ($updated) {
    // Guardar los cambios
    $stmt = $pdo->prepare("UPDATE n8n.workflow_entity SET nodes = ?, \"updatedAt\" = NOW() WHERE id = ?");
    $stmt->execute([json_encode($nodes), $workflow['id']]);
    echo "\n✅ Workflow actualizado con nuevas credenciales\n";
} else {
    echo "\nℹ️  No se encontraron nodos que actualizar\n";
}

// Verificar el resultado
echo "\n=== Verificación ===\n";
$stmt = $pdo->query("SELECT nodes FROM n8n.workflow_entity WHERE id = '{$workflow['id']}'");
$updated_wf = $stmt->fetch(PDO::FETCH_ASSOC);
$updated_nodes = json_decode($updated_wf['nodes'], true);

foreach ($updated_nodes as $node) {
    if (isset($node['credentials'])) {
        echo "✓ {$node['name']}: " . json_encode($node['credentials']) . "\n";
    }
}
