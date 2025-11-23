<?php

namespace App\Helpers;

use App\Models\User;
use Illuminate\Support\Facades\Auth;

class RoleHelper
{
    /**
     * Verificar si el usuario actual tiene un rol específico
     */
    public static function hasRole(string $role): bool
    {
        if (!Auth::check()) {
            return false;
        }
        
        return Auth::user()->role === $role;
    }

    /**
     * Verificar si el usuario actual tiene alguno de los roles especificados
     */
    public static function hasAnyRole(array $roles): bool
    {
        if (!Auth::check()) {
            return false;
        }
        
        return in_array(Auth::user()->role, $roles);
    }

    /**
     * Obtener el rol principal del usuario actual
     */
    public static function getCurrentUserRole(): ?string
    {
        if (!Auth::check()) {
            return null;
        }
        
        return Auth::user()->role;
    }

    /**
     * Verificar si el usuario actual es admin
     */
    public static function isAdmin(): bool
    {
        return self::hasRole('admin');
    }

    /**
     * Verificar si el usuario actual es agent
     */
    public static function isAgent(): bool
    {
        return self::hasRole('agent');
    }

    /**
     * Verificar si el usuario actual es seller
     */
    public static function isSeller(): bool
    {
        return self::hasRole('seller');
    }

    /**
     * Verificar si el usuario actual es assistant
     */
    public static function isAssistant(): bool
    {
        return self::hasRole('assistant');
    }

    /**
     * Verificar si el usuario puede gestionar equipos (admin o agent)
     */
    public static function canManageTeam(): bool
    {
        return self::hasAnyRole(['admin', 'agent']);
    }

    /**
     * Verificar si el usuario puede invitar sellers
     * En sistema simple: solo admin y agent
     */
    public static function canInviteSellers(): bool
    {
        return self::hasAnyRole(['admin', 'agent']);
    }

    /**
     * Verificar si el usuario puede invitar assistants
     * En sistema simple: solo admin y agent
     */
    public static function canInviteAssistants(): bool
    {
        return self::hasAnyRole(['admin', 'agent']);
    }

    /**
     * Verificar si el usuario puede gestionar ventas
     */
    public static function canManageSales(): bool
    {
        return self::hasAnyRole(['admin', 'agent', 'seller']);
    }

    /**
     * Verificar si el usuario puede editar el cerebro/contenido interno
     * En sistema simple: solo admin
     */
    public static function canEditBrainContent(): bool
    {
        return self::isAdmin();
    }

    /**
     * Verificar si el usuario puede gestionar workflows
     * En sistema simple: admin y agent
     */
    public static function canManageWorkflows(): bool
    {
        return self::hasAnyRole(['admin', 'agent']);
    }

    /**
     * Obtener nombre de visualización del rol
     */
    public static function getRoleDisplayName(?string $role = null): string
    {
        if (!$role) {
            $role = self::getCurrentUserRole();
        }

        $displayNames = [
            'admin' => 'Administrador',
            'agent' => 'Agente (Jefe de Equipo)',
            'seller' => 'Vendedor',
            'assistant' => 'Asistente'
        ];

        return $displayNames[$role] ?? ucfirst($role ?? 'Sin rol');
    }

    /**
     * Verificar jerarquía de roles - si un usuario puede gestionar a otro
     */
    public static function canManageUser(User $targetUser): bool
    {
        if (!Auth::check()) {
            return false;
        }

        $currentRole = self::getCurrentUserRole();
        $targetRole = $targetUser->role;

        // Admin puede gestionar a todos
        if ($currentRole === 'admin') {
            return true;
        }

        // Agent puede gestionar a sellers y assistants
        if ($currentRole === 'agent') {
            return in_array($targetRole, ['seller', 'assistant']);
        }

        // Sellers y assistants no pueden gestionar a nadie
        return false;
    }

    /**
     * Obtener todos los roles disponibles
     */
    public static function getAllRoles(): array
    {
        return ['admin', 'agent', 'seller', 'assistant'];
    }

    /**
     * Verificar si un rol es válido
     */
    public static function isValidRole(string $role): bool
    {
        return in_array($role, self::getAllRoles());
    }
}
