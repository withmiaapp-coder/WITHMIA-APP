<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // PostgreSQL no soporta AFTER en ALTER TABLE, simplemente agregamos las columnas
        DB::statement('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NULL');
        DB::statement('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL');
        
        Schema::table('users', function (Blueprint $table) {
            
            if (!Schema::hasColumn('users', 'onboarding_step')) {
                $table->integer('onboarding_step')->default(0);
            }
            
            if (!Schema::hasColumn('users', 'onboarding_completed')) {
                $table->boolean('onboarding_completed')->default(false);
            }
            
            if (!Schema::hasColumn('users', 'company_slug')) {
                $table->string('company_slug')->nullable();
            }
            
            if (!Schema::hasColumn('users', 'login_ip')) {
                $table->string('login_ip', 45)->nullable();
            }
            
            if (!Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable();
            }
            
            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('admin'); // Valid roles: superadmin, admin, agent
            }
            
            if (!Schema::hasColumn('users', 'whatsapp_instance_id')) {
                $table->unsignedBigInteger('whatsapp_instance_id')->nullable();
            }
            
            if (!Schema::hasColumn('users', 'whatsapp_instance_data')) {
                $table->json('whatsapp_instance_data')->nullable();
            }
            
            if (!Schema::hasColumn('users', 'chatwoot_agent_id')) {
                // Note: 2026_01_26 migration defines this as unsignedBigInteger.
                // Using string here for forward-compatibility (Chatwoot IDs may be numeric or string).
                $table->string('chatwoot_agent_id')->nullable();
            }
            
            if (!Schema::hasColumn('users', 'chatwoot_inbox_id')) {
                $table->string('chatwoot_inbox_id')->nullable();
            }
            
            if (!Schema::hasColumn('users', 'chatwoot_agent_token')) {
                $table->string('chatwoot_agent_token')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = [
                'full_name',
                'phone',
                'onboarding_step',
                'onboarding_completed',
                'company_slug',
                'login_ip',
                'last_login_at',
                'role',
                'whatsapp_instance_id',
                'whatsapp_instance_data',
                'chatwoot_agent_id',
                'chatwoot_inbox_id',
                'chatwoot_agent_token'
            ];
            
            foreach ($columns as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
