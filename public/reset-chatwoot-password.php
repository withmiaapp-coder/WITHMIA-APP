<?php
/**
 * TEMPORARY SCRIPT - DELETE AFTER USE
 * Resets Chatwoot admin password directly in PostgreSQL
 */

// Security check - only allow with secret key
$secretKey = $_GET['key'] ?? '';
if ($secretKey !== 'mia-reset-2026-secure') {
    http_response_code(403);
    die('Forbidden');
}

// Chatwoot PostgreSQL connection (using Railway's internal network)
$chatwootDbUrl = getenv('CHATWOOT_DATABASE_URL');

if (!$chatwootDbUrl) {
    die('CHATWOOT_DATABASE_URL not configured. Value: ' . ($chatwootDbUrl ?: 'empty'));
}

// Parse the DATABASE_URL
// Format: postgresql://user:password@host:port/database
$parsed = parse_url($chatwootDbUrl);
$host = $parsed['host'] ?? '';
$port = $parsed['port'] ?? 5432;
$user = $parsed['user'] ?? '';
$pass = $parsed['pass'] ?? '';
$dbname = ltrim($parsed['path'] ?? '', '/');

echo "<pre>Connecting to: $host:$port/$dbname as $user</pre>";

try {
    // Try pg_connect first
    if (function_exists('pg_connect')) {
        $connString = "host=$host port=$port dbname=$dbname user=$user password=$pass";
        $conn = pg_connect($connString);
        
        if (!$conn) {
            die('pg_connect failed: ' . pg_last_error());
        }
        
        $action = $_GET['action'] ?? 'list';
        
        if ($action === 'list') {
            $result = pg_query($conn, "SELECT id, email, name, confirmed_at FROM users ORDER BY id LIMIT 10");
            
            if (!$result) {
                die('Query failed: ' . pg_last_error($conn));
            }
            
            echo "<h2>Chatwoot Users</h2><table border='1'><tr><th>ID</th><th>Email</th><th>Name</th><th>Confirmed</th></tr>";
            while ($row = pg_fetch_assoc($result)) {
                echo "<tr><td>{$row['id']}</td><td>{$row['email']}</td><td>{$row['name']}</td><td>{$row['confirmed_at']}</td></tr>";
            }
            echo "</table>";
            echo "<p>To reset password, use: ?key=mia-reset-2026-secure&action=reset&user_id=X&password=YOUR_NEW_PASSWORD</p>";
            
        } elseif ($action === 'reset') {
            $userId = $_GET['user_id'] ?? null;
            $newPassword = $_GET['password'] ?? null;
            
            if (!$userId || !$newPassword) {
                die('Missing user_id or password parameter');
            }
            
            // Chatwoot uses bcrypt for password hashing (Devise)
            $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
            
            // Update the password
            $result = pg_query_params($conn, 
                "UPDATE users SET encrypted_password = $1 WHERE id = $2", 
                [$hashedPassword, $userId]
            );
            
            if (pg_affected_rows($result) > 0) {
                echo "<h2>Password Reset Successfully!</h2>";
                echo "<p>User ID: $userId</p>";
                echo "<p>New password has been set.</p>";
                echo "<p><strong>DELETE THIS FILE IMMEDIATELY!</strong></p>";
            } else {
                echo "No user found with ID: $userId";
            }
        }
        
        pg_close($conn);
        
    } else {
        // Check what extensions are available
        echo "<h2>Available Extensions:</h2><pre>";
        print_r(get_loaded_extensions());
        echo "</pre>";
        die('Neither PDO_PGSQL nor pg_connect available');
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
