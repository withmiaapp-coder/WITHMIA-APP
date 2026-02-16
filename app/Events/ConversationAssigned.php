<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConversationAssigned implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $conversationId;
    public $inboxId;
    public $accountId;
    public $assignee;
    public $assignedBy;
    public $contactName;

    /**
     * Create a new event instance.
     */
    public function __construct(
        $conversationId,
        $inboxId,
        $accountId,
        $assignee,
        $assignedBy = null,
        $contactName = null
    ) {
        $this->conversationId = $conversationId;
        $this->inboxId = $inboxId;
        $this->accountId = $accountId;
        $this->assignee = $assignee;
        $this->assignedBy = $assignedBy;
        $this->contactName = $contactName;
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
        return 'conversation.assigned';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'conversation_id' => $this->conversationId,
            'inbox_id' => $this->inboxId,
            'account_id' => $this->accountId,
            'assignee' => $this->assignee,
            'assigned_by' => $this->assignedBy,
            'contact_name' => $this->contactName,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
