<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add UNIQUE constraint on companies.slug (if not already present)
     * and add SoftDeletes to critical business models.
     */
    public function up(): void
    {
        // UNIQUE on companies.slug — slug is used as a FK-like binding
        // Guard: the original create_companies migration already has ->unique()
        if (!$this->hasUniqueIndex('companies', 'slug')) {
            Schema::table('companies', function (Blueprint $table) {
                $table->unique('slug');
            });
        }

        // SoftDeletes — prevent accidental permanent data loss
        // Guard each with hasColumn to make migration idempotent
        $softDeleteTables = ['users', 'companies', 'pipelines', 'pipeline_items', 'knowledge_documents'];

        foreach ($softDeleteTables as $tableName) {
            if (!Schema::hasColumn($tableName, 'deleted_at')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->softDeletes();
                });
            }
        }
    }

    /**
     * Check if a unique index exists on a table column.
     */
    private function hasUniqueIndex(string $table, string $column): bool
    {
        $indexes = Schema::getIndexes($table);
        foreach ($indexes as $index) {
            if ($index['unique'] && in_array($column, $index['columns'])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Only drop if they exist (idempotent)
        $softDeleteTables = ['users', 'companies', 'pipelines', 'pipeline_items', 'knowledge_documents'];

        foreach ($softDeleteTables as $tableName) {
            if (Schema::hasColumn($tableName, 'deleted_at')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropSoftDeletes();
                });
            }
        }

        if ($this->hasUniqueIndex('companies', 'slug')) {
            Schema::table('companies', function (Blueprint $table) {
                $table->dropUnique(['slug']);
            });
        }
    }
};
