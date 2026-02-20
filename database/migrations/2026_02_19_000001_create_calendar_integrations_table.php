<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('provider')->default('google'); // google, outlook, etc.
            $table->string('provider_email')->nullable(); // email de la cuenta conectada
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->json('scopes')->nullable(); // scopes otorgados
            $table->json('settings')->nullable(); // configuración por usuario (calendarios seleccionados, notificaciones, etc.)
            $table->string('selected_calendar_id')->nullable(); // ID del calendario seleccionado para sincronizar
            $table->boolean('is_active')->default(true);
            $table->boolean('bot_access_enabled')->default(false); // si el bot puede leer/escribir el calendario
            $table->timestamp('last_sync_at')->nullable();
            $table->json('sync_status')->nullable();
            $table->timestamps();

            // Un usuario solo puede tener una integración por proveedor
            $table->unique(['user_id', 'provider']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_integrations');
    }
};
