<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pipeline extends Model
{
    protected $fillable = [
        'company_id',
        'name',
        'slug',
        'description',
        'type',
        'visible_to_roles',
        'settings',
        'order',
        'is_active'
    ];

    protected $casts = [
        'visible_to_roles' => 'array',
        'settings' => 'array',
        'is_active' => 'boolean',
        'order' => 'integer'
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function items()
    {
        return $this->hasMany(PipelineItem::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForCompany($query, $companyId)
    {
        return $query->where('company_id', $companyId);
    }
}
