<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\User;

class OnboardingCompletedNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $userIP;

    public $company;
    public function __construct(User $user, $userIP = null, $company = null)
    {
        $this->user = $user;
        $this->userIP = $userIP;
        $this->company = $company;
        $this->company = $company;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '🎉 Nuevo usuario completó onboarding en WITHMIA - ' . $this->user->full_name,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.onboarding-completed-notification',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
