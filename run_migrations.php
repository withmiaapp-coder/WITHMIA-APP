<?php
/**
 * Script para ejecutar migraciones manualmente en la base de datos miaapp
 */

$host = 'yamanote.proxy.rlwy.net';
$port = '30172';
$dbname = 'miaapp';
$user = 'postgres';
$password = 'AOtZHroOvTYXBMmKtoaDmKQuSPEiwoWV';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Conectado a base de datos 'miaapp'\n\n";
    
    // Crear tabla migrations
    echo "📦 Creando tabla migrations...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            migration VARCHAR(255) NOT NULL,
            batch INTEGER NOT NULL
        )
    ");
    
    // Crear tabla users
    echo "📦 Creando tabla users...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            email_verified_at TIMESTAMP NULL,
            password VARCHAR(255) NOT NULL,
            remember_token VARCHAR(100) NULL,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL,
            company_id BIGINT NULL,
            role VARCHAR(50) DEFAULT 'user',
            phone VARCHAR(20) NULL,
            phone_country VARCHAR(5) NULL,
            avatar VARCHAR(255) NULL,
            is_active BOOLEAN DEFAULT TRUE,
            last_login_at TIMESTAMP NULL,
            google_id VARCHAR(255) NULL,
            google_token TEXT NULL,
            google_refresh_token TEXT NULL,
            settings JSONB NULL
        )
    ");
    
    // Crear tabla password_reset_tokens
    echo "📦 Creando tabla password_reset_tokens...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            email VARCHAR(255) PRIMARY KEY,
            token VARCHAR(255) NOT NULL,
            created_at TIMESTAMP NULL
        )
    ");
    
    // Crear tabla sessions
    echo "📦 Creando tabla sessions...\n";
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
    
    // Crear tabla cache
    echo "📦 Creando tabla cache...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS cache (
            key VARCHAR(255) PRIMARY KEY,
            value TEXT NOT NULL,
            expiration INTEGER NOT NULL
        )
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS cache_locks (
            key VARCHAR(255) PRIMARY KEY,
            owner VARCHAR(255) NOT NULL,
            expiration INTEGER NOT NULL
        )
    ");
    
    // Crear tabla jobs
    echo "📦 Creando tabla jobs...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS jobs (
            id BIGSERIAL PRIMARY KEY,
            queue VARCHAR(255) NOT NULL,
            payload TEXT NOT NULL,
            attempts SMALLINT NOT NULL,
            reserved_at INTEGER NULL,
            available_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        )
    ");
    $pdo->exec("CREATE INDEX IF NOT EXISTS jobs_queue_index ON jobs(queue)");
    
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS job_batches (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            total_jobs INTEGER NOT NULL,
            pending_jobs INTEGER NOT NULL,
            failed_jobs INTEGER NOT NULL,
            failed_job_ids TEXT NOT NULL,
            options TEXT NULL,
            cancelled_at INTEGER NULL,
            created_at INTEGER NOT NULL,
            finished_at INTEGER NULL
        )
    ");
    
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS failed_jobs (
            id BIGSERIAL PRIMARY KEY,
            uuid VARCHAR(255) UNIQUE NOT NULL,
            connection TEXT NOT NULL,
            queue TEXT NOT NULL,
            payload TEXT NOT NULL,
            exception TEXT NOT NULL,
            failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Crear tabla companies
    echo "📦 Creando tabla companies...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS companies (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            description TEXT NULL,
            industry VARCHAR(255) NULL,
            website VARCHAR(255) NULL,
            logo_url VARCHAR(255) NULL,
            branding JSONB NULL,
            timezone VARCHAR(50) DEFAULT 'UTC',
            settings JSONB NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL,
            chatwoot_account_id INTEGER NULL,
            chatwoot_inbox_id INTEGER NULL,
            chatwoot_hmac_token VARCHAR(255) NULL
        )
    ");
    
    // Crear tabla subscriptions
    echo "📦 Creando tabla subscriptions...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS subscriptions (
            id BIGSERIAL PRIMARY KEY,
            company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
            plan VARCHAR(50) NOT NULL DEFAULT 'free',
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            trial_ends_at TIMESTAMP NULL,
            ends_at TIMESTAMP NULL,
            stripe_subscription_id VARCHAR(255) NULL,
            stripe_customer_id VARCHAR(255) NULL,
            features JSONB NULL,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL
        )
    ");
    
    // Crear tabla ai_agents
    echo "📦 Creando tabla ai_agents...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS ai_agents (
            id BIGSERIAL PRIMARY KEY,
            company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            description TEXT NULL,
            type VARCHAR(50) DEFAULT 'chatbot',
            model VARCHAR(100) DEFAULT 'gpt-4',
            system_prompt TEXT NULL,
            temperature DECIMAL(3,2) DEFAULT 0.7,
            max_tokens INTEGER DEFAULT 2048,
            knowledge_base_id BIGINT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            settings JSONB NULL,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL
        )
    ");
    
    // Crear tabla integrations
    echo "📦 Creando tabla integrations...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS integrations (
            id BIGSERIAL PRIMARY KEY,
            company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            credentials JSONB NULL,
            settings JSONB NULL,
            is_active BOOLEAN DEFAULT TRUE,
            last_sync_at TIMESTAMP NULL,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL
        )
    ");
    
    // Crear tabla usage_metrics
    echo "📦 Creando tabla usage_metrics...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS usage_metrics (
            id BIGSERIAL PRIMARY KEY,
            company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
            metric_type VARCHAR(50) NOT NULL,
            value INTEGER DEFAULT 0,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            metadata JSONB NULL,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL
        )
    ");
    
    // Crear tabla agent_invitations
    echo "📦 Creando tabla agent_invitations...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS agent_invitations (
            id BIGSERIAL PRIMARY KEY,
            company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
            email VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'agent',
            token VARCHAR(255) UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            accepted_at TIMESTAMP NULL,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL
        )
    ");
    
    // Crear tabla pipelines
    echo "📦 Creando tabla pipelines...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS pipelines (
            id BIGSERIAL PRIMARY KEY,
            company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            stages JSONB DEFAULT '[]',
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL
        )
    ");
    
    // Crear tabla pipeline_items
    echo "📦 Creando tabla pipeline_items...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS pipeline_items (
            id BIGSERIAL PRIMARY KEY,
            pipeline_id BIGINT REFERENCES pipelines(id) ON DELETE CASCADE,
            company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
            contact_name VARCHAR(255) NOT NULL,
            contact_email VARCHAR(255) NULL,
            contact_phone VARCHAR(50) NULL,
            stage VARCHAR(100) NOT NULL,
            value DECIMAL(15,2) DEFAULT 0,
            notes TEXT NULL,
            metadata JSONB NULL,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL
        )
    ");
    
    // Crear tabla personal_access_tokens
    echo "📦 Creando tabla personal_access_tokens...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS personal_access_tokens (
            id BIGSERIAL PRIMARY KEY,
            tokenable_type VARCHAR(255) NOT NULL,
            tokenable_id BIGINT NOT NULL,
            name VARCHAR(255) NOT NULL,
            token VARCHAR(64) UNIQUE NOT NULL,
            abilities TEXT NULL,
            last_used_at TIMESTAMP NULL,
            expires_at TIMESTAMP NULL,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL
        )
    ");
    $pdo->exec("CREATE INDEX IF NOT EXISTS personal_access_tokens_tokenable_type_tokenable_id_index ON personal_access_tokens(tokenable_type, tokenable_id)");
    
    // Crear tabla whatsapp_instances
    echo "📦 Creando tabla whatsapp_instances...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS whatsapp_instances (
            id BIGSERIAL PRIMARY KEY,
            company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
            instance_name VARCHAR(255) UNIQUE NOT NULL,
            instance_id VARCHAR(255) NULL,
            status VARCHAR(50) DEFAULT 'disconnected',
            phone_number VARCHAR(50) NULL,
            qr_code TEXT NULL,
            webhook_url VARCHAR(255) NULL,
            settings JSONB NULL,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL
        )
    ");
    
    // Crear tabla knowledge_documents
    echo "📦 Creando tabla knowledge_documents...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS knowledge_documents (
            id BIGSERIAL PRIMARY KEY,
            company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            file_path VARCHAR(255) NULL,
            file_type VARCHAR(50) NULL,
            file_size BIGINT NULL,
            content TEXT NULL,
            vector_ids JSONB NULL,
            status VARCHAR(50) DEFAULT 'pending',
            processed_at TIMESTAMP NULL,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL
        )
    ");
    
    // Registrar migraciones
    echo "\n📝 Registrando migraciones...\n";
    $migrations = [
        '0001_01_01_000000_create_users_table',
        '0001_01_01_000001_create_cache_table',
        '0001_01_01_000002_create_jobs_table',
        '2025_08_18_140823_add_google_fields_to_users_table',
        '2025_08_18_230900_create_companies_table',
        '2025_08_18_230901_create_subscriptions_table',
        '2025_08_18_230902_create_ai_agents_table',
        '2025_08_18_230903_create_integrations_table',
        '2025_08_18_230905_create_usage_metrics_table',
        '2025_09_22_221526_create_pipelines_table',
        '2025_09_22_221534_create_pipeline_items_table',
        '2025_09_28_192518_create_agent_invitations_table',
        '2025_10_05_005315_create_personal_access_tokens_table',
    ];
    
    foreach ($migrations as $migration) {
        $stmt = $pdo->prepare("INSERT INTO migrations (migration, batch) VALUES (?, 1) ON CONFLICT DO NOTHING");
        $stmt->execute([$migration]);
    }
    
    // Verificar tablas creadas
    echo "\n📋 Tablas creadas:\n";
    $tables = $pdo->query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    foreach ($tables as $t) {
        echo "   ✅ " . $t['tablename'] . "\n";
    }
    
    echo "\n✅ Migraciones completadas exitosamente\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
