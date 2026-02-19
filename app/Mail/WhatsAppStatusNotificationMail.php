<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Email de notificación cuando una instancia de WhatsApp cambia de estado
 * (conectada/desconectada) en la integración.
 * 
 * Se envía a los administradores de la empresa.
 */
class WhatsAppStatusNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $instanceName,
        public string $companyName,
        public string $state,
        public ?string $previousState,
        public ?string $profileName = null,
        public ?string $phoneNumber = null,
    ) {}

    public function envelope(): Envelope
    {
        $emoji = $this->isConnected() ? '✅' : '🔴';
        $action = $this->isConnected() ? 'Conectado' : 'Desconectado';
        
        return new Envelope(
            subject: "{$emoji} WhatsApp {$action} — {$this->companyName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.whatsapp-status',
            with: [
                'instanceName' => $this->instanceName,
                'companyName' => $this->companyName,
                'state' => $this->state,
                'previousState' => $this->previousState,
                'isConnected' => $this->isConnected(),
                'profileName' => $this->profileName,
                'phoneNumber' => $this->phoneNumber,
                'timestamp' => now()->setTimezone('America/Santiago')->format('d/m/Y H:i:s'),
                'dashboardUrl' => config('app.url') . '/dashboard/' . $this->instanceName,
            ],
        );
    }

    private function isConnected(): bool
    {
        return in_array($this->state, ['open', 'connected']);
    }
}
