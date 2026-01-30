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
      
    } catch (err: any) {
      // Ignorar errores de abort (componente desmontado)
      if (err?.name === 'AbortError') return;
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
            meta: conv.meta, // Incluir meta para acceso a sender info
            last_message: buildLastMessage(conv),
            status: conv.status,
            priority: conv.priority || 'medium',
            labels: conv.labels || [],
            unread_count: conv.unread_count || 0,
            messages_count: conv.messages_count || 0, // Añadir conteo de mensajes
            inbox_id: conv.inbox_id,
            account_id: conv.account_id,
            assignee_id: conv.assignee?.id || null,
            assignee: conv.assignee || null,
            updated_at: conv.last_activity_at || conv.updated_at,
            created_at: conv.created_at
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
        
        // Merge: actualizar existentes o agregar nuevas
        setConversations(prev => {
          const conversationMap = new Map(prev.map(c => [c.id, c]));

          updatedConversations.forEach(updated => {
            const existing = conversationMap.get(updated.id);
            // Mantener unread_count existente (manejado por GlobalNotificationContext)
            const finalUnreadCount = existing?.unread_count ?? updated.unread_count ?? 0;
            const merged = existing ? { ...updated, unread_count: finalUnreadCount } : updated;
            conversationMap.set(updated.id, merged);
            conversationsCache.current.set(updated.id, merged);
          });

          // Ordenar por timestamp
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

          const sorted = Array.from(conversationMap.values()).sort((a, b) => {
            const timeA = getTimestamp(a);
            const timeB = getTimestamp(b);
            return timeB - timeA;
          });
          
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
    
    // � Marcar como loading INMEDIATAMENTE para mostrar el spinner
    if (loadMore) {
      setActiveConversationState(prev => prev ? { ...prev, _isLoading: true } : prev);
    }
    
    // 🚀 CACHE LOCAL: Verificar si tenemos mensajes en cache (no expirados)
    const cached = messagesLocalCache.current.get(conversationId);
    const now = Date.now();
    
    // 🔧 FIX: Si el caché tiene hasMore=false pero pocos mensajes (< 25), 
    // asumir que puede haber más (el backend anterior tenía un bug)
    const cachedHasMore = cached?.hasMore ?? (cached?.messages?.length >= 20);
    
    if (cached && !loadMore && (now - cached.timestamp) < LOCAL_CACHE_TTL) {
      debugLog.log(`⚡ Mensajes de conversación ${conversationId} desde cache local`);
      const conversation = conversationsRef.current.find((c: any) => c.id === conversationId);
      if (conversation) {
        setActiveConversationState({
          ...conversation,
          messages: cached.messages,
          _isLoading: false,
          _hasMoreMessages: cachedHasMore  // Usar el valor corregido
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
      if (loadMore) {
        // Buscar mensajes en cache o en la conversación activa
        const currentMessages = cached?.messages || activeConversationRef.current?.messages || [];
        console.log('🔍 LoadMore - mensajes actuales:', currentMessages.length);
        if (currentMessages.length > 0) {
          // Ordenar por ID ascendente y obtener el más antiguo (menor ID)
          const sortedMessages = [...currentMessages].sort((a, b) => a.id - b.id);
          const oldestId = sortedMessages[0]?.id;
          console.log('🔍 Mensaje más antiguo ID:', oldestId);
          if (oldestId) {
            url += `&before=${oldestId}`;
            console.log(`📜 URL con before: ${url}`);
          }
        }
      }
      
      console.log(`🌐 Llamando API: ${url}`);
      const result = await apiCall(url);
      console.log(`📦 Respuesta API:`, {
        success: result?.success,
        messagesCount: result?.payload?.payload?.length || result?.payload?.length || 0,
        hasMore: result?.meta?.has_more,
        firstMsgId: (result?.payload?.payload || result?.payload)?.[0]?.id,
        lastMsgId: (result?.payload?.payload || result?.payload)?.[(result?.payload?.payload || result?.payload)?.length - 1]?.id,
        _debug: result?.meta?._debug // Mostrar debug del backend
      });
      const messagesArray = result?.payload?.payload || result?.payload || [];
      const meta = result?.meta || {};
      
      console.log('🔍 DEBUG messagesArray:', {
        isArray: Array.isArray(messagesArray),
        length: messagesArray?.length,
        firstMsg: messagesArray?.[0],
        rawPayload: result?.payload
      });
      
      // Debug: ver todos los message_type
      console.log('🔍 DEBUG message_types RAW:', messagesArray?.slice(0, 5).map((m: any) => ({
        id: m.id,
        message_type: m.message_type,
        typeOf: typeof m.message_type,
        content: m.content?.substring(0, 30)
      })));
      
      // 🔍 DEBUG: Contar tipos de mensaje
      const typesCounts: Record<string, number> = {};
      messagesArray?.forEach((m: any) => {
        const key = `${m.message_type}(${typeof m.message_type})`;
        typesCounts[key] = (typesCounts[key] || 0) + 1;
      });
      console.log('🔍 DEBUG message_types COUNTS:', typesCounts);

      if (Array.isArray(messagesArray)) {
        // 🎭 Ya no filtramos reacciones aquí - se procesan en el frontend para mostrarlas
        // 🚫 TEMPORALMENTE DESACTIVADO: Filtrar mensajes de actividad para debug
        // NOTA: Comparar tanto con número como con string por si acaso
        const chatwootMessages = messagesArray
          .filter((msg: any) => {
            const msgType = msg.message_type;
            // 🔍 DEBUG TEMPORAL: No filtrar nada, solo loguear
            console.log('🔍 MSG:', msg.id, 'type:', msgType, 'typeof:', typeof msgType, 'content:', msg.content?.substring(0, 30));
            // BYPASS TEMPORAL: Aceptar TODO excepto undefined
            return msgType !== undefined;
          })
          .map((msg: any) => {
            // Determinar sender basado en message_type
            // Chatwoot: 0 = incoming (contact), 1 = outgoing (agent)
            const isIncoming = msg.message_type === 0 || msg.message_type === '0';
            return {
              id: msg.id,
              content: msg.content,
              timestamp: msg.created_at,
              created_at: msg.created_at,
              sender: isIncoming ? 'contact' : 'agent',
              message_type: isIncoming ? 'incoming' : 'outgoing',
              status: msg.status || 'sent',
              attachments: msg.attachments || [],
              sender_name: msg.sender?.name || 'Usuario',
              source_id: msg.source_id || null,
              isOptimistic: false,
              _isOptimistic: false
            };
          });
        
        console.log('🔍 DEBUG chatwootMessages después de filtro:', {
          count: chatwootMessages.length,
          firstMsg: chatwootMessages[0]
        });

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

        // 🚀 Si es loadMore, combinar con mensajes existentes (usar cache O conversación activa)
        if (loadMore) {
          const existingMessages = cached?.messages || activeConversationRef.current?.messages || [];
          console.log('🔄 LoadMore combinar:', {
            nuevos: uniqueMessages.length,
            existentes: existingMessages.length,
            nuevosIds: uniqueMessages.map((m: any) => m.id).slice(0, 5),
            existentesIds: existingMessages.map((m: any) => m.id).slice(0, 5)
          });
          if (existingMessages.length > 0) {
            const existingIds = new Set(existingMessages.map((m: any) => m.id));
            const newOlderMessages = uniqueMessages.filter((m: any) => !existingIds.has(m.id));
            console.log(`📜 Mensajes nuevos (no duplicados): ${newOlderMessages.length}`, newOlderMessages.map((m: any) => m.id));
            debugLog.log(`📜 LoadMore: ${newOlderMessages.length} mensajes nuevos, ${existingMessages.length} existentes`);
            
            // ⚠️ Si no hay mensajes nuevos, significa que no hay más mensajes anteriores
            if (newOlderMessages.length === 0) {
              console.log('⚠️ No hay más mensajes anteriores - marcando hasMore=false');
              meta.has_more = false;
            }
            
            uniqueMessages = [...newOlderMessages, ...existingMessages];
            // Re-ordenar por timestamp
            uniqueMessages.sort((a: any, b: any) => {
              const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
              const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
              return timeA - timeB;
            });
            console.log(`✅ Total mensajes después de combinar: ${uniqueMessages.length}`);
          }
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
        console.log('🔍 DEBUG conversation encontrada:', {
          found: !!conversation,
          conversationId,
          conversationsCount: conversationsRef.current.length,
          uniqueMessagesCount: uniqueMessages.length
        });
        
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
        } else {
          // ✅ FIX: Si la conversación no está en la lista, igual actualizar activeConversation
          console.log('⚠️ Conversación no en lista, actualizando activeConversation directamente');
          setActiveConversationState(prev => {
            if (prev && prev.id === conversationId) {
              return {
                ...prev,
                messages: uniqueMessages,
                _isLoading: false,
                _hasMoreMessages: meta.has_more ?? false
              };
            }
            // Si no hay activeConversation previa, crear una mínima
            return {
              id: conversationId,
              messages: uniqueMessages,
              _isLoading: false,
              _hasMoreMessages: meta.has_more ?? false
            } as any;
          });
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
  // ✅ NUEVO: Asignar conversación a un agente
  // ========================================
  const assignConversation = useCallback(async (conversationId: number, agentId: number | null) => {
    try {
      const result = await apiCall(
        `/api/chatwoot-proxy/conversations/${conversationId}/assignments`,
        'POST',
        { assignee_id: agentId }
      );
      
      // Actualizar localmente
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, assignee_id: agentId, assignee: result?.assignee || null }
            : conv
        )
      );
      
      debugLog.log(`✅ Conversación ${conversationId} asignada a agente ${agentId}`);
      return result;
    } catch (err) {
      debugLog.error('Error asignando conversación:', err);
      throw err;
    }
  }, [apiCall]);

  // ========================================
  // ✅ NUEVO: Cambiar estado de conversación (open, resolved, pending, snoozed)
  // ========================================
  const changeConversationStatus = useCallback(async (
    conversationId: number, 
    status: 'open' | 'resolved' | 'pending' | 'snoozed',
    snoozedUntil?: number // Timestamp para snoozed
  ) => {
    try {
      const body: any = { status };
      if (status === 'snoozed' && snoozedUntil) {
        body.snoozed_until = snoozedUntil;
      }
      
      const result = await apiCall(
        `/api/chatwoot-proxy/conversations/${conversationId}/status`,
        'POST',
        body
      );
      
      // Actualizar localmente
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, status }
            : conv
        )
      );
      
      debugLog.log(`✅ Estado de conversación ${conversationId} cambiado a ${status}`);
      return result;
    } catch (err) {
      debugLog.error('Error cambiando estado de conversación:', err);
      throw err;
    }
  }, [apiCall]);

  // ========================================
  // ✅ NUEVO: Añadir/Quitar etiquetas de una conversación
  // ========================================
  const updateConversationLabels = useCallback(async (conversationId: number, labels: string[]) => {
    try {
      const result = await apiCall(
        `/api/chatwoot-proxy/conversations/${conversationId}/labels`,
        'POST',
        { labels }
      );
      
      // Actualizar localmente
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, labels }
            : conv
        )
      );
      
      debugLog.log(`✅ Etiquetas actualizadas para conversación ${conversationId}:`, labels);
      return result;
    } catch (err) {
      debugLog.error('Error actualizando etiquetas:', err);
      throw err;
    }
  }, [apiCall]);

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
    // ✅ NUEVO: Funciones de asignación y estado
    assignConversation,
    changeConversationStatus,
    updateConversationLabels,
    // ✅ NUEVO: Metadatos de paginación
    currentPage,
    hasMorePages,
    totalConversations,
    setConversations, //  NUEVO: Función para actualizar conversaciones directamente
    perPage
  };
};

// ============================================================================
// HOOK: useTeams - Gestión de equipos (CRUD Completo)
// ============================================================================

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  availability_status?: string;
}

export interface Team {
  id: number;
  name: string;
  description: string;
  allow_auto_assign: boolean;
  account_id: number;
  members: TeamMember[];
  created_at?: string;
  updated_at?: string;
}

// Cache en memoria para evitar llamadas duplicadas
let teamsCache: { data: Team[] | null; timestamp: number; promise: Promise<Team[]> | null } = {
  data: null,
  timestamp: 0,
  promise: null
};
const CACHE_TTL = 30000; // 30 segundos de cache en frontend

// Inicializar con datos prefetch del servidor si están disponibles
const initTeamsCacheFromPrefetch = () => {
  if ((window as any).__prefetchedTeams && (window as any).__prefetchedTeams.length > 0 && !teamsCache.data) {
    teamsCache.data = (window as any).__prefetchedTeams;
    teamsCache.timestamp = Date.now();
    console.log('🚀 Teams cache inicializado con prefetch');
  }
};

export const useTeams = () => {
  // Intentar inicializar desde prefetch
  if (typeof window !== 'undefined') {
    initTeamsCacheFromPrefetch();
  }
  
  const [teams, setTeams] = useState<Team[]>(teamsCache.data || []);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const { apiCall, loading, error } = useChatwootAPI();

  // Obtener todos los equipos - CON DEDUPLICACIÓN
  const fetchTeams = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    
    // Si hay cache válido y no es forzado, retornar cache
    if (!forceRefresh && teamsCache.data && (now - teamsCache.timestamp) < CACHE_TTL) {
      setTeams(teamsCache.data);
      return teamsCache.data;
    }
    
    // Si ya hay una llamada en progreso, esperar esa
    if (teamsCache.promise) {
      const result = await teamsCache.promise;
      setTeams(result);
      return result;
    }
    
    try {
      // Crear promesa y guardarla para deduplicar
      teamsCache.promise = apiCall('/api/chatwoot-proxy/teams').then(result => {
        const teamsData = Array.isArray(result) ? result : (result?.data || []);
        teamsCache.data = teamsData;
        teamsCache.timestamp = Date.now();
        teamsCache.promise = null;
        return teamsData;
      });
      
      const teamsData = await teamsCache.promise;
      setTeams(teamsData);
      return teamsData;
    } catch (err: any) {
      teamsCache.promise = null;
      if (err?.name === 'AbortError') return teamsCache.data || [];
      console.error('Error fetching teams:', err);
      return teamsCache.data || [];
    }
  }, [apiCall]);

  // Invalidar cache (llamar después de crear/actualizar/eliminar)
  const invalidateCache = useCallback(() => {
    teamsCache = { data: null, timestamp: 0, promise: null };
  }, []);

  // Obtener un equipo específico con sus miembros
  const fetchTeam = useCallback(async (teamId: number) => {
    try {
      const result = await apiCall(`/api/chatwoot-proxy/teams/${teamId}`);
      const teamData = result?.data || result;
      setSelectedTeam(teamData);
      return teamData;
    } catch (err) {
      console.error('Error fetching team:', err);
      throw err;
    }
  }, [apiCall]);

  // Crear nuevo equipo
  const createTeam = useCallback(async (teamData: { name: string; description?: string; allow_auto_assign?: boolean }) => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/teams', 'POST', teamData);
      invalidateCache();
      await fetchTeams(true);
      return result?.data || result;
    } catch (err) {
      console.error('Error creating team:', err);
      throw err;
    }
  }, [apiCall, fetchTeams, invalidateCache]);

  // Actualizar equipo
  const updateTeam = useCallback(async (teamId: number, teamData: Partial<Team>) => {
    try {
      const result = await apiCall(`/api/chatwoot-proxy/teams/${teamId}`, 'PATCH', teamData);
      invalidateCache();
      await fetchTeams(true);
      return result?.data || result;
    } catch (err) {
      console.error('Error updating team:', err);
      throw err;
    }
  }, [apiCall, fetchTeams, invalidateCache]);

  // Eliminar equipo
  const deleteTeam = useCallback(async (teamId: number) => {
    try {
      await apiCall(`/api/chatwoot-proxy/teams/${teamId}`, 'DELETE');
      invalidateCache();
      setTeams(prev => prev.filter(t => t.id !== teamId));
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(null);
      }
      return true;
    } catch (err) {
      console.error('Error deleting team:', err);
      throw err;
    }
  }, [apiCall, selectedTeam]);

  // Obtener miembros de un equipo
  const fetchTeamMembers = useCallback(async (teamId: number) => {
    try {
      const result = await apiCall(`/api/chatwoot-proxy/teams/${teamId}/members`);
      return result?.data || result || [];
    } catch (err) {
      console.error('Error fetching team members:', err);
      return [];
    }
  }, [apiCall]);

  // Agregar miembros a un equipo
  const addTeamMembers = useCallback(async (teamId: number, userIds: number[]) => {
    try {
      const result = await apiCall(`/api/chatwoot-proxy/teams/${teamId}/members`, 'POST', { user_ids: userIds });
      invalidateCache(); // Forzar recarga sin cache
      await fetchTeam(teamId);
      await fetchTeams(true); // true = forzar recarga
      return result?.data || result;
    } catch (err) {
      console.error('Error adding team members:', err);
      throw err;
    }
  }, [apiCall, fetchTeam, fetchTeams, invalidateCache]);

  // Actualizar miembros (reemplazar todos)
  const updateTeamMembers = useCallback(async (teamId: number, userIds: number[]) => {
    try {
      const result = await apiCall(`/api/chatwoot-proxy/teams/${teamId}/members`, 'PATCH', { user_ids: userIds });
      invalidateCache(); // Forzar recarga sin cache
      await fetchTeam(teamId);
      await fetchTeams(true); // true = forzar recarga
      return result?.data || result;
    } catch (err) {
      console.error('Error updating team members:', err);
      throw err;
    }
  }, [apiCall, fetchTeam, fetchTeams, invalidateCache]);

  // Remover miembro de un equipo
  const removeTeamMember = useCallback(async (teamId: number, userId: number) => {
    try {
      await apiCall(`/api/chatwoot-proxy/teams/${teamId}/members`, 'DELETE', { user_ids: [userId] });
      invalidateCache(); // Forzar recarga sin cache
      await fetchTeam(teamId);
      await fetchTeams(true); // true = forzar recarga
      return true;
    } catch (err) {
      console.error('Error removing team member:', err);
      throw err;
    }
  }, [apiCall, fetchTeam, fetchTeams, invalidateCache]);

  // Cargar equipos al montar
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return { 
    teams, 
    selectedTeam,
    setSelectedTeam,
    loading, 
    error, 
    fetchTeams,
    fetchTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    fetchTeamMembers,
    addTeamMembers,
    updateTeamMembers,
    removeTeamMember
  };
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
      // Asegurar que siempre sea un array
      setLabels(Array.isArray(result) ? result : (result?.data || result?.payload || []));
    } catch (err) {
      console.error('Error fetching labels:', err);
      setLabels([]); // Reset to empty array on error
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

// Cache en memoria para agentes
let agentsCache: { data: any[] | null; timestamp: number; promise: Promise<any[]> | null } = {
  data: null,
  timestamp: 0,
  promise: null
};
const AGENTS_CACHE_TTL = 30000; // 30 segundos

// Inicializar con datos prefetch del servidor si están disponibles
const initAgentsCacheFromPrefetch = () => {
  if ((window as any).__prefetchedAgents && (window as any).__prefetchedAgents.length > 0 && !agentsCache.data) {
    agentsCache.data = (window as any).__prefetchedAgents;
    agentsCache.timestamp = Date.now();
    console.log('🚀 Agents cache inicializado con prefetch');
  }
};

export const useAgents = () => {
  // Intentar inicializar desde prefetch
  if (typeof window !== 'undefined') {
    initAgentsCacheFromPrefetch();
  }
  
  const [agents, setAgents] = useState<any[]>(agentsCache.data || []);
  const { apiCall, loading, error } = useChatwootAPI();

  const fetchAgents = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    
    // Si hay cache válido y no es forzado, retornar cache
    if (!forceRefresh && agentsCache.data && (now - agentsCache.timestamp) < AGENTS_CACHE_TTL) {
      setAgents(agentsCache.data);
      return agentsCache.data;
    }
    
    // Si ya hay una llamada en progreso, esperar esa
    if (agentsCache.promise) {
      const result = await agentsCache.promise;
      setAgents(result);
      return result;
    }
    
    try {
      agentsCache.promise = apiCall('/api/chatwoot-proxy/agents').then(result => {
        const agentsData = Array.isArray(result) ? result : (result?.data || result?.agents || []);
        agentsCache.data = agentsData;
        agentsCache.timestamp = Date.now();
        agentsCache.promise = null;
        return agentsData;
      });
      
      const agentsData = await agentsCache.promise;
      setAgents(agentsData);
      return agentsData;
    } catch (err) {
      agentsCache.promise = null;
      console.error('Error fetching agents:', err);
      setAgents(agentsCache.data || []);
      return agentsCache.data || [];
    }
  }, [apiCall]);

  const invalidateAgentsCache = useCallback(() => {
    agentsCache = { data: null, timestamp: 0, promise: null };
  }, []);

  const createAgent = useCallback(async (agentData: any) => {
    try {
      const result = await apiCall('/api/chatwoot-proxy/agents', 'POST', agentData);
      invalidateAgentsCache();
      await fetchAgents(true);
      return result;
    } catch (err) {
      console.error('Error creating agent:', err);
      throw err;
    }
  }, [apiCall, fetchAgents, invalidateAgentsCache]);

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

// ============================================================================
// HOOK: useTeamInvitations - Gestión de invitaciones de equipo
// ============================================================================

export interface TeamInvitation {
  id: number;
  email: string;
  name: string | null;
  role: 'agent' | 'administrator';
  team_id: number | null;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  invited_by?: {
    id: number;
    name: string;
    email: string;
  };
}

export const useTeamInvitations = () => {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper para obtener CSRF token
  const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/chatwoot-proxy/invitations', {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include',
      });
      const result = await response.json();
      setInvitations(Array.isArray(result?.data) ? result.data : []);
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError('Error al cargar invitaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendInvitation = useCallback(async (data: {
    email: string;
    name?: string;
    role: 'agent' | 'administrator';
    team_id?: number;
  }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/chatwoot-proxy/invitations', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Error al enviar invitación');
      }
      
      await fetchInvitations();
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchInvitations]);

  const resendInvitation = useCallback(async (invitationId: number) => {
    try {
      const response = await fetch(`/api/chatwoot-proxy/invitations/${invitationId}/resend`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Error al reenviar');
      }
      
      await fetchInvitations();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [fetchInvitations]);

  const cancelInvitation = useCallback(async (invitationId: number) => {
    try {
      const response = await fetch(`/api/chatwoot-proxy/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Error al cancelar');
      }
      
      await fetchInvitations();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [fetchInvitations]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return {
    invitations,
    loading,
    error,
    fetchInvitations,
    sendInvitation,
    resendInvitation,
    cancelInvitation,
  };
};
