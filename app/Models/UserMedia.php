<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserMedia extends Model
{
    protected $table = 'user_media';

    protected $fillable = [
        'user_id',
        'type',
        'filename',
        'mime_type',
        'size',
        'data',
    ];

    protected $hidden = ['data']; // Never include binary data in JSON serialization

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
