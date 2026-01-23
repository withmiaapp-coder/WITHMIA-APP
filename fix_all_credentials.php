<?php
/**
 * Actualizar TODOS los workflows para usar las credenciales correctas
 */
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Obtener todas las credenciales
$credentials = [];
$stmt = $pdo->query("SELECT id, name, type FROM n8n.credentials_entity");
foreach ($stmt as $row) {
    $credentials[$row['type']] = ['id' => $row['id'], 'name' => $row['name']];
    echo "📦 {$row['type']}: {$row['name']} ({$row['id']})\n";
}

echo "\n";

// Obtener todos los workflows
$stmt = $pdo->query("SELECT id, name, nodes FROM n8n.workflow_entity");
$workflows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($workflows as $workflow) {
    echo "📋 Procesando: {$workflow['name']}\n";
    
    $nodes = json_decode($workflow['nodes'], true);
    $updated = false;
    
    foreach ($nodes as &$node) {
        if (isset($node['credentials'])) {
            foreach ($node['credentials'] as $credType => &$credInfo) {
                if (isset($credentials[$credType])) {
                    $oldId = $credInfo['id'] ?? 'N/A';
                    $newCred = $credentials[$credType];
                    
                    if ($oldId !== $newCred['id']) {
                        echo "  🔄 {$node['name']}: $credType -> {$newCred['id']}\n";
                        $credInfo = [
                            'id' => $newCred['id'],
                            'name' => $newCred['name']
                        ];
                        $updated = true;
                    }
                }
            }
        }
    }
    
    if ($updated) {
        $stmt = $pdo->prepare("UPDATE n8n.workflow_entity SET nodes = ?, \"updatedAt\" = NOW() WHERE id = ?");
        $stmt->execute([json_encode($nodes), $workflow['id']]);
        echo "  ✅ Actualizado\n";
    } else {
        echo "  ℹ️  Sin cambios\n";
    }
}

echo "\n🎉 ¡Listo! Ahora prueba subir un documento.\n";
