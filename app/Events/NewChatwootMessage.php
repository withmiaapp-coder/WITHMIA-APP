<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewChatwootMessage implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $conversation_id;
    public $contact_name;
    public $message_content;
    public $unread_count;
    public $timestamp;

    /**
     * Create a new event instance.
     */
    public function __construct($conversation_id, $contact_name, $message_content, $unread_count = 0)
    {
        $this->conversation_id = $conversation_id;
        $this->contact_name = $contact_name;
        $this->message_content = $message_content;
        $this->unread_count = $unread_count;
        $this->timestamp = now();
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('chatwoot-messages'),
        ];
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'conversation_id' => $this->conversation_id,
            'contact_name' => $this->contact_name,
            'message_content' => $this->message_content,
            'unread_count' => $this->unread_count,
            'timestamp' => $this->timestamp,
        ];
    }
}
