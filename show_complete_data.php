<?php
require '/var/www/mia-app/vendor/autoload.php';
$app = require_once '/var/www/mia-app/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "========================================\n";
echo "   📊 USERS TABLE (MySQL)\n";
echo "========================================\n\n";

foreach(\App\Models\User::all() as $user) {
    echo "User ID: " . $user->id . "\n";
    echo "  Name: " . $user->name . "\n";
    echo "  Email: " . $user->email . "\n";
    echo "  Google ID: " . $user->google_id . "\n";
    echo "  Google Avatar: " . $user->google_avatar . "\n";
    echo "  Company Slug: " . $user->company_slug . "\n";
    echo "  Chatwoot Account ID: " . $user->chatwoot_account_id . "\n";
    echo "  Chatwoot Agent ID: " . $user->chatwoot_agent_id . "\n";
    echo "  Onboarding Completed: " . ($user->onboarding_completed ? 'YES ✅' : 'NO ❌') . "\n";
    echo "  Current Step: " . ($user->current_onboarding_step ?? 'null') . "\n";
    echo "  First Login: " . ($user->first_login ?? 'null') . "\n";
    echo "  Last Login: " . ($user->last_login ?? 'null') . "\n";
    echo "  Created At: " . $user->created_at . "\n";
    echo "  Updated At: " . $user->updated_at . "\n";
    echo "-------------------------------------------\n\n";
}

echo "\n========================================\n";
echo "   🏢 COMPANIES TABLE (MySQL)\n";
echo "========================================\n\n";

foreach(\App\Models\Company::all() as $company) {
    echo "Company ID: " . $company->id . "\n";
    echo "  Name: " . $company->name . "\n";
    echo "  Slug: " . $company->slug . "\n";
    echo "  Industry: " . ($company->industry ?? 'null') . "\n";
    echo "  Business Size: " . ($company->business_size ?? 'null') . "\n";
    echo "  Website: " . ($company->website ?? 'null') . "\n";
    echo "  Created At: " . $company->created_at . "\n";
    echo "  Updated At: " . $company->updated_at . "\n";
    echo "-------------------------------------------\n\n";
}

// Obtener datos de Chatwoot (PostgreSQL)
echo "\n========================================\n";
echo "   💬 CHATWOOT DATA (PostgreSQL)\n";
echo "========================================\n\n";

try {
    $chatwootDb = DB::connection('chatwoot');
    
    echo "📊 ACCOUNTS:\n";
    $accounts = $chatwootDb->table('accounts')->get();
    foreach($accounts as $acc) {
        echo "  Account ID: " . $acc->id . "\n";
        echo "    Name: " . $acc->name . "\n";
        echo "    Created: " . $acc->created_at . "\n";
        echo "  ---\n";
    }
    
    echo "\n👤 USERS:\n";
    $chatwootUsers = $chatwootDb->table('users')->get();
    foreach($chatwootUsers as $cu) {
        echo "  User ID: " . $cu->id . "\n";
        echo "    Name: " . $cu->name . "\n";
        echo "    Email: " . $cu->email . "\n";
        echo "    Type: " . ($cu->type ?? 'null') . "\n";
        echo "    Created: " . $cu->created_at . "\n";
        echo "  ---\n";
    }
    
    echo "\n📨 INBOXES:\n";
    $inboxes = $chatwootDb->table('inboxes')->get();
    foreach($inboxes as $inbox) {
        echo "  Inbox ID: " . $inbox->id . "\n";
        echo "    Name: " . $inbox->name . "\n";
        echo "    Channel Type: " . ($inbox->channel_type ?? 'null') . "\n";
        echo "    Account ID: " . $inbox->account_id . "\n";
        echo "    Created: " . $inbox->created_at . "\n";
        echo "  ---\n";
    }
    
    echo "\n🔗 INBOX MEMBERS:\n";
    $members = $chatwootDb->table('inbox_members')->get();
    foreach($members as $member) {
        echo "  Member ID: " . $member->id . "\n";
        echo "    Inbox ID: " . $member->inbox_id . "\n";
        echo "    User ID: " . $member->user_id . "\n";
        echo "    Created: " . $member->created_at . "\n";
        echo "  ---\n";
    }
    
} catch (\Exception $e) {
    echo "⚠️ Error connecting to Chatwoot DB: " . $e->getMessage() . "\n";
}

echo "\n========================================\n";
echo "   ✅ REPORTE COMPLETO\n";
echo "========================================\n";
