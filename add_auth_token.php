<?php
$pdo = new PDO('pgsql:host=yamanote.proxy.rlwy.net;port=30172;dbname=miaapp', 'postgres', 'AOtZHroOvTYXBMmKtoaDmKQuSPEiwoWV');
$pdo->exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_token VARCHAR(255) NULL');
echo "✅ Columna auth_token agregada\n";
