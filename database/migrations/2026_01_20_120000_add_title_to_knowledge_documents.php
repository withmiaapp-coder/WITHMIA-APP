<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Note: This migration documents that the 'title' column exists in production.
     * If the column already exists, this migration will be skipped gracefully.
     */
    public function up(): void
    {
        Schema::table('knowledge_documents', function (Blueprint $table) {
            if (!Schema::hasColumn('knowledge_documents', 'title')) {
                $table->string('title')->after('company_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('knowledge_documents', function (Blueprint $table) {
            if (Schema::hasColumn('knowledge_documents', 'title')) {
                $table->dropColumn('title');
            }
        });
    }
};
