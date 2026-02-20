<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('provider'); // woocommerce, shopify, mercadolibre, custom_api
            $table->string('store_url')->nullable();
            $table->text('api_key')->nullable();
            $table->text('api_secret')->nullable();
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->boolean('is_connected')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('bot_access_enabled')->default(true);
            $table->json('settings')->nullable();
            $table->integer('products_count')->default(0);
            $table->timestamp('last_sync_at')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'provider']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_integrations');
    }
};
