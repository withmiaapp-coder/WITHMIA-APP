<?php
/**
 * Fix Chatwoot User - Create or reset admin user
 */

// Chatwoot PostgreSQL connection
$host = 'switchyard.proxy.rlwy.net';
$port = '28796';
$dbname = 'chatwoot';
$user = 'postgres';
$password = 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw';

try {
    $pdo = new PDO(
        "pgsql:host=$host;port=$port;dbname=$dbname",
        $user,
        $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    echo "✅ Connected to Chatwoot database\n\n";
    
    // Check existing users
    echo "=== Existing Users ===\n";
    $stmt = $pdo->query("SELECT id, email, name, confirmed_at, type FROM users ORDER BY id");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($users)) {
        echo "No users found in database!\n";
    } else {
        foreach ($users as $user) {
            echo "ID: {$user['id']}, Email: {$user['email']}, Name: {$user['name']}, Type: {$user['type']}, Confirmed: " . ($user['confirmed_at'] ? 'Yes' : 'No') . "\n";
        }
    }
    
    echo "\n=== Checking for automatiza@withmia.com ===\n";
    $stmt = $pdo->prepare("SELECT id, email, encrypted_password, confirmed_at FROM users WHERE email = ?");
    $stmt->execute(['automatiza@withmia.com']);
    $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingUser) {
        echo "User exists with ID: {$existingUser['id']}\n";
        echo "Has password: " . (!empty($existingUser['encrypted_password']) ? 'Yes' : 'No') . "\n";
        echo "Confirmed: " . ($existingUser['confirmed_at'] ? 'Yes' : 'No') . "\n";
        
        // Reset password using bcrypt (Rails/Devise compatible)
        // Thebulldog.1650 hashed with bcrypt cost 12
        $newPassword = password_hash('Thebulldog.1650', PASSWORD_BCRYPT, ['cost' => 12]);
        
        $stmt = $pdo->prepare("UPDATE users SET 
            encrypted_password = ?,
            confirmed_at = NOW(),
            confirmation_token = NULL
            WHERE id = ?");
        $stmt->execute([$newPassword, $existingUser['id']]);
        
        echo "✅ Password reset for user automatiza@withmia.com\n";
    } else {
        echo "User does not exist. Creating new super admin...\n";
        
        // Create password hash
        $passwordHash = password_hash('Thebulldog.1650', PASSWORD_BCRYPT, ['cost' => 12]);
        
        // Insert new super admin user
        $stmt = $pdo->prepare("INSERT INTO users (
            email, 
            encrypted_password, 
            name, 
            display_name,
            type,
            confirmed_at,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW()) RETURNING id");
        
        $stmt->execute([
            'automatiza@withmia.com',
            $passwordHash,
            'Automatiza',
            'Automatiza WITHMIA',
            'SuperAdmin'
        ]);
        
        $newUserId = $stmt->fetchColumn();
        echo "✅ Created new SuperAdmin user with ID: $newUserId\n";
    }
    
    // Check accounts
    echo "\n=== Checking Accounts ===\n";
    $stmt = $pdo->query("SELECT id, name FROM accounts ORDER BY id");
    $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($accounts)) {
        echo "No accounts found. Creating default account...\n";
        $stmt = $pdo->prepare("INSERT INTO accounts (name, created_at, updated_at) VALUES (?, NOW(), NOW()) RETURNING id");
        $stmt->execute(['WITHMIA']);
        $accountId = $stmt->fetchColumn();
        echo "✅ Created account 'WITHMIA' with ID: $accountId\n";
        
        // Link user to account
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute(['automatiza@withmia.com']);
        $userId = $stmt->fetchColumn();
        
        if ($userId) {
            $stmt = $pdo->prepare("INSERT INTO account_users (account_id, user_id, role, created_at, updated_at) 
                VALUES (?, ?, ?, NOW(), NOW()) ON CONFLICT DO NOTHING");
            $stmt->execute([$accountId, $userId, 'administrator']);
            echo "✅ Linked user to account as administrator\n";
        }
    } else {
        foreach ($accounts as $acc) {
            echo "Account ID: {$acc['id']}, Name: {$acc['name']}\n";
        }
        
        // Make sure user is linked to first account
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute(['automatiza@withmia.com']);
        $userId = $stmt->fetchColumn();
        
        if ($userId && !empty($accounts)) {
            $stmt = $pdo->prepare("INSERT INTO account_users (account_id, user_id, role, created_at, updated_at) 
                VALUES (?, ?, ?, NOW(), NOW()) ON CONFLICT DO NOTHING");
            $stmt->execute([$accounts[0]['id'], $userId, 'administrator']);
            echo "✅ Ensured user is linked to account {$accounts[0]['id']}\n";
        }
    }
    
    echo "\n✅ Done! Try logging in with:\n";
    echo "   Email: automatiza@withmia.com\n";
    echo "   Password: Thebulldog.1650\n";
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
    exit(1);
}
