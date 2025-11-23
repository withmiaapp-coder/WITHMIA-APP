import { useState, useCallback, useRef, useEffect } from 'react';

interface Message {
  id: number | string;
  content: string;
  created_at: number | string;
  message_type: number | string;
  sender?: string;
  [key: string]: any;
}

interface UseMessagePaginationOptions {
  pageSize?: number;
  conversationId?: number;
  onLoadMore?: (page: number) => Promise<Message[]>;
}

interface UseMessagePaginationReturn {
  // Mensajes paginados actuales
  displayedMessages: Message[];
  // Total de mensajes disponibles
  totalMessages: number;
  // Página actual
  currentPage: number;
  // ¿Hay más mensajes para cargar?
  hasMore: boolean;
  // ¿Está cargando?
  isLoading: boolean;
  // Cargar más mensajes antiguos
  loadMore: () => Promise<void>;
  // Reiniciar paginación (cuando cambia de conversación)
  reset: (newMessages: Message[]) => void;
  // Agregar un mensaje nuevo (mensajes en tiempo real)
  addMessage: (message: Message) => void;
  // Indicador de si mostrar el botón "Cargar más"
  showLoadMoreButton: boolean;
}

/**
 * Hook personalizado para manejar paginación de mensajes
 * Carga inicialmente los últimos N mensajes y permite cargar más hacia atrás
 */
export const useMessagePagination = (
  options: UseMessagePaginationOptions = {}
): UseMessagePaginationReturn => {
  const {
    pageSize = 50,
    conversationId,
    onLoadMore
  } = options;

  // Todos los mensajes disponibles
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  
  // Mensajes actualmente mostrados
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  
  // Página actual (0 = últimos mensajes)
  const [currentPage, setCurrentPage] = useState(0);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Ref para evitar múltiples cargas simultáneas
  const loadingRef = useRef(false);
  
  // Ref para conversationId anterior
  const prevConversationIdRef = useRef(conversationId);

  // Calcular mensajes a mostrar basado en la página actual
  useEffect(() => {
    if (allMessages.length === 0) {
      setDisplayedMessages([]);
      return;
    }

    // Ordenar mensajes por fecha (más antiguos primero)
    const sorted = [...allMessages].sort((a, b) => {
      const timeA = typeof a.created_at === 'number' ? a.created_at : new Date(a.created_at).getTime() / 1000;
      const timeB = typeof b.created_at === 'number' ? b.created_at : new Date(b.created_at).getTime() / 1000;
      return timeA - timeB;
    });

    // Calcular cuántos mensajes mostrar
    const totalToShow = pageSize * (currentPage + 1);
    
    // Tomar desde el final (mensajes más recientes)
    const toDisplay = sorted.slice(-totalToShow);
    
    setDisplayedMessages(toDisplay);
  }, [allMessages, currentPage, pageSize]);

  // Resetear cuando cambia el conversationId
  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      setCurrentPage(0);
      prevConversationIdRef.current = conversationId;
    }
  }, [conversationId]);

  /**
   * Reiniciar con nuevos mensajes (cuando cambia de conversación)
   */
  const reset = useCallback((newMessages: Message[]) => {
    setAllMessages(newMessages);
    setCurrentPage(0);
    setIsLoading(false);
    loadingRef.current = false;
  }, []);

  /**
   * Cargar más mensajes antiguos
   */
  const loadMore = useCallback(async () => {
    // Evitar cargas simultáneas
    if (loadingRef.current || isLoading) {
      console.log('⏳ Ya hay una carga en progreso');
      return;
    }

    // No hay más mensajes para cargar en memoria
    const totalDisplayable = allMessages.length;
    const currentlyDisplayed = pageSize * (currentPage + 1);
    
    if (currentlyDisplayed >= totalDisplayable) {
      // Si hay callback para cargar del servidor, intentar
      if (onLoadMore && conversationId) {
        setIsLoading(true);
        loadingRef.current = true;
        
        try {
          console.log(`📥 Cargando página ${currentPage + 1} del servidor...`);
          const olderMessages = await onLoadMore(currentPage + 1);
          
          if (olderMessages && olderMessages.length > 0) {
            // Agregar mensajes más antiguos al inicio
            setAllMessages(prev => {
              // Deduplicar por ID
              const existingIds = new Set(prev.map(m => m.id));
              const newMessages = olderMessages.filter(m => !existingIds.has(m.id));
              return [...newMessages, ...prev];
            });
            
            setCurrentPage(prev => prev + 1);
            console.log(`✅ Cargados ${olderMessages.length} mensajes más antiguos`);
          } else {
            console.log('ℹ️ No hay más mensajes en el servidor');
          }
        } catch (error) {
          console.error('❌ Error cargando mensajes:', error);
        } finally {
          setIsLoading(false);
          loadingRef.current = false;
        }
      } else {
        console.log('ℹ️ No hay más mensajes para cargar');
      }
      return;
    }

    // Cargar siguiente página de mensajes ya en memoria
    setIsLoading(true);
    loadingRef.current = true;
    
    // Simular delay para UX (opcional)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setCurrentPage(prev => prev + 1);
    setIsLoading(false);
    loadingRef.current = false;
    
    console.log(`✅ Mostrando página ${currentPage + 1}`);
  }, [allMessages.length, currentPage, pageSize, onLoadMore, conversationId, isLoading]);

  /**
   * Agregar un mensaje nuevo (tiempo real o envío)
   */
  const addMessage = useCallback((message: Message) => {
    setAllMessages(prev => {
      // Evitar duplicados
      const exists = prev.some(m => m.id === message.id);
      if (exists) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  // Calcular si hay más mensajes disponibles
  const hasMore = displayedMessages.length < allMessages.length;
  
  // Mostrar botón solo si hay más de pageSize mensajes
  const showLoadMoreButton = allMessages.length > pageSize && hasMore;

  return {
    displayedMessages,
    totalMessages: allMessages.length,
    currentPage,
    hasMore,
    isLoading,
    loadMore,
    reset,
    addMessage,
    showLoadMoreButton
  };
};

export default useMessagePagination;
