<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Caché persistente de attachments de Chatwoot.
     * Almacena el binario en PostgreSQL para sobrevivir re-deploys en Railway
     * (el filesystem es efímero y se borra con cada deploy).
     */
    public function up(): void
    {
        Schema::create('cached_attachments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('attachment_id')->unique()->index();
            $table->string('content_type', 255)->default('application/octet-stream');
            $table->string('file_name', 500)->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->binary('binary_data'); // BYTEA en PostgreSQL
            $table->string('original_url', 1000)->nullable();
            $table->unsignedBigInteger('message_id')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cached_attachments');
    }
};
