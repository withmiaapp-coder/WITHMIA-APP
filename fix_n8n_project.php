<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$userId = '00000000-0000-0000-0000-000000000001';
$projectId = 'pers-' . substr(md5($userId), 0, 31); // Max 36 chars

echo "🔧 Creando proyecto y relación...\n\n";

// Crear proyecto personal
try {
    $stmt = $pdo->prepare("
        INSERT INTO n8n.project (id, name, type, \"createdAt\", \"updatedAt\", \"creatorId\")
        VALUES (?, 'Personal', 'personal', NOW(), NOW(), ?)
    ");
    $stmt->execute([$projectId, $userId]);
    echo "✅ Proyecto personal creado: $projectId\n";
} catch (Exception $e) {
    echo "⚠️ Error: " . $e->getMessage() . "\n";
}

// Crear relación
try {
    $stmt = $pdo->prepare("
        INSERT INTO n8n.project_relation (\"projectId\", \"userId\", \"role\", \"createdAt\", \"updatedAt\")
        VALUES (?, ?, 'project:personalOwner', NOW(), NOW())
    ");
    $stmt->execute([$projectId, $userId]);
    echo "✅ Relación proyecto-usuario creada\n";
} catch (Exception $e) {
    echo "⚠️ Error: " . $e->getMessage() . "\n";
}

echo "\n🎉 ¡Listo! Intenta entrar a n8n ahora.\n";
