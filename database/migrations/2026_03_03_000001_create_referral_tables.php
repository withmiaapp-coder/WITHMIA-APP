<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referral_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->string('code', 20)->unique();
            $table->unsignedTinyInteger('discount_percent')->default(10); // 10% off
            $table->unsignedTinyInteger('discount_months')->default(3);   // for 3 months
            $table->unsignedInteger('max_uses')->default(0);             // 0 = unlimited
            $table->unsignedInteger('times_used')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['code', 'is_active']);
            $table->index('company_id');
        });

        Schema::create('referral_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referral_code_id')->constrained()->onDelete('cascade');
            $table->foreignId('redeemer_company_id')->constrained('companies')->onDelete('cascade');
            $table->unsignedTinyInteger('discount_percent');
            $table->unsignedTinyInteger('discount_months');
            $table->unsignedTinyInteger('months_remaining');
            $table->timestamps();

            $table->index('redeemer_company_id');
            $table->unique(['referral_code_id', 'redeemer_company_id']); // one code per company
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_redemptions');
        Schema::dropIfExists('referral_codes');
    }
};
