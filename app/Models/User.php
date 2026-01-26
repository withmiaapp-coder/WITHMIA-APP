<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    // Permisos por defecto según rol
    const DEFAULT_PERMISSIONS = [
        'admin' => [
            'dashboard.view' => true,
            'chats.view_all' => true,
            'chats.view_assigned' => true,
            'chats.respond' => true,
            'chats.assign' => true,
            'chats.transfer' => true,
            'teams.manage' => true,
            'teams.view' => true,
            'settings.view' => true,
            'settings.edit' => true,
            'training.manage' => true,
            'integrations.manage' => true,
            'reports.view' => true,
            'members.invite' => true,
            'members.manage' => true,
        ],
        'agent' => [
            'dashboard.view' => false,
            'chats.view_all' => false,
            'chats.view_assigned' => true,
            'chats.respond' => true,
            'chats.assign' => false,
            'chats.transfer' => false,
            'teams.manage' => false,
            'teams.view' => true,
            'settings.view' => false,
            'settings.edit' => false,
            'training.manage' => false,
            'integrations.manage' => false,
            'reports.view' => false,
            'members.invite' => false,
            'members.manage' => false,
        ],
    ];

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
        'permissions',
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
            'permissions' => 'array',
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

    /**
     * Verificar si el usuario es admin
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Verificar si el usuario es agente
     */
    public function isAgent(): bool
    {
        return $this->role === 'agent';
    }

    /**
     * Obtener todos los permisos del usuario (merge de defaults + custom)
     */
    public function getPermissions(): array
    {
        $defaults = self::DEFAULT_PERMISSIONS[$this->role] ?? self::DEFAULT_PERMISSIONS['agent'];
        $custom = $this->permissions ?? [];
        
        return array_merge($defaults, $custom);
    }

    /**
     * Verificar si tiene un permiso específico
     */
    public function hasPermission(string $permission): bool
    {
        $permissions = $this->getPermissions();
        return $permissions[$permission] ?? false;
    }

    /**
     * Verificar múltiples permisos (debe tener todos)
     */
    public function hasPermissions(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (!$this->hasPermission($permission)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Verificar si tiene al menos uno de los permisos
     */
    public function hasAnyPermission(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($permission)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Actualizar permisos custom
     */
    public function updatePermissions(array $permissions): void
    {
        $this->permissions = $permissions;
        $this->save();
    }

    /**
     * Resetear permisos a defaults del rol
     */
    public function resetPermissions(): void
    {
        $this->permissions = null;
        $this->save();
    }
}
