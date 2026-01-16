<?php
/**
 * TEMPORARY SCRIPT - DELETE AFTER USE
 * Creates access_token for Chatwoot user
 */

$secretKey = $_GET['key'] ?? '';
if ($secretKey !== 'mia-fix-2026') {
    http_response_code(403);
    die('Forbidden');
}

$chatwootDbUrl = getenv('CHATWOOT_DATABASE_URL');
if (!$chatwootDbUrl) {
    die('CHATWOOT_DATABASE_URL not configured');
}

$parsed = parse_url($chatwootDbUrl);
$host = $parsed['host'] ?? '';
$port = $parsed['port'] ?? 5432;
$user = $parsed['user'] ?? '';
$pass = $parsed['pass'] ?? '';
$dbname = ltrim($parsed['path'] ?? '', '/');

$connString = "host=$host port=$port dbname=$dbname user=$user password=$pass";
$conn = pg_connect($connString);

if (!$conn) {
    die('Connection failed: ' . pg_last_error());
}

$userId = $_GET['user_id'] ?? 1;

// Generate a secure random token
$token = bin2hex(random_bytes(32));

// Check if access_token exists
$result = pg_query_params($conn, "SELECT id FROM access_tokens WHERE owner_id = $1 AND owner_type = 'User'", [$userId]);
$existing = pg_fetch_assoc($result);

if ($existing) {
    // Update existing token
    pg_query_params($conn, 
        "UPDATE access_tokens SET token = $1 WHERE owner_id = $2 AND owner_type = 'User'",
        [$token, $userId]
    );
    echo "<h2>Access Token Updated!</h2>";
} else {
    // Create new access token
    pg_query_params($conn,
        "INSERT INTO access_tokens (owner_type, owner_id, token, created_at, updated_at) VALUES ('User', $1, $2, NOW(), NOW())",
        [$userId, $token]
    );
    echo "<h2>Access Token Created!</h2>";
}

echo "<p>User ID: $userId</p>";
echo "<p>Token: $token</p>";
echo "<p><strong>Now try logging in to Chatwoot again!</strong></p>";
echo "<p><strong>DELETE THIS FILE IMMEDIATELY!</strong></p>";

pg_close($conn);
