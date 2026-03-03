<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('subscriptions')) {
            Schema::table('subscriptions', function (Blueprint $table) {
                if (!Schema::hasColumn('subscriptions', 'flow_subscription_id')) {
                    $table->string('flow_subscription_id')->nullable()->after('dlocal_subscription_id');
                }
                if (!Schema::hasColumn('subscriptions', 'flow_customer_id')) {
                    $table->string('flow_customer_id')->nullable()->after('flow_subscription_id');
                }
                if (!Schema::hasColumn('subscriptions', 'cancelled_at')) {
                    $table->timestamp('cancelled_at')->nullable()->after('trial_ends_at');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('subscriptions')) {
            Schema::table('subscriptions', function (Blueprint $table) {
                $columns = [];
                if (Schema::hasColumn('subscriptions', 'flow_subscription_id')) {
                    $columns[] = 'flow_subscription_id';
                }
                if (Schema::hasColumn('subscriptions', 'flow_customer_id')) {
                    $columns[] = 'flow_customer_id';
                }
                if (Schema::hasColumn('subscriptions', 'cancelled_at')) {
                    $columns[] = 'cancelled_at';
                }
                if (!empty($columns)) {
                    $table->dropColumn($columns);
                }
            });
        }
    }
};
