<?php
/**
 * Verificar estado de datos en todos los sistemas
 */

echo "=== VERIFICACIÓN DE DATOS EN TODOS LOS SISTEMAS ===\n\n";

// Conexión PostgreSQL Railway (para app WITHMIA y Chatwoot)
$host = 'switchyard.proxy.rlwy.net';
$port = '28796';
$user = 'postgres';
$password = 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw';

// 1. Verificar base de datos principal (railway)
echo "1️⃣  BASE DE DATOS PRINCIPAL (railway)\n";
echo str_repeat("-", 50) . "\n";
try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=railway", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Listar schemas
    $stmt = $pdo->query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')");
    $schemas = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "   Schemas: " . implode(', ', $schemas) . "\n";
    
    // Verificar si hay tabla users
    $stmt = $pdo->query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'users' AND table_schema NOT IN ('pg_catalog', 'information_schema')");
    $usersTables = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if ($usersTables) {
        foreach ($usersTables as $t) {
            $stmt = $pdo->query("SELECT COUNT(*) FROM \"{$t['table_schema']}\".users");
            $count = $stmt->fetchColumn();
            echo "   📊 Usuarios en {$t['table_schema']}.users: $count\n";
        }
    } else {
        echo "   ⚠️  No hay tabla 'users' en esta base de datos\n";
    }
} catch (Exception $e) {
    echo "   ❌ Error: " . $e->getMessage() . "\n";
}

// 2. Verificar Chatwoot
echo "\n2️⃣  CHATWOOT\n";
echo str_repeat("-", 50) . "\n";
try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=chatwoot", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "   ✅ Conectado a base de datos 'chatwoot'\n";
    
    // Verificar usuarios
    $stmt = $pdo->query("SELECT COUNT(*) FROM users");
    $users = $stmt->fetchColumn();
    echo "   👤 Usuarios: $users\n";
    
    // Verificar cuentas
    $stmt = $pdo->query("SELECT COUNT(*) FROM accounts");
    $accounts = $stmt->fetchColumn();
    echo "   🏢 Cuentas: $accounts\n";
    
    // Verificar conversaciones
    $stmt = $pdo->query("SELECT COUNT(*) FROM conversations");
    $convs = $stmt->fetchColumn();
    echo "   💬 Conversaciones: $convs\n";
    
    // Verificar mensajes
    $stmt = $pdo->query("SELECT COUNT(*) FROM messages");
    $msgs = $stmt->fetchColumn();
    echo "   📨 Mensajes: $msgs\n";
    
    // Verificar inboxes
    $stmt = $pdo->query("SELECT COUNT(*) FROM inboxes");
    $inboxes = $stmt->fetchColumn();
    echo "   📥 Inboxes: $inboxes\n";
    
    // Verificar contacts
    $stmt = $pdo->query("SELECT COUNT(*) FROM contacts");
    $contacts = $stmt->fetchColumn();
    echo "   📇 Contactos: $contacts\n";
    
} catch (Exception $e) {
    echo "   ❌ Error: " . $e->getMessage() . "\n";
}

// 3. Verificar más datos de WITHMIA App (en railway.public)
echo "\n3️⃣  WITHMIA APP (más detalles)\n";
echo str_repeat("-", 50) . "\n";
try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=railway", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Verificar companies
    $stmt = $pdo->query("SELECT COUNT(*) FROM companies");
    $companies = $stmt->fetchColumn();
    echo "   🏢 Companies: $companies\n";
    
    // Verificar ai_agents
    $stmt = $pdo->query("SELECT COUNT(*) FROM ai_agents");
    $agents = $stmt->fetchColumn();
    echo "   🤖 AI Agents: $agents\n";
    
    // Verificar knowledge_documents
    $stmt = $pdo->query("SELECT COUNT(*) FROM knowledge_documents");
    $docs = $stmt->fetchColumn();
    echo "   📚 Knowledge Documents: $docs\n";
    
    // Verificar integrations
    $stmt = $pdo->query("SELECT COUNT(*) FROM integrations");
    $integrations = $stmt->fetchColumn();
    echo "   🔗 Integraciones: $integrations\n";
    
    // Verificar whatsapp_instances
    $stmt = $pdo->query("SELECT COUNT(*) FROM whatsapp_instances");
    $whatsapp = $stmt->fetchColumn();
    echo "   📱 WhatsApp Instances: $whatsapp\n";
    
} catch (Exception $e) {
    echo "   ⚠️  " . $e->getMessage() . "\n";
}

// 4. Verificar n8n
echo "\n4️⃣  N8N DATABASE\n";
echo str_repeat("-", 50) . "\n";
try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=n8n", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "   ✅ Conectado a base de datos 'n8n'\n";
    
    // Verificar usuarios
    $stmt = $pdo->query("SELECT COUNT(*) FROM n8n.user");
    $users = $stmt->fetchColumn();
    echo "   👤 Usuarios n8n: $users\n";
    
    // Verificar workflows
    $stmt = $pdo->query("SELECT COUNT(*) FROM n8n.workflow_entity");
    $workflows = $stmt->fetchColumn();
    echo "   🔄 Workflows: $workflows\n";
    
    // Verificar credentials
    $stmt = $pdo->query("SELECT COUNT(*) FROM n8n.credentials_entity");
    $creds = $stmt->fetchColumn();
    echo "   🔑 Credentials: $creds\n";
    
} catch (Exception $e) {
    echo "   ⚠️  " . $e->getMessage() . "\n";
}

// 5. Verificar Qdrant
echo "\n5️⃣  QDRANT\n";
echo str_repeat("-", 50) . "\n";
$qdrantUrl = 'https://qdrant-production-f4e7.up.railway.app';

// Usar file_get_contents con contexto SSL
$context = stream_context_create([
    'http' => [
        'timeout' => 10,
        'ignore_errors' => true
    ],
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false
    ]
]);

$response = @file_get_contents("$qdrantUrl/collections", false, $context);

if ($response !== false) {
    $data = json_decode($response, true);
    if (isset($data['result']['collections'])) {
        $collections = $data['result']['collections'];
        if (empty($collections)) {
            echo "   ⚠️  No hay colecciones en Qdrant\n";
        } else {
            echo "   ✅ Conectado a Qdrant\n";
            echo "   📦 Colecciones: " . count($collections) . "\n";
            foreach ($collections as $col) {
                echo "      - {$col['name']}\n";
            }
        }
    } else {
        echo "   ⚠️  Respuesta inesperada de Qdrant\n";
    }
} else {
    // Intentar con curl si file_get_contents falla
    if (function_exists('curl_init')) {
        $ch = curl_init("$qdrantUrl/collections");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($httpCode === 200) {
            $data = json_decode($response, true);
            $collections = $data['result']['collections'] ?? [];
            echo "   ✅ Conectado a Qdrant\n";
            echo "   📦 Colecciones: " . count($collections) . "\n";
            foreach ($collections as $col) {
                echo "      - {$col['name']}\n";
            }
        } else {
            echo "   ❌ Error HTTP $httpCode: $error\n";
        }
    } else {
        echo "   ❌ No se pudo conectar a Qdrant (curl no disponible)\n";
    }
}

echo "\n" . str_repeat("=", 50) . "\n";
echo "✅ Verificación completada\n";
