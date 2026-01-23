<?php
/**
 * Actualizar TODOS los workflows en n8n para usar las credenciales correctas
 * Y actualizar el template para futuros clientes
 */

$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "🔧 Actualizando workflows con credenciales correctas...\n\n";

// Obtener IDs de credenciales actuales
$stmt = $pdo->query("SELECT id, name, type FROM n8n.credentials_entity");
$credentials = $stmt->fetchAll(PDO::FETCH_ASSOC);

$credentialMap = [];
foreach ($credentials as $cred) {
    $credentialMap[$cred['type']] = [
        'id' => $cred['id'],
        'name' => $cred['name']
    ];
    echo "📌 {$cred['type']}: {$cred['name']} (ID: {$cred['id']})\n";
}

if (!isset($credentialMap['openAiApi'])) {
    echo "❌ No se encontró credencial de OpenAI\n";
    exit(1);
}

$openAiCredId = $credentialMap['openAiApi']['id'];
$openAiCredName = $credentialMap['openAiApi']['name'];

echo "\n=== Actualizando todos los workflows ===\n";

// Obtener TODOS los workflows
$stmt = $pdo->query("SELECT id, name, nodes FROM n8n.workflow_entity");
$workflows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($workflows as $workflow) {
    echo "\n📋 Workflow: {$workflow['name']}\n";
    
    $nodes = json_decode($workflow['nodes'], true);
    $updated = false;
    
    foreach ($nodes as &$node) {
        // Buscar nodos que usen credenciales de OpenAI
        if (isset($node['credentials']['openAiApi'])) {
            $oldId = $node['credentials']['openAiApi']['id'] ?? 'unknown';
            
            if ($oldId !== $openAiCredId) {
                $node['credentials']['openAiApi'] = [
                    'id' => $openAiCredId,
                    'name' => $openAiCredName
                ];
                echo "   ✅ Nodo '{$node['name']}': ID $oldId → $openAiCredId\n";
                $updated = true;
            } else {
                echo "   ✓ Nodo '{$node['name']}': Ya tiene ID correcto\n";
            }
        }
        
        // También buscar en nodeCredentialType para HTTP Request con auth
        if (isset($node['parameters']['nodeCredentialType']) && 
            $node['parameters']['nodeCredentialType'] === 'openAiApi' &&
            isset($node['credentials']['openAiApi'])) {
            
            $oldId = $node['credentials']['openAiApi']['id'] ?? 'unknown';
            
            if ($oldId !== $openAiCredId) {
                $node['credentials']['openAiApi'] = [
                    'id' => $openAiCredId,
                    'name' => $openAiCredName
                ];
                echo "   ✅ Nodo HTTP '{$node['name']}': ID $oldId → $openAiCredId\n";
                $updated = true;
            }
        }
    }
    
    if ($updated) {
        $stmt = $pdo->prepare("UPDATE n8n.workflow_entity SET nodes = ?, \"updatedAt\" = NOW() WHERE id = ?");
        $stmt->execute([json_encode($nodes), $workflow['id']]);
        echo "   💾 Workflow guardado\n";
    }
}

echo "\n✅ Todos los workflows actualizados!\n";

// Ahora guardar los IDs en un archivo de configuración para referencia
echo "\n=== IDs de credenciales para futuros workflows ===\n";
echo "OpenAI API ID: $openAiCredId\n";
echo "OpenAI API Name: $openAiCredName\n";

if (isset($credentialMap['redis'])) {
    echo "Redis ID: {$credentialMap['redis']['id']}\n";
}
if (isset($credentialMap['qdrantApi'])) {
    echo "Qdrant ID: {$credentialMap['qdrantApi']['id']}\n";
}
