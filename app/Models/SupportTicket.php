<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class SupportTicket extends Model
{
    use HasUuids;

    protected $fillable = [
        'email',
        'name',
        'subject',
        'description',
        'category',
        'status',
        'closed_at',
        'assigned_to',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'closed_at'  => 'datetime',
    ];

    /* ── Relations ── */

    public function replies()
    {
        return $this->hasMany(TicketReply::class, 'ticket_id')->orderBy('created_at');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /* ── Helpers ── */

    public function isOpen(): bool
    {
        return $this->status === 'abierto';
    }

    public function isClosed(): bool
    {
        return $this->status === 'cerrado';
    }

    public function close(): void
    {
        $this->update([
            'status'    => 'cerrado',
            'closed_at' => now(),
        ]);
    }
}
