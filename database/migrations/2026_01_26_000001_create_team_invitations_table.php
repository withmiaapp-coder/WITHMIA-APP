<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('invited_by')->constrained('users')->onDelete('cascade');
            $table->string('email');
            $table->string('name')->nullable();
            $table->string('role')->default('agent'); // agent, administrator
            $table->integer('team_id')->nullable(); // Chatwoot team ID
            $table->string('token', 64)->unique();
            $table->enum('status', ['pending', 'accepted', 'expired', 'cancelled'])->default('pending');
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
            
            // Índices
            $table->index(['company_id', 'status']);
            $table->index(['email', 'status']);
            // Note: token already indexed via unique() constraint above
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_invitations');
    }
};
