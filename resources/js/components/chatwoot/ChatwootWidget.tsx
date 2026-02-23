import React, { useState, useEffect } from 'react';
import { MessageCircle, Users, MoreHorizontal, RefreshCw, User, Clock, Wifi, WifiOff } from 'lucide-react';
import { useConversations } from '../../hooks/useChatwoot';

interface ChatwootWidgetProps {
  chatwootUrl?: string;
}

interface ConversationData {
  id: number;
  contact_name: string;
  last_message: string;
  status: 'open' | 'resolved' | 'pending';
  created_at: string;
  unread_count: number;
}

interface StatsData {
  total: number;
  open: number;
  resolved: number;
  pending: number;
  agents_online?: number;
}

export default function ChatwootWidget({ chatwootUrl }: ChatwootWidgetProps) {
  // Usar el hook mejorado con todas las nuevas características
  const { 
    conversations, 
    loading, 
    error, 
    fetchAllConversations, 
    totalConversations
  } = useConversations();
  
  const [stats, setStats] = useState<StatsData>({ total: 0, open: 0, resolved: 0, pending: 0 });
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Detectar estado de conexión WebSocket
  useEffect(() => {
    const checkConnection = () => {
      // Verificar si hay actualizaciones recientes
      const timeSinceUpdate = Date.now() - lastUpdate.getTime();
      setWsConnected(timeSinceUpdate < 60000); // 1 minuto
    };

    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  // Actualizar timestamp cuando cambian las conversaciones
  useEffect(() => {
    if (conversations.length > 0) {
      setLastUpdate(new Date());
    }
  }, [conversations]);

  // Calcular estadísticas desde las conversaciones
  useEffect(() => {
    if ((conversations || []).length > 0) {
      const open = conversations.filter(c => c.status === 'open').length;
      const resolved = conversations.filter(c => c.status === 'resolved').length;
      const pending = conversations.filter(c => c.status === 'pending').length;

      setStats({
        total: (conversations || []).length,
        open,
        resolved,
        pending
      });
    }
  }, [conversations]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-100';
      case 'resolved': return 'text-emerald-600 bg-emerald-100';
      case 'pending': return 'text-amber-600 bg-amber-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  if (loading && (conversations || []).length === 0) {
    return (
      <div className="h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-6 h-6" />
              <div>
                <h3 className="font-semibold text-lg">Conversaciones</h3>
                <p className="text-blue-100 text-sm">Centro de mensajería WITHMIA</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Cargando conversaciones...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header del Widget */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6" />
            <div>
              <h3 className="font-semibold text-lg">Conversaciones</h3>
              <p className="text-blue-100 text-sm">Centro de mensajería WITHMIA</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Indicador de conexión WebSocket */}
            <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${wsConnected ? 'bg-emerald-500/30' : 'bg-amber-500/30'}`}>
              {wsConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span className="text-xs font-medium">Conectado</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span className="text-xs font-medium">Desconectado</span>
                </>
              )}
            </div>
            {/* Botón de refresh */}
            <button
              onClick={fetchAllConversations}
              className="p-1 hover:bg-blue-500/30 rounded"
              disabled={loading}
              title="Actualizar conversaciones"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {/* Botón para limpiar cache */}
            <button
              onClick={() => fetchAllConversations()}
              className="p-1 hover:bg-blue-500/30 rounded text-xs"
              title="Limpiar caché"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Banner informativo con timestamp */}
      <div className="bg-blue-50 px-4 py-2 border-b border-blue-100">
        <div className="flex items-center justify-between text-xs text-blue-700">
          <span>✅ Caché persistente activa</span>
          <span>📡 Última actualización: {lastUpdate.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats reales desde API */}
      <div className="bg-gray-50 px-4 py-3 border-b">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-600">{stats.open}</div>
            <div className="text-xs text-gray-500">Abiertas</div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-600">{stats.resolved}</div>
            <div className="text-xs text-gray-500">Resueltas</div>
          </div>
          <div>
            <div className="text-lg font-bold text-amber-600">{stats.pending}</div>
            <div className="text-xs text-gray-500">Pendientes</div>
          </div>
        </div>
      </div>

      {/* Lista de conversaciones */}
      <div className="flex-1 overflow-y-auto max-h-[600px]">
        {error && (
          <div className="p-4 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchAllConversations}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Reintentar
            </button>
          </div>
        )}

        {(conversations || []).length === 0 && !loading && !error ? (
          <div className="p-8 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay conversaciones</p>
            <p className="text-gray-400 text-sm mt-2">Las conversaciones aparecerán aquí cuando lleguen mensajes</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {conversations.map((conversation) => (
              <div key={conversation.id} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {conversation.contact?.avatar || 'U'}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 truncate">
                        {conversation.contact?.name || 'Usuario Anónimo'}
                      </p>
                      <div className="flex items-center space-x-2">
                        {conversation.unread_count > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                            {conversation.unread_count}
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(conversation.status)}`}>
                          {conversation.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conversation.last_message?.content || 'Sin mensajes'}
                    </p>

                    <div className="flex items-center mt-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(String(conversation.last_message?.timestamp || new Date().toISOString()))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer con contador total */}
      <div className="bg-gray-50 px-4 py-3 border-t">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>{totalConversations} conversaciones totales</span>
          </span>
          <span className="text-xs text-gray-400">
            v3.0 • WebSocket + Cache
          </span>
        </div>
      </div>
    </div>
  );
}
