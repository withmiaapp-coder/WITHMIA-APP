<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "🔧 Reparando proyecto personal de N8N...\n\n";

$userId = '00000000-0000-0000-0000-000000000001';
$email = 'automatiza@withmia.com';

// 1. Verificar usuario
echo "1️⃣ Verificando usuario...\n";
$stmt = $pdo->query("SELECT * FROM n8n.\"user\" WHERE id = '$userId'");
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if ($user) {
    echo "  ✅ Usuario existe: {$user['email']}\n";
} else {
    echo "  ❌ Usuario no encontrado\n";
    exit(1);
}

// 2. Verificar/Crear proyecto personal
echo "\n2️⃣ Verificando proyecto personal...\n";
$projectId = $userId; // El proyecto personal usa el mismo ID que el usuario

$stmt = $pdo->query("SELECT * FROM n8n.project WHERE id = '$projectId' OR type = 'personal'");
$project = $stmt->fetch(PDO::FETCH_ASSOC);

if ($project) {
    echo "  ℹ️ Proyecto encontrado: {$project['id']} (type: {$project['type']})\n";
    $projectId = $project['id'];
} else {
    echo "  ➕ Creando proyecto personal...\n";
    try {
        $stmt = $pdo->prepare("
            INSERT INTO n8n.project (id, name, type, \"createdAt\", \"updatedAt\")
            VALUES (?, ?, 'personal', NOW(), NOW())
        ");
        $stmt->execute([$projectId, 'Admin WITHMIA <automatiza@withmia.com>']);
        echo "  ✅ Proyecto personal creado: $projectId\n";
    } catch (Exception $e) {
        echo "  ❌ Error: " . $e->getMessage() . "\n";
    }
}

// 3. Verificar/Crear relación proyecto-usuario
echo "\n3️⃣ Verificando relación proyecto-usuario...\n";
$stmt = $pdo->query("SELECT * FROM n8n.project_relation WHERE \"userId\" = '$userId'");
$relation = $stmt->fetch(PDO::FETCH_ASSOC);

if ($relation) {
    echo "  ℹ️ Relación existe: proyecto={$relation['projectId']}, role={$relation['role']}\n";
} else {
    echo "  ➕ Creando relación...\n";
    try {
        $stmt = $pdo->prepare("
            INSERT INTO n8n.project_relation (\"projectId\", \"userId\", role, \"createdAt\", \"updatedAt\")
            VALUES (?, ?, 'project:personalOwner', NOW(), NOW())
        ");
        $stmt->execute([$projectId, $userId]);
        echo "  ✅ Relación creada\n";
    } catch (Exception $e) {
        echo "  ❌ Error: " . $e->getMessage() . "\n";
    }
}

// 4. Verificar settings del usuario
echo "\n4️⃣ Actualizando settings del usuario...\n";
try {
    $settings = json_encode([
        'userActivated' => true,
        'firstSuccessfulWorkflowId' => null,
        'isOnboarded' => true
    ]);
    $stmt = $pdo->prepare("UPDATE n8n.\"user\" SET settings = ?::jsonb WHERE id = ?");
    $stmt->execute([$settings, $userId]);
    echo "  ✅ Settings actualizados\n";
} catch (Exception $e) {
    echo "  ❌ Error: " . $e->getMessage() . "\n";
}

// 5. Mostrar estado final
echo "\n📋 Estado final:\n";

$stmt = $pdo->query("SELECT id, name, type FROM n8n.project");
echo "\nProyectos:\n";
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "  - {$row['id']} | {$row['name']} | {$row['type']}\n";
}

$stmt = $pdo->query("SELECT \"projectId\", \"userId\", role FROM n8n.project_relation");
echo "\nRelaciones:\n";
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "  - Proyecto: {$row['projectId']} | Usuario: {$row['userId']} | Role: {$row['role']}\n";
}

echo "\n✅ ¡Proyecto personal reparado!\n";
echo "🔄 Recarga la página de N8N\n";
