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
        Schema::table('companies', function (Blueprint $table) {
            // ID de la cuenta en Chatwoot
            $table->unsignedBigInteger('chatwoot_account_id')->nullable()->after('slug');
            
            // Clave API de la cuenta de Chatwoot
            $table->string('chatwoot_api_key', 255)->nullable()->after('chatwoot_account_id');
            
            // Datos JSON de configuración de Chatwoot
            $table->json('chatwoot_data')->nullable()->after('chatwoot_api_key');
            
            // Bandera para saber si Chatwoot fue provisionado
            $table->boolean('chatwoot_provisioned')->default(false)->after('chatwoot_data');
            
            // Fecha de provisionamiento
            $table->timestamp('chatwoot_provisioned_at')->nullable()->after('chatwoot_provisioned');
            
            // Índice para búsquedas
            $table->index('chatwoot_account_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropIndex(['chatwoot_account_id']);
            $table->dropColumn([
                'chatwoot_account_id',
                'chatwoot_api_key',
                'chatwoot_data',
                'chatwoot_provisioned',
                'chatwoot_provisioned_at'
            ]);
        });
    }
};
