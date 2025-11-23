<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KnowledgeDocument extends Model
{
    protected \ = 'knowledge_documents';
    
    protected \ = [
        'company_id',
        'filename',
        'category',
        'file_path',
        'qdrant_collection',
        'chunks_created',
        'metadata'
    ];

    protected \ = [
        'metadata' => 'array',
        'chunks_created' => 'integer'
    ];

    public function company()
    {
        return \->belongsTo(Company::class);
    }
}
