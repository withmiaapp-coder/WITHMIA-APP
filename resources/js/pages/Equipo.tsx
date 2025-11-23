import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Settings,
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Send,
  Shield,
  Eye,
  RefreshCw,
  Trash2
} from 'lucide-react';
import axios from 'axios';

interface Props {
  user: any;
  company: any;
}

interface ChatwootConfig {
  is_provisioned: boolean;
  account_id?: number;
  api_key_configured: boolean;
  company_name: string;
  widget_configured: boolean;
}

interface AgentInvitation {
  id: number;
  email: string;
  name: string;
  role: 'agent' | 'administrator';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  invited_by: {
    name: string;
    email: string;
  };
}

export default function Equipo({ user, company }: Props) {
  const [config, setConfig] = useState<ChatwootConfig | null>(null);
  const [invitations, setInvitations] = useState<AgentInvitation[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'agent' as 'agent' | 'administrator',
    team: 'sales' as 'sales' | 'management'
  });

  const fetchConfig = async () => {
    try {
      const response = await axios.get('/api/chatwoot/config');
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await axios.get('/api/chatwoot/invitations');
      setInvitations(response.data);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const sendInvitation = async () => {
    try {
      await axios.post('/api/chatwoot/invite-agent', inviteForm);
      setShowInviteModal(false);
      setInviteForm({
        email: '',
        name: '',
        role: 'agent',
        team: 'sales'
      });
      fetchInvitations();
    } catch (error) {
      console.error('Error sending invitation:', error);
    }
  };

  const cancelInvitation = async (invitationId: number) => {
    try {
      await axios.delete('/api/chatwoot/invitations/' + invitationId);
      fetchInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
    }
  };

  const resendInvitation = async (invitationId: number) => {
    try {
      await axios.post('/api/chatwoot/invitations/' + invitationId + '/resend');
      fetchInvitations();
    } catch (error) {
      console.error('Error resending invitation:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-gray-600" />;
      case 'expired':
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      pending: 'Pendiente',
      accepted: 'Aceptada',
      expired: 'Expirada',
      cancelled: 'Cancelada'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getTeamName = (team: string) => {
    return team === 'sales' ? 'Equipo de Ventas' : 'Equipo Gestión Interna';
  };

  useEffect(() => {
    fetchConfig();
    fetchInvitations();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head title="Gestión de Equipos" />
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => window.history.back()}
                  className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">Gestión de Equipos</h1>
                    <p className="text-sm text-gray-500">Administra agentes e invitaciones</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowInviteModal(true)}
                disabled={!config?.is_provisioned}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                Invitar Agente
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Config Status */}
          {!config?.is_provisioned ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Chatwoot no está configurado
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Necesitas completar la configuración de Chatwoot antes de poder gestionar equipos.
                  </p>
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Ir a Configuración
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Chatwoot Configurado
                  </h3>
                  <p className="text-gray-600">
                    Cuenta ID: <span className="font-mono text-sm bg-white px-2 py-1 rounded border">{config.account_id}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Teams Overview */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Equipos Disponibles
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Equipo de Ventas</h3>
                    <p className="text-gray-600 text-sm">Gestiona leads y conversaciones de venta</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Equipo Gestión Interna</h3>
                    <p className="text-gray-600 text-sm">Administra operaciones internas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invitations */}
          {invitations.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Invitaciones Enviadas
              </h2>
              
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Mail className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{invitation.name}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600">{invitation.email}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{getTeamName(invitation.role === 'agent' ? 'sales' : 'management')}</span>
                            <span>•</span>
                            <span className="capitalize">{invitation.role}</span>
                            <span>•</span>
                            <span>Enviada el {formatDate(invitation.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-white rounded border text-sm">
                          {getStatusIcon(invitation.status)}
                          <span className="text-gray-600">{getStatusText(invitation.status)}</span>
                        </div>
                        
                        {invitation.status === 'pending' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => resendInvitation(invitation.id)}
                              className="p-1 rounded hover:bg-gray-200 transition-colors"
                              title="Reenviar"
                            >
                              <RefreshCw className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => cancelInvitation(invitation.id)}
                              className="p-1 rounded hover:bg-gray-200 transition-colors"
                              title="Cancelar"
                            >
                              <Trash2 className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg border border-gray-200 w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Invitar Nuevo Agente</h3>
                    <p className="text-sm text-gray-600">Envía una invitación por email</p>
                  </div>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                      placeholder="Nombre del agente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección de email
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      placeholder="email@ejemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Equipo asignado
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 transition-all"
                      value={inviteForm.team}
                      onChange={(e) => setInviteForm({ ...inviteForm, team: e.target.value as any })}
                    >
                      <option value="sales">Equipo de Ventas</option>
                      <option value="management">Equipo Gestión Interna</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rol del agente
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 transition-all"
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                    >
                      <option value="agent">Agente</option>
                      <option value="administrator">Administrador</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={sendInvitation}
                    disabled={!inviteForm.email || !inviteForm.name}
                    className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Enviar Invitación
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}