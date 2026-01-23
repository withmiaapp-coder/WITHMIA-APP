<?php
// Verificar estado de documentos en la base de datos

$host = 'autorack.proxy.rlwy.net';
$port = '59234';
$dbname = 'mia_saas';
$user = 'postgres';
$password = 'xLNCCNbpTaWwKtLPOqPVYvbcNGmKjQYe';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->query("SELECT id, filename, category, status, metadata FROM knowledge_documents ORDER BY created_at DESC LIMIT 5");
    
    echo "=== DOCUMENTOS EN BASE DE DATOS ===\n\n";
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $metadata = json_decode($row['metadata'], true);
        echo "📄 {$row['filename']}\n";
        echo "   Status: {$row['status']}\n";
        echo "   Categoría: {$row['category']}\n";
        echo "   Caracteres: " . ($metadata['char_count'] ?? 'N/A') . "\n";
        echo "   Páginas: " . ($metadata['page_count'] ?? 'N/A') . "\n";
        echo "   Chunks: " . ($metadata['total_chunks'] ?? 'N/A') . "\n";
        echo "\n";
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
