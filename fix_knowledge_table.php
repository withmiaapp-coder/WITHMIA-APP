<?php
$host = 'yamanote.proxy.rlwy.net';
$port = '30172';
$dbname = 'miaapp';
$user = 'postgres';
$password = 'AOtZHroOvTYXBMmKtoaDmKQuSPEiwoWV';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "🔧 Actualizando tabla knowledge_documents...\n";
    
    // Agregar columnas faltantes
    $columns = [
        "filename VARCHAR(255)",
        "category VARCHAR(50)",
        "chunks_created INTEGER DEFAULT 0",
        "qdrant_collection VARCHAR(255)",
        "qdrant_vector_ids JSONB"
    ];
    
    foreach ($columns as $col) {
        $colName = explode(' ', $col)[0];
        try {
            $pdo->exec("ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS $col");
            echo "✅ Columna $colName agregada/verificada\n";
        } catch (PDOException $e) {
            echo "⚠️ $colName: " . $e->getMessage() . "\n";
        }
    }
    
    echo "\n✅ Tabla actualizada\n";
    
    // Mostrar estructura final
    echo "\n📋 Estructura final:\n";
    $stmt = $pdo->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'knowledge_documents' ORDER BY ordinal_position");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $col) {
        echo "  - {$col['column_name']} ({$col['data_type']})\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
