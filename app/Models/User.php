<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'full_name',
        'phone',
        'onboarding_step',
        'onboarding_completed',
        'company_slug',
        'email_verified_at',
        'login_ip',
        'last_login_at',
        'whatsapp_instance_id',
        'whatsapp_instance_data',
        'role',
        'phone_country',
        'chatwoot_agent_id',
        'chatwoot_inbox_id',
        'chatwoot_agent_token'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'last_login_at' => 'datetime',
        ];
    }

    public function company()
    {
        // FIX: Usar company_slug en lugar de company_id
        return $this->belongsTo(Company::class, 'company_slug', 'slug');
    }

    /**
     * Alias para compatibilidad con código que usa companies()
     */
    public function companies()
    {
        // Retorna una colección con la empresa del usuario (si tiene)
        return $this->company() ? collect([$this->company]) : collect([]);
    }
}
