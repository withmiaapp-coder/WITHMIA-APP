import { useState, useEffect, useCallback } from 'react';

// Hook para gestionar APIs de Chatwoot Enterprise
export const useChatwootAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCall = async (endpoint, method = 'GET', data = null, chatwootDirect = false) => {
    setLoading(true);
    setError(null);

    try {
      // Si es llamada directa a Chatwoot, usar la API enterprise
      const baseUrl = chatwootDirect ? '' : '';
      const fullUrl = chatwootDirect ? endpoint : endpoint;

      const config = {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        }
      };

      if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(fullUrl, config);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('Chatwoot API Error:', err);
      throw err;
    }
  };

  return { apiCall, loading, error };
};

// Hook específico para Conversaciones
export const useConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const { apiCall, loading, error } = useChatwootAPI();

  const fetchConversations = useCallback(async () => {
    try {
      // ✅ ACTUALIZADO: Usar endpoint filtrado por usuario
      const result = await apiCall('/api/chatwoot-proxy/user/conversations', 'GET');

      if (result && result.success && result.data) {
        // Manejar diferentes estructuras de respuesta
        const payload = result.data.data?.payload || result.data.payload || [];
        
        const chatwootConversations = payload.map(conv => ({
          id: conv.id,
          contact: {
            name: conv.meta?.sender?.name || 'Usuario Anónimo',
            email: conv.meta?.sender?.email || 'sin-email@example.com',
            avatar: conv.meta?.sender?.name?.charAt(0).toUpperCase() || 'U',
            status: conv.meta?.sender?.availability_status || 'offline'
          },
          last_message: {
            content: conv.last_non_activity_message?.content || 'Sin mensajes',
            timestamp: new Date((conv.last_activity_at || conv.created_at) * 1000).toISOString(),
            sender: conv.last_non_activity_message?.message_type === 0 ? 'contact' : 'agent'
          },
          status: conv.status,
          priority: conv.priority || 'medium',
          labels: conv.labels || [],
          unread_count: conv.unread_count || 0,
          inbox_id: conv.inbox_id,
          account_id: conv.account_id,
          assignee_id: conv.assignee?.id || null,
        }));

        setConversations(chatwootConversations);
      } else if (result && result.data && result.data.payload) {
        const chatwootConversations = result.data.payload.map(conv => ({
          id: conv.id,
          contact: {
            name: conv.meta?.sender?.name || 'Usuario Anónimo',
            email: conv.meta?.sender?.email || 'sin-email@example.com',
            avatar: conv.meta?.sender?.name?.charAt(0).toUpperCase() || 'U',
            status: conv.meta?.sender?.availability_status || 'offline'
          },
          last_message: {
            content: conv.last_non_activity_message?.content || 'Sin mensajes',
            timestamp: new Date((conv.last_activity_at || conv.created_at) * 1000).toISOString(),
            sender: conv.last_non_activity_message?.message_type === 0 ? 'contact' : 'agent'
          },
          status: conv.status,
          priority: conv.priority || 'medium',
          labels: conv.labels || [],
          unread_count: conv.unread_count || 0,
          inbox_id: conv.inbox_id,
          account_id: conv.account_id,
          assignee_id: conv.assignee?.id || null,
        }));

        setConversations(chatwootConversations);
      } else {
        // Fallback si no hay conversaciones
        setConversations([]);
      }
    } catch (err) {
      console.error('Error fetching conversations from Chatwoot:', err);
      // En caso de error, mantener conversaciones vacías en lugar de mostrar datos falsos
      setConversations([]);
    }
  }, [apiCall]);

  const loadConversationMessages = useCallback(async (conversationId) => {
    try {
      // Cargar mensajes reales de Chatwoot Enterprise - RUTA CORREGIDA
      const result = await apiCall(`/api/chatwoot-proxy/conversations/${conversationId}/messages`);

      if (result && result.payload) {
        const chatwootMessages = result.payload.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: new Date(msg.created_at * 1000).toISOString(),
          sender: msg.message_type === 0 ? 'contact' : 'agent',
          status: msg.status || 'sent',
          attachments: msg.attachments || [],
          sender_name: msg.sender?.name || 'Usuario'
        }));

        setActiveConversation(prevConv => {
          const conversation = conversations.find(c => c.id === conversationId);
          if (conversation) {
            return {
              ...conversation,
              messages: chatwootMessages
            };
          }
          return prevConv;
        });
      }
    } catch (err) {
      console.error('Error loading messages from Chatwoot:', err);
      // En caso de error, mantener conversación sin mensajes
      setActiveConversation(prevConv => {
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
          return {
            ...conversation,
            messages: []
          };
        }
        return prevConv;
      });
    }
  }, [apiCall, conversations]);

  const sendMessage = useCallback(async (conversationId, content) => {
    try {
      // Envío real de mensaje a Chatwoot Enterprise - RUTA CORREGIDA
      const messageData = {
        content,
        message_type: 'outgoing',
        private: false
      };

      const result = await apiCall(`/api/chatwoot-proxy/conversations/${conversationId}/messages`, 'POST', messageData);

      if (result && result.payload) {
        const newMessage = {
          id: result.payload.id,
          content: result.payload.content,
          timestamp: new Date(result.payload.created_at * 1000).toISOString(),
          sender: 'agent',
          status: 'sent'
        };

        // Actualizar conversación local
        setActiveConversation(prev => {
          if (prev && prev.id === conversationId) {
            return {
              ...prev,
              messages: [...(prev.messages || []), newMessage]
            };
          }
          return prev;
        });

        // Refrescar lista de conversaciones
        await fetchConversations();

        return newMessage;
      }

      throw new Error('No se pudo enviar el mensaje');
    } catch (err) {
      console.error('Error sending message to Chatwoot:', err);
      throw err;
    }
  }, [apiCall, fetchConversations]);

  // Carga inicial de conversaciones (WebSocket manejará las actualizaciones)
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Carga inicial de mensajes (WebSocket manejará las actualizaciones)
  useEffect(() => {
    if (activeConversation && activeConversation.id) {
      loadConversationMessages(activeConversation.id);
      
      return () => {
        clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
      };
    }
  }, [activeConversation?.id, loadConversationMessages]);

  return {
    conversations,
    activeConversation,
    loading,
    error,
    fetchConversations,
    sendMessage,
    loadConversationMessages,
    setActiveConversation
  };
};

// Hook para estadísticas de usuario
export const useUserStats = () => {
  const [stats, setStats] = useState(null);
  const { apiCall, loading, error } = useChatwootAPI();

  const fetchStats = async () => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/user/stats', 'GET');

      if (result && result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
      setStats(null);
    }
  };

  useEffect(() => {
    fetchStats();
    // WebSocket manejará las actualizaciones en tiempo real
  }, []);

  return { stats, loading, error, fetchStats };
};

// Hook para Teams/Equipos
export const useTeams = () => {
  const [teams, setTeams] = useState([]);
  const { apiCall, loading, error } = useChatwootAPI();

  const fetchTeams = async () => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/teams');
      setTeams(result);
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  const createTeam = async (teamData) => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/teams', 'POST', teamData);
      await fetchTeams(); // Refresh teams
      return result;
    } catch (err) {
      console.error('Error creating team:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  return { teams, loading, error, fetchTeams, createTeam };
};

// Hook para Labels/Etiquetas
export const useLabels = () => {
  const [labels, setLabels] = useState([]);
  const { apiCall, loading, error } = useChatwootAPI();

  const fetchLabels = async () => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/labels');
      setLabels(result);
    } catch (err) {
      console.error('Error fetching labels:', err);
    }
  };

  const createLabel = async (labelData) => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/labels', 'POST', labelData);
      await fetchLabels(); // Refresh labels
      return result;
    } catch (err) {
      console.error('Error creating label:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  return { labels, loading, error, fetchLabels, createLabel };
};

// Hook para Dashboard Enterprise
export const useEnterpriseDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const { apiCall, loading, error } = useChatwootAPI();

  const fetchDashboardData = async () => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/enterprise/dashboard');
      setDashboardData(result);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return { dashboardData, loading, error, fetchDashboardData };
};

// Hook para Agents
export const useAgents = () => {
  const [agents, setAgents] = useState([]);
  const { apiCall, loading, error } = useChatwootAPI();

  const fetchAgents = async () => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/agents');
      setAgents(result);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  const createAgent = async (agentData) => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/agents', 'POST', agentData);
      await fetchAgents(); // Refresh agents
      return result;
    } catch (err) {
      console.error('Error creating agent:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  return { agents, loading, error, fetchAgents, createAgent };
};
