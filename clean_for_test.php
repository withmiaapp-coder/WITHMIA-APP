<?php
/**
 * Limpiar todas las tablas para prueba limpia de onboarding
 */

require 'vendor/autoload.php';

$host = 'switchyard.proxy.rlwy.net';
$port = '28796';
$user = 'postgres';
$password = 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw';

echo "=== LIMPIANDO DATOS PARA PRUEBA LIMPIA ===\n\n";

// 1. Limpiar WITHMIA App (railway)
echo "1️⃣  LIMPIANDO WITHMIA APP...\n";
try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=railway", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Orden importante para evitar errores de FK
    $tables = [
        'knowledge_documents',
        'integrations', 
        'whatsapp_instances',
        'ai_agents',
        'companies',
        'sessions',
        'personal_access_tokens',
        'users'
    ];
    
    foreach ($tables as $table) {
        try {
            $pdo->exec("TRUNCATE TABLE $table CASCADE");
            echo "   ✅ $table limpiada\n";
        } catch (Exception $e) {
            echo "   ⚠️  $table: " . $e->getMessage() . "\n";
        }
    }
} catch (Exception $e) {
    echo "   ❌ Error: " . $e->getMessage() . "\n";
}

// 2. Limpiar N8N workflows (mantener usuario)
echo "\n2️⃣  LIMPIANDO N8N WORKFLOWS...\n";
try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=n8n", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $pdo->exec("DELETE FROM n8n.workflow_entity");
    echo "   ✅ Workflows eliminados\n";
    
    $pdo->exec("DELETE FROM n8n.credentials_entity");
    echo "   ✅ Credentials eliminados\n";
    
} catch (Exception $e) {
    echo "   ⚠️  " . $e->getMessage() . "\n";
}

// 3. Limpiar Qdrant
echo "\n3️⃣  LIMPIANDO QDRANT...\n";
$qdrantUrl = 'https://qdrant-production-f4e7.up.railway.app';
$client = new \GuzzleHttp\Client(['verify' => false]);

try {
    // Obtener colecciones
    $response = $client->get("$qdrantUrl/collections");
    $data = json_decode($response->getBody()->getContents(), true);
    $collections = $data['result']['collections'] ?? [];
    
    foreach ($collections as $col) {
        $name = $col['name'];
        $client->delete("$qdrantUrl/collections/$name");
        echo "   ✅ Colección '$name' eliminada\n";
    }
    
    if (empty($collections)) {
        echo "   ℹ️  No había colecciones que eliminar\n";
    }
} catch (Exception $e) {
    echo "   ❌ Error: " . $e->getMessage() . "\n";
}

// 4. Verificar estado final
echo "\n=== ESTADO FINAL ===\n";

// Verificar usuarios
$pdo = new PDO("pgsql:host=$host;port=$port;dbname=railway", $user, $password);
$users = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
$companies = $pdo->query("SELECT COUNT(*) FROM companies")->fetchColumn();
echo "   👤 Usuarios: $users\n";
echo "   🏢 Companies: $companies\n";

$pdo = new PDO("pgsql:host=$host;port=$port;dbname=n8n", $user, $password);
$workflows = $pdo->query("SELECT COUNT(*) FROM n8n.workflow_entity")->fetchColumn();
echo "   🔄 Workflows n8n: $workflows\n";

$response = $client->get("$qdrantUrl/collections");
$data = json_decode($response->getBody()->getContents(), true);
$colCount = count($data['result']['collections'] ?? []);
echo "   📦 Colecciones Qdrant: $colCount\n";

echo "\n✅ Limpieza completada - Listo para probar onboarding\n";
