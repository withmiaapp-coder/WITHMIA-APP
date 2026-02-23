import React, { useState, useEffect, useCallback } from 'react';
import debugLog from '@/utils/debugLogger';
import axios from 'axios';
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
                <UserCog className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Administrar Miembros</h2>
                <p className="text-sm text-gray-500">Gestiona roles y permisos de tu equipo</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-700">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No hay miembros en tu empresa</p>
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
                  <div key={member.id} className={`border rounded-xl overflow-hidden ${isSelf ? 'border-purple-300 bg-purple-50/30' : 'border-gray-200'}`}>
                    {/* Member Header */}
                    <div 
                      className={`p-4 flex items-center justify-between ${isEditable ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors ${
                        isExpanded ? 'bg-gray-50' : ''
                      }`}
                      onClick={() => isEditable && setExpandedMember(isExpanded ? null : member.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                          isSuperAdmin ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                          isCurrentAdmin ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-emerald-500 to-green-500'
                        }`}>
                          {member.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-800">{member.name}</p>
                            {isSuperAdmin && <Crown className="w-4 h-4 text-amber-500" />}
                            {isCurrentAdmin && !isSuperAdmin && <Crown className="w-4 h-4 text-purple-500" />}
                            {isSelf && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">Tú</span>}
                          </div>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isSuperAdmin
                            ? 'bg-amber-100 text-amber-700'
                            : isCurrentAdmin 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isSuperAdmin ? 'Super Admin' : isCurrentAdmin ? 'Administrador' : 'Agente'}
                        </span>
                        {hasChanges(member.id) && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
                            Sin guardar
                          </span>
                        )}
                        {isEditable && (
                          isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && isEditable && (
                      <div className="p-4 border-t border-gray-200 bg-gray-50/50">
                        {/* Role Toggle */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                          <div className="flex space-x-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (effectiveRole !== 'admin') toggleRole(member.id);
                              }}
                              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                                effectiveRole === 'admin'
                                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300'
                              }`}
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
                              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                                effectiveRole === 'agent'
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
                              }`}
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
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              Permisos personalizados
                            </label>
                            <div className="space-y-4">
                              {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                                <div key={groupName}>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
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
                                        className={`p-2 rounded-lg border text-left transition-all ${
                                          effectivePermissions[perm.key]
                                            ? 'border-emerald-300 bg-emerald-50'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                      >
                                        <div className="flex items-center space-x-2">
                                          {effectivePermissions[perm.key] ? (
                                            <Eye className="w-4 h-4 text-emerald-600" />
                                          ) : (
                                            <EyeOff className="w-4 h-4 text-gray-400" />
                                          )}
                                          <div>
                                            <p className={`text-sm font-medium ${
                                              effectivePermissions[perm.key] ? 'text-emerald-700' : 'text-gray-600'
                                            }`}>
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
                          <div className="mb-6 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <p className="text-sm text-purple-700">
                              <strong>Los administradores tienen acceso completo</strong> a todas las funciones y secciones del panel.
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-between pt-4 border-t border-gray-200">
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
                                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
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
                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-2"
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
                              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all flex items-center space-x-2 disabled:opacity-50"
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
