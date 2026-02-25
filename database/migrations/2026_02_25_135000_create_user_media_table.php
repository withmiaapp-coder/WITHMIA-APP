<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('type', 20)->index(); // 'avatar' or 'cover'
            $table->string('filename');
            $table->string('mime_type', 100);
            $table->integer('size'); // bytes
            $table->binary('data'); // raw image bytes
            $table->timestamps();

            $table->unique(['user_id', 'type']); // one avatar + one cover per user
        });

        // PostgreSQL: change data column to bytea to support large files
        // Laravel's binary() creates a bytea column in PostgreSQL which supports up to 1GB
    }

    public function down(): void
    {
        Schema::dropIfExists('user_media');
    }
};
