<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=chatwoot', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

// Check access_tokens table structure
$stmt = $pdo->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'access_tokens' ORDER BY ordinal_position");
echo "access_tokens columns:\n";
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row['column_name'] . ' - ' . $row['data_type'] . "\n";
}

// Check existing tokens
echo "\n=== Existing access_tokens ===\n";
$stmt = $pdo->query("SELECT * FROM access_tokens LIMIT 5");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

// Generate a secure token
$token = bin2hex(random_bytes(32));
echo "\n=== Creating access token for user 1 ===\n";
echo "Token: $token\n";

// Check if user already has a token
$stmt = $pdo->prepare("SELECT id FROM access_tokens WHERE owner_type = 'User' AND owner_id = 1");
$stmt->execute();
$existing = $stmt->fetch();

if ($existing) {
    echo "User already has token, updating...\n";
    $stmt = $pdo->prepare("UPDATE access_tokens SET token = ? WHERE owner_type = 'User' AND owner_id = 1");
    $stmt->execute([$token]);
} else {
    echo "Creating new token...\n";
    $stmt = $pdo->prepare("INSERT INTO access_tokens (owner_type, owner_id, token, created_at, updated_at) VALUES ('User', 1, ?, NOW(), NOW())");
    $stmt->execute([$token]);
}

echo "✅ Access token created/updated!\n";

// Verify
$stmt = $pdo->query("SELECT * FROM access_tokens WHERE owner_type = 'User' AND owner_id = 1");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
