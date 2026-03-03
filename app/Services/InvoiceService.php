<?php

namespace App\Services;

use App\Models\Invoice;

class InvoiceService
{
    /**
     * Generate a PDF for the given invoice using pure HTML-to-PDF (no external library needed).
     * Uses the built-in Chrome/Puppeteer approach or falls back to HTML rendering.
     *
     * For production, this returns a clean HTML document that can be printed to PDF
     * from the browser, or rendered by a PDF library if installed (dompdf, wkhtmltopdf).
     */
    public function generatePdf(Invoice $invoice): string
    {
        $html = $this->renderHtml($invoice);

        // Try dompdf if available (composer require barryvdh/laravel-dompdf)
        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
            $pdf->setPaper('letter', 'portrait');
            return $pdf->output();
        }

        // Fallback: return HTML with print-friendly CSS
        // The frontend can use window.print() or the browser's "Save as PDF"
        return $html;
    }

    /**
     * Render invoice as clean HTML suitable for PDF conversion.
     */
    public function renderHtml(Invoice $invoice): string
    {
        $company = $invoice->company;
        $items   = $invoice->items ?? [];

        $formattedAmount = $this->formatCurrency($invoice->amount, $invoice->currency);
        $formattedNet    = $this->formatCurrency($invoice->net_amount, $invoice->currency);
        $formattedTax    = $this->formatCurrency($invoice->tax_amount, $invoice->currency);

        $itemsHtml = '';
        foreach ($items as $item) {
            $desc     = htmlspecialchars($item['description'] ?? '');
            $qty      = $item['quantity'] ?? 1;
            $unitP    = $this->formatCurrency($item['unit_price'] ?? 0, $invoice->currency);
            $totalP   = $this->formatCurrency($item['total'] ?? 0, $invoice->currency);
            $itemsHtml .= "<tr><td>{$desc}</td><td style='text-align:center'>{$qty}</td><td style='text-align:right'>{$unitP}</td><td style='text-align:right'>{$totalP}</td></tr>";
        }

        $paidDate  = $invoice->paid_at?->format('d/m/Y') ?? '-';
        $issueDate = $invoice->created_at->format('d/m/Y');

        return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Comprobante {$invoice->invoice_number}</title>
<style>
    @page { margin: 2cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #FFD700; padding-bottom: 20px; }
    .logo { font-size: 28px; font-weight: 800; color: #1a1a1a; letter-spacing: -0.5px; }
    .logo span { color: #FFD700; }
    .invoice-label { text-align: right; }
    .invoice-label h2 { font-size: 22px; color: #333; margin-bottom: 4px; }
    .invoice-label .number { font-size: 16px; color: #666; }
    .info-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info-box { width: 48%; }
    .info-box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
    .info-box p { margin-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    thead { background: #f8f8f8; }
    th { text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 2px solid #e0e0e0; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; }
    .totals { width: 280px; margin-left: auto; }
    .totals tr td { border: none; padding: 6px 12px; }
    .totals .label { text-align: right; color: #666; }
    .totals .value { text-align: right; font-weight: 600; }
    .totals .total-row td { border-top: 2px solid #1a1a1a; font-size: 16px; font-weight: 700; padding-top: 10px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 11px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .badge-paid { background: #e6f9ed; color: #1a8a4a; }
    .badge-refunded { background: #fef3e6; color: #c67a1a; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="header">
    <div>
        <div class="logo">WITH<span>MIA</span></div>
        <p style="color:#666; font-size:12px; margin-top:4px">Plataforma de Atención al Cliente con IA</p>
        <p style="color:#999; font-size:11px">Santiago, Chile</p>
    </div>
    <div class="invoice-label">
        <h2>Comprobante de Pago</h2>
        <div class="number">N° {$invoice->invoice_number}</div>
        <div style="margin-top:8px">
            <span class="badge badge-{$invoice->status}">{$invoice->status}</span>
        </div>
    </div>
</div>

<div class="info-grid">
    <div class="info-box">
        <h3>Facturado a</h3>
        <p><strong>{$invoice->billing_name}</strong></p>
        <p>{$invoice->billing_email}</p>
        {$this->renderIf($invoice->billing_rut, "<p>RUT: {$invoice->billing_rut}</p>")}
        {$this->renderIf($invoice->billing_address, "<p>{$invoice->billing_address}</p>")}
    </div>
    <div class="info-box" style="text-align:right">
        <h3>Detalles</h3>
        <p><strong>Fecha emisión:</strong> {$issueDate}</p>
        <p><strong>Fecha pago:</strong> {$paidDate}</p>
        <p><strong>Método:</strong> {$this->paymentMethodLabel($invoice->payment_method)}</p>
        {$this->renderIf($invoice->payment_reference, "<p><strong>Ref:</strong> {$invoice->payment_reference}</p>")}
    </div>
</div>

<table>
    <thead>
        <tr>
            <th>Descripción</th>
            <th style="text-align:center">Cant.</th>
            <th style="text-align:right">Precio Unit.</th>
            <th style="text-align:right">Total</th>
        </tr>
    </thead>
    <tbody>
        {$itemsHtml}
    </tbody>
</table>

<table class="totals">
    <tr><td class="label">Neto:</td><td class="value">{$formattedNet}</td></tr>
    <tr><td class="label">IVA (19%):</td><td class="value">{$formattedTax}</td></tr>
    <tr class="total-row"><td class="label">Total:</td><td class="value">{$formattedAmount}</td></tr>
</table>

<div class="footer">
    <p>Este documento es un comprobante de pago electrónico emitido por WITHMIA.</p>
    <p>Para consultas de facturación: soporte@withmia.com | withmia.com</p>
</div>

</body>
</html>
HTML;
    }

    /**
     * Format a currency amount with locale-appropriate separators.
     */
    private function formatCurrency(int $amount, string $currency): string
    {
        $zeroDecimalCurrencies = ['CLP', 'PYG', 'COP'];

        if (in_array($currency, $zeroDecimalCurrencies)) {
            return '$' . number_format($amount, 0, ',', '.');
        }

        return '$' . number_format($amount / 100, 2, ',', '.');
    }

    private function paymentMethodLabel(string $method): string
    {
        return match ($method) {
            'flow'   => 'Flow.cl',
            'dlocal' => 'dLocal',
            'manual' => 'Manual',
            default  => ucfirst($method),
        };
    }

    private function renderIf(?string $value, string $html): string
    {
        return $value ? $html : '';
    }
}
