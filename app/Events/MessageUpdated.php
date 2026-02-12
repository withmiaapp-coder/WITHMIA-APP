<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;
    public $conversationId;
    public $inboxId;
    public $accountId;

    /**
     * Create a new event instance.
     */
    public function __construct($message, $conversationId, $inboxId, $accountId)
    {
        $this->message = $message;
        $this->conversationId = $conversationId;
        $this->inboxId = $inboxId;
        $this->accountId = $accountId;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('inbox.' . $this->inboxId),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'message.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'message' => $this->message,
            'conversation_id' => $this->conversationId,
            'inbox_id' => $this->inboxId,
            'account_id' => $this->accountId,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
