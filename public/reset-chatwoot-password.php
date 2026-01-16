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
    die('CHATWOOT_DATABASE_URL not configured');
}

try {
    $pdo = new PDO($chatwootDbUrl);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Action: list users or reset password
    $action = $_GET['action'] ?? 'list';
    
    if ($action === 'list') {
        // List all users
        $stmt = $pdo->query("SELECT id, email, name, role, confirmed_at FROM users ORDER BY id LIMIT 10");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<h2>Chatwoot Users</h2>";
        echo "<pre>";
        print_r($users);
        echo "</pre>";
        echo "<p>To reset password, use: ?key=mia-reset-2026-secure&action=reset&user_id=X&password=YOUR_NEW_PASSWORD</p>";
        
    } elseif ($action === 'reset') {
        $userId = $_GET['user_id'] ?? null;
        $newPassword = $_GET['password'] ?? null;
        
        if (!$userId || !$newPassword) {
            die('Missing user_id or password parameter');
        }
        
        // Chatwoot uses bcrypt for password hashing (Devise)
        // We need to generate a bcrypt hash
        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
        
        // Update the password
        $stmt = $pdo->prepare("UPDATE users SET encrypted_password = :password WHERE id = :id");
        $stmt->execute([
            ':password' => $hashedPassword,
            ':id' => $userId
        ]);
        
        if ($stmt->rowCount() > 0) {
            echo "<h2>Password Reset Successfully!</h2>";
            echo "<p>User ID: $userId</p>";
            echo "<p>New password has been set.</p>";
            echo "<p><strong>DELETE THIS FILE IMMEDIATELY!</strong></p>";
        } else {
            echo "No user found with ID: $userId";
        }
    }
    
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage();
}
