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
        Schema::table('users', function (Blueprint $table) {
            // Solo agregar las columnas que realmente faltan
            if (!Schema::hasColumn('users', 'is_onboarded')) {
                $table->boolean('is_onboarded')->default(false);
            }
            if (!Schema::hasColumn('users', 'company_slug')) {
                $table->string('company_slug')->nullable();
            }
            if (!Schema::hasColumn('users', 'whatsapp_instance_id')) {
                $table->string('whatsapp_instance_id')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'is_onboarded')) {
                $table->dropColumn('is_onboarded');
            }
            if (Schema::hasColumn('users', 'company_slug')) {
                $table->dropColumn('company_slug');
            }
            if (Schema::hasColumn('users', 'whatsapp_instance_id')) {
                $table->dropColumn('whatsapp_instance_id');
            }
        });
    }
};