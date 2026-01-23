<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Credenciales existentes en n8n ===\n\n";

$stmt = $pdo->query("SELECT id, name, type, \"createdAt\" FROM n8n.credentials_entity ORDER BY \"createdAt\"");
$credentials = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($credentials)) {
    echo "❌ No hay credenciales creadas\n";
} else {
    foreach ($credentials as $cred) {
        echo "ID: {$cred['id']}\n";
        echo "  Nombre: {$cred['name']}\n";
        echo "  Tipo: {$cred['type']}\n";
        echo "  Creada: {$cred['createdAt']}\n\n";
    }
}

echo "\n=== Credenciales compartidas ===\n";
$stmt = $pdo->query("SELECT sc.*, ce.name, ce.type FROM n8n.shared_credentials sc LEFT JOIN n8n.credentials_entity ce ON sc.\"credentialsId\" = ce.id");
$shared = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($shared)) {
    echo "❌ No hay credenciales compartidas\n";
} else {
    foreach ($shared as $sh) {
        echo "Credencial: {$sh['name']} ({$sh['type']})\n";
        echo "  Proyecto: {$sh['projectId']}\n";
        echo "  Rol: {$sh['role']}\n\n";
    }
}

// Verificar qué tipos de credenciales necesita el workflow
echo "\n=== Tipos de credenciales requeridos ===\n";
echo "1. openAiApi - Para generar embeddings\n";
echo "2. redis - Para cache (opcional)\n";
echo "3. qdrantApi - Para almacenar vectores\n";
