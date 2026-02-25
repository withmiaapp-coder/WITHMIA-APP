<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_replies', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('ticket_id');
            $table->string('author_type'); // 'admin' | 'client'
            $table->string('author_name');
            $table->string('author_email');
            $table->text('body');
            $table->timestamps();

            $table->foreign('ticket_id')
                  ->references('id')
                  ->on('support_tickets')
                  ->onDelete('cascade');

            $table->index('ticket_id');
            $table->index('created_at');
        });

        // Add 'closed_at' and 'assigned_to' to support_tickets
        Schema::table('support_tickets', function (Blueprint $table) {
            $table->timestamp('closed_at')->nullable()->after('status');
            $table->unsignedBigInteger('assigned_to')->nullable()->after('closed_at');

            $table->foreign('assigned_to')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            $table->dropForeign(['assigned_to']);
            $table->dropColumn(['closed_at', 'assigned_to']);
        });

        Schema::dropIfExists('ticket_replies');
    }
};
