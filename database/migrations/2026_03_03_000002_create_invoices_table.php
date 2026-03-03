<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->string('invoice_number', 20)->unique();
            $table->string('concept');
            $table->integer('amount');           // Total including tax
            $table->string('currency', 3)->default('CLP');
            $table->integer('tax_amount')->default(0);        // IVA amount
            $table->integer('net_amount')->default(0);         // Net amount (amount - tax)
            $table->string('status', 20)->default('paid');     // paid, refunded, cancelled
            $table->string('payment_method', 20)->default('flow'); // flow, dlocal, manual
            $table->string('payment_reference')->default('');
            $table->string('billing_name')->default('');
            $table->string('billing_rut', 20)->nullable();
            $table->string('billing_email')->default('');
            $table->string('billing_address')->nullable();
            $table->json('items')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index('company_id');
            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
