<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WhatsAppMessageReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $company_slug;
    public int $conversation_id;
    public string $message;
    public string $phone;
    public string $direction; // 'incoming' or 'outgoing'
    public string $timestamp;

    /**
     * Create a new event instance.
     */
    public function __construct(
        string $company_slug,
        int $conversation_id,
        string $message,
        string $phone,
        string $direction = 'incoming'
    ) {
        $this->company_slug = $company_slug;
        $this->conversation_id = $conversation_id;
        $this->message = $message;
        $this->phone = $phone;
        $this->direction = $direction;
        $this->timestamp = now()->toIso8601String();
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('company.' . $this->company_slug . '.whatsapp'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'whatsapp.message';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'company_slug' => $this->company_slug,
            'conversation_id' => $this->conversation_id,
            'message' => $this->message,
            'phone' => $this->phone,
            'direction' => $this->direction,
            'timestamp' => $this->timestamp,
        ];
    }
}
