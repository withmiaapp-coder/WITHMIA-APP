import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  User,
  Edit3,
  Trash2,
  Search,
  Plus,
  Loader2,
  X,
  Check,
  AlertCircle,
  UserMinus,
  Mail,
  Send,
  Clock,
  RefreshCw,
  UserCog
} from 'lucide-react';
import { useTeams, useAgents, useTeamInvitations, Team, TeamMember, TeamInvitation } from '../hooks/useChatwoot';
import { usePermissions } from '../hooks/usePermissions';
import MembersManagement from './MembersManagement';

// Modal para crear/editar equipo
const TeamModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; allow_auto_assign: boolean }) => Promise<void>;
  team?: Team | null;
}> = ({ isOpen, onClose, onSave, team }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allowAutoAssign, setAllowAutoAssign] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (team) {
      setName(team.name || '');
      setDescription(team.description || '');
      setAllowAutoAssign(team.allow_auto_assign ?? true);
    } else {
      setName('');
      setDescription('');
      setAllowAutoAssign(true);
    }
  }, [team, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim(), allow_auto_assign: allowAutoAssign });
      onClose();
    } catch (err) {
      console.error('Error saving team:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-scale-in">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              {team ? 'Editar Equipo' : 'Crear Nuevo Equipo'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Nombre del Equipo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Ventas, Soporte, Marketing..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-500 bg-white"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el propósito de este equipo..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none text-gray-900 placeholder-gray-500 bg-white"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="autoAssign"
              checked={allowAutoAssign}
              onChange={(e) => setAllowAutoAssign(e.target.checked)}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="autoAssign" className="text-sm text-gray-800 font-medium">
              Permitir asignación automática de conversaciones
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{team ? 'Guardar Cambios' : 'Crear Equipo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para agregar miembros
const AddMembersModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (userIds: number[]) => Promise<void>;
  availableAgents: any[];
  currentMemberIds: number[];
  loading?: boolean;
}> = ({ isOpen, onClose, onAdd, availableAgents, currentMemberIds, loading }) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const agentsArray = Array.isArray(availableAgents) ? availableAgents : [];
  const filteredAgents = agentsArray.filter(agent => !currentMemberIds.includes(agent.id));

  const toggleAgent = (agentId: number) => {
    setSelectedIds(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    
    setSaving(true);
    try {
      await onAdd(selectedIds);
      setSelectedIds([]);
      onClose();
    } catch (err) {
      console.error('Error adding members:', err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isOpen) setSelectedIds([]);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-scale-in max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Agregar Miembros</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No hay agentes disponibles para agregar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAgents.map(agent => (
                <div
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedIds.includes(agent.id)
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                      selectedIds.includes(agent.id) ? 'bg-emerald-500' : 'bg-gray-400'
                    }`}>
                      {agent.name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{agent.name || 'Sin nombre'}</p>
                      <p className="text-sm text-gray-500">{agent.email}</p>
                    </div>
                    {selectedIds.includes(agent.id) && (
                      <Check className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {selectedIds.length} seleccionado(s)
            </span>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || selectedIds.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Agregar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal para invitar nuevo miembro por correo
const InviteMemberModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: { email: string; name?: string; role: 'agent' | 'administrator'; team_id?: number }) => Promise<void>;
  teams: Team[];
  selectedTeamId?: number;
}> = ({ isOpen, onClose, onInvite, teams, selectedTeamId }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'agent' | 'administrator'>('agent');
  const [teamId, setTeamId] = useState<number | undefined>(selectedTeamId);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setName('');
      setRole('agent');
      setTeamId(selectedTeamId);
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, selectedTeamId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await onInvite({ 
        email: email.trim(), 
        name: name.trim() || undefined, 
        role,
        team_id: teamId 
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al enviar invitación');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-scale-in">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Invitar por Correo</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">¡Invitación Enviada!</h3>
            <p className="text-gray-600">Se ha enviado un correo a {email} con las instrucciones para unirse.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500 bg-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Nombre (opcional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del invitado"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Rol
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'agent' | 'administrator')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 bg-white"
              >
                <option value="agent">Agente</option>
                <option value="administrator">Administrador</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Agregar a equipo (opcional)
              </label>
              <select
                value={teamId || ''}
                onChange={(e) => setTeamId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 bg-white"
              >
                <option value="">Sin equipo asignado</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                <strong>📧 El invitado recibirá un correo</strong> con un enlace para crear su cuenta y unirse a tu empresa.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !email.trim()}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Enviar Invitación</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// Componente principal
const TeamsManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInvitationsPanel, setShowInvitationsPanel] = useState(false);
  const [showMembersManagement, setShowMembersManagement] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  
  const { isAdmin, hasPermission } = usePermissions();
  
  const { 
    teams, 
    selectedTeam, 
    setSelectedTeam,
    loading, 
    fetchTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMembers,
    removeTeamMember
  } = useTeams();
  
  const { agents, loading: agentsLoading, fetchAgents } = useAgents();
  const { invitations, sendInvitation, resendInvitation, cancelInvitation, loading: invitationsLoading } = useTeamInvitations();

  useEffect(() => {
    if (showAddMembersModal) {
      fetchAgents();
    }
  }, [showAddMembersModal, fetchAgents]);

  const handleCreateTeam = async (data: { name: string; description: string; allow_auto_assign: boolean }) => {
    await createTeam(data);
    // Notificar a MainDashboard para actualizar el contador
    window.dispatchEvent(new CustomEvent('teams-changed'));
  };

  const handleUpdateTeam = async (data: { name: string; description: string; allow_auto_assign: boolean }) => {
    if (editingTeam) {
      await updateTeam(editingTeam.id, data);
      setEditingTeam(null);
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    try {
      await deleteTeam(teamId);
      setDeleteConfirm(null);
      // Notificar a MainDashboard para actualizar el contador
      window.dispatchEvent(new CustomEvent('teams-changed'));
    } catch (err) {
      console.error('Error deleting team:', err);
    }
  };

  const handleAddMembers = async (userIds: number[]) => {
    if (selectedTeam) {
      await addTeamMembers(selectedTeam.id, userIds);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (selectedTeam && confirm('¿Estás seguro de remover este miembro del equipo?')) {
      await removeTeamMember(selectedTeam.id, userId);
    }
  };

  const handleInviteMember = async (data: { email: string; name?: string; role: 'agent' | 'administrator'; team_id?: number }) => {
    await sendInvitation(data);
  };

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'administrator': return Crown;
      case 'supervisor': return Shield;
      default: return User;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'administrator': return 'text-purple-600 bg-purple-100';
      case 'supervisor': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-400';
      case 'busy': return 'bg-red-400';
      case 'away': return 'bg-yellow-400';
      default: return 'bg-gray-400';
    }
  };

  const teamsArray = Array.isArray(teams) ? teams : [];
  const filteredTeams = teamsArray.filter(team => 
    team.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-50 to-white">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Gestión de Equipos</h1>
              <p className="text-gray-600">Administra equipos y miembros de tu empresa</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Botón de invitaciones pendientes */}
            {pendingInvitations.length > 0 && (
              <button 
                onClick={() => setShowInvitationsPanel(!showInvitationsPanel)}
                className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-all flex items-center space-x-2"
              >
                <Clock className="w-4 h-4" />
                <span>{pendingInvitations.length} pendiente{pendingInvitations.length > 1 ? 's' : ''}</span>
              </button>
            )}
            
            {/* Botón administrar miembros - solo admin */}
            {isAdmin && (
              <button 
                onClick={() => setShowMembersManagement(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 flex items-center space-x-2 shadow-lg"
              >
                <UserCog className="w-4 h-4" />
                <span>Administrar</span>
              </button>
            )}
            
            {/* Botón invitar - solo si tiene permiso */}
            {(isAdmin || hasPermission('members.invite')) && (
              <button 
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center space-x-2 shadow-lg"
              >
                <Mail className="w-4 h-4" />
                <span>Invitar</span>
              </button>
            )}
            
            {/* Botón crear equipo - solo si tiene permiso */}
            {(isAdmin || hasPermission('teams.create')) && (
              <button 
                onClick={() => {
                  setEditingTeam(null);
                  setShowTeamModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all duration-300 flex items-center space-x-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Equipo</span>
              </button>
            )}
          </div>
        </div>

        {/* Panel de invitaciones pendientes */}
        {showInvitationsPanel && pendingInvitations.length > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-amber-800 flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Invitaciones Pendientes</span>
              </h3>
              <button 
                onClick={() => setShowInvitationsPanel(false)}
                className="text-amber-600 hover:text-amber-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {pendingInvitations.map(inv => (
                <div key={inv.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                  <div>
                    <p className="font-medium text-gray-800">{inv.email}</p>
                    <p className="text-xs text-gray-500">
                      {inv.role === 'administrator' ? 'Admin' : 'Agente'} • Expira: {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => resendInvitation(inv.id)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Reenviar"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => cancelInvitation(inv.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar equipos..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all duration-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        
        {/* Lista de Equipos */}
        <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200/60 bg-white/60 backdrop-blur-xl overflow-y-auto">
          {loading ? (
            <div className="p-8 flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 text-emerald-500 mb-4 animate-spin" />
              <p className="text-gray-600">Cargando equipos...</p>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center h-full">
              <Users className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay equipos creados</h3>
              <p className="text-gray-500 mb-4 text-center">Crea tu primer equipo para comenzar a organizar a tu personal</p>
              <button
                onClick={() => {
                  setEditingTeam(null);
                  setShowTeamModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all duration-200 shadow-lg"
              >
                Crear primer equipo
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredTeams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => {
                    setSelectedTeam(team);
                    fetchTeam(team.id);
                  }}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-md ${
                    selectedTeam?.id === team.id 
                      ? 'bg-white border-2 border-emerald-400 shadow-lg' 
                      : 'bg-white/80 border border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center shadow">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{team.name}</h3>
                        <p className="text-sm text-gray-500">{team.members?.length || 0} miembros</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTeam(team);
                          setShowTeamModal(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4 text-gray-500" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(team.id);
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  
                  {team.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{team.description}</p>
                  )}
                  
                  {team.members && team.members.length > 0 && (
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 4).map((member: TeamMember, index: number) => (
                        <div 
                          key={member.id || index} 
                          className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                          title={member.name}
                        >
                          {member.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      ))}
                      {team.members.length > 4 && (
                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white">
                          +{team.members.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detalles del Equipo */}
        <div className="flex-1 bg-white/70 backdrop-blur-xl overflow-y-auto">
          {selectedTeam ? (
            <div className="h-full flex flex-col">
              
              {/* Header del Equipo */}
              <div className="p-6 border-b border-gray-200/60 bg-white/90 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Users className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{selectedTeam.name}</h2>
                      {selectedTeam.description && (
                        <p className="text-gray-600">{selectedTeam.description}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedTeam.members?.length || 0} miembros • 
                        {selectedTeam.allow_auto_assign ? ' Auto-asignación activa' : ' Sin auto-asignación'}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setShowAddMembersModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center space-x-2 shadow-lg"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Agregar Miembro</span>
                  </button>
                </div>
              </div>

              {/* Lista de Miembros */}
              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Miembros del Equipo</h3>
                
                {!selectedTeam.members || selectedTeam.members.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-700 mb-2">Sin miembros</h4>
                    <p className="text-gray-500 mb-4">Este equipo aún no tiene miembros asignados</p>
                    <button 
                      onClick={() => setShowAddMembersModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all"
                    >
                      Agregar primer miembro
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedTeam.members.map((member: TeamMember) => {
                      const RoleIcon = getRoleIcon(member.role);
                      
                      return (
                        <div key={member.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-300">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-semibold shadow">
                                {member.avatar_url ? (
                                  <img src={member.avatar_url} alt={member.name} className="w-full h-full rounded-xl object-cover" />
                                ) : (
                                  member.name?.charAt(0)?.toUpperCase() || 'U'
                                )}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(member.availability_status || 'offline')} rounded-full border-2 border-white`} />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-semibold text-gray-800">{member.name || 'Sin nombre'}</h4>
                                <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${getRoleColor(member.role)}`}>
                                  <RoleIcon className="w-3 h-3" />
                                  <span className="capitalize">{member.role}</span>
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{member.email}</p>
                            </div>
                            
                            <button 
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                              title="Remover del equipo"
                            >
                              <UserMinus className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Users className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Selecciona un Equipo</h3>
                <p className="text-gray-500">Elige un equipo de la lista para ver sus detalles y miembros</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <TeamModal
        isOpen={showTeamModal}
        onClose={() => {
          setShowTeamModal(false);
          setEditingTeam(null);
        }}
        onSave={editingTeam ? handleUpdateTeam : handleCreateTeam}
        team={editingTeam}
      />

      <AddMembersModal
        isOpen={showAddMembersModal}
        onClose={() => setShowAddMembersModal(false)}
        onAdd={handleAddMembers}
        availableAgents={agents}
        currentMemberIds={selectedTeam?.members?.map((m: TeamMember) => m.id) || []}
        loading={agentsLoading}
      />

      {/* Confirmación de eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Eliminar Equipo</h3>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de eliminar este equipo? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteTeam(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de invitación */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteMember}
        teams={teamsArray}
        selectedTeamId={selectedTeam?.id}
      />

      {/* Modal de administración de miembros */}
      <MembersManagement
        isOpen={showMembersManagement}
        onClose={() => setShowMembersManagement(false)}
      />
    </div>
  );
};

export default TeamsManagement;