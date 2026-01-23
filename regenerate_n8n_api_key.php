<?php
try {
    $pdo = new PDO(
        'pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n',
        'postgres',
        'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    echo "✅ Conectado a base de datos N8N\n\n";
    
    // Buscar usuario de N8N
    $stmt = $pdo->query("SELECT id, email FROM n8n.\"user\" WHERE email = 'automatiza@withmia.com'");
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo "❌ Usuario no encontrado\n";
        exit(1);
    }
    
    echo "👤 Usuario encontrado:\n";
    echo "   ID: {$user['id']}\n";
    echo "   Email: {$user['email']}\n\n";
    
    // Crear nuevo API key (JWT simple basado en user data)
    $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
    $payload = json_encode([
        'id' => $user['id'],
        'email' => $user['email'],
        'password' => null
    ]);
    
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    // Usar secret key (debe coincidir con N8N_ENCRYPTION_KEY)
    $secret = 'withmia-n8n-encryption-key-2026';
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    $jwt = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    
    echo "🔑 Nuevo API Key generado:\n";
    echo "$jwt\n\n";
    
    // Verificar si existe una API key
    $stmt = $pdo->prepare("SELECT * FROM n8n.user_api_keys WHERE \"userId\" = ?");
    $stmt->execute([$user['id']]);
    $existingKey = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingKey) {
        // Actualizar
        $stmt = $pdo->prepare("UPDATE n8n.user_api_keys SET \"apiKey\" = ?, \"updatedAt\" = NOW() WHERE \"userId\" = ?");
        $stmt->execute([$jwt, $user['id']]);
        echo "✅ API Key actualizado en base de datos\n";
    } else {
        // Crear nuevo
        $stmt = $pdo->prepare("INSERT INTO n8n.user_api_keys (\"userId\", \"apiKey\", \"label\", \"createdAt\", \"updatedAt\") VALUES (?, ?, 'WITHMIA API Key', NOW(), NOW())");
        $stmt->execute([$user['id'], $jwt]);
        echo "✅ API Key creado en base de datos\n";
    }
    
    echo "\n📋 Para actualizar en Railway ejecuta:\n";
    echo "railway service WITHMIA-APP\n";
    echo "railway variables --set \"N8N_API_KEY=$jwt\"\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
