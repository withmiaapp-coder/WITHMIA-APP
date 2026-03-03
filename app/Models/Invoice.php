<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    protected $fillable = [
        'company_id',
        'subscription_id',
        'invoice_number',
        'concept',
        'amount',
        'currency',
        'tax_amount',
        'net_amount',
        'status',
        'payment_method',
        'payment_reference',
        'billing_name',
        'billing_rut',
        'billing_email',
        'billing_address',
        'items',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'integer',
        'tax_amount' => 'integer',
        'net_amount' => 'integer',
        'items' => 'array',
        'paid_at' => 'datetime',
    ];

    /* ── Relationships ── */

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    /* ── Helpers ── */

    /**
     * Generate the next sequential invoice number for the year.
     */
    public static function nextNumber(): string
    {
        $year = now()->format('Y');
        $prefix = "WM-{$year}-";

        $lastInvoice = static::where('invoice_number', 'like', "{$prefix}%")
            ->orderByDesc('invoice_number')
            ->first();

        if ($lastInvoice) {
            $lastSeq = (int) str_replace($prefix, '', $lastInvoice->invoice_number);
            $nextSeq = $lastSeq + 1;
        } else {
            $nextSeq = 1;
        }

        return $prefix . str_pad($nextSeq, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Create an invoice from a payment event.
     */
    public static function createFromPayment(
        int $companyId,
        string $concept,
        int $amount,
        string $currency = 'CLP',
        string $paymentMethod = 'flow',
        string $paymentReference = '',
        ?int $subscriptionId = null,
        array $items = [],
    ): self {
        // Calculate IVA (19% included in amount for CLP)
        $taxRate = $currency === 'CLP' ? 0.19 : 0;
        $netAmount = $taxRate > 0 ? (int) round($amount / (1 + $taxRate)) : $amount;
        $taxAmount = $amount - $netAmount;

        $company = Company::find($companyId);

        return static::create([
            'company_id'        => $companyId,
            'subscription_id'   => $subscriptionId,
            'invoice_number'    => static::nextNumber(),
            'concept'           => $concept,
            'amount'            => $amount,
            'currency'          => $currency,
            'tax_amount'        => $taxAmount,
            'net_amount'        => $netAmount,
            'status'            => 'paid',
            'payment_method'    => $paymentMethod,
            'payment_reference' => $paymentReference,
            'billing_name'      => $company?->name ?? '',
            'billing_email'     => $company?->user?->email ?? '',
            'items'             => $items ?: [['description' => $concept, 'quantity' => 1, 'unit_price' => $amount, 'total' => $amount]],
            'paid_at'           => now(),
        ]);
    }
}
