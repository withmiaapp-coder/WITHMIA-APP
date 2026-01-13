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
    public $inbox_id;

    /**
     * Create a new event instance.
     */
    public function __construct($conversation_id, $contact_name, $message_content, $unread_count = 0, $inbox_id = 1)
    {
        $this->conversation_id = $conversation_id;
        $this->contact_name = $contact_name;
        $this->message_content = $message_content;
        $this->unread_count = $unread_count;
        $this->inbox_id = $inbox_id;
        $this->timestamp = now();
    }

    /**
     * Get the channels the event should broadcast on.
     * Enviar al canal privado inbox.{id} que el frontend escucha
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('inbox.' . $this->inbox_id),
        ];
    }

    /**
     * Nombre del evento que el frontend escucha
     */
    public function broadcastAs(): string
    {
        return 'message.received';
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
            'inbox_id' => $this->inbox_id,
            'timestamp' => $this->timestamp,
        ];
    }
}
