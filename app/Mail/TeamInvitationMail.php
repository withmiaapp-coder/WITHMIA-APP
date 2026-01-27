<?php

namespace App\Mail;

use App\Models\TeamInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TeamInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public TeamInvitation $invitation;

    public function __construct(TeamInvitation $invitation)
    {
        $this->invitation = $invitation;
    }

    public function envelope(): Envelope
    {
        $companyName = $this->invitation->company->name ?? 'WITHMIA';
        
        return new Envelope(
            subject: "Has sido invitado a unirte a {$companyName} en WITHMIA",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.team-invitation',
            with: [
                'invitation' => $this->invitation,
                'acceptUrl' => $this->invitation->getAcceptUrl(),
                'companyName' => $this->invitation->company->name ?? 'la empresa',
                'inviterName' => $this->invitation->invitedBy->name ?? 'Un administrador',
                'roleName' => $this->invitation->role === 'administrator' ? 'Administrador' : 'Agente',
            ],
        );
    }
}
