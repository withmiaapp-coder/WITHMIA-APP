<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WhatsAppStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $companySlug;
    public string $instanceName;
    public string $state;
    public ?string $qrCode;
    public ?array $profileInfo;

    /**
     * Create a new event instance.
     */
    public function __construct(
        string $companySlug,
        string $instanceName,
        string $state,
        ?string $qrCode = null,
        ?array $profileInfo = null
    ) {
        $this->companySlug = $companySlug;
        $this->instanceName = $instanceName;
        $this->state = $state;
        $this->qrCode = $qrCode;
        $this->profileInfo = $profileInfo;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel("company.{$this->companySlug}.whatsapp"),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'instanceName' => $this->instanceName,
            'state' => $this->state,
            'qrCode' => $this->qrCode,
            'profileInfo' => $this->profileInfo,
        ];
    }
}
