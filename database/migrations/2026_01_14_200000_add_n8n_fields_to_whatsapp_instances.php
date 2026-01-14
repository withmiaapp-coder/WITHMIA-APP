<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_instances', function (Blueprint $table) {
            if (!Schema::hasColumn('whatsapp_instances', 'n8n_workflow_id')) {
                $table->string('n8n_workflow_id')->nullable()->after('api_key');
            }
            if (!Schema::hasColumn('whatsapp_instances', 'n8n_webhook_url')) {
                $table->string('n8n_webhook_url')->nullable()->after('n8n_workflow_id');
            }
            if (!Schema::hasColumn('whatsapp_instances', 'company_slug')) {
                $table->string('company_slug')->nullable()->after('instance_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_instances', function (Blueprint $table) {
            $table->dropColumn(['n8n_workflow_id', 'n8n_webhook_url', 'company_slug']);
        });
    }
};
