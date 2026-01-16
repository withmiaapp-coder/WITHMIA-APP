<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TruncateAllTables extends Command
{
    protected $signature = 'db:truncate-all {--force : Force the operation to run}';
    protected $description = 'Truncate all tables in the database except migrations';

    public function handle()
    {
        if (!$this->option('force')) {
            if (!$this->confirm('This will delete ALL data from all tables. Are you sure?')) {
                $this->info('Operation cancelled.');
                return 0;
            }
        }

        try {
            // Disable foreign key constraints
            DB::statement('SET session_replication_role = replica');
            
            $tables = DB::select("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations'");
            
            $this->info('Truncating tables...');
            $bar = $this->output->createProgressBar(count($tables));
            $bar->start();

            foreach ($tables as $table) {
                DB::statement("TRUNCATE TABLE {$table->tablename} CASCADE");
                $this->newLine();
                $this->line("✓ Truncated: {$table->tablename}");
                $bar->advance();
            }

            // Re-enable foreign key constraints
            DB::statement('SET session_replication_role = DEFAULT');
            
            $bar->finish();
            $this->newLine(2);
            $this->info('All tables truncated successfully!');
            
            return 0;
        } catch (\Exception $e) {
            $this->error('Error: ' . $e->getMessage());
            return 1;
        }
    }
}
