<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Models\User;
use App\Models\KnowledgeDocument;
use App\Models\WhatsAppInstance;
use App\Models\CalendarIntegration;
use App\Models\Product;
use App\Models\ProductIntegration;
use App\Models\Sale;
use App\Models\Subscription;
use App\Models\TeamInvitation;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupTestData extends Command
{
    protected $signature = 'cleanup:test-data {--keep-slug=withmia-nbm6qp : Company slug to keep} {--force : Skip confirmation}';
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

        if (!$this->option('force') && !$this->confirm('Are you sure you want to delete these companies and their data?')) {
            $this->info('Aborted.');
            return 0;
        }
        
        foreach ($companiesToDelete as $company) {
            $this->info("Deleting company: {$company->name} ({$company->slug})");
            
            // Delete related data using actual tables/models
            KnowledgeDocument::where('company_id', $company->id)->delete();
            WhatsAppInstance::where('company_id', $company->id)->delete();
            CalendarIntegration::where('company_id', $company->id)->delete();
            ProductIntegration::where('company_id', $company->id)->delete();
            Product::where('company_id', $company->id)->delete();
            Sale::where('company_id', $company->id)->delete();
            Subscription::where('company_id', $company->id)->delete();
            TeamInvitation::where('company_slug', $company->slug)->delete();
            
            // Delete company
            $company->forceDelete();
            
            $this->info("  ✓ Deleted");
        }
        
        // Delete users that belong to deleted companies (NOT null company_slug — those could be superadmins)
        $validSlugs = Company::pluck('slug')->toArray();
        $usersToDelete = User::whereNotNull('company_slug')
            ->whereNotIn('company_slug', $validSlugs)
            ->get();

        $this->info("Found {$usersToDelete->count()} orphaned users to delete");
        
        foreach ($usersToDelete as $user) {
            $this->info("Deleting user: {$user->email}");
            DB::table('sessions')->where('user_id', $user->id)->delete();
            $user->forceDelete();
            $this->info("  ✓ Deleted");
        }
        
        $this->info("Cleanup completed!");
        
        // Show remaining data
        $this->info("\nRemaining companies: " . Company::count());
        $this->info("Remaining users: " . User::count());
        
        return 0;
    }
}
