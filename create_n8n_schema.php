<?php
$pdo = new PDO('pgsql:host=yamanote.proxy.rlwy.net;port=30172;dbname=railway', 'postgres', 'AOtZHroOvTYXBMmKtoaDmKQuSPEiwoWV');
$pdo->exec('CREATE SCHEMA IF NOT EXISTS n8n');
echo "✅ Schema n8n creado\n";
