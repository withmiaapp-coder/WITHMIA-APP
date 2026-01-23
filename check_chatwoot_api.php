<?php
/**
 * Verificar y regenerar API key de Chatwoot
 */

$host = 'switchyard.proxy.rlwy.net';
$port = '28796';
$user = 'postgres';
$password = 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw';

echo "=== CHATWOOT API KEY ===\n\n";

$pdo = new PDO("pgsql:host=$host;port=$port;dbname=chatwoot", $user, $password);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// 1. Ver usuarios
echo "1️⃣  USUARIOS EN CHATWOOT:\n";
$stmt = $pdo->query("SELECT id, email, name, type FROM users");
foreach($stmt as $row) {
    echo "   ID: {$row['id']}, Email: {$row['email']}, Name: {$row['name']}, Type: {$row['type']}\n";
}

// 2. Ver access tokens existentes
echo "\n2️⃣  ACCESS TOKENS:\n";
$stmt = $pdo->query("SELECT id, owner_id, owner_type, token FROM access_tokens LIMIT 5");
$tokens = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (empty($tokens)) {
    echo "   ⚠️  No hay tokens\n";
} else {
    foreach($tokens as $token) {
        echo "   ID: {$token['id']}, Owner: {$token['owner_type']}#{$token['owner_id']}, Token: {$token['token']}\n";
    }
}

// 3. Ver platform app tokens
echo "\n3️⃣  PLATFORM APP TOKENS:\n";
$stmt = $pdo->query("SELECT id, name, access_token FROM platform_apps LIMIT 5");
$apps = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (empty($apps)) {
    echo "   ⚠️  No hay platform apps\n";
    
    // Crear una platform app
    echo "\n   📝 Creando Platform App...\n";
    $newToken = bin2hex(random_bytes(16));
    $stmt = $pdo->prepare("INSERT INTO platform_apps (name, access_token, created_at, updated_at) VALUES (?, ?, NOW(), NOW()) RETURNING id, access_token");
    $stmt->execute(['WITHMIA Platform', $newToken]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   ✅ Platform App creada!\n";
    echo "   📌 Nuevo Token: {$result['access_token']}\n";
} else {
    foreach($apps as $app) {
        echo "   ID: {$app['id']}, Name: {$app['name']}, Token: {$app['access_token']}\n";
    }
}

echo "\n✅ Verificación completada\n";
