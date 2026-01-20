<?php
$pdo = new PDO('pgsql:host=yamanote.proxy.rlwy.net;port=30172;dbname=miaapp', 'postgres', 'AOtZHroOvTYXBMmKtoaDmKQuSPEiwoWV');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Columnas adicionales para users
$userColumns = [
    'company_slug' => 'VARCHAR(255) NULL',
    'referral_source' => 'VARCHAR(100) NULL',
    'referral_details' => 'TEXT NULL',
];

echo "📦 Agregando columnas a 'users':\n";
foreach ($userColumns as $col => $type) {
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS \"$col\" $type");
    echo "✅ '$col'\n";
}

// Columnas adicionales para companies
$companyColumns = [
    'referral_source' => 'VARCHAR(100) NULL',
    'referral_details' => 'TEXT NULL',
];

echo "\n📦 Agregando columnas a 'companies':\n";
foreach ($companyColumns as $col => $type) {
    $pdo->exec("ALTER TABLE companies ADD COLUMN IF NOT EXISTS \"$col\" $type");
    echo "✅ '$col'\n";
}

echo "\n✅ Completado\n";
