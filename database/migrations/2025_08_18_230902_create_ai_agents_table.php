<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->enum('type', ['chatbot', 'voice', 'email', 'api'])->default('chatbot');
            $table->text('personality')->nullable();
            $table->text('instructions')->nullable();
            $table->json('training_data')->nullable();
            $table->json('capabilities')->nullable();
            $table->string('model')->default('gpt-4');
            $table->json('model_settings')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_trained_at')->nullable();
            $table->timestamps();
            $table->unique(['company_id', 'slug']);
        });
    }
    
    public function down(): void
    {
        Schema::dropIfExists('ai_agents');
    }
};
