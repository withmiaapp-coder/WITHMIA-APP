import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface UserPermissions {
  role: 'admin' | 'agent';
  is_admin: boolean;
  is_agent: boolean;
  permissions: Record<string, boolean>;
}

// Permisos default mientras carga - RESTRICTIVOS para evitar flash de contenido admin
const DEFAULT_PERMISSIONS: UserPermissions = {
  role: 'agent',
  is_admin: false,
  is_agent: true,
  permissions: {
    'dashboard.view': true,
    'chats.view_all': false,
    'chats.view_assigned': true,
    'chats.respond': true,
    'chats.assign': false,
    'chats.transfer': false,
    'teams.manage': false,
    'teams.view': true,
    'settings.view': false,
    'settings.edit': false,
    'training.manage': false,
    'integrations.manage': false,
    'reports.view': false,
    'members.invite': false,
    'members.manage': false,
    'sidebar.dashboard': true,
    'sidebar.chats': true,
    'sidebar.teams': true,
    'sidebar.integrations': false,
    'sidebar.knowledge': false,
    'sidebar.training': false,
    'sidebar.calendar': false,
    'sidebar.products': false,
  }
};

// Cache global para evitar múltiples requests
let permissionsCache: UserPermissions | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function usePermissions() {
  const [permissions, setPermissions] = useState<UserPermissions>(permissionsCache || DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(!permissionsCache);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async (force: boolean = false) => {
    // Usar cache si es válido y no se fuerza refresh
    if (!force && permissionsCache && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      setPermissions(permissionsCache);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get('/api/user/permissions');
      
      if (response.data.success) {
        const perms: UserPermissions = {
          role: response.data.role || 'admin',
          is_admin: response.data.is_admin ?? true,
          is_agent: response.data.is_agent ?? false,
          permissions: response.data.permissions || DEFAULT_PERMISSIONS.permissions,
        };
        
        // Actualizar cache
        permissionsCache = perms;
        cacheTimestamp = Date.now();
        
        setPermissions(perms);
        setError(null);
      } else {
        // Si no hay success, usar defaults
        setPermissions(DEFAULT_PERMISSIONS);
      }
    } catch (err: any) {
      // En cualquier error, usar defaults de admin para no bloquear la UI
      setPermissions(DEFAULT_PERMISSIONS);
      // Limpiar cache inválido
      permissionsCache = DEFAULT_PERMISSIONS;
      cacheTimestamp = Date.now();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Verificar un permiso específico
  const hasPermission = useCallback((permission: string): boolean => {
    return permissions.permissions[permission] ?? false;
  }, [permissions]);

  // Verificar múltiples permisos (debe tener todos)
  const hasPermissions = useCallback((perms: string[]): boolean => {
    return perms.every(p => hasPermission(p));
  }, [hasPermission]);

  // Verificar si tiene al menos uno de los permisos
  const hasAnyPermission = useCallback((perms: string[]): boolean => {
    return perms.some(p => hasPermission(p));
  }, [hasPermission]);

  // Refrescar permisos
  const refresh = useCallback(() => {
    fetchPermissions(true);
  }, [fetchPermissions]);

  // Limpiar cache (al logout)
  const clearCache = useCallback(() => {
    permissionsCache = null;
    cacheTimestamp = 0;
  }, []);

  return {
    permissions,
    loading,
    error,
    isAdmin: permissions.is_admin,
    isAgent: permissions.is_agent,
    role: permissions.role,
    hasPermission,
    hasPermissions,
    hasAnyPermission,
    refresh,
    clearCache,
  };
}

// Hook para componentes condicionales
export function useCanAccess(permission: string | string[]): boolean {
  const { hasPermission, hasAnyPermission } = usePermissions();
  
  if (Array.isArray(permission)) {
    return hasAnyPermission(permission);
  }
  return hasPermission(permission);
}
