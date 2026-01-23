<?php
echo "=== LIMPIEZA COMPLETA DE DATOS ===\n\n";

try {
    // Conectar a base de datos principal
    $pdo = new PDO(
        'pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=railway',
        'postgres',
        'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    echo "✅ Conectado a base de datos principal\n\n";
    
    // Deshabilitar triggers y constraints temporalmente
    $pdo->exec("SET session_replication_role = 'replica';");
    
    $tables = [
        'companies',
        'users',
        'onboarding_data',
        'documents',
        'knowledge_base',
        'training_data',
        'chat_sessions',
        'messages',
        'workflows',
        'api_keys',
        'sessions',
        'password_resets',
        'failed_jobs',
        'jobs',
        'personal_access_tokens'
    ];
    
    foreach ($tables as $table) {
        try {
            $pdo->exec("TRUNCATE TABLE $table CASCADE");
            echo "✅ Tabla '$table' limpiada\n";
        } catch (Exception $e) {
            echo "⚠️  Tabla '$table' no existe o error: " . $e->getMessage() . "\n";
        }
    }
    
    // Rehabilitar triggers
    $pdo->exec("SET session_replication_role = 'origin';");
    
    echo "\n=== LIMPIEZA DE QDRANT ===\n\n";
    
    // Eliminar todas las colecciones de Qdrant
    $response = @file_get_contents("https://qdrant-production-f4e7.up.railway.app/collections");
    if ($response) {
        $data = json_decode($response, true);
        foreach ($data['result']['collections'] as $collection) {
            $collectionName = $collection['name'];
            $ch = curl_init("https://qdrant-production-f4e7.up.railway.app/collections/$collectionName");
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            $result = curl_exec($ch);
            curl_close($ch);
            echo "✅ Colección Qdrant '$collectionName' eliminada\n";
        }
    }
    
    echo "\n=== RECREAR TOKEN CHATWOOT ===\n\n";
    
    // Conectar a Chatwoot
    $pdoChatwoot = new PDO(
        'pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=chatwoot',
        'postgres',
        'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    // Eliminar token anterior
    $pdoChatwoot->exec("DELETE FROM access_tokens WHERE owner_type = 'User' AND owner_id = 1");
    
    // Crear nuevo token
    $token = bin2hex(random_bytes(32));
    $stmt = $pdoChatwoot->prepare("INSERT INTO access_tokens (owner_type, owner_id, token, created_at, updated_at) VALUES ('User', 1, ?, NOW(), NOW())");
    $stmt->execute([$token]);
    
    echo "✅ Nuevo token Chatwoot creado:\n";
    echo "   Token: $token\n\n";
    
    echo "=== COMANDOS PARA ACTUALIZAR VARIABLES ===\n\n";
    echo "railway service WITHMIA-APP\n";
    echo "railway variables --set \"CHATWOOT_TOKEN=$token\"\n";
    echo "railway variables --set \"CHATWOOT_API_KEY=$token\"\n";
    echo "railway variables --set \"CHATWOOT_PLATFORM_API_TOKEN=$token\"\n\n";
    
    echo "✅ LIMPIEZA COMPLETA EXITOSA\n\n";
    echo "📝 SIGUIENTE PASO:\n";
    echo "   1. Ve a N8N: https://n8n-production-00dd.up.railway.app\n";
    echo "   2. Settings > API\n";
    echo "   3. Crea un nuevo API Key\n";
    echo "   4. Actualiza: railway variables --set \"N8N_API_KEY=<tu_nuevo_key>\"\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
