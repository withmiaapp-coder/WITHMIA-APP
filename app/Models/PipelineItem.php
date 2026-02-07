<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PipelineItem extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'pipeline_id',
        'company_id',
        'assigned_to',
        'created_by',
        'title',
        'description',
        'status',
        'priority',
        'contact_name',
        'contact_email',
        'contact_phone',
        'contact_company',
        'value',
        'due_date',
        'custom_fields',
        'tags',
        'order',
        'completed_at'
    ];

    protected $casts = [
        'custom_fields' => 'array',
        'tags' => 'array',
        'value' => 'decimal:2',
        'due_date' => 'date',
        'completed_at' => 'datetime',
        'order' => 'integer'
    ];

    public function pipeline()
    {
        return $this->belongsTo(Pipeline::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function assignedTo()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeForPipeline($query, $pipelineId)
    {
        return $query->where('pipeline_id', $pipelineId);
    }

    public function scopePending($query)
    {
        return $query->whereNull('completed_at');
    }

    public function scopeCompleted($query)
    {
        return $query->whereNotNull('completed_at');
    }
}
