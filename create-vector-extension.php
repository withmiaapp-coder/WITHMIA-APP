<?php
$host = 'postgres-vector-production-f51c.up.railway.app';
$port = '5432';
$dbname = 'chatwoot';
$user = 'postgres';
$password = 'SDYYzXiHXBzfUZBFEsMqvaRyJZovcXlT';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create vector extension
    $pdo->exec("CREATE EXTENSION IF NOT EXISTS vector");
    echo "Extension 'vector' created successfully!\n";
    
    // Verify
    $stmt = $pdo->query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        echo "Verified: pgvector extension is installed.\n";
    } else {
        echo "Warning: Extension not found after creation.\n";
    }
    
    // Also create chatwoot database if not exists
    $pdo->exec("CREATE DATABASE chatwoot");
    echo "Database 'chatwoot' created.\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
