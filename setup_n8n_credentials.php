<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "🔧 Configurando credenciales en n8n...\n\n";

// ID del usuario y proyecto
$userId = '00000000-0000-0000-0000-000000000001';
$projectId = 'pers-' . substr(md5($userId), 0, 31);

// Función para encriptar datos (n8n usa AES-256-GCM)
// Para simplificar, usaremos datos en formato que n8n espera
function generateCredentialId() {
    return bin2hex(random_bytes(12));
}

// Credenciales a crear
$credentials = [
    [
        'id' => generateCredentialId(),
        'name' => 'OpenAI Account',
        'type' => 'openAiApi',
        'data' => json_encode([
            'apiKey' => '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'
        ])
    ],
    [
        'id' => generateCredentialId(),
        'name' => 'Redis Railway',
        'type' => 'redis',
        'data' => json_encode([
            'host' => 'redis.railway.internal',
            'port' => 6379,
            'password' => 'cHOBHRcVixJRUocDljNXAbCaLmFXPeOi',
            'database' => 0
        ])
    ],
    [
        'id' => generateCredentialId(),
        'name' => 'Qdrant Railway',
        'type' => 'qdrantApi',
        'data' => json_encode([
            'qdrantUrl' => 'https://qdrant-production-f4e7.up.railway.app',
            'apiKey' => 'qdrant_api_key_withmia_2024_secure'
        ])
    ]
];

foreach ($credentials as $cred) {
    try {
        // Insertar credencial
        $stmt = $pdo->prepare("
            INSERT INTO n8n.credentials_entity (id, name, data, type, \"createdAt\", \"updatedAt\", \"isManaged\", \"isGlobal\")
            VALUES (?, ?, ?, ?, NOW(), NOW(), false, false)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, \"updatedAt\" = NOW()
        ");
        $stmt->execute([$cred['id'], $cred['name'], $cred['data'], $cred['type']]);
        echo "✅ Credencial creada: {$cred['name']} ({$cred['type']})\n";
        
        // Compartir con el proyecto del usuario
        $stmt = $pdo->prepare("
            INSERT INTO n8n.shared_credentials (\"credentialsId\", \"projectId\", role, \"createdAt\", \"updatedAt\")
            VALUES (?, ?, 'credential:owner', NOW(), NOW())
            ON CONFLICT DO NOTHING
        ");
        $stmt->execute([$cred['id'], $projectId]);
        echo "   ↳ Compartida con proyecto\n";
        
    } catch (Exception $e) {
        echo "❌ Error con {$cred['name']}: " . $e->getMessage() . "\n";
    }
}

echo "\n🎉 ¡Credenciales configuradas!\n";
echo "\n⚠️ NOTA: n8n encripta las credenciales con una clave interna.\n";
echo "   Es posible que necesites re-ingresar las credenciales desde la UI de n8n.\n";
