<?php
try {
    $pdo = new PDO(
        'pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=evolution',
        'postgres',
        'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw'
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Conectado a Evolution DB\n\n";
    
    // Ver últimos mensajes
    $stmt = $pdo->query('SELECT id, key, source, "messageTimestamp", "chatwootMessageId" FROM "Message" ORDER BY "messageTimestamp" DESC LIMIT 20');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Últimos 20 mensajes:\n";
    echo str_repeat("-", 100) . "\n";
    
    foreach ($rows as $row) {
        $key = json_decode($row['key'], true);
        $fromMe = isset($key['fromMe']) && $key['fromMe'] ? 'SENT' : 'RECV';
        $remoteJid = $key['remoteJid'] ?? 'N/A';
        $ts = date('Y-m-d H:i:s', $row['messageTimestamp']);
        $chatwootId = $row['chatwootMessageId'] ?? 'NULL';
        $source = $row['source'] ?? 'NULL';
        
        echo "ID: {$row['id']} | $fromMe | $remoteJid | $ts | CW: $chatwootId | Source: $source\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
