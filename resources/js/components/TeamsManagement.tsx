import React, { useState, useEffect, useMemo } from 'react';
import debugLog from '@/utils/debugLogger';
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
  UserCog,
  ShieldCheck,
  Info
} from 'lucide-react';
import { useTeams, useAgents, useTeamInvitations, Team, TeamMember, TeamInvitation } from '../hooks/useChatwoot';
import type { Agent } from '@/types/chatwoot';
import { usePermissions } from '../hooks/usePermissions';
import { useTheme } from '../contexts/ThemeContext';
import { ThemedSelect } from './ui/ThemedSelect';
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
  const { hasTheme, isDark } = useTheme();

  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      bg: 'var(--theme-content-bg)',
      border: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      text: 'var(--theme-text-primary)',
      textSec: 'var(--theme-text-secondary)',
      inputBg: isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb',
      inputBorder: isDark ? 'var(--theme-glass-border)' : '#e5e7eb',
      accent: 'var(--theme-accent)',
    };
  }, [hasTheme, isDark]);

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
      debugLog.error('Error saving team:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl shadow-2xl w-full max-w-md animate-scale-in ${!t ? 'bg-white' : ''}`}
        style={t ? { background: t.bg, borderColor: t.border, border: '1px solid' } : undefined}
      >
        <div className={`p-6 border-b ${!t ? 'border-gray-200' : ''}`} style={t ? { borderColor: t.border } : undefined}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.text } : undefined}>
              {team ? 'Editar Equipo' : 'Crear Nuevo Equipo'}
            </h2>
            <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${!t ? 'hover:bg-gray-100' : ''}`}>
              <X className={`w-5 h-5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined} />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.text } : undefined}>
              Nombre del Equipo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Ventas, Soporte, Marketing..."
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 transition-all ${!t ? 'focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-500 bg-white border-gray-300' : 'placeholder-gray-500'}`}
              style={t ? { background: t.inputBg, borderColor: t.inputBorder, color: t.text, '--tw-ring-color': t.accent } as React.CSSProperties : undefined}
              required
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.text } : undefined}>
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el propósito de este equipo..."
              rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 transition-all resize-none ${!t ? 'focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-500 bg-white border-gray-300' : 'placeholder-gray-500'}`}
              style={t ? { background: t.inputBg, borderColor: t.inputBorder, color: t.text, '--tw-ring-color': t.accent } as React.CSSProperties : undefined}
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="autoAssign"
              checked={allowAutoAssign}
              onChange={(e) => setAllowAutoAssign(e.target.checked)}
              className={`w-4 h-4 border-gray-300 rounded ${!t ? 'text-emerald-600 focus:ring-emerald-500' : ''}`}
              style={t ? { accentColor: 'var(--theme-accent)' } as React.CSSProperties : undefined}
            />
            <label htmlFor="autoAssign" className={`text-sm font-medium ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.text } : undefined}>
              Permitir asignación automática de conversaciones
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg transition-colors ${!t ? 'text-gray-700 bg-gray-100 hover:bg-gray-200' : ''}`}
              style={t ? { color: t.text, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' } : undefined}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className={`px-4 py-2 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${!t ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600' : ''}`}
              style={t ? { background: t.accent } : undefined}
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
  availableAgents: Agent[];
  currentMemberIds: number[];
  loading?: boolean;
}> = ({ isOpen, onClose, onAdd, availableAgents, currentMemberIds, loading }) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const { hasTheme, isDark } = useTheme();

  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      bg: 'var(--theme-content-bg)',
      border: isDark ? 'var(--theme-glass-border)' : '#e5e7eb',
      text: 'var(--theme-text-primary)',
      textSec: 'var(--theme-text-secondary)',
      textMuted: 'var(--theme-text-muted)',
      inputBg: isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb',
      accent: 'var(--theme-accent)',
    };
  }, [hasTheme, isDark]);

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
      debugLog.error('Error adding members:', err);
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
      <div className={`rounded-xl shadow-2xl w-full max-w-md animate-scale-in max-h-[80vh] flex flex-col ${!t ? 'bg-white' : ''}`}
        style={t ? { background: t.bg, border: '1px solid', borderColor: t.border } : undefined}
      >
        <div className={`p-6 border-b ${!t ? 'border-gray-200' : ''}`} style={t ? { borderColor: t.border } : undefined}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.text } : undefined}>Agregar Miembros</h2>
            <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${!t ? 'hover:bg-gray-100' : ''}`}>
              <X className={`w-5 h-5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
            <Loader2 className={`w-8 h-8 animate-spin ${!t ? 'text-emerald-500' : ''}`} style={t ? { color: t.accent } : undefined} />
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-8">
              <Users className={`w-12 h-12 mx-auto mb-3 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
              <p className={`${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSec } : undefined}>No hay agentes disponibles para agregar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAgents.map(agent => (
                <div
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedIds.includes(agent.id)
                      ? (!t ? 'border-emerald-500 bg-emerald-50' : '')
                      : !t ? 'border-gray-200 hover:border-gray-300' : ''
                  }`}
                  style={selectedIds.includes(agent.id) && t
                    ? { borderColor: t.accent, background: isDark ? 'rgba(255,255,255,0.06)' : 'var(--theme-accent-light)' }
                    : (!selectedIds.includes(agent.id) && t ? { borderColor: t.border, background: t.inputBg } : undefined)
                  }
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                      selectedIds.includes(agent.id) ? (!t ? 'bg-emerald-500' : '') : !t ? 'bg-gray-400' : ''
                    }`}
                      style={t ? { background: t.accent } : undefined}
                    >
                      {agent.name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.text } : undefined}>{agent.name || 'Sin nombre'}</p>
                      <p className={`text-sm ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{agent.email}</p>
                    </div>
                    {selectedIds.includes(agent.id) && (
                      <Check className={`w-5 h-5 ${!t ? 'text-emerald-500' : ''}`} style={t ? { color: t.accent } : undefined} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className={`p-6 border-t ${!t ? 'border-gray-200' : ''}`} style={t ? { borderColor: t.border } : undefined}>
          <div className="flex justify-between items-center">
            <span className={`text-sm ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSec } : undefined}>
              {selectedIds.length} seleccionado(s)
            </span>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg transition-colors ${!t ? 'text-gray-700 bg-gray-100 hover:bg-gray-200' : ''}`}
                style={t ? { color: t.text, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' } : undefined}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || selectedIds.length === 0}
                className={`px-4 py-2 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${!t ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600' : ''}`}
                style={t ? { background: t.accent } : undefined}
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
// Icono de Google
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

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
  const { hasTheme, isDark } = useTheme();

  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      bg: 'var(--theme-content-bg)',
      border: isDark ? 'var(--theme-glass-border)' : '#e5e7eb',
      text: 'var(--theme-text-primary)',
      textSec: 'var(--theme-text-secondary)',
      textMuted: 'var(--theme-text-muted)',
      inputBg: isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb',
      inputBorder: isDark ? 'var(--theme-glass-border)' : '#e5e7eb',
      accent: 'var(--theme-accent)',
      accentLight: 'var(--theme-accent-light)',
    };
  }, [hasTheme, isDark]);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar invitación');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl shadow-2xl w-full max-w-md animate-scale-in overflow-hidden ${!t ? 'bg-white' : ''}`}
        style={t ? { background: t.bg, border: '1px solid', borderColor: t.border } : undefined}
      >
        {/* Header */}
        <div className={`p-5 ${!t ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600' : ''}`}
          style={t ? { background: `linear-gradient(to right, var(--theme-accent), color-mix(in srgb, var(--theme-accent) 80%, #4338ca))` } : undefined}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Invitar Miembro</h2>
                <p className="text-white/70 text-xs">Añade un nuevo integrante a tu equipo</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        
        {success ? (
          <div className="p-8 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${!t ? 'bg-green-100' : ''}`}
              style={t ? { background: isDark ? 'rgba(16,185,129,0.15)' : '#dcfce7' } : undefined}
            >
              <Check className={`w-8 h-8 ${!t ? 'text-green-600' : ''}`} style={t ? { color: isDark ? '#6ee7b7' : '#16a34a' } : undefined} />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.text } : undefined}>¡Invitación Enviada!</h3>
            <p className={`text-sm ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSec } : undefined}>Se ha enviado un correo a <strong>{email}</strong> con las instrucciones para unirse.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className={`p-3 border rounded-xl flex items-center space-x-2 ${!t ? 'bg-red-50 border-red-200 text-red-700' : ''}`}
                style={t ? { background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: isDark ? 'rgba(239,68,68,0.2)' : '#fecaca', color: isDark ? '#fca5a5' : '#b91c1c' } : undefined}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Gmail security notice */}
            <div className={`flex items-center gap-3 p-3 border rounded-xl ${!t ? 'bg-gray-50 border-gray-200' : ''}`}
              style={t ? { background: isDark ? 'rgba(255,255,255,0.04)' : undefined, borderColor: t.border } : undefined}
            >
              <div className={`p-1.5 rounded-lg shadow-sm border flex-shrink-0 ${!t ? 'bg-white border-gray-100' : ''}`}
                style={t ? { borderColor: t.border, background: t.inputBg } : undefined}
              >
                <GoogleIcon />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.text } : undefined}>Solo cuentas de Google</p>
                <p className={`text-xs ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Por seguridad, el acceso es exclusivamente mediante Google Sign-In.</p>
              </div>
              <ShieldCheck className={`w-4 h-4 flex-shrink-0 ${!t ? 'text-green-500' : ''}`} style={t ? { color: isDark ? '#6ee7b7' : '#22c55e' } : undefined} />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>
                Correo de Google <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={`w-4 h-4 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@gmail.com"
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 transition-all text-sm ${!t ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 bg-white' : 'placeholder-gray-500'}`}
                  style={t ? { background: t.inputBg, borderColor: t.inputBorder, color: t.text } : undefined}
                  required
                />
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>
                Nombre <span className={`text-xs font-normal ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>(opcional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className={`w-4 h-4 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del invitado"
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 transition-all text-sm ${!t ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 bg-white' : 'placeholder-gray-500'}`}
                  style={t ? { background: t.inputBg, borderColor: t.inputBorder, color: t.text } : undefined}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>
                  Rol
                </label>
                <ThemedSelect
                  value={role}
                  onChange={(val) => setRole(val as 'agent' | 'administrator')}
                  options={[
                    { value: 'agent', label: 'Agente' },
                    { value: 'administrator', label: 'Administrador' },
                  ]}
                  triggerClassName={`w-full px-3 py-2.5 border rounded-xl focus:ring-2 transition-all text-sm ${!t ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white' : ''}`}
                  triggerStyle={t ? { background: t.inputBg, borderColor: t.inputBorder, color: t.text } : undefined}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>
                  Equipo <span className={`text-xs font-normal ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>(opc.)</span>
                </label>
                <ThemedSelect
                  value={teamId ? String(teamId) : ''}
                  onChange={(val) => setTeamId(val ? parseInt(val) : undefined)}
                  options={[
                    { value: '', label: 'Sin equipo' },
                    ...teams.map(team => ({ value: String(team.id), label: team.name })),
                  ]}
                  triggerClassName={`w-full px-3 py-2.5 border rounded-xl focus:ring-2 transition-all text-sm ${!t ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white' : ''}`}
                  triggerStyle={t ? { background: t.inputBg, borderColor: t.inputBorder, color: t.text } : undefined}
                />
              </div>
            </div>

            {/* Info box */}
            <div className={`flex items-start gap-2.5 p-3 border rounded-xl ${!t ? 'bg-blue-50 border-blue-100' : ''}`}
              style={t ? { background: t.accentLight, borderColor: isDark ? 'transparent' : undefined } : undefined}
            >
              <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${!t ? 'text-blue-500' : ''}`} style={t ? { color: t.accent } : undefined} />
              <div className={`text-xs leading-relaxed ${!t ? 'text-blue-700' : ''}`} style={t ? { color: t.text } : undefined}>
                <p>El invitado recibirá un <strong>correo con un enlace</strong> para unirse. Deberá iniciar sesión con su cuenta de Google para aceptar la invitación.</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl transition-colors text-sm font-medium ${!t ? 'text-gray-600 bg-gray-100 hover:bg-gray-200' : ''}`}
                style={t ? { color: t.text, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' } : undefined}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !email.trim()}
                className={`px-5 py-2.5 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm font-medium shadow-lg ${!t ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25' : ''}`}
                style={t ? { background: t.accent } : undefined}
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
  const { hasTheme, isDark } = useTheme();

  // ═══════════════════════════════════════════════════════════
  // Theme styles memo — uses CSS variables from ThemeContext
  // ═══════════════════════════════════════════════════════════
  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      containerBg: 'var(--theme-content-bg)',
      panelBg: isDark ? 'var(--theme-sidebar-bg)' : 'var(--theme-content-card-bg)',
      panelBorder: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      headerBg: 'var(--theme-header-bg)',
      headerBorder: 'var(--theme-header-border)',
      textPrimary: 'var(--theme-text-primary)',
      textSecondary: 'var(--theme-text-secondary)',
      textMuted: 'var(--theme-text-muted)',
      cardBg: isDark ? 'var(--theme-sidebar-bg)' : 'var(--theme-content-card-bg)',
      cardBorder: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      cardHover: isDark ? 'var(--theme-sidebar-hover)' : 'var(--theme-sidebar-hover)',
      cardActive: isDark ? 'var(--theme-sidebar-active-bg)' : 'var(--theme-sidebar-active-bg)',
      inputBg: isDark ? 'rgba(255,255,255,0.04)' : 'var(--theme-content-card-bg)',
      inputBorder: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      inputText: 'var(--theme-text-primary)',
      buttonBg: isDark ? 'var(--theme-sidebar-hover)' : 'var(--theme-content-card-bg)',
      buttonBorder: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      accent: 'var(--theme-accent)',
      accentLight: 'var(--theme-accent-light)',
      divider: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      iconColor: 'var(--theme-icon-inactive)',
      dropdownBg: isDark ? 'var(--theme-sidebar-bg)' : 'var(--theme-content-card-bg)',
      dropdownBorder: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
    };
  }, [hasTheme, isDark]);
  
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
      debugLog.error('Error deleting team:', err);
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
    if (t) {
      // When themed, use theme-aware colors
      switch (role) {
        case 'administrator': return isDark ? 'text-purple-300 bg-purple-500/15' : 'text-purple-600 bg-purple-100';
        case 'supervisor': return isDark ? 'text-blue-300 bg-blue-500/15' : 'text-blue-600 bg-blue-100';
        default: return isDark ? 'text-gray-300 bg-gray-500/15' : 'text-gray-600 bg-gray-100';
      }
    }
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
    <div className={`w-full h-full flex flex-col ${!t ? 'bg-gradient-to-br from-gray-50 to-white' : ''}`}
      style={t ? { background: t.containerBg } : undefined}
    >
      
      {/* Header */}
      <div className={`p-6 border-b backdrop-blur-xl flex-shrink-0 ${!t ? 'border-gray-200/60 bg-white/80' : ''}`}
        style={t ? { background: t.headerBg, borderColor: t.headerBorder } : undefined}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg shadow-lg ${!t ? 'bg-gradient-to-r from-emerald-500 to-green-500' : ''}`}
              style={t ? { background: t.accent } : undefined}
            >
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Gestión de Equipos</h1>
              <p className={`${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSecondary } : undefined}>Administra equipos y miembros de tu empresa</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Botón de invitaciones pendientes */}
            {pendingInvitations.length > 0 && (
              <button 
                onClick={() => setShowInvitationsPanel(!showInvitationsPanel)}
                className={`px-3 py-2 rounded-lg transition-all flex items-center space-x-2 ${!t ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : ''}`}
                style={t ? { background: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7', color: isDark ? '#fcd34d' : '#b45309' } : undefined}
              >
                <Clock className="w-4 h-4" />
                <span>{pendingInvitations.length} pendiente{pendingInvitations.length > 1 ? 's' : ''}</span>
              </button>
            )}
            
            {/* Botón administrar miembros - solo admin */}
            {isAdmin && (
              <button 
                onClick={() => setShowMembersManagement(true)}
                className={`px-4 py-2 text-white rounded-lg transition-all duration-300 flex items-center space-x-2 shadow-lg ${!t ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600' : ''}`}
                style={t ? { background: t.accent } : undefined}
              >
                <UserCog className="w-4 h-4" />
                <span>Administrar</span>
              </button>
            )}
            
            {/* Botón invitar - solo si tiene permiso */}
            {(isAdmin || hasPermission('members.invite')) && (
              <button 
                onClick={() => setShowInviteModal(true)}
                className={`px-4 py-2 text-white rounded-lg transition-all duration-300 flex items-center space-x-2 shadow-lg ${!t ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' : ''}`}
                style={t ? { background: t.accent } : undefined}
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
                className={`px-4 py-2 text-white rounded-lg transition-all duration-300 flex items-center space-x-2 shadow-lg ${!t ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600' : ''}`}
                style={t ? { background: t.accent } : undefined}
              >
                <Plus className="w-4 h-4" />
                <span>Crear Equipo</span>
              </button>
            )}
          </div>
        </div>

        {/* Panel de invitaciones pendientes */}
        {showInvitationsPanel && pendingInvitations.length > 0 && (
          <div className={`mb-4 border rounded-xl p-4 ${!t ? 'bg-amber-50 border-amber-200' : ''}`}
            style={t ? { background: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb', borderColor: isDark ? 'rgba(245,158,11,0.2)' : '#fde68a' } : undefined}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-semibold flex items-center space-x-2 ${!t ? 'text-amber-800' : ''}`}
                style={t ? { color: isDark ? '#fcd34d' : '#92400e' } : undefined}
              >
                <Clock className="w-4 h-4" />
                <span>Invitaciones Pendientes</span>
              </h3>
              <button 
                onClick={() => setShowInvitationsPanel(false)}
                className={`${!t ? 'text-amber-600 hover:text-amber-800' : ''}`}
                style={t ? { color: isDark ? '#fcd34d' : '#d97706' } : undefined}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {pendingInvitations.map(inv => (
                <div key={inv.id} className={`flex items-center justify-between rounded-lg p-3 border ${!t ? 'bg-white border-amber-100' : ''}`}
                  style={t ? { background: t.cardBg, borderColor: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7' } : undefined}
                >
                  <div>
                    <p className={`font-medium ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{inv.email}</p>
                    <p className={`text-xs ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                      {inv.role === 'administrator' ? 'Admin' : 'Agente'} • Expira: {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => resendInvitation(inv.id)}
                      className={`p-1.5 rounded-lg transition-colors ${!t ? 'text-blue-600 hover:bg-blue-50' : ''}`}
                      style={t ? { color: t.accent } : undefined}
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
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
          <input
            type="text"
            placeholder="Buscar equipos..."
            className={`w-full pl-10 pr-4 py-2 border rounded-lg transition-all duration-300 ${!t ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50' : 'placeholder-gray-500 focus:ring-2'}`}
            style={t ? { background: t.inputBg, borderColor: t.inputBorder, color: t.inputText, '--tw-ring-color': t.accent } as React.CSSProperties : undefined}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        
        {/* Lista de Equipos */}
        <div className={`w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r backdrop-blur-xl overflow-y-auto ${!t ? 'border-gray-200/60 bg-white/60' : ''}`}
          style={t ? { background: t.panelBg, borderColor: t.panelBorder } : undefined}
        >
          {loading ? (
            <div className="p-8 flex flex-col items-center justify-center h-full">
              <Loader2 className={`w-12 h-12 mb-4 animate-spin ${!t ? 'text-emerald-500' : ''}`} style={t ? { color: t.accent } : undefined} />
              <p className={`${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSecondary } : undefined}>Cargando equipos...</p>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center h-full">
              <Users className={`w-16 h-16 mb-4 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
              <h3 className={`text-lg font-semibold mb-2 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.textPrimary } : undefined}>No hay equipos creados</h3>
              <p className={`mb-4 text-center ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Crea tu primer equipo para comenzar a organizar a tu personal</p>
              <button
                onClick={() => {
                  setEditingTeam(null);
                  setShowTeamModal(true);
                }}
                className={`px-4 py-2 text-white rounded-lg transition-all duration-200 shadow-lg ${!t ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600' : ''}`}
                style={t ? { background: t.accent } : undefined}
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
                      ? (!t ? 'bg-white border-2 border-emerald-400 shadow-lg' : 'border-2 shadow-lg')
                      : (!t ? 'bg-white/80 border border-gray-200 hover:border-emerald-300' : 'border hover:shadow-md')
                  }`}
                  style={t ? {
                    background: selectedTeam?.id === team.id ? t.cardActive : t.cardBg,
                    borderColor: selectedTeam?.id === team.id ? t.accent : t.cardBorder,
                  } : undefined}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg shadow-lg ${!t ? 'bg-gradient-to-r from-emerald-500 to-green-500' : ''}`}
                        style={t ? { background: t.accent } : undefined}
                      >
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{team.name}</h3>
                        <p className={`text-sm ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{team.members?.length || 0} miembros</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTeam(team);
                          setShowTeamModal(true);
                        }}
                        className={`p-2 rounded-lg transition-colors ${!t ? 'hover:bg-gray-100' : ''}`}
                      >
                        <Edit3 className={`w-4 h-4 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.iconColor } : undefined} />
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
                    <p className={`text-sm mb-3 line-clamp-2 ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSecondary } : undefined}>{team.description}</p>
                  )}
                  
                  {team.members && team.members.length > 0 && (
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 4).map((member: TeamMember, index: number) => (
                        <div 
                          key={member.id || index} 
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 ${!t ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-white' : ''}`}
                          style={t ? { background: t.accent, borderColor: t.panelBg } : undefined}
                          title={member.name}
                        >
                          {member.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      ))}
                      {team.members.length > 4 && (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 ${!t ? 'bg-gray-400 border-white' : ''}`}
                          style={t ? { background: t.textMuted, borderColor: t.panelBg } : undefined}
                        >
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
        <div className={`flex-1 backdrop-blur-xl overflow-y-auto ${!t ? 'bg-white/70' : ''}`}
          style={t ? { background: t.containerBg } : undefined}
        >
          {selectedTeam ? (
            <div className="h-full flex flex-col">
              
              {/* Header del Equipo */}
              <div className={`p-6 border-b flex-shrink-0 ${!t ? 'border-gray-200/60 bg-white/90' : ''}`}
                style={t ? { background: t.headerBg, borderColor: t.headerBorder } : undefined}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg shadow-lg ${!t ? 'bg-gradient-to-r from-emerald-500 to-green-500' : ''}`}
                      style={t ? { background: t.accent } : undefined}
                    >
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-bold ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{selectedTeam.name}</h2>
                      {selectedTeam.description && (
                        <p className={`${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSecondary } : undefined}>{selectedTeam.description}</p>
                      )}
                      <p className={`text-sm mt-1 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                        {selectedTeam.members?.length || 0} miembros • 
                        {selectedTeam.allow_auto_assign ? ' Auto-asignación activa' : ' Sin auto-asignación'}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setShowAddMembersModal(true)}
                    className={`px-4 py-2 text-white rounded-lg transition-all duration-300 flex items-center space-x-2 shadow-lg ${!t ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' : ''}`}
                    style={t ? { background: t.accent } : undefined}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Agregar Miembro</span>
                  </button>
                </div>
              </div>

              {/* Lista de Miembros */}
              <div className="flex-1 overflow-y-auto p-6">
                <h3 className={`text-lg font-semibold mb-4 ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Miembros del Equipo</h3>
                
                {!selectedTeam.members || selectedTeam.members.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className={`w-16 h-16 mx-auto mb-4 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                    <h4 className={`text-lg font-medium mb-2 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Sin miembros</h4>
                    <p className={`mb-4 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Este equipo aún no tiene miembros asignados</p>
                    <button 
                      onClick={() => setShowAddMembersModal(true)}
                      className={`px-4 py-2 text-white rounded-lg transition-all ${!t ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600' : ''}`}
                      style={t ? { background: t.accent } : undefined}
                    >
                      Agregar primer miembro
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedTeam.members.map((member: TeamMember) => {
                      const RoleIcon = getRoleIcon(member.role);
                      
                      return (
                        <div key={member.id} className={`border rounded-xl p-4 transition-all duration-300 ${!t ? 'bg-white border-gray-200 hover:shadow-md' : ''}`}
                          style={t ? { background: t.cardBg, borderColor: t.cardBorder } : undefined}
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold shadow ${!t ? 'bg-gradient-to-r from-blue-500 to-blue-600' : ''}`}
                              style={t ? { background: t.accent } : undefined}
                            >
                              {member.avatar_url ? (
                                <img src={member.avatar_url} alt={member.name} className="w-full h-full rounded-xl object-cover" />
                              ) : (
                                member.name?.charAt(0)?.toUpperCase() || 'U'
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className={`font-semibold ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{member.name || 'Sin nombre'}</h4>
                                <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${getRoleColor(member.role)}`}>
                                  <RoleIcon className="w-3 h-3" />
                                  <span className="capitalize">{member.role}</span>
                                </span>
                              </div>
                              <p className={`text-sm ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSecondary } : undefined}>{member.email}</p>
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
                <Users className={`w-20 h-20 mx-auto mb-4 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                <h3 className={`text-xl font-semibold mb-2 ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Selecciona un Equipo</h3>
                <p className={`${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Elige un equipo de la lista para ver sus detalles y miembros</p>
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
          <div className={`rounded-xl shadow-2xl w-full max-w-sm p-6 animate-scale-in ${!t ? 'bg-white' : ''}`}
            style={t ? { background: 'var(--theme-content-bg)', border: '1px solid', borderColor: isDark ? t.panelBorder : '#e5e7eb' } : undefined}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className={`p-3 rounded-full ${!t ? 'bg-red-100' : ''}`}
                style={t ? { background: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2' } : undefined}
              >
                <AlertCircle className={`w-6 h-6 ${!t ? 'text-red-600' : ''}`} style={t ? { color: isDark ? '#fca5a5' : '#dc2626' } : undefined} />
              </div>
              <h3 className={`text-lg font-semibold ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Eliminar Equipo</h3>
            </div>
            <p className={`mb-6 ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSecondary } : undefined}>
              ¿Estás seguro de eliminar este equipo? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`px-4 py-2 rounded-lg transition-colors ${!t ? 'text-gray-700 bg-gray-100 hover:bg-gray-200' : ''}`}
                style={t ? { color: t.textPrimary, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' } : undefined}
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