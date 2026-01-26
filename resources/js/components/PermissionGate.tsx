import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Lock } from 'lucide-react';

interface PermissionGateProps {
  permission: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLocked?: boolean;
  requireAll?: boolean; // Si es array, ¿requiere todos o al menos uno?
}

/**
 * Componente que oculta/muestra contenido según permisos del usuario
 * 
 * Uso:
 * <PermissionGate permission="settings.edit">
 *   <SettingsForm />
 * </PermissionGate>
 * 
 * <PermissionGate permission={["chats.view_all", "chats.view_assigned"]} requireAll={false}>
 *   <ChatList />
 * </PermissionGate>
 */
export function PermissionGate({ 
  permission, 
  children, 
  fallback = null,
  showLocked = false,
  requireAll = false 
}: PermissionGateProps) {
  const { hasPermission, hasPermissions, hasAnyPermission, loading } = usePermissions();

  // Mientras carga, mostrar children (optimistic)
  if (loading) {
    return <>{children}</>;
  }

  let hasAccess = false;

  if (Array.isArray(permission)) {
    hasAccess = requireAll ? hasPermissions(permission) : hasAnyPermission(permission);
  } else {
    hasAccess = hasPermission(permission);
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Si showLocked, mostrar un indicador de que está bloqueado
  if (showLocked) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-xl border border-gray-200">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Acceso restringido</p>
          <p className="text-sm text-gray-400 mt-1">No tienes permiso para ver esta sección</p>
        </div>
      </div>
    );
  }

  return <>{fallback}</>;
}

/**
 * HOC para proteger páginas completas
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: string | string[],
  requireAll: boolean = false
) {
  return function WithPermissionComponent(props: P) {
    return (
      <PermissionGate 
        permission={permission} 
        requireAll={requireAll}
        showLocked={true}
      >
        <WrappedComponent {...props} />
      </PermissionGate>
    );
  };
}

/**
 * Hook helper para verificar permisos en lógica
 */
export { usePermissions } from '@/hooks/usePermissions';
