<?php
/**
 * Script para configurar inbox_id de usuarios
 * Ejecutar: php configure-inbox.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Company;

echo "\n";
echo "╔══════════════════════════════════════════════════════════════╗\n";
echo "║  CONFIGURACIÓN DE INBOX_ID PARA USUARIOS - WITHMIA          ║\n";
echo "╚══════════════════════════════════════════════════════════════╝\n";
echo "\n";

// 1. Mostrar usuarios actuales y su configuración
echo "📊 USUARIOS ACTUALES:\n";
echo str_repeat("-", 80) . "\n";
printf("%-5s %-25s %-30s %-10s %-10s\n", "ID", "Nombre", "Email", "Company", "Inbox ID");
echo str_repeat("-", 80) . "\n";

$users = User::with('company')->get();

foreach ($users as $user) {
    $companyName = $user->company ? $user->company->name : 'Sin company';
    $inboxId = $user->chatwoot_inbox_id ?: '❌ NO';
    
    printf(
        "%-5s %-25s %-30s %-10s %-10s\n",
        $user->id,
        substr($user->name, 0, 25),
        substr($user->email, 0, 30),
        substr($companyName, 0, 10),
        $inboxId
    );
}

echo str_repeat("-", 80) . "\n";

// 2. Mostrar companies y sus inbox_id
echo "\n";
echo "🏢 COMPANIES Y SUS INBOX:\n";
echo str_repeat("-", 80) . "\n";
printf("%-5s %-30s %-15s %-15s\n", "ID", "Nombre", "Account ID", "Inbox ID");
echo str_repeat("-", 80) . "\n";

$companies = Company::all();

foreach ($companies as $company) {
    printf(
        "%-5s %-30s %-15s %-15s\n",
        $company->id,
        substr($company->name, 0, 30),
        $company->chatwoot_account_id ?: 'NO',
        $company->chatwoot_inbox_id ?: 'NO'
    );
}

echo str_repeat("-", 80) . "\n";

// 3. Preguntar si quiere actualizar automáticamente
echo "\n";
echo "🔧 OPCIONES:\n";
echo "1. Asignar inbox_id de company a todos sus usuarios\n";
echo "2. Asignar inbox_id manualmente a un usuario específico\n";
echo "3. Ver solo usuarios sin inbox_id\n";
echo "4. Salir\n";
echo "\n";
echo "Selecciona una opción (1-4): ";

$handle = fopen("php://stdin", "r");
$option = trim(fgets($handle));

switch ($option) {
    case '1':
        echo "\n⚙️  Asignando inbox_id de company a usuarios...\n\n";
        
        $updated = 0;
        foreach ($users as $user) {
            if ($user->company && $user->company->chatwoot_inbox_id && !$user->chatwoot_inbox_id) {
                $user->chatwoot_inbox_id = $user->company->chatwoot_inbox_id;
                $user->save();
                
                echo "✅ Usuario {$user->name} ({$user->email}) → Inbox ID: {$user->chatwoot_inbox_id}\n";
                $updated++;
            }
        }
        
        echo "\n🎉 Total usuarios actualizados: $updated\n";
        break;
        
    case '2':
        echo "\nIngresa el ID del usuario: ";
        $userId = trim(fgets($handle));
        
        echo "Ingresa el inbox_id a asignar: ";
        $inboxId = trim(fgets($handle));
        
        $user = User::find($userId);
        if ($user) {
            $user->chatwoot_inbox_id = $inboxId;
            $user->save();
            echo "\n✅ Usuario actualizado: {$user->name} → Inbox ID: {$inboxId}\n";
        } else {
            echo "\n❌ Usuario no encontrado\n";
        }
        break;
        
    case '3':
        echo "\n📋 USUARIOS SIN INBOX_ID:\n";
        echo str_repeat("-", 80) . "\n";
        
        $usersWithoutInbox = $users->filter(function($user) {
            return !$user->chatwoot_inbox_id;
        });
        
        foreach ($usersWithoutInbox as $user) {
            $companyInbox = $user->company && $user->company->chatwoot_inbox_id 
                ? $user->company->chatwoot_inbox_id 
                : 'NO TIENE';
            
            echo "ID: {$user->id} | {$user->name} ({$user->email})\n";
            echo "   Company: " . ($user->company ? $user->company->name : 'Sin company') . "\n";
            echo "   Inbox de company: {$companyInbox}\n";
            echo str_repeat("-", 80) . "\n";
        }
        
        echo "\nTotal sin inbox_id: " . $usersWithoutInbox->count() . "\n";
        break;
        
    case '4':
        echo "\n👋 Saliendo...\n\n";
        exit(0);
        
    default:
        echo "\n❌ Opción inválida\n\n";
}

fclose($handle);

echo "\n";
echo "✅ Script completado\n";
echo "\n";
