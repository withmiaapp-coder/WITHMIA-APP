<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=evolution', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$stmt = $pdo->query('SELECT id, key, "messageTimestamp" FROM "Message" ORDER BY "messageTimestamp" DESC LIMIT 5');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Últimos 5 mensajes (cualquier número):\n";
foreach ($rows as $row) {
    $ts = date('Y-m-d H:i:s', (int)$row['messageTimestamp']);
    $key = json_decode($row['key'], true);
    $fromMe = ($key['fromMe'] ?? false) ? 'ENVIADO' : 'RECIBIDO';
    echo "$ts | $fromMe | {$key['remoteJid']}\n";
}

// Hora actual UTC
echo "\nHora actual UTC: " . gmdate('Y-m-d H:i:s') . "\n";
echo "Hora actual Chile: " . date('Y-m-d H:i:s') . "\n";
