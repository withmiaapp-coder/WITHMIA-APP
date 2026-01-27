<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // Remove the unique constraint from company_slug
            $table->dropUnique(['company_slug']);
            
            // Add a regular index instead (for query performance)
            $table->index('company_slug');
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['company_slug']);
            $table->unique('company_slug');
        });
    }
};
