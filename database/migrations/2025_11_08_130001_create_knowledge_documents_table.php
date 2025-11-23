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
        Schema::create('knowledge_documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('filename');
            $table->enum('category', ['historia', 'producto', 'informacion', 'desarrollo']);
            $table->integer('chunks_created')->default(0);
            $table->timestamp('uploaded_at')->useCurrent();
            $table->timestamps();

            // Indexes
            $table->index(['company_id', 'category']);
            $table->index('uploaded_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('knowledge_documents');
    }
};
