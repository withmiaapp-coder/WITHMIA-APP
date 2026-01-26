import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface UserPermissions {
  role: 'admin' | 'agent';
  is_admin: boolean;
  is_agent: boolean;
  permissions: Record<string, boolean>;
}

// Permisos default mientras carga
const DEFAULT_PERMISSIONS: UserPermissions = {
  role: 'admin',
  is_admin: true,
  is_agent: false,
  permissions: {
    'dashboard.view': true,
    'chats.view_all': true,
    'chats.view_assigned': true,
    'chats.respond': true,
    'chats.assign': true,
    'chats.transfer': true,
    'teams.manage': true,
    'teams.view': true,
    'settings.view': true,
    'settings.edit': true,
    'training.manage': true,
    'integrations.manage': true,
    'reports.view': true,
    'members.invite': true,
    'members.manage': true,
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
          role: response.data.role,
          is_admin: response.data.is_admin,
          is_agent: response.data.is_agent,
          permissions: response.data.permissions,
        };
        
        // Actualizar cache
        permissionsCache = perms;
        cacheTimestamp = Date.now();
        
        setPermissions(perms);
        setError(null);
      }
    } catch (err: any) {
      // Si no está autenticado, usar defaults de admin
      if (err.response?.status === 401) {
        setPermissions(DEFAULT_PERMISSIONS);
      } else {
        setError('Error al cargar permisos');
      }
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
