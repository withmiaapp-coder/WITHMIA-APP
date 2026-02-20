<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('provider')->default('manual'); // manual, woocommerce, shopify, mercadolibre, custom_api
            $table->string('external_id')->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 12, 2)->nullable();
            $table->decimal('compare_at_price', 12, 2)->nullable();
            $table->string('currency', 10)->default('CLP');
            $table->string('sku')->nullable();
            $table->integer('stock_quantity')->nullable();
            $table->string('stock_status')->default('in_stock'); // in_stock, out_of_stock, on_backorder
            $table->string('category')->nullable();
            $table->json('images')->nullable();
            $table->json('attributes')->nullable();
            $table->json('variants')->nullable();
            $table->string('url')->nullable();
            $table->string('brand')->nullable();
            $table->decimal('weight', 8, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'provider', 'external_id']);
            $table->index(['company_id', 'is_active']);
            $table->index(['company_id', 'category']);
            $table->index(['company_id', 'provider']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
