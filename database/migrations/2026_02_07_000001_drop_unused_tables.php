<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Consolidation Migration: Drop unused/orphaned tables
 * 
 * Tables being dropped (all have 0 rows, no models, no code references):
 * - ai_agents: Created but never used, no model exists
 * - subscriptions: Created but never used, no model exists  
 * - usage_metrics: Created but never used, no model exists
 * - custom_configs: Created but never used, no model exists
 * - integrations: Created but never used, no model exists
 * - permissions/roles/model_has_*: Spatie permission tables, unused (app uses JSON permissions on users table)
 * - agent_invitations: Duplicate of team_invitations, 0 rows
 */
return new class extends Migration
{
    public function up(): void
    {
        // Drop orphaned tables with no models and 0 rows
        $tablesToDrop = [
            'ai_agents',
            'subscriptions',
            'usage_metrics',
            'custom_configs',
            'integrations',
        ];

        foreach ($tablesToDrop as $table) {
            Schema::dropIfExists($table);
        }

        // Drop unused Spatie permission tables (app uses JSON permissions column instead)
        Schema::dropIfExists('model_has_permissions');
        Schema::dropIfExists('model_has_roles');
        Schema::dropIfExists('role_has_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');

        // Drop agent_invitations (duplicate of team_invitations, 0 rows)
        Schema::dropIfExists('agent_invitations');
    }

    public function down(): void
    {
        // These tables can be recreated from their original migrations if needed
        // Not recreating in down() as they were confirmed empty and unused
    }
};
