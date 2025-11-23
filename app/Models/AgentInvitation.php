<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class AgentInvitation extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'invited_by_user_id',
        'email',
        'name',
        'role',
        'chatwoot_user_id',
        'invitation_token',
        'status',
        'expires_at',
        'accepted_at'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime'
    ];

    /**
     * Relationships
     */
    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function invitedBy()
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    /**
     * Scopes
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending')->where('expires_at', '>', Carbon::now());
    }

    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<=', Carbon::now());
    }

    /**
     * Accessors & Mutators
     */
    public function getIsExpiredAttribute()
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function getCanBeCancelledAttribute()
    {
        return $this->status === 'pending' && !$this->is_expired;
    }

    /**
     * Auto-expire invitations
     */
    public static function expireOldInvitations()
    {
        static::where('status', 'pending')
            ->where('expires_at', '<=', Carbon::now())
            ->update(['status' => 'expired']);
    }
}