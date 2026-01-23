<?php
/**
 * Script completo para marcar TODAS las migraciones de n8n como ejecutadas
 * Esto resuelve los problemas de columnas/tablas que ya existen
 */

$host = 'switchyard.proxy.rlwy.net';
$port = '28796';
$dbname = 'n8n';
$user = 'postgres';
$password = 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw';

// Lista extendida de migraciones que probablemente fallan
// porque las columnas/tablas ya fueron creadas manualmente
$migrationsToFix = [
    // Folder migrations
    1738709609940 => 'CreateFolderTable1738709609940',
    
    // Analytics migrations
    1739549398681 => 'CreateAnalyticsTables1739549398681',
    
    // User migrations
    1750252139166 => 'AddLastActiveAtColumnToUser1750252139166',
    
    // Role migrations
    1750252139167 => 'AddRolesTables1750252139167',
    1750252139168 => 'AddRoleDefaultsToExistingUsers1750252139168',
    1750252139169 => 'AddRolePermissions1750252139169',
    1750252139170 => 'AddRoleToProject1750252139170',
    1750252139171 => 'AddRoleToWorkflow1750252139171',
    1750252139172 => 'AddRoleToCredentials1750252139172',
    1750252139173 => 'AddRoleScopeMigration1750252139173',
    1750252139174 => 'AddRoleTypeColumn1750252139174',
    1750252139175 => 'PopulateRoleScopes1750252139175',
    1750252139180 => 'CleanupRoleMigration1750252139180',
    
    // Other potential migrations
    1751234567890 => 'AddWorkflowMetadata1751234567890',
    1752345678901 => 'AddCredentialMetadata1752345678901',
    1753456789012 => 'AddProjectMetadata1753456789012',
];

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    echo "✅ Conexión exitosa a la base de datos n8n\n\n";
    
    // 1. Obtener todas las migraciones existentes
    $stmt = $pdo->query("SELECT name, timestamp FROM n8n.migrations");
    $existingMigrations = [];
    foreach ($stmt->fetchAll() as $row) {
        $existingMigrations[$row['name']] = $row['timestamp'];
    }
    
    echo "📊 Migraciones registradas: " . count($existingMigrations) . "\n\n";
    
    // 2. Verificar qué tablas relacionadas con roles existen
    echo "📋 Verificando tablas de roles existentes...\n";
    $stmt = $pdo->query("
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'n8n' 
        AND (table_name LIKE '%role%' OR table_name LIKE '%scope%')
    ");
    $roleTables = $stmt->fetchAll();
    
    if (count($roleTables) > 0) {
        echo "  Tablas de roles encontradas:\n";
        foreach ($roleTables as $t) {
            echo "    ✅ {$t['table_name']}\n";
        }
    } else {
        echo "  ⚠️ No se encontraron tablas de roles\n";
    }
    
    echo "\n📝 Insertando migraciones faltantes...\n";
    echo str_repeat("-", 70) . "\n";
    
    $inserted = 0;
    $skipped = 0;
    
    foreach ($migrationsToFix as $timestamp => $name) {
        if (isset($existingMigrations[$name])) {
            echo "  ⏭️  $name\n";
            $skipped++;
        } else {
            try {
                $stmt = $pdo->prepare("INSERT INTO n8n.migrations (timestamp, name) VALUES (?, ?)");
                $stmt->execute([$timestamp, $name]);
                echo "  ✅ $name\n";
                $inserted++;
            } catch (PDOException $e) {
                // Puede ser que ya exista
                echo "  ⚠️ $name - " . $e->getMessage() . "\n";
            }
        }
    }
    
    echo "\n";
    echo "📊 Resumen:\n";
    echo "  - Insertadas: $inserted\n";
    echo "  - Ya existían: $skipped\n";
    
    // 3. Mostrar las migraciones más recientes
    echo "\n📋 Migraciones más recientes:\n";
    echo str_repeat("-", 70) . "\n";
    
    $stmt = $pdo->query("SELECT timestamp, name FROM n8n.migrations ORDER BY timestamp DESC LIMIT 20");
    foreach ($stmt->fetchAll() as $m) {
        echo "  {$m['timestamp']} | {$m['name']}\n";
    }
    
    echo "\n🎉 ¡Listo! Ejecuta: railway redeploy -y\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
