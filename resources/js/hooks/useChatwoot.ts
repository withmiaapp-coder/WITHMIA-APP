import { useState, useEffect, useCallback, useRef } from 'react';
import debugLog from '@/utils/debugLogger';
import { isReactionMessage } from '@/utils/messageUtils';

// ============================================================================
// HOOK PRINCIPAL: Gestión de Conversaciones con Chatwoot - OPTIMIZADO v2
// ============================================================================

interface ChatwootAPIConfig {
  baseUrl?: string;
}

const useChatwootAPI = (config: ChatwootAPIConfig = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async (endpoint: string, method = 'GET', data: any = null) => {
    setLoading(true);
    setError(null);

    // ⚡ Timeout de 20 segundos para Railway
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const requestConfig: RequestInit = {
        method,
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      };

      if (data && method !== 'GET') {
        requestConfig.body = JSON.stringify(data);
      }

      const response = await fetch(endpoint, requestConfig);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError('La solicitud tardó demasiado. Intenta de nuevo.');
        debugLog.warn('⏱️ Timeout en llamada API:', endpoint);
      } else {
        setError(err.message);
        debugLog.error('Chatwoot API Error:', err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { apiCall, loading, error };
};

// ============================================================================
// HOOK: useConversations - Gestión completa con PAGINACIÓN y OPTIMIZACIONES
// ============================================================================

export const useConversations = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversationState] = useState<any | null>(null);
  const [userInboxId, setUserInboxId] = useState<number | null>(null);
  const { apiCall, loading, error } = useChatwootAPI();
  
  // ✅ NUEVO: Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [totalConversations, setTotalConversations] = useState(0);
  const perPage = 25; // Cargar 25 conversaciones por página
  
  // ✅ NUEVO: Timestamps para polling incremental
  const lastFetchTimestamp = useRef<number>(Date.now());
  const lastUpdateTimestamp = useRef<number>(Date.now());
  //  HELPER: Deduplicar conversaciones por contacto (normalizar phone_number)
  const deduplicateConversations = (conversations: any[]) => {
    const contactMap = new Map();
    const groups: any[] = [];

    const normalizePhone = (phone: string | undefined) => {
      if (!phone) return null;
      return phone.replace(/[\s\-\(\)\+]/g, '');
    };

    const isGroup = (conv: any) => {
      const phone1 = conv.contact?.phone_number;
      const phone2 = conv.meta?.sender?.phone_number;
      const name = conv.contact?.name || conv.meta?.sender?.name || '';
      
      const hasNoPhone = !phone1 && !phone2;
      const phoneEqualsName = (phone1 === name || phone2 === name);
      const nameIndicatesGroup = name.toLowerCase().includes('grupo') || 
                                  name.toLowerCase().includes('group') ||
                                  name.includes('@g.us');
      
      return hasNoPhone || phoneEqualsName || nameIndicatesGroup;
    };

    conversations.forEach(conv => {
      if (isGroup(conv)) {
        groups.push(conv);
        return;
      }

      const phone1 = conv.contact?.phone_number;
      const phone2 = conv.meta?.sender?.phone_number;
      const rawPhone = phone1 || phone2;
      const normalizedPhone = normalizePhone(rawPhone);

      const identifier = conv.contact?.id || conv.meta?.sender?.id;
      const key = normalizedPhone || identifier || conv.id;

      const existing = contactMap.get(key);
      if (!existing) {
        contactMap.set(key, conv);
      } else {
        const existingTimestamp = existing.timestamp || existing.last_activity_at || existing.updated_at || 0;
        const currentTimestamp = conv.timestamp || conv.last_activity_at || conv.updated_at || 0;

        if (currentTimestamp > existingTimestamp) {
          contactMap.set(key, conv);
        }
      }
    });

    // FIX: Combinar conversaciones individuales y grupos, luego ordenar por timestamp
    const allConversations = [...Array.from(contactMap.values()), ...groups];
    const deduplicated = allConversations.sort((a: any, b: any) => {
      const timeA = a.timestamp || a.last_activity_at || new Date(a.updated_at || 0).getTime() / 1000 || 0;
      const timeB = b.timestamp || b.last_activity_at || new Date(b.updated_at || 0).getTime() / 1000 || 0;
      return timeB - timeA; // Más reciente primero
    });
    return deduplicated;
  };
  
  // 🆕 Helper: Construir last_message con soporte para attachments
  const buildLastMessage = (conv: any) => {
    const lastMsg = conv.last_non_activity_message;
    const attachments = lastMsg?.attachments || [];
    const content = lastMsg?.content || '';
    
    // Si no hay contenido pero hay attachments, generar preview del archivo
    let displayContent = content;
    if ((!content || content.trim() === '') && attachments.length > 0) {
      const attachment = attachments[0];
      const fileType = attachment.file_type || attachment.content_type || '';
      const fileName = attachment.data_url?.split('/').pop() || attachment.file_name || 'archivo';
      
      if (fileType.startsWith('image/')) displayContent = '📷 Imagen';
      else if (fileType.startsWith('video/')) displayContent = '🎥 Video';
      else if (fileType.startsWith('audio/')) displayContent = '🎵 Audio';
      else if (fileType.includes('pdf')) displayContent = '📄 PDF';
      else displayContent = `📎 ${fileName}`;
    } else if (!content || content.trim() === '') {
      displayContent = 'Sin mensajes';
    }
    
    return {
      content: displayContent,
      timestamp: conv.last_activity_at || conv.created_at,
      sender: lastMsg?.message_type === 0 ? 'contact' : 'agent',
      attachments: attachments
    };
  };
  
  // ✅ NUEVO: Cache de conversaciones para merge inteligente
  const conversationsCache = useRef<Map<number, any>>(new Map());
  
  // ✅ NUEVO: Ref para evitar stale closure en callbacks
  const conversationsRef = useRef<any[]>([]);
  const activeConversationRef = useRef<any | null>(null);
  
  // ✅ NUEVO: Flag para evitar cargas concurrentes de mensajes
  const isLoadingMessagesRef = useRef<Set<string>>(new Set());
  
  // 🚀 Cache local de mensajes con persistencia en sessionStorage
  const messagesLocalCache = useRef<Map<number, { messages: any[], timestamp: number, hasMore: boolean }>>(new Map());
  const LOCAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutos en ms
  
  // ✅ NUEVO: Cargar caché desde sessionStorage al iniciar
  useEffect(() => {
    try {
      const savedCache = sessionStorage.getItem('chatwoot_messages_cache');
      if (savedCache) {
        const parsed = JSON.parse(savedCache);
        const now = Date.now();
        // Solo restaurar mensajes que no hayan expirado
        Object.entries(parsed).forEach(([convId, data]: [string, any]) => {
          if (now - data.timestamp < LOCAL_CACHE_TTL) {
            messagesLocalCache.current.set(parseInt(convId), data);
            debugLog.log(`📥 Restaurada caché de conversación ${convId} desde sessionStorage`);
          }
        });
      }
    } catch (e) {
      debugLog.warn('Error restaurando caché de mensajes:', e);
    }
  }, []);
  
  // ✅ NUEVO: Función para guardar caché en sessionStorage
  const persistMessagesCache = useCallback(() => {
    try {
      const cacheObj: Record<string, any> = {};
      messagesLocalCache.current.forEach((value, key) => {
        cacheObj[key] = value;
      });
      sessionStorage.setItem('chatwoot_messages_cache', JSON.stringify(cacheObj));
    } catch (e) {
      debugLog.warn('Error guardando caché de mensajes:', e);
    }
  }, []);
  
  // 🚀 NUEVO: Prefetch queue
  const prefetchedConversations = useRef<Set<number>>(new Set());
  
  // Mantener refs actualizadas
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // ========================================
  // Obtener inbox_id del usuario autenticado
  // ========================================
  useEffect(() => {
    const fetchUserInboxId = async () => {
      try {
        const result = await fetch('/api/user/profile', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
          }
        });

        if (result.ok) {
          const data = await result.json();
          const inboxId = data.user?.company?.chatwoot_inbox_id || data.chatwoot_inbox_id || null;
          
          // Solo loguear si realmente obtuvimos un inbox_id
          if (inboxId) {
            debugLog.log('✅ User inbox_id obtenido:', inboxId);
          }
          setUserInboxId(inboxId);
        }
      } catch (err) {
        // Silenciar error - el inbox_id se obtiene desde las props del Dashboard
      }
    };

    fetchUserInboxId();
  }, []);

  // ========================================
  // ✅ OPTIMIZADO: Cargar TODAS las conversaciones (backend hace paginación infinita)
  // ========================================
  const fetchAllConversations = useCallback(async () => {
    try {
      // console.log('📚 Cargando TODAS las conversaciones...');
      
      // El backend ahora devuelve TODAS las conversaciones automáticamente
      const result = await apiCall('/api/chatwoot-proxy/conversations', 'GET');

      const payload = result?.data?.payload || result?.payload || [];
      const meta = result?.data?.meta || result?.meta || {};
      
      if (Array.isArray(payload)) {
        const chatwootConversations = payload.map((conv: any) => ({
          id: conv.id,
          contact: {
            id: conv.meta?.sender?.id || conv.contact_id,
            name: conv.meta?.sender?.name || 'Usuario Anónimo',
            email: conv.meta?.sender?.email || 'sin-email@example.com',
            phone_number: conv.meta?.sender?.phone_number || conv.meta?.sender?.name,
            avatar: conv.meta?.sender?.name?.charAt(0).toUpperCase() || 'U',
            avatarUrl: conv.meta?.sender?.thumbnail || conv.meta?.sender?.avatar_url || null,
            status: conv.meta?.sender?.availability_status || 'offline'
          },
          last_message: buildLastMessage(conv),
          status: conv.status,
          priority: conv.priority || 'medium',
          labels: conv.labels || [],
          unread_count: conv.unread_count || 0,
          inbox_id: conv.inbox_id,
          account_id: conv.account_id,
          assignee_id: conv.assignee?.id || null,
          assignee: conv.assignee || null,
          updated_at: conv.last_activity_at || conv.updated_at,
          meta: conv.meta
        }));
        
        const deduplicated = deduplicateConversations(chatwootConversations);
        setConversations(deduplicated); // FIX GRUPOS: Deduplicar contactos individuales, respetar grupos
        setTotalConversations(meta.total_count || chatwootConversations.length);
        setCurrentPage(1);
        setHasMorePages(false); // Ya cargamos todas
        
        // console.log(`✅ Total conversaciones cargadas: ${chatwootConversations.length}`);
      } else {
        setConversations([]);
        setTotalConversations(0);
      }
      
    } catch (err) {
      console.error('❌ Error cargando todas las conversaciones:', err);
      setConversations([]);
    }
  }, [apiCall]);

  // ========================================
  // ✅ OPTIMIZADO: Fetch de conversaciones con paginación
  // ========================================
  const fetchConversations = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      debugLog.log(`📄 Fetching conversations - Page ${page}, Per page: ${perPage}`);
      
      const result = await apiCall(
        `/api/chatwoot-proxy/conversations?page=${page}&per_page=${perPage}`,
        'GET'
      );

      const payload = result?.data?.payload || result?.payload || [];
      const meta = result?.data?.meta || result?.meta || {};
      
      // Actualizar metadatos de paginación
      setTotalConversations(meta.count || payload.length);
      setHasMorePages(meta.current_page < meta.total_pages);
      setCurrentPage(page);
      
      if (Array.isArray(payload)) {
        const chatwootConversations = payload.map((conv: any) => {
          const conversation = {
            id: conv.id,
            contact: {
              id: conv.meta?.sender?.id || conv.contact_id,
              name: conv.meta?.sender?.name || 'Usuario Anónimo',
              email: conv.meta?.sender?.email || 'sin-email@example.com',
              phone_number: conv.meta?.sender?.phone_number || conv.meta?.sender?.name,
              avatar: conv.meta?.sender?.name?.charAt(0).toUpperCase() || 'U',
            avatarUrl: conv.meta?.sender?.thumbnail || conv.meta?.sender?.avatar_url || null,
              status: conv.meta?.sender?.availability_status || 'offline'
            },
            last_message: buildLastMessage(conv),
            status: conv.status,
            priority: conv.priority || 'medium',
            labels: conv.labels || [],
            unread_count: conv.unread_count || 0,
            inbox_id: conv.inbox_id,
            account_id: conv.account_id,
            assignee_id: conv.assignee?.id || null,
            assignee: conv.assignee || null,
            updated_at: conv.last_activity_at || conv.updated_at
          };
          
          // Actualizar cache
          conversationsCache.current.set(conversation.id, conversation);
          
          return conversation;
        });

        if (append) {
          // Append para infinite scroll
          setConversations(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newConversations = chatwootConversations.filter(c => !existingIds.has(c.id));
            return [...prev, ...newConversations];
          });
        } else {
          // Replace para refresh
          const deduplicated = deduplicateConversations(chatwootConversations);
        setConversations(deduplicated); // FIX GRUPOS: Deduplicar contactos individuales, respetar grupos
        }
        
        lastFetchTimestamp.current = Date.now();
        
        debugLog.log(`✅ Loaded ${chatwootConversations.length} conversations (Page ${page})`);
      } else {
        setConversations([]);
      }
    } catch (err) {
      debugLog.error('Error fetching conversations:', err);
      if (!append) {
        setConversations([]);
      }
    }
  }, [apiCall, perPage]);

  // ========================================
  // ✅ NUEVO: Polling incremental (solo conversaciones actualizadas)
  // ========================================
  const fetchUpdatedConversations = useCallback(async () => {
    try {
      const updatedSince = Math.floor(lastUpdateTimestamp.current / 1000);
      
      debugLog.log(`🔄 Fetching updated conversations since ${new Date(lastUpdateTimestamp.current).toISOString()}`);
      
      const result = await apiCall(
        `/api/chatwoot-proxy/conversations?updated_since=${updatedSince}`,
        'GET'
      );

      const payload = result?.data?.payload || result?.payload || [];
      
      if (Array.isArray(payload) && payload.length > 0) {
        debugLog.log(`✅ Found ${payload.length} updated conversations`);
        
        const updatedConversations = payload.map((conv: any) => ({
          id: conv.id,
          contact: {
            id: conv.meta?.sender?.id || conv.contact_id,
            name: conv.meta?.sender?.name || 'Usuario Anónimo',
            email: conv.meta?.sender?.email || 'sin-email@example.com',
            phone_number: conv.meta?.sender?.phone_number || conv.meta?.sender?.name,
            avatar: conv.meta?.sender?.name?.charAt(0).toUpperCase() || 'U',
            avatarUrl: conv.meta?.sender?.thumbnail || conv.meta?.sender?.avatar_url || null,
            status: conv.meta?.sender?.availability_status || 'offline'
          },
          last_message: buildLastMessage(conv),
          status: conv.status,
          priority: conv.priority || 'medium',
          labels: conv.labels || [],
          unread_count: conv.unread_count || 0,
          inbox_id: conv.inbox_id,
          account_id: conv.account_id,
          assignee_id: conv.assignee?.id || null,
          assignee: conv.assignee || null,
          updated_at: conv.last_activity_at || conv.updated_at,
          meta: conv.meta
        }));
        
        // Merge inteligente: actualizar existentes o agregar nuevas
        setConversations(prev => {
          const conversationMap = new Map(prev.map(c => [c.id, c]));

          updatedConversations.forEach(updated => {
            const existing = conversationMap.get(updated.id);
            // ✅ FIX: Si el servidor dice unread_count 0, respetarlo (fue marcada como leída)
            // Solo usar Math.max si el servidor reporta mensajes no leídos
            let finalUnreadCount = updated.unread_count || 0;
            if (existing && updated.unread_count > 0) {
              // Solo mantener el máximo cuando HAY mensajes no leídos según el servidor
              finalUnreadCount = Math.max(updated.unread_count, existing.unread_count || 0);
            }
            const merged = existing ? { ...updated, unread_count: finalUnreadCount } : updated;
            conversationMap.set(updated.id, merged);
            conversationsCache.current.set(updated.id, merged);
          });

          // Helper function para obtener timestamp
          const getTimestamp = (conv: any) => {
            if (conv.updated_at) {
              return conv.updated_at > 10000000000 ? conv.updated_at : conv.updated_at * 1000;
            }
            if (conv.last_message?.timestamp) {
              return conv.last_message.timestamp > 10000000000 
                ? conv.last_message.timestamp 
                : conv.last_message.timestamp * 1000;
            }
            return 0;
          };

          // Ordenar por timestamp más reciente
          const sorted = Array.from(conversationMap.values()).sort((a, b) => {
            const timeA = getTimestamp(a);
            const timeB = getTimestamp(b);
            return timeB - timeA;
          });

          debugLog.log(`🔄 Conversaciones reordenadas. Primera: ${sorted[0]?.contact.name} (ID: ${sorted[0]?.id}) - Timestamp: ${new Date(getTimestamp(sorted[0])).toISOString()}`);
          
          return sorted;
        });
        lastUpdateTimestamp.current = Date.now();
        
        return updatedConversations.length;
      } else {
        debugLog.log('✅ No updates found');
        return 0;
      }
    } catch (err) {
      debugLog.error('Error fetching updated conversations:', err);
      return 0;
    }
  }, [apiCall]);

  // ========================================
  // ✅ NUEVO: Cargar más conversaciones (infinite scroll)
  // ========================================
  const loadMoreConversations = useCallback(async () => {
    if (!hasMorePages || loading) return;
    
    const nextPage = currentPage + 1;
    await fetchConversations(nextPage, true);
  }, [currentPage, hasMorePages, loading, fetchConversations]);

  // ========================================
  // Enviar mensaje
  // ========================================
  const sendMessage = useCallback(async (conversationId: number, content: string) => {
    try {
      const messageData = {
        content,
        message_type: 'outgoing',
        private: false
      };

      const result = await apiCall(
        `/api/chatwoot-proxy/conversations/${conversationId}/messages`,
        'POST',
        messageData
      );

      if (result?.payload) {
        // ✅ NO agregar aquí - ConversationsInterface ya lo hace optimísticamente
        debugLog.log('✅ Mensaje enviado exitosamente', { 
          id: result.payload.id, 
          content: result.payload.content 
        });

        return {
          id: result.payload.id,
          content: result.payload.content,
          timestamp: result.payload.created_at,
          sender: 'agent',
          status: 'sent'
        };
      }

      throw new Error('No se pudo enviar el mensaje');
    } catch (err) {
      debugLog.error('Error enviando mensaje:', err);
      throw err;
    }
  }, [apiCall]);

  // ========================================
  // Cargar mensajes de conversación - CON CACHE LOCAL + PAGINACIÓN
  // ========================================
  const loadConversationMessages = useCallback(async (conversationId: number, loadMore: boolean = false) => {
    // ✅ Evitar cargas concurrentes de la misma conversación
    // Para loadMore, usamos una key diferente para permitir cargar más mientras hay mensajes en cache
    const loadingKey = loadMore ? `${conversationId}-loadMore` : `${conversationId}`;
    
    if (isLoadingMessagesRef.current.has(loadingKey)) {
      debugLog.log(`⏭️ Ya se están cargando mensajes para conversación ${conversationId} (loadMore: ${loadMore}), omitiendo...`);
      return;
    }
    
    debugLog.log(`📥 Cargando mensajes para conversación ${conversationId} (loadMore: ${loadMore})`);
    isLoadingMessagesRef.current.add(loadingKey);
    
    // 🚀 CACHE LOCAL: Verificar si tenemos mensajes en cache (no expirados)
    const cached = messagesLocalCache.current.get(conversationId);
    const now = Date.now();
    
    if (cached && !loadMore && (now - cached.timestamp) < LOCAL_CACHE_TTL) {
      debugLog.log(`⚡ Mensajes de conversación ${conversationId} desde cache local`);
      const conversation = conversationsRef.current.find((c: any) => c.id === conversationId);
      if (conversation) {
        setActiveConversationState({
          ...conversation,
          messages: cached.messages,
          _isLoading: false,
          _hasMoreMessages: cached.hasMore
        });
        
        // Actualizar unread_count local
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
          )
        );
        
        // 🚀 PREFETCH: Precargar siguientes conversaciones en background
        prefetchNextConversations(conversationId);
        // Limpiar loading key ya que usamos cache
        isLoadingMessagesRef.current.delete(loadingKey);
        return;
      }
    }
    
    try {
      // 🚀 PAGINACIÓN: Si loadMore, enviar el ID más antiguo (20 mensajes para no saturar)
      let url = `/api/chatwoot-proxy/conversations/${conversationId}/messages?limit=20`;
      if (loadMore && cached?.messages?.length > 0) {
        const oldestId = cached.messages[0]?.id;
        if (oldestId) {
          url += `&before=${oldestId}`;
          debugLog.log(`📜 Cargando mensajes anteriores a ID: ${oldestId}`);
        }
      }
      
      debugLog.log(`🌐 Llamando API: ${url}`);
      const result = await apiCall(url);
      debugLog.log(`📦 Respuesta API:`, {
        success: result?.success,
        messagesCount: result?.payload?.payload?.length || result?.payload?.length || 0,
        hasMore: result?.meta?.has_more
      });
      const messagesArray = result?.payload?.payload || result?.payload || [];
      const meta = result?.meta || {};

      if (Array.isArray(messagesArray)) {
        // 🎭 Ya no filtramos reacciones aquí - se procesan en el frontend para mostrarlas
        const chatwootMessages = messagesArray
          .map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          timestamp: msg.created_at,
          created_at: msg.created_at,
          sender: msg.message_type === 0 ? 'contact' : 'agent',
          message_type: msg.message_type === 0 ? 'incoming' : 'outgoing',
          status: msg.status || 'sent',
          attachments: msg.attachments || [],
          sender_name: msg.sender?.name || 'Usuario',
          source_id: msg.source_id || null,
          isOptimistic: false,
          _isOptimistic: false
        }));

        // Deduplicación Evolution
        const duplicateIds = new Set<number>();
        const contentGroups = new Map<string, any[]>();
        
        for (const msg of chatwootMessages) {
          const msgTimestamp = typeof msg.timestamp === 'string' 
            ? new Date(msg.timestamp).getTime() 
            : msg.timestamp * 1000;
          const approxTimestamp = Math.floor(msgTimestamp / 3000);
          const groupKey = `${msg.content?.trim()}|${approxTimestamp}|${msg.message_type}`;
          
          if (!contentGroups.has(groupKey)) {
            contentGroups.set(groupKey, []);
          }
          contentGroups.get(groupKey)!.push(msg);
        }
        
        for (const [key, group] of contentGroups) {
          if (group.length >= 2) {
            const withSourceId = group.filter((m: any) => m.source_id?.startsWith('WAID:'));
            const withoutSourceId = group.filter((m: any) => !m.source_id);
            
            if (withSourceId.length >= 1 && withoutSourceId.length >= 1) {
              for (const dupMsg of withSourceId) {
                duplicateIds.add(dupMsg.id);
              }
            }
          }
        }
        
        let uniqueMessages = chatwootMessages
          .filter((m: any) => !duplicateIds.has(m.id))
          .sort((a: any, b: any) => {
            const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
            const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
            return timeA - timeB;
          });

        // 🚀 Si es loadMore, combinar con mensajes existentes
        if (loadMore && cached?.messages) {
          const existingIds = new Set(cached.messages.map((m: any) => m.id));
          const newOlderMessages = uniqueMessages.filter((m: any) => !existingIds.has(m.id));
          uniqueMessages = [...newOlderMessages, ...cached.messages];
        } else if (cached?.messages) {
          // ✅ FIX: Preservar mensajes optimistas/pendientes que aún no están en API
          const optimisticMessages = cached.messages.filter((m: any) => 
            m._isOptimistic || 
            String(m.id).startsWith('temp-') || 
            String(m.id).startsWith('pending-') ||
            m.status === 'sending'
          );
          
          if (optimisticMessages.length > 0) {
            debugLog.log(`💾 Preservando ${optimisticMessages.length} mensajes optimistas pendientes`);
            // Agregar mensajes optimistas que no están en la respuesta de API
            const apiMessageContents = new Set(uniqueMessages.map((m: any) => m.content?.trim()));
            const pendingToKeep = optimisticMessages.filter((m: any) => 
              !apiMessageContents.has(m.content?.trim())
            );
            
            if (pendingToKeep.length > 0) {
              uniqueMessages = [...uniqueMessages, ...pendingToKeep];
              debugLog.log(`📝 Agregados ${pendingToKeep.length} mensajes pendientes a la lista`);
            }
          }
        }

        // 🚀 Guardar en cache local
        messagesLocalCache.current.set(conversationId, {
          messages: uniqueMessages,
          timestamp: now,
          hasMore: meta.has_more ?? false
        });
        persistMessagesCache(); // ✅ Persistir en sessionStorage

        const conversation = conversationsRef.current.find((c: any) => c.id === conversationId);
        if (conversation) {
          setActiveConversationState({
            ...conversation,
            messages: uniqueMessages,
            _isLoading: false,
            _hasMoreMessages: meta.has_more ?? false
          });

          setConversations(prev =>
            prev.map(conv =>
              conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
            )
          );

          setActiveConversationState(prev =>
            prev ? { ...prev, unread_count: 0 } : prev
          );

          setTimeout(() => {
            markConversationAsRead(conversationId);
          }, 300);
          
          // 🚀 PREFETCH: Precargar siguientes conversaciones en background
          if (!loadMore) {
            prefetchNextConversations(conversationId);
          }
        }
      }
    } catch (err) {
      debugLog.error('Error cargando mensajes:', err);
      const conversation = conversationsRef.current.find((c: any) => c.id === conversationId);
      if (conversation) {
        setActiveConversationState({
          ...conversation,
          messages: cached?.messages || [],
          _isLoading: false
        });
      }
    } finally {
      debugLog.log(`✅ Liberando loading key: ${loadingKey}`);
      isLoadingMessagesRef.current.delete(loadingKey);
    }
  }, [apiCall]);

  // 🚀 PREFETCH: Precargar mensajes de las siguientes 2 conversaciones
  const prefetchNextConversations = useCallback((currentConversationId: number) => {
    const currentIndex = conversationsRef.current.findIndex(c => c.id === currentConversationId);
    if (currentIndex === -1) return;
    
    // Obtener las siguientes 2 conversaciones
    const nextConversations = conversationsRef.current.slice(currentIndex + 1, currentIndex + 3);
    
    nextConversations.forEach(conv => {
      // Solo prefetch si no está en cache
      if (!messagesLocalCache.current.has(conv.id) && !prefetchedConversations.current.has(conv.id)) {
        prefetchedConversations.current.add(conv.id);
        
        // Cargar en background con delay para no saturar
        setTimeout(() => {
          debugLog.log(`🔮 Prefetching mensajes para conversación ${conv.id}`);
          apiCall(`/api/chatwoot-proxy/conversations/${conv.id}/messages?limit=20`)
            .then(result => {
              const messagesArray = result?.payload?.payload || result?.payload || [];
              if (Array.isArray(messagesArray)) {
                // 🎭 Ya no filtramos reacciones aquí - se procesan en el frontend
                const chatwootMessages = messagesArray
                  .map((msg: any) => ({
                  id: msg.id,
                  content: msg.content,
                  timestamp: msg.created_at,
                  created_at: msg.created_at,
                  sender: msg.message_type === 0 ? 'contact' : 'agent',
                  message_type: msg.message_type === 0 ? 'incoming' : 'outgoing',
                  status: msg.status || 'sent',
                  attachments: msg.attachments || [],
                  sender_name: msg.sender?.name || 'Usuario',
                  source_id: msg.source_id || null,
                  isOptimistic: false,
                  _isOptimistic: false
                }));
                
                messagesLocalCache.current.set(conv.id, {
                  messages: chatwootMessages,
                  timestamp: Date.now(),
                  hasMore: result?.meta?.has_more ?? false
                });
                persistMessagesCache(); // ✅ Persistir en sessionStorage
                debugLog.log(`✅ Prefetch completado para conversación ${conv.id}`);
              }
            })
            .catch(() => {
              // Silenciar errores de prefetch
            });
        }, 500);
      }
    });
  }, [apiCall]);

  // ========================================
  // Marcar conversación como leída
  // ========================================
  const markConversationAsRead = useCallback(async (conversationId: number) => {
    try {
      await apiCall(`/api/chatwoot-proxy/conversations/${conversationId}/update_last_seen`, 'POST');

      // Actualizar estado local inmediatamente
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      );

      // Usar ref para evitar stale closure
      if (activeConversationRef.current?.id === conversationId) {
        setActiveConversationState(prev =>
          prev ? { ...prev, unread_count: 0 } : prev
        );
      }

      // ✅ NUEVO: Refetch la conversación después de marcar como leída
      // para obtener el unread_count actualizado desde Chatwoot
      setTimeout(async () => {
        try {
          const response = await apiCall(`/api/chatwoot-proxy/conversations/${conversationId}`);
          if (response?.payload) {
            // Actualizar en la lista de conversaciones
            setConversations(prev =>
              prev.map(conv =>
                conv.id === conversationId ? { ...conv, unread_count: response.payload.unread_count || 0 } : conv
              )
            );
            
            // Actualizar conversación activa también
            if (activeConversationRef.current?.id === conversationId) {
              setActiveConversationState(prev =>
                prev ? { ...prev, unread_count: response.payload.unread_count || 0 } : prev
              );
            }
            
            debugLog.log('✅ Conversación refetcheada después de marcar como leída - unread_count:', response.payload.unread_count);
          }
        } catch (err) {
          debugLog.warn('No se pudo refetch la conversación:', err);
        }
      }, 800); // 800ms de delay para que Chatwoot procese

    } catch (err) {
      debugLog.error('Error marcando como leída:', err);
    }
  }, [apiCall]);

  // ========================================
  // ✅ NUEVO: Función para actualizar caché de mensajes (para sincronización RT)
  // ========================================
  const updateMessagesCache = useCallback((conversationId: number, messages: any[]) => {
    if (!conversationId || !messages) return;
    
    const existingCache = messagesLocalCache.current.get(conversationId);
    messagesLocalCache.current.set(conversationId, {
      messages: messages,
      timestamp: Date.now(),
      hasMore: existingCache?.hasMore ?? false
    });
    persistMessagesCache(); // ✅ Persistir en sessionStorage
    debugLog.log(`💾 Caché de mensajes actualizada para conversación ${conversationId} (${messages.length} mensajes)`);
  }, [persistMessagesCache]);

  // ========================================
  // ✅ NUEVO: Función para agregar mensaje a caché existente
  // ========================================
  const addMessageToCache = useCallback((conversationId: number, newMessage: any) => {
    if (!conversationId || !newMessage) return;
    
    const existingCache = messagesLocalCache.current.get(conversationId);
    if (existingCache) {
      // Verificar que el mensaje no exista ya
      const messageExists = existingCache.messages.some((m: any) => 
        m.id === newMessage.id || 
        (m._isOptimistic && m.content === newMessage.content)
      );
      
      if (!messageExists) {
        const updatedMessages = [...existingCache.messages, newMessage];
        messagesLocalCache.current.set(conversationId, {
          messages: updatedMessages,
          timestamp: Date.now(),
          hasMore: existingCache.hasMore
        });
        persistMessagesCache(); // ✅ Persistir en sessionStorage
        debugLog.log(`💾 Mensaje agregado a caché para conversación ${conversationId}`);
      }
    }
  }, [persistMessagesCache]);

  // ========================================
  // ✅ NUEVO: Cargar TODAS las conversaciones inicialmente
  // ========================================
  useEffect(() => {
    fetchAllConversations();
  }, [fetchAllConversations]);

  return {
    conversations: conversations || [],
    activeConversation,
    userInboxId,
    loading,
    error,
    fetchConversations,
    fetchAllConversations, // ✅ NUEVO: Función para cargar TODAS las conversaciones
    fetchUpdatedConversations,
    loadMoreConversations,
    sendMessage,
    loadConversationMessages,
    markConversationAsRead, // ✅ Función para marcar como leída
    setActiveConversation: setActiveConversationState,
    updateMessagesCache, // ✅ NUEVO: Función para actualizar caché de mensajes
    addMessageToCache, // ✅ NUEVO: Función para agregar mensaje a caché
    // ✅ NUEVO: Metadatos de paginación
    currentPage,
    hasMorePages,
    totalConversations,
    setConversations, //  NUEVO: Función para actualizar conversaciones directamente
    perPage
  };
};

// ============================================================================
// HOOK: useTeams - Gestión de equipos
// ============================================================================

export const useTeams = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const { apiCall, loading, error } = useChatwootAPI();

  const fetchTeams = useCallback(async () => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/teams');
      setTeams(result);
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  }, [apiCall]);

  const createTeam = useCallback(async (teamData: any) => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/teams', 'POST', teamData);
      await fetchTeams();
      return result;
    } catch (err) {
      console.error('Error creating team:', err);
      throw err;
    }
  }, [apiCall, fetchTeams]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return { teams, loading, error, fetchTeams, createTeam };
};

// ============================================================================
// HOOK: useLabels - Gestión de etiquetas
// ============================================================================

export const useLabels = () => {
  const [labels, setLabels] = useState<any[]>([]);
  const { apiCall, loading, error } = useChatwootAPI();

  const fetchLabels = useCallback(async () => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/labels');
      setLabels(result);
    } catch (err) {
      console.error('Error fetching labels:', err);
    }
  }, [apiCall]);

  const createLabel = useCallback(async (labelData: any) => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/labels', 'POST', labelData);
      await fetchLabels();
      return result;
    } catch (err) {
      console.error('Error creating label:', err);
      throw err;
    }
  }, [apiCall, fetchLabels]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  return { labels, loading, error, fetchLabels, createLabel };
};

// ============================================================================
// HOOK: useAgents - Gestión de agentes
// ============================================================================

export const useAgents = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const { apiCall, loading, error } = useChatwootAPI();

  const fetchAgents = useCallback(async () => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/agents');
      setAgents(result);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  }, [apiCall]);

  const createAgent = useCallback(async (agentData: any) => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/agents', 'POST', agentData);
      await fetchAgents();
      return result;
    } catch (err) {
      console.error('Error creating agent:', err);
      throw err;
    }
  }, [apiCall, fetchAgents]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, fetchAgents, createAgent };
};

// ============================================================================
// HOOK: useEnterpriseDashboard - Dashboard empresarial
// ============================================================================

export const useEnterpriseDashboard = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const { apiCall, loading, error } = useChatwootAPI();

  const fetchDashboardData = useCallback(async () => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/enterprise/dashboard');
      setDashboardData(result);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }, [apiCall]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { dashboardData, loading, error, fetchDashboardData };
};

// ============================================================================
// HOOK: useUserStats - Estadísticas de usuario
// ============================================================================

export const useUserStats = () => {
  const [stats, setStats] = useState<any>(null);
  const { apiCall, loading, error } = useChatwootAPI();

  const fetchUserStats = useCallback(async () => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/user/stats');
      setStats(result);
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  }, [apiCall]);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  return { stats, loading, error, fetchUserStats };
};
