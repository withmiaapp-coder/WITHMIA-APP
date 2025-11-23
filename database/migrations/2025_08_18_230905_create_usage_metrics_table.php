<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usage_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('ai_agent_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('metric_type');
            $table->string('metric_name');
            $table->decimal('metric_value', 15, 2);
            $table->json('metadata')->nullable();
            $table->date('metric_date');
            $table->timestamps();
            $table->index(['company_id', 'metric_date']);
            $table->index(['ai_agent_id', 'metric_date']);
        });
    }
    
    public function down(): void
    {
        Schema::dropIfExists('usage_metrics');
    }
};
