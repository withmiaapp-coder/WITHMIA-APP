<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "🔧 Recreando datos iniciales de n8n...\n\n";

// 1. Crear roles básicos
echo "1️⃣ Creando roles...\n";
$roles = [
    ['global:owner', 'Owner', 'Owner of the n8n instance', 'global', true],
    ['global:admin', 'Admin', 'Administrator of the n8n instance', 'global', true],
    ['global:member', 'Member', 'Member of the n8n instance', 'global', true],
    ['project:personalOwner', 'Project Owner', 'Owner of a personal project', 'project', true],
    ['project:admin', 'Project Admin', 'Admin of a project', 'project', true],
    ['project:editor', 'Project Editor', 'Editor of a project', 'project', true],
    ['project:viewer', 'Project Viewer', 'Viewer of a project', 'project', true],
    ['credential:owner', 'Credential Owner', 'Owner of a credential', 'credential', true],
    ['credential:user', 'Credential User', 'User of a credential', 'credential', true],
    ['workflow:owner', 'Workflow Owner', 'Owner of a workflow', 'workflow', true],
    ['workflow:editor', 'Workflow Editor', 'Editor of a workflow', 'workflow', true],
];

foreach ($roles as $role) {
    try {
        $stmt = $pdo->prepare("INSERT INTO n8n.role (slug, \"displayName\", description, \"roleType\", \"systemRole\", \"createdAt\", \"updatedAt\") VALUES (?, ?, ?, ?, ?, NOW(), NOW()) ON CONFLICT (slug) DO NOTHING");
        $stmt->execute($role);
        echo "  ✅ {$role[0]}\n";
    } catch (Exception $e) {
        echo "  ⚠️ {$role[0]}: " . $e->getMessage() . "\n";
    }
}

// 2. Crear usuario owner
echo "\n2️⃣ Creando usuario owner...\n";
$userId = '00000000-0000-0000-0000-000000000001';
$email = 'automatiza@withmia.com';
// Password: Admin123! (bcrypt hash)
$password = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.Y.PLvpqNBnFb5K6Cy2';

try {
    $stmt = $pdo->prepare("
        INSERT INTO n8n.\"user\" (id, email, \"firstName\", \"lastName\", password, \"personalizationAnswers\", \"createdAt\", \"updatedAt\", settings, disabled, \"mfaEnabled\", \"roleSlug\")
        VALUES (?, ?, ?, ?, ?, '{}', NOW(), NOW(), '{}', false, false, 'global:owner')
    ");
    $stmt->execute([$userId, $email, 'Admin', 'WITHMIA', $password]);
    echo "  ✅ Usuario owner creado: $email\n";
} catch (Exception $e) {
    echo "  ⚠️ Error creando usuario: " . $e->getMessage() . "\n";
}

// 3. Crear proyecto personal para el owner
echo "\n3️⃣ Creando proyecto personal...\n";
$projectId = 'personal-' . $userId;
try {
    $stmt = $pdo->prepare("
        INSERT INTO n8n.project (id, name, type, \"createdAt\", \"updatedAt\", \"creatorId\")
        VALUES (?, ?, 'personal', NOW(), NOW(), ?)
    ");
    $stmt->execute([$projectId, 'Admin WITHMIA <automatiza@withmia.com>', $userId]);
    echo "  ✅ Proyecto personal creado\n";
} catch (Exception $e) {
    echo "  ⚠️ Error creando proyecto: " . $e->getMessage() . "\n";
}

// 4. Crear relación proyecto-usuario
echo "\n4️⃣ Creando relación proyecto-usuario...\n";
try {
    $stmt = $pdo->prepare("
        INSERT INTO n8n.project_relation (\"projectId\", \"userId\", \"role\", \"createdAt\", \"updatedAt\")
        VALUES (?, ?, 'project:personalOwner', NOW(), NOW())
    ");
    $stmt->execute([$projectId, $userId]);
    echo "  ✅ Relación creada\n";
} catch (Exception $e) {
    echo "  ⚠️ Error creando relación: " . $e->getMessage() . "\n";
}

echo "\n🎉 ¡Datos iniciales de n8n recreados!\n";
echo "\n📧 Email: $email\n";
echo "🔑 Password: Admin123!\n";
echo "\n⚠️ IMPORTANTE: Cambia la contraseña después de iniciar sesión.\n";
