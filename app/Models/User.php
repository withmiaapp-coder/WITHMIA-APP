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
            // Vistas del sidebar
            'sidebar.dashboard' => true,
            'sidebar.chats' => true,
            'sidebar.teams' => true,
            'sidebar.integrations' => true,
            'sidebar.knowledge' => true,
            'sidebar.training' => true,
            'sidebar.calendar' => true,
            'sidebar.products' => true,
            // Acciones en chats
            'chats.view_all' => true,
            'chats.view_assigned' => true,
            'chats.respond' => true,
            'chats.assign' => true,
            'chats.transfer' => true,
            // Equipos
            'teams.manage' => true,
            'teams.view' => true,
            'teams.create' => true,
            'teams.delete' => true,
            // Configuración
            'settings.view' => true,
            'settings.edit' => true,
            // Otras funciones
            'training.manage' => true,
            'integrations.manage' => true,
            'reports.view' => true,
            'members.invite' => true,
            'members.manage' => true,
            'members.delete' => true,
        ],
        'agent' => [
            // Vistas del sidebar - Solo Inicio, Conversaciones y Equipos
            'sidebar.dashboard' => true,
            'sidebar.chats' => true,
            'sidebar.teams' => true,
            'sidebar.integrations' => false,
            'sidebar.knowledge' => false,
            'sidebar.training' => false,
            'sidebar.calendar' => false,
            'sidebar.products' => false,
            // Acciones en chats
            'chats.view_all' => false,
            'chats.view_assigned' => true,
            'chats.respond' => true,
            'chats.assign' => false,
            'chats.transfer' => false,
            // Equipos - solo visualizar
            'teams.manage' => false,
            'teams.view' => true,
            'teams.create' => false,
            'teams.delete' => false,
            // Configuración
            'settings.view' => false,
            'settings.edit' => false,
            // Otras funciones
            'training.manage' => false,
            'integrations.manage' => false,
            'reports.view' => false,
            'members.invite' => false,
            'members.manage' => false,
            'members.delete' => false,
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
     * 🚀 OPTIMIZACIÓN: Cache de 5 minutos por usuario para evitar recálculos
     */
    public function getPermissions(): array
    {
        $cacheKey = "user_permissions_{$this->id}_{$this->role}";
        
        return cache()->remember($cacheKey, 300, function () {
            $defaults = self::DEFAULT_PERMISSIONS[$this->role] ?? self::DEFAULT_PERMISSIONS['agent'];
            $custom = $this->permissions ?? [];
            
            return array_merge($defaults, $custom);
        });
    }

    /**
     * Invalidar cache de permisos (llamar al actualizar permisos)
     */
    public function clearPermissionsCache(): void
    {
        cache()->forget("user_permissions_{$this->id}_{$this->role}");
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
        $this->clearPermissionsCache(); // 🚀 Invalidar cache
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
