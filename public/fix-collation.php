<?php
/**
 * Script para verificar estado de n8n en instancias
 * Usa PDO directamente para evitar problemas con facades
 * ELIMINAR DESPUÉS DE USAR
 */

header('Content-Type: application/json');

$results = [];

// Obtener DATABASE_URL del entorno
$databaseUrl = getenv('DATABASE_URL');
if (!$databaseUrl) {
    echo json_encode(['error' => 'No DATABASE_URL found']);
    exit;
}

// Parsear DATABASE_URL (formato: postgres://user:pass@host:port/dbname)
$parsed = parse_url($databaseUrl);
$host = $parsed['host'] ?? '';
$port = $parsed['port'] ?? 5432;
$user = $parsed['user'] ?? '';
$pass = $parsed['pass'] ?? '';
$dbname = ltrim($parsed['path'] ?? '', '/');

try {
    $pdo = new PDO(
        "pgsql:host={$host};port={$port};dbname={$dbname}",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    // Refresh collation version
    try {
        $pdo->exec("ALTER DATABASE {$dbname} REFRESH COLLATION VERSION");
        $results['collation_fix'] = 'OK - Collation refreshed';
    } catch (PDOException $e) {
        $results['collation_fix'] = 'ERROR: ' . $e->getMessage();
    }
    
    // Verificar instancias
    $stmt = $pdo->query("SELECT id, instance_name, n8n_workflow_id, n8n_webhook_url, is_active FROM whatsapp_instances ORDER BY id");
    $instances = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $results['instances'] = array_map(function($i) {
        return [
            'id' => $i['id'],
            'instance_name' => $i['instance_name'],
            'n8n_workflow_id' => $i['n8n_workflow_id'],
            'n8n_webhook_url' => $i['n8n_webhook_url'],
            'has_workflow' => !empty($i['n8n_workflow_id']),
            'has_webhook_url' => !empty($i['n8n_webhook_url']),
            'is_active' => $i['is_active']
        ];
    }, $instances);
    
    $results['total_instances'] = count($instances);
    
} catch (PDOException $e) {
    $results['db_error'] = $e->getMessage();
}

echo json_encode([
    'success' => true,
    'results' => $results,
    'timestamp' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT);
