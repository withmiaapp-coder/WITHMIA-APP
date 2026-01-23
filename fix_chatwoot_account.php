<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=chatwoot', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

// Role 0 = agent, Role 1 = administrator in Chatwoot
// Update to administrator
$stmt = $pdo->prepare('UPDATE account_users SET role = 1 WHERE user_id = 1 AND account_id = 1');
$stmt->execute();
echo "Updated role to administrator (1)\n";

// Verify
$stmt = $pdo->query('SELECT * FROM account_users WHERE user_id = 1');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
