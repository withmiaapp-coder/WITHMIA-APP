<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            if (!Schema::hasColumn('subscriptions', 'dlocal_payment_id')) {
                $table->string('dlocal_payment_id')->nullable()->after('payment_info');
            }
            if (!Schema::hasColumn('subscriptions', 'dlocal_subscription_id')) {
                $table->string('dlocal_subscription_id')->nullable()->after('dlocal_payment_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['dlocal_payment_id', 'dlocal_subscription_id']);
        });
    }
};
