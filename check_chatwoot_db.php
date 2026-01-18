<?php
// Use environment variables from WITHMIA that reference POSTGRES
$dbUrl = getenv('DATABASE_URL_CHATWOOT') ?: 'postgresql://postgres:SDYYzXiHXBzfUZBFEsMqvaRyJZovcXlT@postgres-vector.railway.internal:5432/chatwoot';

try {
    // Parse the DATABASE_URL
    $parsed = parse_url($dbUrl);
    $host = $parsed['host'] ?? 'postgres-vector.railway.internal';
    $port = $parsed['port'] ?? '5432';
    $user = $parsed['user'] ?? 'postgres';
    $password = $parsed['pass'] ?? '';
    $dbname = ltrim($parsed['path'] ?? '/chatwoot', '/');
    
    echo "Connecting to: $host:$port/$dbname as $user\n";
    
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== Connected to chatwoot database ===\n\n";
    
    // List tables
    $result = $pdo->query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    $tables = $result->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($tables)) {
        echo "NO TABLES FOUND IN CHATWOOT DATABASE!\n";
        echo "The database is empty - migrations need to be run.\n";
    } else {
        echo "Found " . count($tables) . " tables:\n";
        foreach ($tables as $table) {
            echo "  - $table\n";
        }
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
