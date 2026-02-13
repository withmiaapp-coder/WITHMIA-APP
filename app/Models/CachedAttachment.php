<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Caché persistente de attachments de Chatwoot.
 * Almacena binarios en PostgreSQL (BYTEA) para que sobrevivan
 * a redeploys en Railway (filesystem efímero).
 */
class CachedAttachment extends Model
{
    protected $fillable = [
        'attachment_id',
        'content_type',
        'file_name',
        'file_size',
        'binary_data',
        'original_url',
        'message_id',
    ];

    protected $casts = [
        'attachment_id' => 'integer',
        'file_size' => 'integer',
        'message_id' => 'integer',
    ];
}
