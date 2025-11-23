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
        Schema::create('pipelines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->string('name'); // "Ventas", "Soporte", "Marketing"
            $table->string('slug');
            $table->text('description')->nullable();
            $table->enum('type', ['sales', 'support', 'marketing', 'custom'])->default('custom');
            $table->json('visible_to_roles')->nullable(); // ["agent", "seller"] - qué roles pueden ver este pipeline
            $table->json('settings')->nullable(); // configuraciones adicionales
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->unique(['company_id', 'slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pipelines');
    }
};