<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KnowledgeDocument extends Model
{
    protected $table = 'knowledge_documents';
    
    protected $fillable = [
        'company_id',
        'filename',
        'category',
        'file_path',
        'qdrant_collection',
        'chunks_created',
        'metadata'
    ];

    protected $casts = [
        'metadata' => 'array',
        'chunks_created' => 'integer'
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
