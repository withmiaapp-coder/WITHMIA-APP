<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * RoleSeeder — DESACTIVADO
 *
 * Las tablas de Spatie Permission (roles, permissions, model_has_roles, etc.)
 * fueron eliminadas en la migración 2026_02_07_000001_drop_unused_tables.
 *
 * Los roles ahora se manejan con un campo string `role` en la tabla users
 * con valores: 'superadmin', 'admin', 'agent'.
 *
 * Los permisos se gestionan internamente vía User::DEFAULT_PERMISSIONS.
 *
 * Este seeder se mantiene como referencia histórica y NO debe ejecutarse.
 */
class RoleSeeder extends Seeder
{
    /**
     * Roles válidos del sistema (definidos en la tabla users.role).
     */
    public const VALID_ROLES = ['superadmin', 'admin', 'agent'];

    public function run(): void
    {
        $this->command->warn('⚠ RoleSeeder skipped: Spatie Permission tables were dropped in 2026_02_07.');
        $this->command->info('Roles are managed via the `role` column on users table: ' . implode(', ', self::VALID_ROLES));
        $this->command->info('Permissions are managed via User::DEFAULT_PERMISSIONS.');
    }
}
