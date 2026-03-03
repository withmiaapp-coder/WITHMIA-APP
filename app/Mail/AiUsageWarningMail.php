<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Email notification sent when a company approaches or exceeds
 * their AI message limit. Sent at 90% and 100% thresholds.
 */
class AiUsageWarningMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $companyName,
        public int $messagesUsed,
        public int $messagesLimit,
        public int $percentage,
        public bool $overageEnabled,
        public int $overageMessages,
        public int $overageCostClp,
        public string $subscriptionUrl,
    ) {}

    public function envelope(): Envelope
    {
        $emoji = $this->percentage >= 100 ? '🚫' : '⚠️';
        $status = $this->percentage >= 100 ? 'Límite alcanzado' : "Uso al {$this->percentage}%";

        return new Envelope(
            subject: "{$emoji} {$status} — Mensajes IA — {$this->companyName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.ai-usage-warning',
        );
    }
}
