<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "🔧 Corrigiendo contraseña de N8N...\n\n";

// Verificar usuario actual
$stmt = $pdo->query("SELECT id, email, password, \"roleSlug\" FROM n8n.\"user\" WHERE email = 'automatiza@withmia.com'");
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user) {
    echo "Usuario encontrado:\n";
    echo "  ID: {$user['id']}\n";
    echo "  Email: {$user['email']}\n";
    echo "  Role: {$user['roleSlug']}\n";
    echo "  Password hash actual: " . substr($user['password'], 0, 20) . "...\n\n";
} else {
    echo "❌ Usuario no encontrado, creándolo...\n\n";
}

// N8N usa bcrypt con $2a$ o $2b$ prefix
// Estos son hashes válidos para "Admin123!" generados con bcrypt
// Hash generado online con bcrypt para "Admin123!"
$password = 'Admin123!';

// Usar PHP para generar y convertir a formato $2a$
$hash = password_hash($password, PASSWORD_BCRYPT);
// Convertir $2y$ a $2a$ (compatible con Node.js bcrypt)
$hash = str_replace('$2y$', '$2a$', $hash);

echo "Nuevo hash generado: $hash\n\n";

// Verificar que el hash funciona
if (password_verify($password, str_replace('$2a$', '$2y$', $hash))) {
    echo "✅ Hash verificado correctamente\n\n";
} else {
    echo "❌ Error verificando hash\n\n";
}

// Actualizar o insertar usuario
$userId = '00000000-0000-0000-0000-000000000001';
$email = 'automatiza@withmia.com';

try {
    // Primero intentar actualizar
    $stmt = $pdo->prepare("UPDATE n8n.\"user\" SET password = ? WHERE email = ?");
    $stmt->execute([$hash, $email]);
    
    if ($stmt->rowCount() > 0) {
        echo "✅ Contraseña actualizada\n";
    } else {
        echo "Usuario no existe, creándolo...\n";
        
        // Crear usuario
        $stmt = $pdo->prepare("
            INSERT INTO n8n.\"user\" (id, email, \"firstName\", \"lastName\", password, \"personalizationAnswers\", \"createdAt\", \"updatedAt\", settings, disabled, \"mfaEnabled\", \"roleSlug\")
            VALUES (?, ?, ?, ?, ?, '{}', NOW(), NOW(), '{}', false, false, 'global:owner')
        ");
        $stmt->execute([$userId, $email, 'Admin', 'WITHMIA', $hash]);
        echo "✅ Usuario creado\n";
    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

// Verificar resultado final
$stmt = $pdo->query("SELECT id, email, \"roleSlug\", LEFT(password, 30) as pwd_prefix FROM n8n.\"user\" WHERE email = 'automatiza@withmia.com'");
$user = $stmt->fetch(PDO::FETCH_ASSOC);

echo "\n📋 Estado final:\n";
echo "  ID: {$user['id']}\n";
echo "  Email: {$user['email']}\n";
echo "  Role: {$user['roleSlug']}\n";
echo "  Password prefix: {$user['pwd_prefix']}\n";

echo "\n🔑 Credenciales:\n";
echo "  Email: automatiza@withmia.com\n";
echo "  Password: Admin123!\n";
