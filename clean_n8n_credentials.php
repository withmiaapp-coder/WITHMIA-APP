<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "🗑️ Eliminando credenciales mal configuradas...\n\n";

// Primero eliminar las relaciones
$pdo->exec("DELETE FROM n8n.shared_credentials");
echo "✅ shared_credentials limpiado\n";

// Luego eliminar las credenciales
$pdo->exec("DELETE FROM n8n.credentials_entity");
echo "✅ credentials_entity limpiado\n";

echo "\n🎉 ¡Credenciales eliminadas!\n";
echo "\nAhora ve a n8n y crea las credenciales manualmente:\n";
echo "1. Click en 'Credentials' en el menú lateral\n";
echo "2. Click '+ Add Credential'\n";
echo "3. Crea OpenAI, Redis y Qdrant\n";
