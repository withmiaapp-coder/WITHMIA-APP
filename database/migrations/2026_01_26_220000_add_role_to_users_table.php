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
        Schema::table('users', function (Blueprint $table) {
            // Role: 'admin' (dueño de empresa), 'agent' (miembro de equipo)
            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('admin')->after('email');
            }
            
            // Permisos JSON para granularidad
            if (!Schema::hasColumn('users', 'permissions')) {
                $table->json('permissions')->nullable()->after('role');
            }
            
            // ID del agente en Chatwoot (para agentes)
            if (!Schema::hasColumn('users', 'chatwoot_agent_id')) {
                $table->unsignedBigInteger('chatwoot_agent_id')->nullable()->after('permissions');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'permissions', 'chatwoot_agent_id']);
        });
    }
};
