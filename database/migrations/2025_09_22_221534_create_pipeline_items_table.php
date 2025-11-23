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
        Schema::create('pipeline_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pipeline_id')->constrained()->onDelete('cascade');
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null'); // Usuario asignado
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade'); // Quién lo creó
            
            $table->string('title'); // "Llamar a Juan Pérez"
            $table->text('description')->nullable();
            $table->enum('status', ['new', 'in_progress', 'waiting', 'completed', 'cancelled'])->default('new');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            
            // Información del contacto/lead
            $table->string('contact_name')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('contact_company')->nullable();
            
            // Datos específicos del negocio
            $table->decimal('value', 10, 2)->nullable(); // Valor potencial de la venta
            $table->date('due_date')->nullable(); // Fecha límite
            $table->json('custom_fields')->nullable(); // Campos personalizables
            $table->json('tags')->nullable(); // Etiquetas
            
            // Metadatos
            $table->integer('order')->default(0); // Orden dentro del pipeline
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            
            $table->index(['pipeline_id', 'status']);
            $table->index(['assigned_to', 'status']);
            $table->index('due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pipeline_items');
    }
};