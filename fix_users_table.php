<?php
/**
 * Script para verificar y arreglar la tabla users
 */

$host = 'yamanote.proxy.rlwy.net';
$port = '30172';
$dbname = 'railway';
$user = 'postgres';
$password = 'AOtZHroOvTYXBMmKtoaDmKQuSPEiwoWV';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Conectado a PostgreSQL\n\n";
    
    // Verificar estructura de la tabla users
    echo "📋 Columnas en la tabla 'users':\n";
    $columns = $pdo->query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
    $columnList = [];
    foreach ($columns as $col) {
        $columnList[] = $col['column_name'];
        echo "   - " . $col['column_name'] . " (" . $col['data_type'] . ")\n";
    }
    
    // Verificar si falta la columna password
    if (!in_array('password', $columnList)) {
        echo "\n⚠️  FALTA la columna 'password'\n";
        echo "   Agregando columna password...\n";
        $pdo->exec("ALTER TABLE users ADD COLUMN password VARCHAR(255)");
        echo "   ✅ Columna password agregada\n";
    } else {
        echo "\n✅ La columna 'password' existe\n";
    }
    
    // Verificar otras columnas necesarias
    $requiredColumns = [
        'id' => 'BIGSERIAL PRIMARY KEY',
        'name' => 'VARCHAR(255)',
        'email' => 'VARCHAR(255) UNIQUE',
        'password' => 'VARCHAR(255)',
        'email_verified_at' => 'TIMESTAMP NULL',
        'remember_token' => 'VARCHAR(100) NULL',
        'created_at' => 'TIMESTAMP NULL',
        'updated_at' => 'TIMESTAMP NULL',
        'company_id' => 'BIGINT NULL',
        'role' => 'VARCHAR(50) DEFAULT \'user\'',
        'phone' => 'VARCHAR(20) NULL',
        'phone_country' => 'VARCHAR(5) NULL',
        'avatar' => 'VARCHAR(255) NULL',
        'is_active' => 'BOOLEAN DEFAULT TRUE',
        'last_login_at' => 'TIMESTAMP NULL',
    ];
    
    echo "\n📋 Verificando columnas requeridas:\n";
    foreach ($requiredColumns as $colName => $colDef) {
        if (!in_array($colName, $columnList)) {
            echo "   ⚠️  Falta: $colName - Agregando...\n";
            try {
                // Extraer solo el tipo de dato básico
                $type = explode(' ', $colDef)[0];
                if ($type === 'BIGSERIAL') $type = 'BIGINT';
                $nullable = strpos($colDef, 'NULL') !== false ? '' : ' NOT NULL DEFAULT \'\'';
                if (strpos($colDef, 'BOOLEAN') !== false) $nullable = ' DEFAULT TRUE';
                if (strpos($colDef, 'TIMESTAMP') !== false) $nullable = ' NULL';
                if (strpos($colDef, 'BIGINT') !== false && $colName !== 'id') $nullable = ' NULL';
                
                $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS \"$colName\" $type $nullable");
                echo "   ✅ Agregada: $colName\n";
            } catch (PDOException $e) {
                echo "   ❌ Error agregando $colName: " . $e->getMessage() . "\n";
            }
        } else {
            echo "   ✅ Existe: $colName\n";
        }
    }
    
    // Verificar tabla sessions
    echo "\n📋 Verificando tabla 'sessions':\n";
    $sessionsExists = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'sessions'")->fetchColumn();
    if (!$sessionsExists) {
        echo "   ⚠️  Tabla 'sessions' no existe - Creando...\n";
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR(255) PRIMARY KEY,
                user_id BIGINT NULL,
                ip_address VARCHAR(45) NULL,
                user_agent TEXT NULL,
                payload TEXT NOT NULL,
                last_activity INTEGER NOT NULL
            )
        ");
        $pdo->exec("CREATE INDEX IF NOT EXISTS sessions_user_id_index ON sessions(user_id)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS sessions_last_activity_index ON sessions(last_activity)");
        echo "   ✅ Tabla 'sessions' creada\n";
    } else {
        echo "   ✅ Tabla 'sessions' existe\n";
    }
    
    echo "\n✅ Verificación completada\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
