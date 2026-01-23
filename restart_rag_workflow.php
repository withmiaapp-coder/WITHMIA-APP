<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

echo "=== Reiniciando workflow RAG ===\n\n";

// Desactivar
$stmt = $pdo->prepare("UPDATE n8n.workflow_entity SET active = false, \"updatedAt\" = NOW() WHERE name LIKE '%RAG%'");
$stmt->execute();
echo "1. Workflow desactivado\n";

sleep(2);

// Reactivar
$stmt = $pdo->prepare("UPDATE n8n.workflow_entity SET active = true, \"updatedAt\" = NOW() WHERE name LIKE '%RAG%'");
$stmt->execute();
echo "2. Workflow reactivado\n";

// Verificar credencial
$stmt = $pdo->query("SELECT id, name FROM n8n.credentials_entity WHERE type = 'openAiApi'");
$cred = $stmt->fetch(PDO::FETCH_ASSOC);
echo "\n✅ Credencial OpenAI activa:\n";
echo "   ID: {$cred['id']}\n";
echo "   Name: {$cred['name']}\n";

echo "\n🔄 Ahora prueba subir el documento de nuevo.\n";
echo "   Si sigue fallando, abre el workflow en n8n, edita el nodo 'Generate Embeddings'\n";
echo "   y re-selecciona la credencial 'OpenAI API'.\n";
