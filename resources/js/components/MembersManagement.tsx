import React, { useState, useEffect, useCallback, useMemo } from 'react';
import debugLog from '@/utils/debugLogger';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import {
  Users,
  UserCog,
  Shield,
  User,
  Trash2,
  Save,
  X,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Crown,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Member {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'superadmin';
  chatwoot_agent_id?: number;
  permissions?: Record<string, boolean>;
  created_at?: string;
}

interface MembersManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

// Definición de permisos disponibles agrupados
const PERMISSION_GROUPS = {
  'Secciones del Panel': [
    { key: 'sidebar.dashboard', label: 'Inicio', description: 'Ver página de inicio' },
    { key: 'sidebar.chats', label: 'Conversaciones', description: 'Ver y responder chats' },
    { key: 'sidebar.teams', label: 'Equipos', description: 'Ver equipos' },
    { key: 'sidebar.integrations', label: 'Integración', description: 'Ver integraciones' },
    { key: 'sidebar.knowledge', label: 'Conocimientos', description: 'Ver base de conocimientos' },
    { key: 'sidebar.training', label: 'Entrenamiento', description: 'Ver entrenamiento IA' },
    { key: 'sidebar.calendar', label: 'Calendario', description: 'Ver calendario' },
    { key: 'sidebar.products', label: 'Productos', description: 'Ver productos' },
  ],
  'Acciones en Equipos': [
    { key: 'teams.manage', label: 'Gestionar equipos', description: 'Editar equipos existentes' },
    { key: 'teams.create', label: 'Crear equipos', description: 'Crear nuevos equipos' },
    { key: 'teams.delete', label: 'Eliminar equipos', description: 'Eliminar equipos' },
    { key: 'members.invite', label: 'Invitar miembros', description: 'Enviar invitaciones' },
  ],
  'Acciones en Conversaciones': [
    { key: 'chats.view_all', label: 'Ver todas', description: 'Ver todas las conversaciones' },
    { key: 'chats.assign', label: 'Asignar', description: 'Asignar conversaciones a agentes' },
    { key: 'chats.transfer', label: 'Transferir', description: 'Transferir conversaciones' },
  ],
};

// Permisos por defecto para agentes
const DEFAULT_AGENT_PERMISSIONS: Record<string, boolean> = {
  'sidebar.dashboard': true,
  'sidebar.chats': true,
  'sidebar.teams': true,
  'sidebar.integrations': false,
  'sidebar.knowledge': false,
  'sidebar.training': false,
  'sidebar.calendar': false,
  'sidebar.products': false,
  'teams.manage': false,
  'teams.create': false,
  'teams.delete': false,
  'members.invite': false,
  'chats.view_all': false,
  'chats.assign': false,
  'chats.transfer': false,
};

const MembersManagement: React.FC<MembersManagementProps> = ({ isOpen, onClose }) => {
  const { currentTheme, hasTheme, isDark } = useTheme();

  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      modalBg: 'var(--theme-content-bg)',
      border: isDark ? 'var(--theme-content-card-border)' : '#e5e7eb',
      text: 'var(--theme-text-primary)',
      textSec: 'var(--theme-text-secondary)',
      textMuted: 'var(--theme-text-muted)',
      hoverBg: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
      expandedBg: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
      inputBg: isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb',
      accent: 'var(--theme-accent)',
      accentLight: 'var(--theme-accent-light)',
    };
  }, [hasTheme, isDark]);

  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedMember, setExpandedMember] = useState<number | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<Record<number, Record<string, boolean>>>({});
  const [editedRoles, setEditedRoles] = useState<Record<number, 'admin' | 'agent' | 'superadmin'>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Obtener miembros
  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/chatwoot-proxy/members');
      if (response.data.success) {
        setMembers(response.data.data || []);
        if (response.data.current_user_id) {
          setCurrentUserId(response.data.current_user_id);
        }
      }
    } catch (err) {
      debugLog.error('Error fetching members:', err);
      setError('Error al cargar miembros');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, fetchMembers]);

  // Obtener permisos efectivos de un miembro
  const getEffectivePermissions = (member: Member): Record<string, boolean> => {
    if (member.role === 'admin' || member.role === 'superadmin') {
      // Admins tienen todos los permisos
      const allTrue: Record<string, boolean> = {};
      Object.values(PERMISSION_GROUPS).flat().forEach(p => {
        allTrue[p.key] = true;
      });
      return allTrue;
    }
    // Para agentes, usar permisos custom o defaults
    return { ...DEFAULT_AGENT_PERMISSIONS, ...(member.permissions || {}) };
  };

  // Toggle permiso
  const togglePermission = (memberId: number, permissionKey: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member || member.role === 'admin') return;

    const currentPermissions = editedPermissions[memberId] || getEffectivePermissions(member);
    setEditedPermissions(prev => ({
      ...prev,
      [memberId]: {
        ...currentPermissions,
        [permissionKey]: !currentPermissions[permissionKey]
      }
    }));
  };

  // Cambiar rol
  const toggleRole = (memberId: number) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const currentRole = editedRoles[memberId] || member.role;
    setEditedRoles(prev => ({
      ...prev,
      [memberId]: currentRole === 'admin' ? 'agent' : 'admin'
    }));
  };

  // Guardar cambios
  const saveChanges = async (memberId: number) => {
    try {
      setSaving(memberId);
      setError(null);
      
      const member = members.find(m => m.id === memberId);
      if (!member) return;

      const newRole = editedRoles[memberId] || member.role;
      const newPermissions = editedPermissions[memberId] || member.permissions;

      const response = await axios.patch(`/api/chatwoot-proxy/members/${memberId}`, {
        role: newRole,
        permissions: newPermissions,
      });

      const data = response.data;
      
      if (data.success) {
        setSuccess('Cambios guardados correctamente');
        setTimeout(() => setSuccess(null), 3000);
        await fetchMembers();
        // Limpiar ediciones
        setEditedPermissions(prev => {
          const { [memberId]: _, ...rest } = prev;
          return rest;
        });
        setEditedRoles(prev => {
          const { [memberId]: _, ...rest } = prev;
          return rest;
        });
      } else {
        setError(data.message || 'Error al guardar cambios');
      }
    } catch (err) {
      setError('Error al guardar cambios');
    } finally {
      setSaving(null);
    }
  };

  // Eliminar miembro
  const deleteMember = async (memberId: number) => {
    try {
      setDeleting(memberId);
      setError(null);

      const response = await axios.delete(`/api/chatwoot-proxy/members/${memberId}`);

      const data = response.data;
      
      if (data.success) {
        setSuccess('Miembro eliminado correctamente');
        setTimeout(() => setSuccess(null), 3000);
        setDeleteConfirm(null);
        await fetchMembers();
      } else {
        setError(data.message || 'Error al eliminar miembro');
      }
    } catch (err) {
      setError('Error al eliminar miembro');
    } finally {
      setDeleting(null);
    }
  };

  // Verificar si hay cambios pendientes
  const hasChanges = (memberId: number): boolean => {
    return editedPermissions[memberId] !== undefined || editedRoles[memberId] !== undefined;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in ${!t ? 'bg-white' : ''}`} style={t ? { background: t.modalBg, color: t.text } : undefined}>
        {/* Header */}
        <div className={`p-6 border-b flex-shrink-0 ${!t ? 'border-gray-200' : ''}`} style={t ? { borderColor: t.border } : undefined}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${!t ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : ''}`}
                style={t ? { background: t.accent } : undefined}
              >
                <UserCog className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.text } : undefined}>Administrar Miembros</h2>
                <p className={`text-sm ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined}>Gestiona roles y permisos de tu equipo</p>
              </div>
            </div>
            <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${!t ? 'hover:bg-gray-100' : 'hover:opacity-80'}`} style={t ? { color: t.textMuted } : undefined}>
              <X className={`w-5 h-5 ${!t ? 'text-gray-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className={`mx-6 mt-4 p-3 border rounded-lg flex items-center space-x-2 ${!t ? 'bg-red-50 border-red-200 text-red-700' : ''}`}
            style={t ? { background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: isDark ? 'rgba(239,68,68,0.2)' : '#fecaca', color: isDark ? '#fca5a5' : '#b91c1c' } : undefined}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className={`mx-6 mt-4 p-3 border rounded-lg flex items-center space-x-2 ${!t ? 'bg-green-50 border-green-200 text-green-700' : ''}`}
            style={t ? { background: isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5', borderColor: isDark ? 'rgba(16,185,129,0.2)' : '#bbf7d0', color: isDark ? '#6ee7b7' : '#15803d' } : undefined}
          >
            <Check className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={t ? { color: t.accent } : { color: '#a855f7' }} />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-3" style={t ? { color: t.textMuted } : { color: '#9ca3af' }} />
              <p style={t ? { color: t.textSec } : { color: '#4b5563' }}>No hay miembros en tu empresa</p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map(member => {
                const isExpanded = expandedMember === member.id;
                const isSelf = member.id === currentUserId;
                const isSuperAdmin = member.role === 'superadmin';
                const effectiveRole = editedRoles[member.id] || member.role;
                const effectivePermissions = editedPermissions[member.id] || getEffectivePermissions(member);
                const isCurrentAdmin = effectiveRole === 'admin' || effectiveRole === 'superadmin';
                const isEditable = !isSelf && !isSuperAdmin;
                
                return (
                  <div key={member.id} className={`border rounded-xl overflow-hidden ${!t ? (isSelf ? 'border-purple-300 bg-purple-50/30' : 'border-gray-200') : ''}`} style={t ? { borderColor: isSelf ? t.accent : t.border, background: isSelf ? (isDark ? 'rgba(255,255,255,0.03)' : undefined) : undefined } : undefined}>
                    {/* Member Header */}
                    <div 
                      className={`p-4 flex items-center justify-between ${isEditable ? 'cursor-pointer' : ''} transition-colors`}
                      style={t ? { background: isExpanded ? t.expandedBg : undefined } : undefined}
                      onClick={() => isEditable && setExpandedMember(isExpanded ? null : member.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                          !t ? (
                            isSuperAdmin ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                            isCurrentAdmin ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-emerald-500 to-green-500'
                          ) : ''
                        }`}
                          style={t ? { background: isSuperAdmin ? (isDark ? '#f59e0b' : '#f59e0b') : t.accent } : undefined}
                        >
                          {member.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className={`font-medium ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.text } : undefined}>{member.name}</p>
                            {isSuperAdmin && <Crown className="w-4 h-4 text-amber-500" />}
                            {isCurrentAdmin && !isSuperAdmin && <Crown className="w-4 h-4 text-purple-500" />}
                            {isSelf && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${!t ? 'bg-purple-100 text-purple-600' : ''}`} style={t ? { background: t.accentLight, color: t.accent } : undefined}>Tú</span>}
                          </div>
                          <p className={`text-sm ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined}>{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${!t ? (
                          isSuperAdmin
                            ? 'bg-amber-100 text-amber-700'
                            : isCurrentAdmin 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-emerald-100 text-emerald-700'
                        ) : ''}`} style={t ? { background: isSuperAdmin ? (isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7') : t.accentLight, color: isSuperAdmin ? (isDark ? '#fcd34d' : '#b45309') : t.accent } : undefined}>
                          {isSuperAdmin ? 'Super Admin' : isCurrentAdmin ? 'Administrador' : 'Agente'}
                        </span>
                        {hasChanges(member.id) && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
                            Sin guardar
                          </span>
                        )}
                        {isEditable && (
                          isExpanded ? (
                            <ChevronUp className="w-5 h-5" style={t ? { color: t.textMuted } : { color: '#9ca3af' }} />
                          ) : (
                            <ChevronDown className="w-5 h-5" style={t ? { color: t.textMuted } : { color: '#9ca3af' }} />
                          )
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && isEditable && (
                      <div className={`p-4 border-t ${!t ? 'border-gray-200 bg-gray-50/50' : ''}`} style={t ? { borderColor: t.border, background: t.expandedBg } : undefined}>
                        {/* Role Toggle */}
                        <div className="mb-6">
                          <label className={`block text-sm font-medium mb-2 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>Rol</label>
                          <div className="flex space-x-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (effectiveRole !== 'admin') toggleRole(member.id);
                              }}
                              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${!t ? (
                                effectiveRole === 'admin'
                                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300'
                              ) : ''}`}
                              style={t ? {
                                borderColor: effectiveRole === 'admin' ? t.accent : t.border,
                                background: effectiveRole === 'admin' ? t.accentLight : t.inputBg,
                                color: effectiveRole === 'admin' ? t.accent : t.textSec
                              } : undefined}
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <Crown className="w-4 h-4" />
                                <span>Administrador</span>
                              </div>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (effectiveRole !== 'agent') toggleRole(member.id);
                              }}
                              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${!t ? (
                                effectiveRole === 'agent'
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
                              ) : ''}`}
                              style={t ? {
                                borderColor: effectiveRole === 'agent' ? t.accent : t.border,
                                background: effectiveRole === 'agent' ? t.accentLight : t.inputBg,
                                color: effectiveRole === 'agent' ? t.accent : t.textSec
                              } : undefined}
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <User className="w-4 h-4" />
                                <span>Agente</span>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Permissions - Solo mostrar si es agente */}
                        {effectiveRole === 'agent' && (
                          <div className="mb-6">
                            <label className={`block text-sm font-medium mb-3 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>
                              Permisos personalizados
                            </label>
                            <div className="space-y-4">
                              {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                                <div key={groupName}>
                                  <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                                    {groupName}
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {permissions.map(perm => (
                                      <button
                                        key={perm.key}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          togglePermission(member.id, perm.key);
                                        }}
                                        className={`p-2 rounded-lg border text-left transition-all ${!t ? (
                                          effectivePermissions[perm.key]
                                            ? 'border-emerald-300 bg-emerald-50'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                        ) : ''}`}
                                        style={t ? {
                                          borderColor: effectivePermissions[perm.key] ? t.accent : t.border,
                                          background: effectivePermissions[perm.key] ? t.accentLight : t.inputBg
                                        } : undefined}
                                      >
                                        <div className="flex items-center space-x-2">
                                          {effectivePermissions[perm.key] ? (
                                            <Eye className="w-4 h-4" style={t ? { color: t.accent } : { color: '#059669' }} />
                                          ) : (
                                            <EyeOff className="w-4 h-4" style={t ? { color: t.textMuted } : { color: '#9ca3af' }} />
                                          )}
                                          <div>
                                            <p className={`text-sm font-medium ${!t ? (
                                              effectivePermissions[perm.key] ? 'text-emerald-700' : 'text-gray-600'
                                            ) : ''}`} style={t ? { color: effectivePermissions[perm.key] ? t.accent : t.textSec } : undefined}>
                                              {perm.label}
                                            </p>
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {isCurrentAdmin && (
                          <div className={`mb-6 p-3 border rounded-lg ${!t ? 'bg-purple-50 border-purple-200' : ''}`} style={t ? { background: t.accentLight, borderColor: t.border } : undefined}>
                            <p className={`text-sm ${!t ? 'text-purple-700' : ''}`} style={t ? { color: t.accent } : undefined}>
                              <strong>Los administradores tienen acceso completo</strong> a todas las funciones y secciones del panel.
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className={`flex justify-between pt-4 border-t ${!t ? 'border-gray-200' : ''}`} style={t ? { borderColor: t.border } : undefined}>
                          {/* Delete Button */}
                          <div>
                            {deleteConfirm === member.id ? (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-red-600">¿Eliminar permanentemente?</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteMember(member.id);
                                  }}
                                  disabled={deleting === member.id}
                                  className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
                                >
                                  {deleting === member.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    'Sí, eliminar'
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm(null);
                                  }}
                                  className={`px-3 py-1 rounded-lg text-sm ${!t ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'hover:opacity-80'}`}
                                  style={t ? { background: t.inputBg, color: t.textSec } : undefined}
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm(member.id);
                                }}
                                className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${!t ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:opacity-80'}`}
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Eliminar del sistema</span>
                              </button>
                            )}
                          </div>

                          {/* Save Button */}
                          {hasChanges(member.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveChanges(member.id);
                              }}
                              disabled={saving === member.id}
                              className={`px-4 py-2 text-white rounded-lg transition-all flex items-center space-x-2 disabled:opacity-50 ${!t ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600' : ''}`}
                              style={t ? { background: t.accent } : undefined}
                            >
                              {saving === member.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              <span>Guardar cambios</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MembersManagement;
