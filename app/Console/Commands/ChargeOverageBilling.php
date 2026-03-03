<?php

namespace App\Console\Commands;

use App\Models\AiUsage;
use App\Models\Company;
use App\Services\OverageService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Charge companies for overage AI message usage.
 *
 * Runs monthly on the 1st at midnight (billing previous month's overage).
 * Finds companies that exceeded their plan's AI message limit and
 * generates overage charges via Flow.cl or dLocal.
 *
 * Pricing: $5.990 CLP per 1.000 extra messages (IVA incluido).
 * Maximum: 5.000 extra messages ($29.950 CLP) per billing cycle.
 *
 * Flow:
 * 1. Query all ai_usages from the PREVIOUS month where messages_used > messages_limit
 * 2. For each, generate an overage invoice via OverageService
 * 3. Bill via the company's preferred gateway (dLocal or Flow.cl)
 * 4. Log results for audit trail
 *
 * @see config('billing.overage')
 */
class ChargeOverageBilling extends Command
{
    protected $signature = 'billing:charge-overage
                            {--dry-run : Preview overage charges without actually billing}
                            {--month= : Specific month to bill (YYYY-MM format, default: previous month)}
                            {--company= : Bill a specific company ID only}';

    protected $description = 'Charge companies for overage AI message usage ($5.990 CLP / 1.000 msgs)';

    public function handle(OverageService $overage): int
    {
        if (!$overage->isEnabled()) {
            $this->info('Overage billing is disabled.');
            return self::SUCCESS;
        }

        $isDryRun = $this->option('dry-run');
        $specificCompany = $this->option('company');

        // Determine which month to bill
        $monthOption = $this->option('month');
        if ($monthOption) {
            try {
                $billingDate = \Carbon\Carbon::createFromFormat('Y-m', $monthOption)->startOfMonth();
            } catch (\Exception $e) {
                $this->error("Invalid month format. Use YYYY-MM (e.g., 2025-01)");
                return self::FAILURE;
            }
        } else {
            // Default: previous month
            $billingDate = now()->subMonth()->startOfMonth();
        }

        $year = $billingDate->year;
        $month = $billingDate->month;
        $periodLabel = $billingDate->format('Y-m');

        $this->info("╔══════════════════════════════════════════════╗");
        $this->info("║  WITHMIA — Overage Billing: {$periodLabel}        ║");
        $this->info("╚══════════════════════════════════════════════╝");

        if ($isDryRun) {
            $this->warn('🔍 DRY RUN — no charges will be made.');
        }

        // Query ai_usages where messages_used > messages_limit
        $query = AiUsage::where('year', $year)
            ->where('month', $month)
            ->whereColumn('messages_used', '>', 'messages_limit');

        if ($specificCompany) {
            $query->where('company_id', (int) $specificCompany);
        }

        $overageUsages = $query->get();

        if ($overageUsages->isEmpty()) {
            $this->info("No overage usage found for {$periodLabel}.");
            return self::SUCCESS;
        }

        $this->info("Found {$overageUsages->count()} company(ies) with overage usage.");
        $this->newLine();

        $totalCharged = 0;
        $totalFailed = 0;
        $totalSkipped = 0;
        $totalAmount = 0;

        foreach ($overageUsages as $usage) {
            $company = Company::find($usage->company_id);
            $companyName = $company?->name ?? "ID:{$usage->company_id}";
            $overageMessages = $usage->messages_used - $usage->messages_limit;
            $overagePacks = (int) ceil($overageMessages / 1000);
            $overageCost = $overage->calculateOverageCost($overageMessages);

            $this->info("─── {$companyName} ───");
            $this->line("  Plan limit:      {$usage->messages_limit}");
            $this->line("  Total used:      {$usage->messages_used}");
            $this->line("  Overage msgs:    {$overageMessages}");
            $this->line("  Overage packs:   {$overagePacks}");
            $this->line("  Amount:          \${$this->formatCLP($overageCost)} CLP");

            if ($isDryRun) {
                $this->comment("  → DRY RUN: Would charge \${$this->formatCLP($overageCost)} CLP");
                $totalAmount += $overageCost;
                continue;
            }

            // Check if company has an active subscription
            $subscription = $company?->activeSubscription;
            if (!$subscription) {
                $this->warn("  → SKIPPED: No active subscription");
                $totalSkipped++;
                continue;
            }

            // Don't bill free-tier companies
            if ($subscription->plan === 'free' || !$subscription->plan) {
                $this->warn("  → SKIPPED: Free tier (no overage billing)");
                $totalSkipped++;
                continue;
            }

            try {
                $result = $overage->billOverage($usage->company_id);

                if ($result) {
                    $gateway = $result['gateway'] ?? 'unknown';
                    $this->info("  → ✅ Charged via {$gateway}: \${$this->formatCLP($overageCost)} CLP");

                    Log::info('Overage billing charged', [
                        'company_id'       => $usage->company_id,
                        'company_name'     => $companyName,
                        'period'           => $periodLabel,
                        'overage_messages' => $overageMessages,
                        'overage_packs'    => $overagePacks,
                        'amount_clp'       => $overageCost,
                        'gateway'          => $gateway,
                        'order_id'         => $result['order_id'] ?? null,
                    ]);

                    $totalCharged++;
                    $totalAmount += $overageCost;
                } else {
                    $this->error("  → ❌ Failed: No payment result");
                    $totalFailed++;
                }
            } catch (\Exception $e) {
                $this->error("  → ❌ Error: {$e->getMessage()}");
                Log::error('Overage billing error', [
                    'company_id' => $usage->company_id,
                    'error'      => $e->getMessage(),
                ]);
                $totalFailed++;
            }

            $this->newLine();
        }

        // Summary
        $this->newLine();
        $this->info("═══════════════════════════════════════════════");
        $this->info("  Summary for {$periodLabel}:");
        $this->info("  Charged:  {$totalCharged}");
        if ($totalFailed > 0) $this->error("  Failed:   {$totalFailed}");
        if ($totalSkipped > 0) $this->warn("  Skipped:  {$totalSkipped}");
        $this->info("  Total:    \${$this->formatCLP($totalAmount)} CLP");
        $this->info("═══════════════════════════════════════════════");

        Log::info('Overage billing cycle complete', [
            'period'      => $periodLabel,
            'charged'     => $totalCharged,
            'failed'      => $totalFailed,
            'skipped'     => $totalSkipped,
            'total_clp'   => $totalAmount,
            'dry_run'     => $isDryRun,
        ]);

        return $totalFailed > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * Format CLP amount with dot separator.
     */
    private function formatCLP(int $amount): string
    {
        return number_format($amount, 0, ',', '.');
    }
}
