<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add missing indexes identified in audit for high-frequency WHERE columns.
     */
    public function up(): void
    {
        // users.role — filtered frequently in admin and permission checks
        Schema::table('users', function (Blueprint $table) {
            $table->index('role');
        });

        // companies.chatwoot_inbox_id — webhook lookups
        Schema::table('companies', function (Blueprint $table) {
            $table->index('chatwoot_inbox_id');
        });

        // knowledge_documents: add FK constraint on company_id (was missing)
        // First clean up any orphaned rows that would violate the FK
        DB::table('knowledge_documents')
            ->whereNotIn('company_id', DB::table('companies')->select('id'))
            ->delete();

        Schema::table('knowledge_documents', function (Blueprint $table) {
            $table->foreign('company_id')
                  ->references('id')
                  ->on('companies')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->dropIndex(['chatwoot_inbox_id']);
        });

        Schema::table('knowledge_documents', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
        });
    }
};
