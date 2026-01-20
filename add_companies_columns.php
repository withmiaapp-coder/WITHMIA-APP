<?php
/**
 * Agregar columnas faltantes a la tabla companies
 */
$pdo = new PDO('pgsql:host=yamanote.proxy.rlwy.net;port=30172;dbname=miaapp', 'postgres', 'AOtZHroOvTYXBMmKtoaDmKQuSPEiwoWV');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "✅ Conectado a miaapp\n\n";

$columns = [
    'client_type' => 'VARCHAR(50) NULL',
    'target_audience' => 'TEXT NULL',
    'business_goals' => 'JSONB NULL',
    'page' => 'VARCHAR(255) NULL',
    'facebook_page' => 'VARCHAR(255) NULL',
    'instagram_handle' => 'VARCHAR(255) NULL',
    'whatsapp_number' => 'VARCHAR(50) NULL',
    'email_contact' => 'VARCHAR(255) NULL',
    'address' => 'TEXT NULL',
    'city' => 'VARCHAR(100) NULL',
    'country' => 'VARCHAR(100) NULL',
    'postal_code' => 'VARCHAR(20) NULL',
    'phone' => 'VARCHAR(50) NULL',
    'onboarding_completed' => 'BOOLEAN DEFAULT FALSE',
    'onboarding_data' => 'JSONB NULL',
    'ai_personality' => 'TEXT NULL',
    'ai_tone' => 'VARCHAR(50) NULL',
    'ai_language' => 'VARCHAR(10) DEFAULT \'es\'',
    'welcome_message' => 'TEXT NULL',
    'business_hours' => 'JSONB NULL',
    'auto_reply_enabled' => 'BOOLEAN DEFAULT TRUE',
    'channels' => 'JSONB NULL',
];

echo "📦 Agregando columnas a 'companies':\n";
foreach ($columns as $col => $type) {
    try {
        $pdo->exec("ALTER TABLE companies ADD COLUMN IF NOT EXISTS \"$col\" $type");
        echo "✅ '$col'\n";
    } catch (PDOException $e) {
        echo "⚠️ Error con '$col': " . $e->getMessage() . "\n";
    }
}

echo "\n✅ Completado\n";
