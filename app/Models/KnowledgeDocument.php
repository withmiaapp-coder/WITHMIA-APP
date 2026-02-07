<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class KnowledgeDocument extends Model
{
    use SoftDeletes;

    protected $table = 'knowledge_documents';
    
    protected $fillable = [
        'company_id',
        'title',
        'filename',
        'category',
        'file_path',
        'qdrant_collection',
        'qdrant_vector_ids',
        'chunks_created',
        'metadata'
    ];

    protected $casts = [
        'metadata' => 'array',
        'chunks_created' => 'integer',
        'qdrant_vector_ids' => 'array',
        'uploaded_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
