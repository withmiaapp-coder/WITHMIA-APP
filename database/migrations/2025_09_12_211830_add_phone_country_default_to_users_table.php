<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Add phone_country with default value if it doesn't exist
            if (!Schema::hasColumn('users', 'phone_country')) {
                $table->string('phone_country')->default('US')->after('email');
            } else {
                // If it exists, just add default value
                $table->string('phone_country')->default('US')->change();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'phone_country')) {
                $table->dropColumn('phone_country');
            }
        });
    }
};
