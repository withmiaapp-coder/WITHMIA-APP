<?php
$host = 'yamanote.proxy.rlwy.net';
$port = '30172';
$dbname = 'miaapp';
$user = 'postgres';
$password = 'AOtZHroOvTYXBMmKtoaDmKQuSPEiwoWV';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "� Estructura de knowledge_documents:\n";
    $stmt = $pdo->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'knowledge_documents' ORDER BY ordinal_position");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $col) {
        echo "  - {$col['column_name']} ({$col['data_type']})\n";
    }
    
    echo "\n📄 Documentos:\n";
    $stmt = $pdo->query("SELECT * FROM knowledge_documents ORDER BY id DESC LIMIT 5");
    $docs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($docs)) {
        echo "❌ No hay documentos guardados\n";
    } else {
        foreach ($docs as $doc) {
            print_r($doc);
        }
    }
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
