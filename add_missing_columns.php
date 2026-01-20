<?php
/**
 * Agregar todas las columnas faltantes a la tabla users
 */
$pdo = new PDO('pgsql:host=yamanote.proxy.rlwy.net;port=30172;dbname=miaapp', 'postgres', 'AOtZHroOvTYXBMmKtoaDmKQuSPEiwoWV');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "✅ Conectado a miaapp\n\n";

$columns = [
    'full_name' => 'VARCHAR(255) NULL',
    'auth_token' => 'VARCHAR(255) NULL',
    'onboarding_step' => 'INTEGER DEFAULT 0',
    'onboarding_completed' => 'BOOLEAN DEFAULT FALSE',
    'onboarding_data' => 'JSONB NULL',
    'phone' => 'VARCHAR(50) NULL',
    'phone_country' => 'VARCHAR(10) NULL',
    'country_code' => 'VARCHAR(10) NULL',
    'timezone' => 'VARCHAR(50) NULL',
    'locale' => 'VARCHAR(10) DEFAULT \'es\'',
    'avatar_url' => 'VARCHAR(255) NULL',
    'profile_photo_path' => 'VARCHAR(255) NULL',
    'two_factor_secret' => 'TEXT NULL',
    'two_factor_recovery_codes' => 'TEXT NULL',
    'two_factor_confirmed_at' => 'TIMESTAMP NULL',
];

foreach ($columns as $col => $type) {
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS \"$col\" $type");
        echo "✅ Columna '$col' verificada/agregada\n";
    } catch (PDOException $e) {
        echo "⚠️ Error con '$col': " . $e->getMessage() . "\n";
    }
}

echo "\n📋 Columnas actuales en users:\n";
$cols = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
foreach ($cols as $c) {
    echo "   - " . $c['column_name'] . "\n";
}

echo "\n✅ Completado\n";
