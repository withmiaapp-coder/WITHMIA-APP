<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Forzar la creación de columnas usando SQL directo para evitar problemas con Schema::hasColumn
        DB::statement('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NULL AFTER name');
        DB::statement('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL AFTER email');
        
        Schema::table('users', function (Blueprint $table) {
            
            if (!Schema::hasColumn('users', 'onboarding_step')) {
                $table->integer('onboarding_step')->default(0)->after('email_verified_at');
            }
            
            if (!Schema::hasColumn('users', 'onboarding_completed')) {
                $table->boolean('onboarding_completed')->default(false)->after('onboarding_step');
            }
            
            if (!Schema::hasColumn('users', 'company_slug')) {
                $table->string('company_slug')->nullable()->after('onboarding_completed');
            }
            
            if (!Schema::hasColumn('users', 'login_ip')) {
                $table->string('login_ip', 45)->nullable()->after('company_slug');
            }
            
            if (!Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('login_ip');
            }
            
            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('user')->after('last_login_at');
            }
            
            if (!Schema::hasColumn('users', 'whatsapp_instance_id')) {
                $table->unsignedBigInteger('whatsapp_instance_id')->nullable()->after('role');
            }
            
            if (!Schema::hasColumn('users', 'whatsapp_instance_data')) {
                $table->json('whatsapp_instance_data')->nullable()->after('whatsapp_instance_id');
            }
            
            if (!Schema::hasColumn('users', 'chatwoot_agent_id')) {
                $table->string('chatwoot_agent_id')->nullable()->after('whatsapp_instance_data');
            }
            
            if (!Schema::hasColumn('users', 'chatwoot_inbox_id')) {
                $table->string('chatwoot_inbox_id')->nullable()->after('chatwoot_agent_id');
            }
            
            if (!Schema::hasColumn('users', 'chatwoot_agent_token')) {
                $table->string('chatwoot_agent_token')->nullable()->after('chatwoot_inbox_id');
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
