<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=evolution', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

echo "=== TODOS LOS MENSAJES DE LA ÚLTIMA HORA ===\n\n";

// Buscar mensajes de la última hora (timestamp > ahora - 3600)
$oneHourAgo = time() - 3600;
$stmt = $pdo->prepare('SELECT id, key, "messageTimestamp", "chatwootMessageId" FROM "Message" WHERE "messageTimestamp" > ? ORDER BY "messageTimestamp" DESC');
$stmt->execute([$oneHourAgo]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Mensajes encontrados: " . count($rows) . "\n\n";

foreach ($rows as $row) {
    $ts = date('Y-m-d H:i:s', (int)$row['messageTimestamp']);
    $key = json_decode($row['key'], true);
    $fromMe = ($key['fromMe'] ?? false) ? 'ENVIADO' : 'RECIBIDO';
    $remoteJid = $key['remoteJid'] ?? 'N/A';
    $cwId = $row['chatwootMessageId'] ?? 'NULL';
    
    echo "$ts | $fromMe | $remoteJid | CW: $cwId\n";
}

echo "\n=== BUSCAR 'prueba' EN MENSAJES RECIENTES ===\n\n";

// Buscar mensaje que contenga "prueba" en el contenido
$stmt2 = $pdo->query('SELECT id, key, "messageTimestamp", message FROM "Message" ORDER BY "messageTimestamp" DESC LIMIT 30');
$rows2 = $stmt2->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows2 as $row) {
    $message = $row['message'] ?? '';
    if (stripos($message, 'prueba') !== false || stripos($message, 'celular') !== false) {
        $ts = date('Y-m-d H:i:s', (int)$row['messageTimestamp']);
        $key = json_decode($row['key'], true);
        echo "ENCONTRADO: $ts | {$key['remoteJid']}\n";
        echo "Contenido: " . substr($message, 0, 200) . "\n\n";
    }
}

echo "\n=== ÚLTIMOS 20 MENSAJES SIN FILTRO ===\n\n";
$stmt3 = $pdo->query('SELECT key, "messageTimestamp", message FROM "Message" ORDER BY "messageTimestamp" DESC LIMIT 20');
$rows3 = $stmt3->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows3 as $row) {
    $ts = date('Y-m-d H:i:s', (int)$row['messageTimestamp']);
    $key = json_decode($row['key'], true);
    $fromMe = ($key['fromMe'] ?? false) ? 'ENV' : 'REC';
    $msg = json_decode($row['message'] ?? '{}', true);
    $content = $msg['conversation'] ?? $msg['extendedTextMessage']['text'] ?? '[media/otro]';
    $content = substr($content, 0, 50);
    
    echo "$ts | $fromMe | {$key['remoteJid']} | $content\n";
}
