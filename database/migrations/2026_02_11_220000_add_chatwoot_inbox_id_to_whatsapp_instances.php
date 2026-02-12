<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds chatwoot_inbox_id to whatsapp_instances table.
     * The column was already declared in the WhatsAppInstance model
     * ($fillable and $casts) but never had a migration.
     */
    public function up(): void
    {
        Schema::table('whatsapp_instances', function (Blueprint $table) {
            if (!Schema::hasColumn('whatsapp_instances', 'chatwoot_inbox_id')) {
                $table->unsignedInteger('chatwoot_inbox_id')->nullable()->after('company_slug');
                $table->index('chatwoot_inbox_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('whatsapp_instances', function (Blueprint $table) {
            $table->dropIndex(['chatwoot_inbox_id']);
            $table->dropColumn('chatwoot_inbox_id');
        });
    }
};
