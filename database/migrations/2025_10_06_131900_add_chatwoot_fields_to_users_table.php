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
            // ID del agente en Chatwoot
            $table->unsignedBigInteger('chatwoot_agent_id')->nullable()->after('email');
            
            // ID del inbox dedicado del usuario en Chatwoot
            $table->unsignedBigInteger('chatwoot_inbox_id')->nullable()->after('chatwoot_agent_id');
            
            // Token de acceso del agente individual (en lugar de usar el super admin token)
            $table->string('chatwoot_agent_token', 255)->nullable()->after('chatwoot_inbox_id');
            
            // Rol del agente en Chatwoot (agent, administrator)
            $table->string('chatwoot_agent_role', 50)->default('agent')->after('chatwoot_agent_token');
            
            // Índices para optimizar búsquedas
            $table->index('chatwoot_agent_id');
            $table->index('chatwoot_inbox_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['chatwoot_agent_id']);
            $table->dropIndex(['chatwoot_inbox_id']);
            
            $table->dropColumn([
                'chatwoot_agent_id',
                'chatwoot_inbox_id',
                'chatwoot_agent_token',
                'chatwoot_agent_role'
            ]);
        });
    }
};
