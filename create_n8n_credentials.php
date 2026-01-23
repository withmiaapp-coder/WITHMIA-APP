<?php
/**
 * Crear credenciales encriptadas para n8n
 * n8n usa AES-256-GCM para encriptar las credenciales
 */

$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Clave de encriptación de n8n (N8N_ENCRYPTION_KEY)
$encryptionKey = 'withmia-n8n-encryption-key-2026';

/**
 * Encriptar datos como lo hace n8n
 * n8n usa aes-256-gcm con IV de 16 bytes y tag de 16 bytes
 */
function encryptN8nCredential($data, $key) {
    // n8n deriva una clave de 32 bytes del key usando sha256
    $derivedKey = hash('sha256', $key, true);
    
    // Generar IV aleatorio de 16 bytes
    $iv = random_bytes(16);
    
    // Encriptar usando AES-256-GCM
    $cipher = 'aes-256-gcm';
    $tag = null;
    
    $encrypted = openssl_encrypt(
        json_encode($data),
        $cipher,
        $derivedKey,
        OPENSSL_RAW_DATA,
        $iv,
        $tag,
        '',
        16
    );
    
    // n8n almacena: iv:tag:encrypted en base64
    $result = base64_encode($iv) . ':' . base64_encode($tag) . ':' . base64_encode($encrypted);
    
    return $result;
}

echo "🔧 Creando credenciales encriptadas para n8n...\n\n";

// Obtener el usuario y proyecto
$stmt = $pdo->query("SELECT id, email FROM n8n.\"user\" WHERE email = 'automatiza@withmia.com'");
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo "❌ Usuario no encontrado\n";
    exit(1);
}

echo "👤 Usuario: {$user['email']}\n";

// Obtener proyecto personal
$stmt = $pdo->prepare("SELECT id, name FROM n8n.project WHERE type = 'personal' LIMIT 1");
$stmt->execute();
$project = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$project) {
    echo "❌ Proyecto personal no encontrado\n";
    exit(1);
}

echo "📁 Proyecto: {$project['name']} ({$project['id']})\n\n";

// Función para generar ID
function generateCredentialId() {
    return bin2hex(random_bytes(12));
}

// Credenciales a crear
$credentials = [
    [
        'id' => generateCredentialId(),
        'name' => 'OpenAI API',
        'type' => 'openAiApi',
        'data' => [
            'apiKey' => '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'
        ]
    ],
    [
        'id' => generateCredentialId(),
        'name' => 'Redis Cache',
        'type' => 'redis',
        'data' => [
            'host' => 'redis.railway.internal',
            'port' => 6379,
            'password' => 'cHOBHRcVixJRUocDljNXAbCaLmFXPeOi',
            'database' => 0
        ]
    ],
    [
        'id' => generateCredentialId(),
        'name' => 'Qdrant Vector DB',
        'type' => 'qdrantApi',
        'data' => [
            'qdrantUrl' => 'https://qdrant-production-f4e7.up.railway.app',
            'apiKey' => 'qdrant_api_key_withmia_2024_secure'
        ]
    ]
];

// Primero, limpiar credenciales existentes
echo "🧹 Limpiando credenciales anteriores...\n";
$pdo->exec("DELETE FROM n8n.shared_credentials");
$pdo->exec("DELETE FROM n8n.credentials_entity");
echo "✅ Credenciales limpiadas\n\n";

foreach ($credentials as $cred) {
    try {
        // Encriptar los datos
        $encryptedData = encryptN8nCredential($cred['data'], $encryptionKey);
        
        // Insertar credencial
        $stmt = $pdo->prepare("
            INSERT INTO n8n.credentials_entity (id, name, data, type, \"createdAt\", \"updatedAt\", \"isManaged\", \"isGlobal\")
            VALUES (?, ?, ?, ?, NOW(), NOW(), false, false)
        ");
        $stmt->execute([$cred['id'], $cred['name'], $encryptedData, $cred['type']]);
        echo "✅ Credencial creada: {$cred['name']} ({$cred['type']})\n";
        echo "   ID: {$cred['id']}\n";
        
        // Compartir con el proyecto
        $stmt = $pdo->prepare("
            INSERT INTO n8n.shared_credentials (\"credentialsId\", \"projectId\", role, \"createdAt\", \"updatedAt\")
            VALUES (?, ?, 'credential:owner', NOW(), NOW())
        ");
        $stmt->execute([$cred['id'], $project['id']]);
        echo "   ↳ Compartida con proyecto: {$project['id']}\n\n";
        
    } catch (Exception $e) {
        echo "❌ Error con {$cred['name']}: " . $e->getMessage() . "\n";
    }
}

echo "🎉 ¡Credenciales creadas!\n\n";

// Verificar
echo "=== Verificación ===\n";
$stmt = $pdo->query("SELECT id, name, type FROM n8n.credentials_entity ORDER BY \"createdAt\"");
foreach ($stmt as $row) {
    echo "✓ {$row['name']} ({$row['type']})\n";
}

echo "\n⚠️ IMPORTANTE: Es posible que n8n use un formato de encriptación diferente.\n";
echo "   Si las credenciales no funcionan, deberás crearlas manualmente desde la UI de n8n:\n";
echo "   1. Ir a Settings -> Credentials\n";
echo "   2. Crear 'OpenAI API' con tu API key\n";
echo "   3. Crear 'Qdrant Vector DB' con la URL y API key\n";
echo "   4. Crear 'Redis Cache' con la conexión de Railway\n";
