<?php
$pdo = new PDO(
    'pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n',
    'postgres',
    'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw'
);

echo "Workflows en N8N:\n\n";
$wfs = $pdo->query('SELECT id, name, active FROM n8n.workflow_entity ORDER BY name')->fetchAll(PDO::FETCH_ASSOC);
foreach ($wfs as $w) {
    $active = $w['active'] ? '✓' : '✗';
    echo "{$active} {$w['id']} - {$w['name']}\n";
}
