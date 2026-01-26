import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Settings,
  Crown,
  Shield,
  User,
  MoreHorizontal,
  Edit3,
  Trash2,
  Search,
  Plus,
  
  Loader2,
  Star,
  Activity,
  Clock,
  MessageSquare
} from 'lucide-react';
import { useTeams } from '../hooks/useChatwoot';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: 'administrator' | 'agent' | 'supervisor';
  status: 'online' | 'offline' | 'busy' | 'away';
  avatar?: string;
  phone?: string;
  joined_date: string;
  last_activity: string;
  conversations_count: number;
  response_time: number;
  satisfaction_score: number;
  permissions: string[];
}

interface Team {
  id: number;
  name: string;
  description: string;
  members: TeamMember[];
  created_at: string;
  updated_at: string;
  color: string;
}

const TeamsManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  
  // Usar el hook real de Chatwoot
  const { teams, loading, _error, _fetchTeams, _createTeam } = useTeams();

  // Usar equipos reales de Chatwoot (o array vacío si no hay)
  const actualTeams: Team[] = Array.isArray(teams) ? teams : [];

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredTeams = actualTeams.filter(team => {
    return team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           team.description.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-50 to-white backdrop-blur-xl border border-gray-200/50 overflow-hidden">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Gestión de Equipos</h1>
              <p className="text-gray-600">Administra equipos y miembros de WITHMIA</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowCreateTeamModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all duration-300 flex items-center space-x-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Equipo</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar equipos..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-md text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-gray-400/50 focus:border-gray-400/50 backdrop-blur-xl transition-all duration-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        
        {/* Lista de Equipos */}
        <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200/60 bg-white/60 backdrop-blur-xl overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Cargando equipos...</p>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay equipos creados</h3>
              <p className="text-gray-500 mb-4">Aún no se han configurado equipos en Chatwoot</p>
              <button
                onClick={() => setShowCreateTeamModal(true)}
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
                  onClick={() => setSelectedTeam(team)}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-300 hover:bg-gray-50 border ${
                    selectedTeam?.id === team.id 
                      ? 'bg-white border-gray-300 shadow-xl' 
                      : 'bg-white/80 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 bg-gradient-to-r ${team.color} rounded-md flex items-center justify-center shadow-lg`}>
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{team.name}</h3>
                        <p className="text-sm text-gray-600">{team.members.length} miembros</p>
                      </div>
                    </div>
                    <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                      <MoreHorizontal className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{team.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 3).map((member, index) => (
                        <div key={index} className="relative">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold border-2 border-white">
                            {member.avatar}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor(member.status)} rounded-full border border-white`} />
                        </div>
                      ))}
                      {team.members.length > 3 && (
                        <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white">
                          +{team.members.length - 3}
                        </div>
                      )}
                    </div>
                    
                    <span className="text-xs text-gray-500">
                      {formatDate(team.updated_at)}
                    </span>
                  </div>
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
              <div className="p-6 border-b border-gray-200/60 bg-white/90 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 bg-gradient-to-r ${selectedTeam.color} rounded-md flex items-center justify-center shadow-xl`}>
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{selectedTeam.name}</h2>
                      <p className="text-gray-600">{selectedTeam.description}</p>
                      <p className="text-sm text-gray-500 mt-1">{selectedTeam.members.length} miembros activos</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setShowInviteModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center space-x-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Invitar</span>
                    </button>
                    <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                      <Settings className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Métricas del Equipo */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/90 border border-gray-200 rounded-md p-4 text-center">
                    <MessageSquare className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-gray-800">
                      {selectedTeam.members.reduce((acc, m) => acc + m.conversations_count, 0)}
                    </p>
                    <p className="text-xs text-gray-600">Conversaciones</p>
                  </div>
                  <div className="bg-white/90 border border-gray-200 rounded-md p-4 text-center">
                    <Clock className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-gray-800">
                      {(selectedTeam.members.reduce((acc, m) => acc + m.response_time, 0) / selectedTeam.members.length).toFixed(1)}min
                    </p>
                    <p className="text-xs text-gray-600">Tiempo Respuesta</p>
                  </div>
                  <div className="bg-white/90 border border-gray-200 rounded-md p-4 text-center">
                    <Star className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-gray-800">
                      {(selectedTeam.members.reduce((acc, m) => acc + m.satisfaction_score, 0) / selectedTeam.members.length).toFixed(1)}/5
                    </p>
                    <p className="text-xs text-gray-600">Satisfacción</p>
                  </div>
                  <div className="bg-white/90 border border-gray-200 rounded-md p-4 text-center">
                    <Activity className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-gray-800">
                      {selectedTeam.members.filter(m => m.status === 'online').length}
                    </p>
                    <p className="text-xs text-gray-600">Online</p>
                  </div>
                </div>
              </div>

              {/* Lista de Miembros */}
              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Miembros del Equipo</h3>
                
                <div className="space-y-3">
                  {selectedTeam.members.map((member) => {
                    const RoleIcon = getRoleIcon(member.role);
                    
                    return (
                      <div key={member.id} className="bg-white/90 border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-all duration-300">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-md flex items-center justify-center text-white font-semibold">
                              {member.avatar}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 ${getStatusColor(member.status)} rounded-full border-2 border-white`} />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold text-gray-800">{member.name}</h4>
                              <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${getRoleColor(member.role)}`}>
                                <RoleIcon className="w-3 h-3" />
                                <span>{member.role}</span>
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">{member.email}</p>
                            
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div>
                                <p className="text-gray-500">Conversaciones</p>
                                <p className="font-semibold text-gray-800">{member.conversations_count}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Tiempo Respuesta</p>
                                <p className="font-semibold text-gray-800">{member.response_time}min</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Satisfacción</p>
                                <p className="font-semibold text-gray-800">{member.satisfaction_score}/5</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                              <Edit3 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button className="p-2 bg-gray-100 hover:bg-red-100 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Selecciona un Equipo</h3>
                <p className="text-gray-500">Elige un equipo para ver sus detalles</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamsManagement;