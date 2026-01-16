<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupTestData extends Command
{
    protected $signature = 'cleanup:test-data {--keep-slug=withmia-nbm6qp : Company slug to keep}';
    protected $description = 'Clean up test companies and users, keeping only the specified company';

    public function handle()
    {
        $keepSlug = $this->option('keep-slug');
        
        $this->info("Cleaning up test data, keeping company: {$keepSlug}");
        
        // Get company to keep
        $keepCompany = Company::where('slug', $keepSlug)->first();
        
        if (!$keepCompany) {
            $this->error("Company with slug '{$keepSlug}' not found!");
            return 1;
        }
        
        $this->info("Keeping company: {$keepCompany->name} (ID: {$keepCompany->id})");
        
        // Get companies to delete
        $companiesToDelete = Company::where('slug', '!=', $keepSlug)->get();
        
        $this->info("Found {$companiesToDelete->count()} companies to delete");
        
        foreach ($companiesToDelete as $company) {
            $this->info("Deleting company: {$company->name} ({$company->slug})");
            
            // Delete related data
            DB::table('company_user')->where('company_id', $company->id)->delete();
            DB::table('invitations')->where('company_id', $company->id)->delete();
            DB::table('chatwoot_configs')->where('company_id', $company->id)->delete();
            DB::table('evolution_instances')->where('company_id', $company->id)->delete();
            DB::table('workflow_configs')->where('company_id', $company->id)->delete();
            DB::table('whatsapp_connections')->where('company_id', $company->id)->delete();
            DB::table('knowledge_documents')->where('company_id', $company->id)->delete();
            DB::table('contacts')->where('company_id', $company->id)->delete();
            DB::table('conversations')->where('company_id', $company->id)->delete();
            
            // Delete company
            $company->delete();
            
            $this->info("  ✓ Deleted");
        }
        
        // Delete users without companies (using subquery since relationship may not exist)
        $userIdsWithCompanies = DB::table('company_user')->pluck('user_id')->unique()->toArray();
        $usersWithoutCompanies = User::whereNotIn('id', $userIdsWithCompanies)->get();
        $this->info("Found {$usersWithoutCompanies->count()} users without companies");
        
        foreach ($usersWithoutCompanies as $user) {
            $this->info("Deleting user: {$user->email}");
            DB::table('sessions')->where('user_id', $user->id)->delete();
            $user->delete();
            $this->info("  ✓ Deleted");
        }
        
        $this->info("Cleanup completed!");
        
        // Show remaining data
        $this->info("\nRemaining companies: " . Company::count());
        $this->info("Remaining users: " . User::count());
        
        return 0;
    }
}
