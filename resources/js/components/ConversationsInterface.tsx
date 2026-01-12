import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import * as XLSX from 'xlsx';
import { useVirtualizer } from '@tanstack/react-virtual';
import axios from 'axios';
import {
  MessageCircle,
  Search,
  MoreHorizontal,
  Send,
  Paperclip,
  Smile,
  Archive,
  Star,
  CheckCircle2,
  AlertTriangle,
  User,
  Tag,
  Plus,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  Settings,
  Download,
  AlertCircle,
  UserPlus,
  X,
  // Iconos para funciones de WhatsApp
  Reply,
  Copy,
  Forward,
  Trash2,
  Pin,
  PinOff,
  Volume2,
  VolumeX,
  Info,
  Check,
  CheckCheck,
  Clock,
  Image as ImageIcon,
  File,
  ChevronDown,
  ChevronUp,
  CornerUpLeft,
  // Iconos adicionales Fase 3
  Mic,
  StopCircle,
  Upload,
  Film,
  FileText,
  Play,
  Pause,
  Bell,
  BellOff,
  Grid,
  // Nuevos iconos para Fase 3
  Filter
} from 'lucide-react';
import { useConversations } from '../hooks/useChatwoot';
import { useCombinedRealtime } from '../hooks/useRealtimeConversations';
import { useNotifications } from '../hooks/useNotifications';
import NotificationToast from './NotificationToast.tsx';
// FASE 3: Nuevos componentes y hooks (Filtros)
import AdvancedFilters from './AdvancedFilters';
import { useMessagePagination } from '../hooks/useMessagePagination';
import { useEnhancedNotifications } from '../hooks/useEnhancedNotifications';
import NotificationCenter from './NotificationCenter.tsx';
import NotificationSettings from './NotificationSettings.tsx';
// ?? OPTIMIZACIONES: Utilidades extraídas para mejor performance
import { formatTimestamp } from '../utils/dateFormatter';
import { getPriorityColor, getStatusColor } from '../utils/conversationColors';
import debugLog from '../utils/debugLogger';

interface Conversation {
  id: number;
  contact: {
    name: string;
    email: string;
    avatar: string;
    status: 'online' | 'offline';
  };
  last_message: {
    content: string;
    timestamp: string;
    sender: 'agent' | 'contact';
  };
  status: 'open' | 'resolved' | 'pending';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  labels: string[];
  unread_count: number;
  assignee_id?: number;
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
}

interface _Message {
  id: number;
  content: string;
  timestamp: string;
  sender: 'agent' | 'contact';
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

// 🎯 Componente para mostrar estado del mensaje (checks de WhatsApp)
const MessageStatus = ({ status, isHighlighted }: { status?: string | number | null | undefined; isHighlighted?: boolean }) => {
  const baseColor = isHighlighted ? 'text-gray-600' : 'text-blue-200';
  const readColor = 'text-blue-400'; // Azul más brillante para leído
  
  // 📌 Normalizar status - si es null/undefined, mostrar delivered (doble check)
  if (status === null || status === undefined) {
    // Default: 2 checks grises - entregado al dispositivo
    return (
      <svg className={`w-4 h-3 ${baseColor}`} viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 7l4 4L14 3" />
        <path d="M8 7l4 4L20 3" />
      </svg>
    );
  }
  
  // Normalizar status (Chatwoot puede enviar números o strings diferentes)
  let normalizedStatus: string = 'delivered';
  
  if (typeof status === 'number') {
    // Chatwoot status: 0=sent, 1=delivered, 2=read, 3=failed
    const statusMap: Record<number, string> = { 0: 'sent', 1: 'delivered', 2: 'read', 3: 'failed' };
    normalizedStatus = statusMap[status] ?? 'delivered';
  } else if (typeof status === 'string') {
    // Normalizar variaciones de strings
    const statusLower = status.toLowerCase();
    if (statusLower === 'sending' || statusLower === 'pending' || statusLower === 'progress') {
      normalizedStatus = 'sending';
    } else if (statusLower === 'sent' || statusLower === 'created') {
      normalizedStatus = 'sent';
    } else if (statusLower === 'delivered') {
      normalizedStatus = 'delivered';
    } else if (statusLower === 'read' || statusLower === 'seen') {
      normalizedStatus = 'read';
    } else if (statusLower === 'failed' || statusLower === 'error') {
      normalizedStatus = 'failed';
    } else {
      // Para cualquier otro valor desconocido, mostrar delivered
      normalizedStatus = 'delivered';
    }
  }
  
  switch (normalizedStatus) {
    case 'sending':
      // Reloj girando - mensaje enviándose
      return (
        <svg className={`w-3 h-3 ${baseColor} animate-spin`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    case 'failed':
      // Error - mensaje no enviado
      return (
        <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'sent':
      // 1 check - enviado al servidor
      return (
        <svg className={`w-3 h-3 ${baseColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'read':
      // 2 checks azules - leído
      return (
        <svg className={`w-4 h-3 ${readColor}`} viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 7l4 4L14 3" />
          <path d="M8 7l4 4L20 3" />
        </svg>
      );
    case 'delivered':
    default:
      // 2 checks grises - entregado al dispositivo (default)
      return (
        <svg className={`w-4 h-3 ${baseColor}`} viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 7l4 4L14 3" />
          <path d="M8 7l4 4L20 3" />
        </svg>
      );
  }
};


  // Helper: Formatea preview del ultimo mensaje (con limpieza de formato)
  const formatLastMessagePreview = (message) => {
    if (!message) return "";
    
    // Limpiar mensaje de formato markdown/HTML
    let cleanMessage = message;
    
    // Eliminar citas/replies (> texto)
    cleanMessage = cleanMessage.replace(/^>\s*[^:]+:\s*/gm, "");
    
    // Eliminar markdown bold (**texto** o __texto__)
    cleanMessage = cleanMessage.replace(/\*\*([^*]+)\*\*/g, "$1");
    cleanMessage = cleanMessage.replace(/__([^_]+)__/g, "$1");
    
    // Eliminar markdown italic (*texto* o _texto_)
    cleanMessage = cleanMessage.replace(/\*([^*]+)\*/g, "$1");
    cleanMessage = cleanMessage.replace(/_([^_]+)_/g, "$1");
    
    // Eliminar saltos de l??nea m??ltiples
    cleanMessage = cleanMessage.replace(/\n+/g, " ").trim();
    
    // Si es URL de imagen
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;
    if (imageExtensions.test(cleanMessage) || 
        cleanMessage.includes("active_storage") || 
        cleanMessage.includes("chatwoot-admin")) {
      return " Imagen";
    }
    
    // URL larga generica
    if (cleanMessage.startsWith("http") && cleanMessage.length > 50) {
      return " Enlace";
    }
    
    // Multimedia
    if (/\.(mp3|wav|ogg|m4a)$/i.test(cleanMessage)) return " Audio";
    if (/\.(mp4|mov|avi|webm)$/i.test(cleanMessage)) return " Video";
    if (/\.(pdf|doc|docx|xls|xlsx)$/i.test(cleanMessage)) return " Documento";
    
    return cleanMessage;
  };


  // Helper: Formatea el avatar para mostrar solo iniciales
  const formatAvatar = (avatar, name) => {
    // Si el avatar es una URL, extraer iniciales del nombre
    if (avatar && (avatar.startsWith('http') || avatar.includes('/'))) {
      return name?.charAt(0).toUpperCase() || 'U';
    }
    // Si ya son iniciales, retornar tal cual
    return avatar || name?.charAt(0).toUpperCase() || 'U';
  };

const ConversationsInterface: React.FC = () => {
  const notifications = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  // Estado para navegaci??n entre coincidencias de búsqueda
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  
  //  OPTIMIZACIÓN: Debounce timer para recargas
  const reloadDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastReloadTimestampRef = useRef<number>(0);
  const isPendingReloadRef = useRef<boolean>(false);

  // Función para resaltar t??rminos de búsqueda con estilo profesional
  const highlightSearchTerm = (text: string, searchTerm: string, messageIndex: number) => {
    if (!searchTerm || !text) return text;

    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    let matchCounter = 0;

    return parts.map((part, index) => {
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        const globalMatchIndex = matchCounter;
        matchCounter++;
        
        // Estilo diferente para la coincidencia actual
        const isCurrentMatch = globalMatchIndex === currentMatchIndex;
        
        return (
          <mark 
            key={index}
            data-match-index={globalMatchIndex}
            className={`
              ${isCurrentMatch 
                ? 'bg-blue-500 text-white ring-2 ring-blue-300 ring-offset-1' 
                : 'bg-blue-100 text-blue-900 hover:bg-blue-200'
              }
              px-1.5 py-0.5 rounded font-medium transition-all duration-200
            `}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    const saved = localStorage.getItem('conversationsPanelWidth');
    return saved ? parseFloat(saved) : 33;
  });
  const [isResizing, setIsResizing] = useState(false);
  
  // ?? Usar hooks optimizados de Chatwoot
  const {
    conversations,
    activeConversation,
    loading: conversationsLoading,
    error: conversationsError,
    sendMessage,
    loadConversationMessages,
    markConversationAsRead,
    setActiveConversation: _setActiveConversation,
    userInboxId,
    fetchUpdatedConversations,
    loadMoreConversations,
    hasMorePages,
    totalConversations,
    setConversations,
    currentPage,
    updateMessagesCache, // ✅ NUEVO: Para actualizar caché de mensajes
    addMessageToCache // ✅ NUEVO: Para agregar mensaje a caché
  } = useConversations();
  
  // Estados locales
  const [isTyping, setIsTyping] = useState(false);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // FASE 3: Estados para filtros avanzados
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<any | null>(null);
  
  // ?? NUEVO: Estado para separador de "nuevos mensajes"
  const [newMessageSeparatorIndex, setNewMessageSeparatorIndex] = useState<number | null>(null);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  
  //  NUEVOS ESTADOS - FUNCIONES DE WHATSAPP
  // 1. Reply/Quote (Responder)
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  
  // 2. Starred Messages (Mensajes destacados)
  const [starredMessages, setStarredMessages] = useState<Set<number>>(new Set());
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  
  // 3. Search (B??squeda en mensajes - NO CONFUNDIR con búsqueda global)
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchResults, setMessageSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  
  // 4. Typing Indicator (Escribiendo...)
  const [isContactTyping, setIsContactTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 5. Message Actions (Menu contextual)
  const [messageMenuOpen, setMessageMenuOpen] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // 6. Pinned Messages (Mensajes fijados)
  const [pinnedMessage, setPinnedMessage] = useState<any | null>(null);
  
  // 7. Contact Info Panel (Panel de informaci??n)
  const [showContactInfo, setShowContactInfo] = useState(false);
  
  // 8. Muted Conversations (Silenciadas)
  const [mutedConversations, setMutedConversations] = useState<Set<number>>(new Set());
  
  //  FASE 3 - FUNCIONES AVANZADAS
  // 1. Search Bar Visual (Barra de búsqueda expandible)
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  
  // 2. Multimedia Gallery (Galer??a multimedia)
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'images' | 'files' | 'links'>('all');
  
  // 3. Drag & Drop (Arrastrar y soltar archivos)
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
  
  // 4. Audio Messages (Mensajes de voz)
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  
  // Estados para modal de descarga con progreso
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [downloadPhase, setDownloadPhase] = useState<'idle' | 'fetching' | 'processing' | 'generating' | 'complete' | 'error'>('idle');
  
  // Estados para modal de editar contacto
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  
  // Estado para toast notification
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // ?? NUEVO: Ref para auto-scroll de mensajes
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  
  // ?? NUEVO: Ref para auto-scroll de mensajes
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  // ?? NUEVO: Ref para evitar stale closure en callbacks de tiempo real
  const activeConversationRef = useRef<any | null>(null);
  
  // ?? DEDUPLICACI?N: Ref para evitar procesar eventos WebSocket duplicados
  const processedEventsRef = useRef<Set<string>>(new Set());
  
  //  OPTIMIZACIÓN: Función con debounce para recargar conversaciones
  const debouncedFetchConversations = useCallback(() => {
    // Cancelar reload pendiente si existe
    if (reloadDebounceRef.current) {
      clearTimeout(reloadDebounceRef.current);
    }
    
    // Si ya hay un reload en progreso, marcar que hay uno pendiente
    if (isPendingReloadRef.current) {
      console.log('?? Reload ya en progreso, agendando siguiente...');
      return;
    }
    
    // Verificar si pas?? suficiente tiempo desde el ??ltimo reload (m??nimo 2 segundos)
    const now = Date.now();
    const timeSinceLastReload = now - lastReloadTimestampRef.current;
    
    if (timeSinceLastReload < 2000) {
      // Agendar reload despu??s del tiempo m??nimo
      const delay = 2000 - timeSinceLastReload;
      console.log(`?? Agendando reload en ${delay}ms...`);
      
      reloadDebounceRef.current = setTimeout(() => {
        executeFetchConversations();
      }, delay);
    } else {
      // Ejecutar inmediatamente
      executeFetchConversations();
    }
  }, []);
  
  //  Función que ejecuta el fetch real
  const executeFetchConversations = useCallback(async () => {
    isPendingReloadRef.current = true;
    lastReloadTimestampRef.current = Date.now();
    
    try {
      await fetchUpdatedConversations();
      console.log('??? Conversaciones actualizadas');
    } catch (error) {
      console.error('??? Error actualizando conversaciones:', error);
    } finally {
      isPendingReloadRef.current = false;
    }
  }, [fetchUpdatedConversations]);
  
  //  OPTIMIZACIÓN: Recargar conversaciones INMEDIATAMENTE sin debounce
  const fetchConversationsImmediate = useCallback(async () => {
    debugLog.log('??? Recargando conversaciones INMEDIATAMENTE (sin debounce)');
    lastReloadTimestampRef.current = Date.now();
    
    try {
      await fetchUpdatedConversations();
      debugLog.log('??? Conversaciones recargadas inmediatamente');
    } catch (error) {
      debugLog.error('??? Error recargando conversaciones:', error);
    }
  }, [fetchUpdatedConversations]);
  
  // Mantener ref actualizada
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);
  
  //  Cleanup del debounce timer al desmontar
  useEffect(() => {
    return () => {
      if (reloadDebounceRef.current) {
        clearTimeout(reloadDebounceRef.current);
      }
    };
  }, []);
  
  //  Auto-focus del input cuando se abre una conversación (como WhatsApp)
  useEffect(() => {
    if (activeConversation && messageInputRef.current) {
      // Peque??o delay para asegurar que el DOM esté listo
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    }
  }, [activeConversation?.id]); // Solo cuando cambie la conversación activa
  
  // 🎯 NUEVO: Usar hook combinado de tiempo real con WebSocket (sin polling)
  const {
    isConnected,
    wsConnected,
    lastEventTime,
    usingFallback
  } = useCombinedRealtime({
    inboxId: userInboxId,
    enabled: realtimeEnabled && userInboxId !== null,
    onUpdate: async () => {
      // Retornar cantidad de actualizaciones para el algoritmo de backoff
      const updateCount = await fetchUpdatedConversations();
      return updateCount;
    },
    onConversationUpdated: (event) => {
      // 🔄 Usar debounced fetch en lugar de directo
      debouncedFetchConversations();
    },
    onMessageUpdated: (event) => {
      // 📝 Actualizar estado del mensaje (sent, delivered, read)
      const messageId = event?.message?.id;
      const newStatus = event?.message?.status;
      
      if (messageId && newStatus) {
        console.log(`📝 Actualizando estado de mensaje ${messageId} a ${newStatus}`);
        
        _setActiveConversation((prev: any) => {
          if (!prev || !prev.messages) return prev;
          
          const updatedMessages = prev.messages.map((msg: any) => {
            if (msg.id === messageId || (msg._isOptimistic && msg.source_id === event?.message?.source_id)) {
              return { ...msg, status: newStatus, _isOptimistic: false };
            }
            return msg;
          });
          
          return { ...prev, messages: updatedMessages };
        });
      }
    },
    onNewMessage: async (event) => {
      // ?? DEDUPLICACI?N: Crear ID ??nico del evento
      const eventId = `${event?.message?.id || 'unknown'}-${event?.timestamp || Date.now()}`;

      console.log(' ========== NUEVO MENSAJE RECIBIDO ==========');
      console.log(' EventID:', eventId);
      console.log(' Evento completo:', JSON.stringify(event, null, 2));
      console.log(' Conversaci??n activa ID:', activeConversationRef.current?.id);
      console.log(' Conversation ID del evento:', event?.conversation_id);
      console.log(' ??Coinciden?:', event?.conversation_id === activeConversationRef.current?.id);

      // Verificar duplicados
      if (processedEventsRef.current.has(eventId)) {
        console.log('?? Evento duplicado, omitiendo');
        return;
      }

      processedEventsRef.current.add(eventId);
      
      // 🧪 FILTRAR MENSAJES DE PRUEBA - No crear conversaciones falsas
      if (event?.message?.test === true || event?.test === true) {
        console.log('🧪 Mensaje de PRUEBA detectado - ignorando para evitar conversaciones falsas');
        return;
      }
      
      // 🔢 Verificar que conversation_id sea válido (no IDs de prueba como 999)
      const convId = event?.conversation_id || event?.conversation?.id || event?.message?.conversation_id;
      if (!convId || convId <= 0) {
        console.log('⚠️ conversation_id inválido:', convId, '- ignorando');
        return;
      }
      
      // ⚠️ NO FILTRAR NADA MÁS - Dejar que Laravel maneje los filtros
      // El backend ya filtra mensajes fromMe, aquí solo procesamos
      console.log('✅ Procesando evento normalmente (filtros en backend)');

      // Obtener el conversation_id del evento
      const conversationId = event?.conversation_id || event?.conversation?.id || event?.message?.conversation_id;

      //  ACTUALIZACIÓN OPTIMISTA: Actualizar conversación localmente INMEDIATAMENTE
      setConversations((prevConversations: any[]) => {
        const conversationId = event.conversation_id;
        const newTimestamp = event.timestamp || event.message?.created_at || new Date().toISOString();

        console.log(' Iniciando actualización optimista para conversación:', conversationId);
        console.log(' Nuevo timestamp:', newTimestamp);

        // Buscar si la conversación ya existe
        const existingIndex = prevConversations.findIndex((conv: any) => conv.id === conversationId);

        let updated;
        if (existingIndex !== -1) {
          // Conversación existe - actualizar
          updated = prevConversations.map((conv: any) => {
            if (conv.id === conversationId) {
              // ✅ Solo incrementar unread_count si es mensaje INCOMING
              const messageType = event.message?.message_type;
              const isOutgoing = messageType === 1 || messageType === 'outgoing';
              const shouldIncrementUnread = !isOutgoing;
              
              const updatedConv = {
                ...conv,
                last_message: {
                  content: event.message?.content || event.content || '',
                  created_at: event.message?.created_at || newTimestamp,
                  timestamp: event.message?.created_at || new Date(newTimestamp).getTime() / 1000,
                  message_type: event.message?.message_type || 0,
                  sender: event.sender || event.message?.sender
                },
                unread_count: shouldIncrementUnread ? (conv.unread_count || 0) + 1 : (conv.unread_count || 0),
                updated_at: newTimestamp,
                timestamp: new Date(newTimestamp).getTime() / 1000,
                last_activity_at: new Date(newTimestamp).getTime() / 1000
              };
              console.log(' Conversación actualizada:', updatedConv.id, updatedConv.meta?.sender?.name);
              return updatedConv;
            }
            return conv;
          });
        } else {
          // Conversación NO existe - agregarla desde el evento
          console.log(' Conversación nueva detectada - agregando:', conversationId);
          // Construir conversación con estructura completa
          const sender = event.sender || event.message?.sender || { name: 'Nuevo contacto' };
          const newConv = {
            ...(event.message?.conversation || event.conversation || {}),
            id: conversationId,
            inbox_id: event.inbox_id,
            status: 'open',
            unread_count: 1,
            meta: {
              sender: sender,
              assignee: null,
              team: null
            },
            contact: {
              id: sender.id || 0,
              name: sender.name || 'Nuevo contacto',
              email: sender.email || '',
              phone_number: sender.phone_number || '',
              avatarUrl: sender.thumbnail || sender.avatar || null
            },
            last_message: {
              content: event.message?.content || event.content || '',
              created_at: event.message?.created_at || newTimestamp,
              timestamp: new Date(event.message?.created_at || newTimestamp).getTime() / 1000,
              message_type: event.message?.message_type || 0,
              sender: sender
            },
            labels: [],
            timestamp: new Date(newTimestamp).getTime() / 1000,
            last_activity_at: new Date(newTimestamp).getTime() / 1000,
            created_at: newTimestamp,
            updated_at: newTimestamp
          };
          // Agregar solo si no existe ya (prevenir duplicados)
          const alreadyExists = prevConversations.some(c => c.id === conversationId);
          updated = alreadyExists ? prevConversations : [newConv, ...prevConversations];
          console.log(' Nueva conversación agregada al inicio');
        }

        // Ordenar por timestamp (más reciente primero)
        const sorted = updated.sort((a: any, b: any) => {
          const timeA = a.last_activity_at || a.timestamp || new Date(a.updated_at || 0).getTime() / 1000;
          const timeB = b.last_activity_at || b.timestamp || new Date(b.updated_at || 0).getTime() / 1000;
          return timeB - timeA;
        });

        console.log(' Primera conversación después de ordenar:', sorted[0]?.id, sorted[0]?.meta?.sender?.name);
        return sorted;
      });

      console.log(' Conversation ID encontrado:', conversationId);


      //  NOTIFICACIÓN DE NUEVO MENSAJE
      // ✅ FILTRO: Solo notificar mensajes INCOMING (no outgoing)
      const messageType = event?.message?.message_type;
      const isIncoming = messageType === 0 || messageType === 'incoming';
      const isOutgoing = messageType === 1 || messageType === 'outgoing';
      
      console.log('🔔 Filtro de notificación:', { messageType, isIncoming, isOutgoing, pasaFiltro: isIncoming && !isOutgoing });
      
      if (event?.message && event?.conversation && isIncoming && !isOutgoing) {
        notifications.notify({
          conversationId: event.conversation.id || event.conversation_id || 0,
          conversationName: event.conversation.contact_name || event.sender?.name || event.contact?.name || 'Nuevo contacto',
          message: event.message.content || event.content || 'Nuevo mensaje',
          priority: (event.conversation.unread_count || 0) > 3 ? 'high' : 'medium',
          avatar: (event.conversation.contact_name || event.sender?.name || 'M').charAt(0),
          assignedToMe: true,
          onClickNotification: () => {
            if (event.conversation_id) {
              const conv = conversations.find((c: any) => c.id === event.conversation_id);
              if (conv) {
                _setActiveConversation(conv);
              }
            }
          }
        });
        console.log('??? Notificaci??n enviada para nuevo mensaje');
      }

      // Limpiar eventos antiguos
      if (processedEventsRef.current.size > 50) {
        const firstItem = processedEventsRef.current.values().next().value;
        processedEventsRef.current.delete(firstItem);
      }

      // Si el mensaje es para la conversación activa, agregar mensaje en tiempo real
      // ✅ AGREGAR TODOS los mensajes (incoming y outgoing) - verificar duplicados por ID
      const currentActiveConv = activeConversationRef.current;
      
      if (currentActiveConv && currentActiveConv.id === conversationId) {
        console.log("💬 Mensaje para conversación activa - Agregando en tiempo real...");
        try {
          // Normalizar message_type a número (0 = incoming, 1 = outgoing)
          const rawMsgType = event.message?.message_type;
          const normalizedMsgType = (rawMsgType === 'outgoing' || rawMsgType === 1) ? 1 : 0;
          
          // Normalizar sender a string 'agent' o 'contact' para el renderizado
          // El renderizador usa message.sender === 'agent' para posicionar el mensaje
          const normalizedSender = normalizedMsgType === 1 ? 'agent' : 'contact';
          
          // Construir el nuevo mensaje desde el evento
          const newMessage = {
            id: event.message?.id || event.id || Date.now(),
            content: event.message?.content || event.content || '',
            message_type: normalizedMsgType,
            created_at: event.message?.created_at || event.timestamp || new Date().toISOString(),
            sender: normalizedSender, // Usar string normalizado, no el objeto del webhook
            attachments: event.message?.attachments || [],
            source_id: event.message?.source_id || event.source_id || null,
            content_type: event.message?.content_type || 'text',
            private: event.message?.private || false,
            status: event.message?.status || 'sent'
          };
          
          // Actualizar activeConversation con el nuevo mensaje
          _setActiveConversation((prev: any) => {
            if (!prev || prev.id !== conversationId) return prev;
            
            // Verificar si el mensaje ya existe (evitar duplicados)
            const existingMessages = prev.messages || [];
            
            // Buscar duplicado por:
            // 1. Mismo ID numérico
            // 2. Mensaje optimista/pending con mismo contenido (para mensajes outgoing recientes)
            const messageExists = existingMessages.some((m: any) => {
              // Duplicado exacto por ID
              if (m.id === newMessage.id) return true;
              
              // Para mensajes outgoing, verificar si hay un mensaje optimista/pending con mismo contenido
              if (newMessage.message_type === 1 || newMessage.sender === 'agent') {
                const isOptimisticOrPending = (
                  m._isOptimistic || 
                  m.status === 'sending' || 
                  m.status === 'sent' ||
                  String(m.id).startsWith('temp-') || 
                  String(m.id).startsWith('pending-')
                );
                
                if (isOptimisticOrPending && m.content === newMessage.content) {
                  console.log('🔄 Detectado mensaje duplicado (optimista→real):', m.id, '→', newMessage.id);
                  return true;
                }
              }
              
              return false;
            });
            
            if (messageExists) {
              console.log('⚠️ Mensaje ya existe en el chat, ignorando duplicado:', newMessage.id);
              // En lugar de ignorar, reemplazar el mensaje optimista con el real
              const updatedMessages = existingMessages.map((m: any) => {
                // Reemplazar mensaje optimista/pending con el mensaje real
                if (
                  (m._isOptimistic || String(m.id).startsWith('temp-') || String(m.id).startsWith('pending-')) &&
                  m.content === newMessage.content &&
                  (newMessage.message_type === 1 || newMessage.sender === 'agent')
                ) {
                  console.log('✅ Reemplazando mensaje optimista con real:', m.id, '→', newMessage.id);
                  return { ...newMessage, _isOptimistic: false };
                }
                return m;
              });
              
              // ✅ NUEVO: Actualizar caché con mensajes actualizados
              if (updateMessagesCache) {
                updateMessagesCache(prev.id, updatedMessages);
              }
              
              return {
                ...prev,
                messages: updatedMessages
              };
            }
            
            console.log('✅ Agregando nuevo mensaje al chat:', newMessage.id, newMessage.content);
            const newMessages = [...existingMessages, newMessage];
            
            // ✅ NUEVO: Actualizar caché con nuevo mensaje
            if (updateMessagesCache) {
              updateMessagesCache(prev.id, newMessages);
            }
            
            return {
              ...prev,
              messages: newMessages
            };
          });
          
          console.log('💬 Mensaje agregado exitosamente al chat');
        } catch (error) {
          console.error('❌ Error agregando mensaje al chat:', error);
        }
      }
    }
  });

  //  HOOK DE NOTIFICACIONES
  // ELIMINADO: Declaraci??n duplicada de notifications
  
  // ?? NUEVO: Referencias para virtualizaci??n
  const conversationsListRef = useRef<HTMLDivElement>(null);
  
  //  Mensajes filtrados (sin privados, ordenados por fecha)
  // ⚡ MEJORADO: Filtrar mensajes optimistas cuando ya existe mensaje real con mismo contenido
  const filteredMessages = useMemo(() => {
    if (!activeConversation) return [];
    
    const allMessages = activeConversation.messages || [];
    
    // Obtener contenidos de mensajes reales (no optimistas)
    // Un mensaje es "real" si tiene ID numérico y NO tiene flags optimistas
    const realMessageContents = new Set(
      allMessages
        .filter((m: any) => {
          const isReal = (
            typeof m.id === 'number' &&
            !m._isOptimistic &&
            !String(m.id).startsWith('temp-') &&
            !String(m.id).startsWith('pending-')
          );
          return isReal;
        })
        .map((m: any) => m.content?.trim())
    );
    
    // Filtrar: excluir mensajes optimistas/pending cuyo contenido ya existe en mensajes reales
    const deduplicatedMessages = allMessages.filter((m: any) => {
      // Si es mensaje real (ID numérico, no flags), siempre incluir (excepto privados)
      const isRealMessage = (
        typeof m.id === 'number' &&
        !m._isOptimistic &&
        !String(m.id).startsWith('temp-') &&
        !String(m.id).startsWith('pending-')
      );
      
      if (isRealMessage) {
        return !m.private;
      }
      
      // Si es optimista o pending, solo incluir si su contenido NO existe ya en mensajes reales
      if (m._isOptimistic || String(m.id).startsWith('temp-') || String(m.id).startsWith('pending-')) {
        const contentExists = realMessageContents.has(m.content?.trim());
        if (contentExists) {
          console.log('🔄 Filtrando mensaje optimista duplicado:', m.content?.substring(0, 30));
        }
        return !contentExists;
      }
      return !m.private;
    });
    
    return deduplicatedMessages.sort((a: Message, b: Message) => {
      const timeA = a.timestamp || new Date(a.created_at).getTime() / 1000;
      const timeB = b.timestamp || new Date(b.created_at).getTime() / 1000;
      return timeA - timeB;
    });
  }, [activeConversation]);
  
  // Manejadores para redimensionamiento
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Función para toggle del panel derecho
  const toggleRightPanel = () => {
    setIsRightPanelVisible(!isRightPanelVisible);
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      if (newWidth >= 29 && newWidth <= 50) {
        setLeftPanelWidth(newWidth);
        localStorage.setItem('conversationsPanelWidth', newWidth.toString());
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  //  B??SQUEDA GLOBAL EN BACKEND
  useEffect(() => {
    // Si no hay t??rmino de búsqueda, limpiar resultados
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    // Debounce: esperar 500ms despu??s de que el usuario deje de escribir
    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        console.log(' Buscando en backend:', searchTerm);
        
        const response = await axios.get('/api/chatwoot/conversations/search', {
          params: { q: searchTerm }
        });

        console.log('??? Resultados de búsqueda:', response.data);
        
        if (response.data.success) {
          // Mapear resultados para incluir avatarUrl en el objeto contact
          const mappedResults = response.data.data.map((conv: any) => {
            // Buscar avatarUrl en m??ltiples ubicaciones posibles
            const avatarUrl = conv.meta?.sender?.thumbnail || 
                             conv.meta?.sender?.avatar_url || 
                             conv.contact?.avatar_url ||
                             conv.contact?.avatarUrl ||
                             null;
            
            // Debug temporal
            console.log(' Avatar para', conv.contact?.name, ':', avatarUrl);
            
            return {
              ...conv,
              contact: {
                ...conv.contact,
                avatarUrl: avatarUrl,
                // Asegurar que avatar sea solo iniciales si hay URL
                avatar: avatarUrl ? conv.contact?.name?.substring(0, 2).toUpperCase() : conv.contact?.avatar
              }
            };
          });
          setSearchResults(mappedResults);
          console.log(` Encontradas ${mappedResults.length} conversaciones con avatarUrl mapeado`);
        } else {
          setSearchResults([]);
          console.warn('?? B??squeda sin resultados');
        }
      } catch (error: any) {
        console.error('??? Error en búsqueda:', error.response?.data || error.message);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // Esperar 500ms (debounce)

    // Cleanup: cancelar búsqueda si el usuario sigue escribiendo
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const filteredConversations = React.useMemo(() => {
    debugLog.log(' Filtro ejecutado:', { 
      totalConversations: conversations?.length, 
      searchTerm, 
      selectedFilter,
      hasSearchResults: !!searchResults,
      searchResultsCount: searchResults?.length || 0
    });
    
    // Si hay resultados de búsqueda del backend, usarlos
    if (searchResults !== null) {
      debugLog.log('??? Usando resultados de búsqueda backend:', searchResults.length);
      
      // Aplicar filtro de pesta??a sobre los resultados de búsqueda
      const result = searchResults.filter((conversation: any) => {
        if (selectedFilter === 'all') return true;
        if (selectedFilter === 'mine') return conversation.assignee_id === 1;
        if (selectedFilter === 'assigned') return conversation.assignee_id && conversation.assignee_id !== 1;
        return true;
      });
      
      debugLog.log(' Resultados despu??s de filtro de pesta??a:', result.length);
      return result;
    }
    
    if (!searchTerm) {
      // Sin busqueda, aplicar solo filtro de pestana
      const result = (conversations || []).filter(conversation => {
        if (selectedFilter === 'all') return true;
        if (selectedFilter === 'mine') return conversation.assignee_id === 1;
        if (selectedFilter === 'assigned') return conversation.assignee_id && conversation.assignee_id !== 1;
        return true;
      });
      debugLog.log('??? Sin búsqueda, resultados:', result.length);
      return result;
    }
    
    // Con busqueda, filtrar por texto Y pestana
    let result = (conversations || []).filter(conversation => {
      const searchLower = searchTerm.toLowerCase();
      
      // 1. Buscar en nombre del contacto
      const nameMatch = conversation.contact?.name?.toLowerCase()?.includes(searchLower);
      
      // 2. Buscar en el ultimo mensaje
      const lastMessageMatch = conversation.last_message?.content?.toLowerCase()?.includes(searchLower);
      
      // 3. Buscar en TODOS los mensajes cargados en memoria (si existen)
      const allMessagesMatch = conversation.messages?.some((msg: any) => 
        msg.content?.toLowerCase()?.includes(searchLower)
      );
      
      // 4. Buscar en etiquetas
      const labelMatch = conversation.labels?.some((label: any) => 
        label.title?.toLowerCase()?.includes(searchLower)
      );
      
      // 5. Buscar en email o telefono
      const contactMatch = conversation.contact?.email?.toLowerCase()?.includes(searchLower) ||
                           conversation.contact?.phone_number?.includes(searchTerm);
      
      const matchesSearch = nameMatch || lastMessageMatch || allMessagesMatch || labelMatch || contactMatch;
      
      if (matchesSearch) {
        console.log('??? Match encontrado:', {
          name: conversation.contact?.name,
          nameMatch,
          lastMessageMatch,
          allMessagesMatch: allMessagesMatch ? 'SI (en historial)' : 'no',
          labelMatch,
          contactMatch,
          totalMessages: conversation.messages?.length || 0
        });
      }
      
      // Aplicar filtro de pestana
      if (selectedFilter === 'all') return matchesSearch;
      if (selectedFilter === 'mine') return matchesSearch && conversation.assignee_id === 1;
      if (selectedFilter === 'assigned') return matchesSearch && conversation.assignee_id && conversation.assignee_id !== 1;
      return matchesSearch;
    });
    
    console.log(' Con búsqueda, resultados:', result.length);

    window.DEBUG_CONVS = result.slice(0, 5).map(c => ({ id: c.id, name: c.contact?.name, updated_at: c.updated_at, lastMsg: c.last_message?.timestamp }));
    if (appliedFilters) {
      if (appliedFilters.status && appliedFilters.status.length > 0) {
        result = result.filter(conv => appliedFilters.status.includes(conv.status));
      }

      if (appliedFilters.priority && appliedFilters.priority.length > 0) {
        result = result.filter(conv => {
          const priority = conv.priority || 'none';
          return appliedFilters.priority.includes(priority);
        });
      }

      if (appliedFilters.labels && appliedFilters.labels.length > 0) {
        result = result.filter(conv => {
          if (!conv.labels || conv.labels.length === 0) return false;
          return conv.labels.some(label => appliedFilters.labels.includes(label));
        });
      }

      if (appliedFilters.unreadOnly) {
        result = result.filter(conv => conv.unread_count > 0);
      }

      if (appliedFilters.assignedTo) {
        if (appliedFilters.assignedTo === 'me') {
          result = result.filter(conv => conv.assignee_id === 1);
        } else if (appliedFilters.assignedTo === 'unassigned') {
          result = result.filter(conv => !conv.assignee_id);
        } else if (appliedFilters.assignedTo === 'others') {
          result = result.filter(conv => conv.assignee_id && conv.assignee_id !== 1);
        }
      }

      if (appliedFilters.dateRange && appliedFilters.dateRange !== 'all') {
        const now = new Date();
        let startDate = null;
        let endDate = null;

        if (appliedFilters.dateRange === 'today') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        } else if (appliedFilters.dateRange === 'week') {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          startDate = weekAgo;
          endDate = now;
        } else if (appliedFilters.dateRange === 'month') {
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          startDate = monthAgo;
          endDate = now;
        } else if (appliedFilters.dateRange === 'custom' && appliedFilters.customDateFrom && appliedFilters.customDateTo) {
          startDate = new Date(appliedFilters.customDateFrom);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(appliedFilters.customDateTo);
          endDate.setHours(23, 59, 59, 999);
        }

        if (startDate && endDate) {
          result = result.filter(conv => {
            let convDate = null;

            // Intentar obtener la fecha de la conversacion
            if (conv.last_activity_at) {
              // last_activity_at es timestamp Unix en segundos
              convDate = new Date(conv.last_activity_at * 1000);
            } else if (conv.timestamp) {
              // timestamp puede estar en segundos o milisegundos
              convDate = new Date(conv.timestamp > 10000000000 ? conv.timestamp : conv.timestamp * 1000);
            } else if (conv.updated_at) {
              // updated_at puede ser ISO string o timestamp
              if (typeof conv.updated_at === 'string') {
                convDate = new Date(conv.updated_at);
              } else {
                convDate = new Date(conv.updated_at > 10000000000 ? conv.updated_at : conv.updated_at * 1000);
              }
            } else if (conv.last_message?.timestamp) {
              convDate = new Date(conv.last_message.timestamp > 10000000000 ? conv.last_message.timestamp : conv.last_message.timestamp * 1000);
            } else if (conv.created_at) {
              convDate = new Date(conv.created_at);
            }

            if (!convDate || isNaN(convDate.getTime())) {
              return false;
            }

            return convDate >= startDate && convDate <= endDate;
          });
        }
      }
    }

    return result;
  }, [conversations, searchTerm, selectedFilter, searchResults?.length ?? 0, appliedFilters]);

  //  VIRTUALIZACI?N: Solo renderiza items visibles (mejora 80% el performance)
  const rowVirtualizer = useVirtualizer({
    count: (filteredConversations || []).length,
    getScrollElement: () => conversationsListRef.current,
    estimateSize: () => 80, // Altura estimada de cada conversación en px
    overscan: 5 // Renderizar 5 items extra arriba/abajo para scroll suave
  });

  const handleSelectConversation = async (conversation: Conversation) => {
    // ✅ NUEVO: Guardar mensajes de la conversación actual en caché ANTES de cambiar
    if (activeConversation?.id && activeConversation?.messages?.length > 0 && updateMessagesCache) {
      console.log(`💾 Guardando ${activeConversation.messages.length} mensajes de conversación ${activeConversation.id} en caché antes de cambiar`);
      updateMessagesCache(activeConversation.id, activeConversation.messages);
    }
    
    // 🚀 OPTIMIZACIÓN: Mostrar conversación INMEDIATAMENTE con loading state
    // Esto elimina el delay de 3 segundos percibido por el usuario
    _setActiveConversation({
      ...conversation,
      messages: [], // Array vacío mientras carga
      _isLoading: true // Flag para mostrar skeleton
    });
    
    // Cargar mensajes en background (no bloqueante)
    loadConversationMessages(conversation.id);
    
    // Marcar como leída en background (no bloqueante)
    if (markConversationAsRead) {
      markConversationAsRead(conversation.id).then(() => {
        console.log('✅ Conversación marcada como leída en servidor');
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeConversation) return;

    try {
      // Si est? respondiendo, agregar el contexto
      let messageContent = newMessage;
      if (replyingTo) {
        messageContent = `> ${replyingTo.sender_name}: ${replyingTo.content}\n\n${newMessage}`;
      }
      
      //  UI OPTIMISTA: Agregar mensaje temporal inmediatamente
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const nowTimestamp = Math.floor(Date.now() / 1000); // Unix timestamp en segundos
      const optimisticMessage = {
        id: tempId,
        content: messageContent,
        created_at: new Date().toISOString(),
        timestamp: nowTimestamp, // ⚡ IMPORTANTE: Agregar timestamp para formatTimestamp()
        message_type: 'outgoing',
        sender: 'agent', // ✅ String directo, no objeto
        conversation_id: activeConversation.id,
        status: 'sending', // Marcador especial
        _isOptimistic: true // Flag para identificar mensajes temporales
      };
      
      // Agregar al estado local temporalmente
      if (activeConversation.messages) {
        // ⚡ IMPORTANTE: Crear nuevo array para que useMemo detecte el cambio
        const newMessages = [...activeConversation.messages, optimisticMessage];
        console.log(' Agregando mensaje optimista:', tempId, 'Total mensajes:', (newMessages || []).length);
        // Forzar re-render con nuevo objeto Y nuevo array
        _setActiveConversation({ 
          ...activeConversation, 
          messages: newMessages 
        });
        
        // ⚡ NUEVO: Actualizar sidebar (lista de conversaciones) con el mensaje enviado
        setConversations((prevConversations: any[]) => {
          return prevConversations.map((conv: any) => {
            if (conv.id === activeConversation.id) {
              return {
                ...conv,
                last_message: {
                  content: messageContent,
                  created_at: new Date().toISOString(),
                  timestamp: nowTimestamp,
                  message_type: 1, // outgoing
                  sender: { name: 'Yo' }
                },
                updated_at: new Date().toISOString(),
                last_activity_at: nowTimestamp
              };
            }
            return conv;
          }).sort((a: any, b: any) => {
            const timeA = a.last_activity_at || a.timestamp || 0;
            const timeB = b.last_activity_at || b.timestamp || 0;
            return timeB - timeA;
          });
        });
        
        // ✅ NUEVO: Actualizar caché de mensajes con el mensaje optimista
        if (addMessageToCache) {
          addMessageToCache(activeConversation.id, optimisticMessage);
        }
      }
      
      // Limpiar UI inmediatamente (sin delay)
      setNewMessage('');
      setReplyingTo(null);
      
      // 📤 Enviar al servidor y actualizar status
      const conversationId = activeConversation.id;
      sendMessage(conversationId, messageContent)
        .then((result) => {
          console.log('✅ Mensaje enviado, actualizando status a sent:', result);
          // Actualizar mensaje optimista con ID real y status 'sent'
          _setActiveConversation((prev: any) => {
            if (!prev || !prev.messages) return prev;
            const updatedMessages = prev.messages.map((msg: any) => {
              if (msg.id === tempId) {
                return {
                  ...msg,
                  id: result?.id || msg.id, // Actualizar con ID real si está disponible
                  status: 'sent',
                  _isOptimistic: false
                };
              }
              return msg;
            });
            
            // ✅ NUEVO: Actualizar caché con los mensajes actualizados
            if (updateMessagesCache) {
              updateMessagesCache(prev.id, updatedMessages);
            }
            
            return {
              ...prev,
              messages: updatedMessages
            };
          });
        })
        .catch((error) => {
          console.error('❌ Error sending message:', error);
          // Marcar mensaje como fallido
          _setActiveConversation((prev: any) => {
            if (!prev || !prev.messages) return prev;
            return {
              ...prev,
              messages: prev.messages.map((msg: any) => {
                if (msg.id === tempId) {
                  return { ...msg, status: 'failed', _isOptimistic: false };
                }
                return msg;
              })
            };
          });
        });
      
      // ?? El polling detectar? el mensaje real y reemplazar? el optimista
      
    } catch (error) {
      console.error('Error preparing message:', error);
    }
  };

  //  FUNCIONES DE WHATSAPP
  
  // 1 REPLY - Responder a un mensaje
  const handleReplyToMessage = (message: any) => {
    setReplyingTo(message);
    setMessageMenuOpen(null);
    // Focus en el input
    document.getElementById('message-input')?.focus();
  };

  // 2 STAR - Destacar mensaje
  const handleStarMessage = (messageId: number) => {
    setStarredMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
    setMessageMenuOpen(null);
  };

  // 3 COPY - Copiar mensaje
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    setMessageMenuOpen(null);
    // Mostrar notificaci??n temporal
    alert('Mensaje copiado al portapapeles');
  };

  // 4 FORWARD - Reenviar mensaje (simplificado - copiar al portapapeles)
  const handleForwardMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    setMessageMenuOpen(null);
    alert('Mensaje copiado. Pégalo en otra conversación.');
  };

  // 5 DELETE - Eliminar mensaje (solo visual)
  const handleDeleteMessage = (messageId: number) => {
    if (activeConversation) {
      const updatedMessages = activeConversation.messages.filter((m: any) => m.id !== messageId);
      _setActiveConversation({
        ...activeConversation,
        messages: updatedMessages
      });
    }
    setMessageMenuOpen(null);
  };

  // 6 PIN - Fijar mensaje
  const handlePinMessage = (message: any) => {
    setPinnedMessage(message);
    setMessageMenuOpen(null);
  };

  // 7 SEARCH - Buscar en mensajes
  const handleSearchMessages = (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !activeConversation) {
      setMessageSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    // Filtrar mensajes que contienen el query y guardar sus IDs
    const results = activeConversation.messages
      .filter((msg: any) => 
        msg.content && msg.content.toLowerCase().includes(query.toLowerCase())
      )
      .map((msg: any) => msg.id);

    setMessageSearchResults(results);
    setCurrentSearchIndex(0);

    // Scroll al primer resultado
    if ((results || []).length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`message-${results[0]}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
    
    console.log(` B??squeda: "${query}" - ${(results || []).length} resultados encontrados`, results);
  };

  // 8 MUTE - Silenciar conversación
  const handleMuteConversation = (conversationId: number) => {
    setMutedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  // 9 TYPING INDICATOR - Simular "escribiendo..."
  const handleTypingIndicator = () => {
    // En una implementaci??n real, esto vendr??a del WebSocket
    setIsContactTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsContactTyping(false);
    }, 3000);
  };

  //  EMOJI - Agregar emoji al mensaje
  const handleAddEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  //  FASE 3 - HANDLERS PARA FUNCIONES AVANZADAS

  // 1 DRAG & DROP - Manejar archivos arrastrados
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if ((files || []).length > 0 && activeConversation) {
      setDraggedFiles(files);
      // Enviar archivos al backend
      for (const file of files) {
        await handleSendAttachment(file);
      }
      setDraggedFiles([]);
    }
  };

  const handleSendAttachment = async (file: File) => {
    if (!activeConversation) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversation_id', activeConversation.id.toString());
    
    try {
      const response = await fetch(`/api/chatwoot-proxy/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (response.ok) {
        console.log(' Archivo enviado:', file.name);
      }
    } catch (error) {
      console.error('?? Error enviando archivo:', error);
    }
  };

  // 2 AUDIO MESSAGES - Grabar mensajes de voz
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await handleSendAudioMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        setAudioChunks([]);
        setRecordingDuration(0);
      };

      recorder.start();
      setAudioRecorder(recorder);
      setIsRecording(true);
      
      // Contador de duraci??n
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('?? Error al iniciar grabaci??n:', error);
      alert('No se pudo acceder al micr??fono');
    }
  };

  const handleStopRecording = () => {
    if (audioRecorder && isRecording) {
      audioRecorder.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const handleSendAudioMessage = async (audioBlob: Blob) => {
    if (!activeConversation) return;
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio-message.webm');
    formData.append('conversation_id', activeConversation.id.toString());
    formData.append('message_type', 'outgoing');
    formData.append('content', ' Mensaje de voz');
    
    try {
      const response = await fetch(`/api/chatwoot-proxy/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (response.ok) {
        console.log(' Audio enviado');
      }
    } catch (error) {
      console.error('?? Error enviando audio:', error);
    }
  };

  // 3 MULTIMEDIA GALLERY - Extraer multimedia de la conversación
  const getMediaFromConversation = () => {
    if (!activeConversation?.messages) return { images: [], files: [], links: [] };
    
    const images: any[] = [];
    const files: any[] = [];
    const links: any[] = [];
    
    activeConversation.messages.forEach((msg: any) => {
      // Buscar im?genes en attachments
      if (msg.attachments) {
        msg.attachments.forEach((att: any) => {
          if (att.file_type?.startsWith('image/')) {
            images.push({ ...att, message_id: msg.id });
          } else if (att.file_type) {
            files.push({ ...att, message_id: msg.id });
          }
        });
      }
      
      // Buscar URLs en el contenido
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const foundLinks = msg.content?.match(urlRegex);
      if (foundLinks) {
        foundLinks.forEach((url: string) => {
          links.push({ url, message_id: msg.id, created_at: msg.created_at });
        });
      }
    });
    
    return { images, files, links };
  };


  // ?? NUEVO: Función para hacer scroll al final de los mensajes
  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'auto') => {
    const container = messagesContainerRef.current;
    debugLog.log('?? scrollToBottom llamado - behavior:', behavior, 'container existe:', !!container);
    if (container) {
      debugLog.log(' Container scrollHeight:', container.scrollHeight, 'scrollTop actual:', container.scrollTop);
      if (behavior === 'smooth') {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        // Scroll instant??neo m??s confiable
        container.scrollTop = container.scrollHeight;
      }
      debugLog.log('??? Scroll ejecutado - nuevo scrollTop:', container.scrollTop);
    } else {
      debugLog.error('??? messagesContainerRef.current es null!');
    }
  }, []);

  // ?? NUEVO: Auto-scroll cuando se carga una conversación o llegan mensajes nuevos
  useEffect(() => {
    if (activeConversation?.messages && (activeConversation?.messages || []).length > 0) {
      const currentMessageCount = (activeConversation?.messages || []).length;
      
      // Detectar si hay nuevos mensajes (no es el primer load)
      if (previousMessageCount > 0 && currentMessageCount > previousMessageCount) {
        // ✅ VERIFICAR: Solo mostrar separador si el último mensaje NO es tuyo
        const lastMessage = activeConversation.messages[activeConversation.messages.length - 1];
        const esIncoming = lastMessage?.message_type === 0 || lastMessage?.message_type === 'incoming';
        
        console.log(' Nuevos mensajes detectados:', currentMessageCount - previousMessageCount);
        console.log(' Último mensaje tipo:', lastMessage?.message_type, 'Es incoming?', esIncoming);
        
        // Solo mostrar separador si es mensaje INCOMING (de otro usuario)
        if (esIncoming) {
          // Hay mensajes nuevos de OTROS - mostrar separador
          setNewMessageSeparatorIndex(previousMessageCount);
          
          // Ocultar separador después de 3 segundos
          setTimeout(() => {
            setNewMessageSeparatorIndex(null);
          }, 3000);
        }
        
        // ?? SCROLL INMEDIATO Y GARANTIZADO (siempre scroll, con o sin separador)
        requestAnimationFrame(() => {
          const container = messagesContainerRef.current;
          if (container) {
            console.log(' Forzando scroll inmediato - scrollHeight:', container.scrollHeight);
            container.scrollTop = container.scrollHeight;
            console.log('?? Scroll ejecutado - scrollTop:', container.scrollTop);
          }
        });
      } else if (previousMessageCount === 0) {
        // Primer load - scroll instant??neo
        debugLog.log(' Primera carga de mensajes');
        setTimeout(() => scrollToBottom('auto'), 100);
      }
      
      // Actualizar contador
      setPreviousMessageCount(currentMessageCount);
    }
  }, [activeConversation?.id, activeConversation?.messages?.length ?? 0, scrollToBottom]);
  
  //  NUEVO: Mantener scroll SIEMPRE en el fondo (MutationObserver)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !activeConversation) return;

    debugLog.log('??? Iniciando observer para mantener scroll al fondo');

    // Función para forzar scroll al fondo
    const scrollToBottomImmediate = () => {
      //  NO hacer scroll autom?tico si hay búsqueda activa
      if ((searchResults || []).length > 0) {
        debugLog.log(' B??squeda activa - cancelando auto-scroll');
        return;
      }
      
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      });
    };

    // Observer que detecta cambios en el DOM (nuevos mensajes, im?genes cargadas, etc)
    const observer = new MutationObserver(() => {
      debugLog.log(' DOM mutado - haciendo scroll al fondo');
      scrollToBottomImmediate();
    });

    // Observar cambios en el contenedor
    observer.observe(container, {
      childList: true,        // Detectar cuando se agregan/eliminan hijos
      subtree: true,          // Observar todos los descendientes
      attributes: true,       // Detectar cambios de atributos (ej: im?genes cargadas)
      characterData: true     // Detectar cambios de texto
    });

    // Scroll inicial
    scrollToBottomImmediate();

    // Cleanup
    return () => {
      debugLog.log(' Deteniendo observer de scroll');
      observer.disconnect();
    };
  }, [activeConversation?.id, activeConversation?.messages?.length ?? 0, searchResults?.length ?? 0]);

  //  Scroll autom??tico al primer mensaje que coincide con la búsqueda
  useEffect(() => {
    if (searchTerm && searchResults && activeConversation?.messages) {
      // Esperar a que los mensajes se rendericen
      setTimeout(() => {
        // Buscar el primer mensaje que contiene el t??rmino
        const messages = activeConversation.messages;
        const firstMatchIndex = messages.findIndex((msg: any) => 
          msg.content?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (firstMatchIndex !== -1) {
          // Buscar el elemento DOM del mensaje
          const messageElements = document.querySelectorAll('[data-message-id]');
          if (messageElements[firstMatchIndex]) {
            messageElements[firstMatchIndex].scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            console.log(' Scroll al mensaje que coincide:', firstMatchIndex);
          }
        }
      }, 500);
    }
  }, [activeConversation?.id, searchTerm, searchResults?.length ?? 0]);

  //  Contar total de coincidencias en la conversación
  useEffect(() => {
    if (searchTerm && searchResults && activeConversation?.messages) {
      let count = 0;
      activeConversation.messages.forEach((msg: any) => {
        if (msg.content) {
          const regex = new RegExp(searchTerm, 'gi');
          const matches = msg.content.match(regex);
          if (matches) {
            count += matches.length;
          }
        }
      });
      setTotalMatches(count);
      setCurrentMatchIndex(0); // Resetear a la primera coincidencia
      console.log(` Total de coincidencias de "${searchTerm}":`, count);
    } else {
      setTotalMatches(0);
      setCurrentMatchIndex(0);
    }
  }, [activeConversation?.id, activeConversation?.messages?.length ?? 0, searchTerm, searchResults?.length ?? 0]);


  
  // ?? Ejecutar scroll cuando se active el trigger
  useEffect(() => {
    if (shouldScrollToBottom) {
      console.log(' Haciendo scroll autom?tico...');
      setTimeout(() => scrollToBottom('smooth'), 150);
      setShouldScrollToBottom(false);
    }
  }, [shouldScrollToBottom, scrollToBottom]);
  
  // ?? Resetear contador cuando cambia de conversación
  useEffect(() => {
    setPreviousMessageCount(0);
    setNewMessageSeparatorIndex(null);
    //  Limpiar búsqueda al cambiar de conversación
    setSearchQuery('');
    setMessageSearchResults([]);
    setCurrentSearchIndex(0);
    setShowSearchBar(false);
  }, [activeConversation?.id]);

  // ?? NUEVO: Cerrar men?? de settings al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  // FASE 3: Atajo de teclado para filtros avanzados
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Filtros avanzados: Ctrl+F
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setShowAdvancedFilters(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // FASE 3: Scroll automatico al navegar resultados de busqueda
  useEffect(() => {
    if ((searchResults || []).length > 0 && currentSearchIndex < (searchResults || []).length) {
      const messageId = messageSearchResults[currentSearchIndex];
      setTimeout(() => {
        const element = document.getElementById(`message-${messageId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [currentSearchIndex, searchResults?.length ?? 0]);

  // Funciones para el modal de editar contacto
  const handleOpenEditModal = () => {
    if (activeConversation) {
      const contact = activeConversation.contact;
      
      console.log(' DEBUG - Abriendo modal de edici??n:', {
        'activeConversation completo': activeConversation,
        'contact': contact,
        'contact.name': contact?.name,
        'contact.phone_number': contact?.phone_number,
        'contact.email': contact?.email,
        'contact.id': contact?.id
      });
      
      //  L?GICA BASADA EN LA BD DE CHATWOOT:
      // - phone_number: SIEMPRE tiene el n??mero correcto (ej: +56984680080)
      // - name: Puede ser el nombre real O el n??mero si no tiene nombre
      // - identifier: Es el WhatsApp ID (ej: 56984680080@s.whatsapp.net)
      
      const phoneNumber = contact?.phone_number || contact?.name || '';
      const nameValue = contact?.name || '';
      
      // Determinar si 'name' es solo un n??mero (sin nombre real asignado)
      // o si es un nombre real (con letras/caracteres especiales)
      const isPhoneNumber = /^[+\d]+$/.test(nameValue);
      
      console.log(' Valores a setear:', {
        phoneNumber,
        nameValue,
        isPhoneNumber,
        'nombre final': isPhoneNumber ? '' : nameValue,
        'tel??fono final': phoneNumber
      });
      
      // Si name es solo el n??mero, dejamos el campo nombre vac??o para que el usuario lo complete
      // Si name tiene letras/caracteres, es un nombre real
      setEditName(isPhoneNumber ? '' : nameValue);
      
      // SIEMPRE usar phone_number como fuente confiable del tel??fono
      setEditPhone(phoneNumber);
      
      setEditEmail(contact?.email || '');
      setIsEditModalOpen(true);
    } else {
      console.error('?? No hay conversación activa');
    }
  };

  const handleSaveContact = async () => {
    console.log(' handleSaveContact llamado', {
      'activeConversation existe': !!activeConversation,
      'activeConversation.contact existe': !!activeConversation?.contact,
      'activeConversation.contact.id': activeConversation?.contact?.id,
      'activeConversation.meta': activeConversation?.meta,
      'activeConversation.inbox_id': activeConversation?.inbox_id,
      'activeConversation completo': activeConversation
    });

    // Intentar obtener el contact_id de diferentes lugares
    const contactId = activeConversation?.contact?.id 
      || activeConversation?.meta?.sender?.id 
      || activeConversation?.contact_inbox?.contact_id;

    if (!contactId) {
      console.error('?? No se pudo obtener el ID del contacto', {
        'contact': activeConversation?.contact,
        'meta': activeConversation?.meta,
        'contact_inbox': activeConversation?.contact_inbox
      });
      setToastMessage('?? Error: No hay contacto activo');
      setShowToast(true);
      return;
    }

    try {
      console.log(' Guardando contacto:', {
        id: contactId,
        name: editName,
        phone: editPhone,
        email: editEmail
      });

      // Llamar a la API de Laravel que maneja Chatwoot
      const updateResponse = await fetch(`/api/chatwoot-proxy/contacts/${contactId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({
          name: editName || editPhone, // Si no hay nombre, usar el tel??fono
          email: editEmail,
          phone_number: editPhone
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.message || 'Error actualizando contacto');
      }

      const result = await updateResponse.json();
      console.log('?? Contacto actualizado exitosamente:', result);

      // Actualizar el estado local de la conversación activa
      if (activeConversation) {
        const updatedConversation = {
          ...activeConversation,
          contact: {
            ...activeConversation.contact,
            name: editName || editPhone,
            email: editEmail,
            phone_number: editPhone
          }
        };
        _setActiveConversation(updatedConversation);
      }

      // Recargar conversaciones para reflejar los cambios
      await fetchUpdatedConversations();
      
      // Mostrar toast de ??xito
      setToastMessage('?Contacto actualizado exitosamente!');
      setShowToast(true);
      
      // Cerrar modal
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error guardando contacto:', error);
      setToastMessage('Error al actualizar el contacto');
      setShowToast(true);
      
      // Ocultar toast de error despu??s de 3 segundos
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }
  };

  // Auto-hide toast
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Handlers para opciones del men??
  const handleDownloadChat = () => {
    if (!activeConversation) {
      alert('Por favor selecciona una conversación primero');
      return;
    }
    
    try {
      console.log('📊 Iniciando descarga de conversación:', activeConversation.id);
      
      // Crear workbook
      const wb = XLSX.utils.book_new();
      
      // ===== HOJA 1: INFORMACI?N GENERAL =====
      const contacto = activeConversation.meta?.sender || activeConversation.contact || {};
      const telefono = contacto.phone_number || contacto.identifier || 'N/A';
      const email = contacto.email || 'N/A';
      
      const infoData = [
        ['INFORMACI?N DE LA CONVERSACI?N'],
        [''],
        ['ID Conversaci??n:', activeConversation.id],
        ['Contacto:', activeConversation.contact?.name || 'Sin nombre'],
        ['Email:', email],
        ['Tel??fono:', telefono],
        ['Estado:', activeConversation.status === 'open' ? 'Abierta' : activeConversation.status === 'resolved' ? 'Resuelta' : activeConversation.status],
        ['Prioridad:', activeConversation.priority || 'Normal'],
        ['Agente asignado:', activeConversation.assignee?.name || 'No asignado'],
        ['Mensajes no le??dos:', activeConversation.unread_count || 0],
        ['Total de mensajes:', activeConversation.messages?.length || 0],
        ['Fecha de exportaci??n:', new Date().toLocaleString('es-ES')],
        [''],
        ['Etiquetas:', activeConversation.labels?.join(', ') || 'Sin etiquetas']
      ];
      
      const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
      wsInfo['!cols'] = [{ wch: 25 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, wsInfo, 'Informacion');
      
      // ===== HOJA 2: MENSAJES =====
      const mensajesData = [
        ['HISTORIAL DE MENSAJES'],
        [''],
        ['Fecha y Hora', 'Remitente', 'Tipo', 'Contenido']
      ];
      
      if (activeConversation.messages && (activeConversation?.messages || []).length > 0) {
        // Ordenar mensajes por timestamp (ascendente)
        const mensajesOrdenados = [...activeConversation.messages].sort((a, b) => {
          const timeA = a.created_at || a.timestamp || 0;
          const timeB = b.created_at || b.timestamp || 0;
          return timeA - timeB;
        });
        
        mensajesOrdenados.forEach((msg: any) => {
          const timestamp = msg.created_at || msg.timestamp;
          const fecha = timestamp ? new Date(timestamp * 1000).toLocaleString('es-ES') : 'Sin fecha';
          const esAgente = msg.message_type === 1 || msg.sender === 'agent';
          const remitente = esAgente 
            ? (activeConversation.assignee?.name || 'Agente')
            : (activeConversation.contact?.name || 'Cliente');
          const tipo = esAgente ? 'Saliente (Agente)' : 'Entrante (Cliente)';
          
          mensajesData.push([
            fecha,
            remitente,
            tipo,
            msg.content || ''
          ]);
        });
      } else {
        mensajesData.push(['Sin mensajes', '', '', '']);
      }
      
      const wsMensajes = XLSX.utils.aoa_to_sheet(mensajesData);
      wsMensajes['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsMensajes, 'Mensajes');
      
      // ===== HOJA 3: ESTAD?STICAS =====
      const mensajesAgente = activeConversation.messages?.filter((m: any) => 
        m.message_type === 1 || m.sender === 'agent'
      ).length || 0;
      
      const mensajesCliente = activeConversation.messages?.filter((m: any) => 
        m.message_type === 0 || m.sender === 'user'
      ).length || 0;
      
      const primerMensaje = activeConversation.messages?.[0];
      const ultimoMensaje = activeConversation.messages?.[(activeConversation?.messages || []).length - 1];
      
      const fechaPrimer = primerMensaje?.created_at || primerMensaje?.timestamp;
      const fechaUltimo = ultimoMensaje?.created_at || ultimoMensaje?.timestamp;
      
      const statsData = [
        ['ESTAD?STICAS DE LA CONVERSACI?N'],
        [''],
        ['M??trica', 'Valor'],
        ['Total de mensajes', (activeConversation.messages?.length || 0).toString()],
        ['Mensajes del agente', mensajesAgente.toString()],
        ['Mensajes del cliente', mensajesCliente.toString()],
        ['Mensajes no le??dos', (activeConversation.unread_count || 0).toString()],
        [''],
        ['Primer mensaje', fechaPrimer ? new Date(fechaPrimer * 1000).toLocaleString('es-ES') : 'N/A'],
        ['?ltimo mensaje', fechaUltimo ? new Date(fechaUltimo * 1000).toLocaleString('es-ES') : 'N/A'],
        [''],
        ['Estado actual', activeConversation.status || 'N/A'],
        ['Prioridad', activeConversation.priority || 'Normal'],
        ['Canal', activeConversation.channel || 'Desconocido']
      ];
      
      const wsStats = XLSX.utils.aoa_to_sheet(statsData);
      wsStats['!cols'] = [{ wch: 30 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, wsStats, 'Estadisticas');
      
      // Generar nombre de archivo seguro
      const nombreContacto = (activeConversation.contact?.name || 'sin-nombre')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 30);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `Conversacion_${nombreContacto}_${timestamp}.xlsx`;
      
      // Descargar archivo
      XLSX.writeFile(wb, filename);
      
      console.log('✅ Excel descargado exitosamente:', filename);
      setIsSettingsOpen(false);
      
    } catch (error) {
      console.error('❌ Error al descargar chat:', error);
      alert('Error al generar el archivo Excel. Por favor intenta de nuevo.');
    }
  };

  // ?? Función mejorada con modal de progreso
  const handleDownloadAllConversations = async () => {
    try {
      // Abrir modal y resetear estado
      setIsDownloadModalOpen(true);
      setDownloadProgress(0);
      setDownloadPhase('fetching');
      setDownloadStatus('Conectando con el servidor...');
      setIsSettingsOpen(false);
      
      console.log('📤 Solicitando exportación de conversaciones con mensajes...');

      // Fase 1: Fetching (0-30%)
      setDownloadProgress(5);
      setDownloadStatus('Solicitando conversaciones al servidor...');
      
      const response = await fetch('/api/chatwoot-proxy/conversations/export-all', {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      setDownloadProgress(15);
      setDownloadStatus('Recibiendo datos...');
      
      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('No se recibieron datos del servidor');
      }

      const conversationsWithMessages = result.data.sort((a: any, b: any) => a.id - b.id);
      
      setDownloadProgress(30);
      setDownloadStatus(`${(conversationsWithMessages || []).length} conversaciones recibidas`);
      console.log(`✅ Recibidas ${(conversationsWithMessages || []).length} conversaciones con mensajes`);

      // Fase 2: Processing (30-60%)
      setDownloadPhase('processing');
      setDownloadProgress(35);
      setDownloadStatus('Organizando informaci??n de contactos...');
      
      const wb = XLSX.utils.book_new();

      const resumenData = [
        ['REPORTE COMPLETO DE CONVERSACIONES'],
        [''],
        ['Fecha de exportacion:', new Date().toLocaleString('es-ES')],
        ['Total de conversaciones:', (conversationsWithMessages || []).length],
        ['Procesadas con mensajes:', result.meta?.processed_successfully || 0],
        [''],
        ['ID', 'Contacto', 'Email', 'Telefono', 'Estado', 'Prioridad', 'No Leidos', 'Total Mensajes', 'Agente', 'Fecha Creacion']
      ];

      conversationsWithMessages.forEach((conv: any, index: number) => {
        // Actualizar progreso cada 10 conversaciones
        if (index % 10 === 0) {
          const progress = 35 + Math.floor((index / (conversationsWithMessages || []).length) * 25);
          setDownloadProgress(progress);
          setDownloadStatus(`Procesando contacto ${index + 1} de ${(conversationsWithMessages || []).length}...`);
        }
        
        //  Buscar datos actualizados del contacto en el estado local
        const localConv = conversations.find((c: any) => c.id === conv.id);
        const contactData = localConv?.contact || conv.contact || {};
        
        const contacto = conv.meta?.sender || contactData || {};
        const telefono = contactData.phone_number || contacto.phone_number || contacto.identifier || 'N/A';
        const email = contactData.email || contacto.email || 'N/A';
        const nombreContacto = contactData.name || conv.contact?.name || 'Sin nombre';
        const fechaCreacion = conv.created_at ? 
          new Date(conv.created_at * 1000).toLocaleString('es-ES') : 'N/A';

        resumenData.push([
          conv.id,
          nombreContacto,
          email,
          telefono,
          conv.status === 'open' ? 'Abierta' : 
          conv.status === 'resolved' ? 'Resuelta' : 
          conv.status === 'pending' ? 'Pendiente' : conv.status,
          conv.priority || 'Sin prioridad',
          conv.unread_count || 0,
          conv.messages?.length || 0,
          conv.assignee?.name || 'No asignado',
          fechaCreacion
        ]);
      });

      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
      wsResumen['!cols'] = [
        { wch: 10 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 12 },
        { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      const todosMensajesData = [
        ['TODOS LOS MENSAJES'],
        [''],
        ['Conv ID', 'Contacto', 'Fecha y Hora', 'Remitente', 'Tipo', 'Mensaje']
      ];

      // Fase 3: Generating (60-95%)
      setDownloadPhase('generating');
      setDownloadProgress(60);
      setDownloadStatus('Procesando mensajes...');
      
      let totalMensajes = 0;
      conversationsWithMessages.forEach((conv: any, convIndex: number) => {
        // Actualizar progreso cada 5 conversaciones
        if (convIndex % 5 === 0) {
          const progress = 60 + Math.floor((convIndex / (conversationsWithMessages || []).length) * 35);
          setDownloadProgress(progress);
          setDownloadStatus(`Procesando mensajes ${convIndex + 1}/${(conversationsWithMessages || []).length}...`);
        }
        
        if (conv.messages && (conv?.messages || []).length > 0) {
          //  Buscar datos actualizados del contacto en el estado local
          const localConv = conversations.find((c: any) => c.id === conv.id);
          const contactData = localConv?.contact || conv.contact || {};
          const nombreContacto = contactData.name || conv.contact?.name || 'Sin nombre';
          
          // Ordenar mensajes por created_at
          const mensajesOrdenados = [...conv.messages].sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
          
          mensajesOrdenados.forEach((msg: any) => {
            const fecha = new Date(msg.created_at * 1000).toLocaleString('es-ES');
            const remitente = msg.message_type === 1 
              ? (conv.assignee?.name || 'Agente')
              : nombreContacto;
            const tipo = msg.message_type === 1 ? 'Agente' : 'Cliente';

            todosMensajesData.push([
              conv.id,
              nombreContacto,
              fecha,
              remitente,
              tipo,
              msg.content || ''
            ]);
            totalMensajes++;
          });
        }
      });

      const wsTodosMensajes = XLSX.utils.aoa_to_sheet(todosMensajesData);
      wsTodosMensajes['!cols'] = [
        { wch: 10 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 80 }
      ];
      XLSX.utils.book_append_sheet(wb, wsTodosMensajes, 'Todos los Mensajes');

      const conversacionesAbiertas = conversationsWithMessages.filter((c: any) => c.status === 'open').length;
      const conversacionesResueltas = conversationsWithMessages.filter((c: any) => c.status === 'resolved').length;
      const totalNoLeidos = conversationsWithMessages.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);

      const statsData = [
        ['ESTADISTICAS GENERALES'],
        [''],
        ['Total de conversaciones', (conversationsWithMessages || []).length],
        ['Total de mensajes exportados', totalMensajes],
        [''],
        ['Conversaciones abiertas', conversacionesAbiertas],
        ['Conversaciones resueltas', conversacionesResueltas],
        ['Total mensajes no leidos', totalNoLeidos]
      ];

      const wsStats = XLSX.utils.aoa_to_sheet(statsData);
      wsStats['!cols'] = [{ wch: 35 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsStats, 'Estadisticas');

      // Fase 4: Generar archivo (95-100%)
      setDownloadProgress(95);
      setDownloadStatus('Generando archivo Excel...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `Conversaciones_Completo_${timestamp}.xlsx`;
      
      XLSX.writeFile(wb, filename);
      
      setDownloadProgress(100);
      setDownloadPhase('complete');
      setDownloadStatus(`✅ ¡Completado! ${(conversationsWithMessages || []).length} conversaciones con ${totalMensajes} mensajes`);
      
      console.log('✅ Excel generado exitosamente:', filename);
      
      // Cerrar modal después de 3 segundos
      setTimeout(() => {
        setIsDownloadModalOpen(false);
      }, 3000);

    } catch (error) {
      console.error('?? Error descargando conversaciones:', error);
      setDownloadPhase('error');
      setDownloadStatus(`?? Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setDownloadProgress(0);
      
      // Cerrar modal despu??s de 5 segundos en error
      setTimeout(() => {
        setIsDownloadModalOpen(false);
      }, 5000);
    }
  };
  const handleScroll = () => {
    if (!conversationsListRef.current || !hasMorePages || conversationsLoading) return;
    
    const { scrollTop, scrollHeight, clientHeight } = conversationsListRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    // Cargar m?s cuando llega al 80% del scroll
    if (scrollPercentage > 0.8) {
      console.log(' Cargando m?s conversaciones...');
      loadMoreConversations();
    }
  };

  // ?? OPTIMIZACI?N: Funciones extraídas a ../utils/ para mejor performance y reutilizaci??n
  // formatTimestamp, getPriorityColor, getStatusColor ahora se importan desde ../utils/

  // ?? GUARDIA: Prevenir render si conversations es undefined
  if (!conversations) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ?? GUARDIA: Prevenir render si conversations es undefined
  if (!conversations) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (conversationsLoading && (conversations || []).length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white/20 backdrop-blur-2xl">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-gray-600">Cargando conversaciones...</span>
        </div>
      </div>
    );
  }

  if (conversationsError) {
    return (
      <div className="h-full flex items-center justify-center bg-white/20 backdrop-blur-2xl">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Error de Conexi??n</h3>
          <p className="text-gray-600 mb-4">No se pudieron cargar las conversaciones</p>
          <button 
            onClick={() => fetchUpdatedConversations()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-full bg-white/10 backdrop-blur-3xl border border-white/20 overflow-hidden">
      
      {/* Lista de Conversaciones - Panel Izquierdo */}
      <div 
        className="bg-white/35 backdrop-blur-2xl flex flex-col shadow-sm border-r border-white/30"
        style={{ width: `${leftPanelWidth}%` }}
      >
        
        {/* Header de Conversaciones */}
        <div className="p-4 border-b border-gray-200/40 bg-white/60 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg shadow-md">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Conversaciones</h2>
                <p className="text-sm text-gray-600">
                  {(conversations || []).length} de {totalConversations} {hasMorePages && '(m?s disponibles)'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* FASE 3: Boton de filtros avanzados */}
              <button
                onClick={() => setShowAdvancedFilters(true)}
                className="p-2 bg-white/70 hover:bg-white/90 shadow-sm hover:shadow rounded-xl transition-all duration-300 backdrop-blur-sm border border-gray-200/30 relative"
                title="Filtros avanzados (Ctrl+F)"
              >
                <Filter className="w-4 h-4 text-gray-700" />
                {appliedFilters && (
                  <span className='absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold'>
                    !
                  </span>
                )}
              </button>

              {/* Menu de configuracion */}
              <div className="relative" ref={settingsMenuRef}>
                <button 
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className="p-2 bg-white/70 hover:bg-white/90 shadow-sm hover:shadow rounded-xl transition-all duration-300 backdrop-blur-sm border border-gray-200/30"
                  title="Configuraci??n"
                >
                  <Settings className="w-4 h-4 text-gray-700" />
                </button>
                
                {/* Menu desplegable */}
                {isSettingsOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-fade-in">
                    <button
                      onClick={handleDownloadChat}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2"
                      disabled={!activeConversation}
                    >
                      <span></span>
                      <span>Descargar chat</span>
                    </button>

                    <button
                      onClick={handleDownloadAllConversations}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2"
                    >
                      <span></span>
                      <span>Descargar todas</span>
                    </button>
                  </div>

                )}
              </div>
            </div>
          </div>
          
          {/* Barra de Busqueda - Busca en TODA la base de datos (backend) */}
          <div className="relative mb-3">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-4 h-4 z-10 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
            )}
            <input
              type="text"
              placeholder="Buscar en todas las conversaciones"
              className="w-full pl-10 pr-10 py-2 bg-white/30 border border-white/30 rounded-xl text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 backdrop-blur-xl transition-all duration-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSearchResults(null);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Limpiar busqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Indicador de resultados de búsqueda */}
          {searchResults !== null && !isSearching && (
            <div className="mb-3 px-3 py-2.5 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-xl text-xs font-semibold text-blue-800 shadow-md backdrop-blur-sm">
              {searchResults.length === 0 ? (
                <span>??? No se encontraron resultados para "{searchTerm}"</span>
              ) : (
                <span>??? {searchResults.length} conversación{searchResults.length !== 1 ? 'es' : ''} encontrada{searchResults.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}
          
          {/* Filtros */}
          <div className="flex space-x-2">
            {[
              { id: 'all', label: 'Todo', count: (conversations || []).length },
              { id: 'mine', label: 'M??o', count: (conversations || []).filter(c => c.assignee_id === 1).length },
              { id: 'assigned', label: 'Asignadas', count: (conversations || []).filter(c => c.assignee_id && c.assignee_id !== 1).length }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${
                  selectedFilter === filter.id
                    ? 'bg-blue-500/20 text-blue-700 border border-blue-400/30'
                    : 'bg-white/10 text-gray-600 hover:bg-white/20'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>

        {/*  Lista VIRTUALIZADA de Conversaciones - Mejora 80% performance */}
        <div 
          ref={conversationsListRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
        >
          {(filteredConversations || []).length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm 
                  ? `No se encontraron resultados para "${searchTerm}"`
                  : 'No hay conversaciones'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-700"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative'
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const conversation = filteredConversations[virtualRow.index];
                
                return (
                  <div
                    key={conversation.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`p-4 border-b border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/20 ${
                      activeConversation?.id === conversation.id ? 'bg-white/30 border-r-4 border-r-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        {/* Avatar: imagen real o iniciales */}
                        {conversation.contact.avatarUrl ? (
                          <img 
                            src={conversation.contact.avatarUrl} 
                            alt={conversation.contact.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
                            onError={(e) => { 
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white ${
                            conversation.priority === 'urgent'
                              ? 'bg-gradient-to-r from-red-500 to-red-600'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600'
                          }`}
                          style={{ display: conversation.contact.avatarUrl ? 'none' : 'flex' }}
                        >
                          {formatAvatar(conversation.contact.avatar, conversation.contact.name)}
                        </div>
                        {conversation.contact.status === 'online' && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-800 truncate">{conversation.contact.name}</h4>
                          <span className="text-xs text-gray-500">{formatTimestamp(conversation.last_message.timestamp)}</span>
                        </div>
                        
                        <p className="text-sm text-gray-600 truncate mb-2">{formatLastMessagePreview(conversation.last_message.content)}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(conversation.priority)}`}>
                              {conversation.priority}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(conversation.status)}`}>
                              {conversation.status}
                            </span>
                          </div>
                          
                          {conversation.unread_count > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                        
                        {(conversation?.labels || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {conversation.labels.slice(0, 2).map((label, index) => (
                              <span key={index} className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full">
                                #{label}
                              </span>
                            ))}
                            {(conversation?.labels || []).length > 2 && (
                              <span className="text-xs text-gray-500">+{(conversation?.labels || []).length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* ?? Indicador de carga al hacer scroll */}
          {conversationsLoading && (conversations || []).length > 0 && (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
              <span className="text-sm text-gray-600">Cargando m?s...</span>
            </div>
          )}
        </div>
      </div>

      {/* Divisor Redimensionable */}
      <div 
        className="w-1 bg-gray-200/30 hover:bg-gray-300/50 cursor-col-resize transition-all duration-200 relative group"
        onMouseDown={() => setIsResizing(true)}
      >
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-gray-400/10" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex flex-col gap-1">
            <div className="w-0.5 h-1 bg-gray-400/70 rounded"></div>
            <div className="w-0.5 h-1 bg-gray-400/70 rounded"></div>
            <div className="w-0.5 h-1 bg-gray-400/70 rounded"></div>
          </div>
        </div>
      </div>

      {/* Chat Principal - Panel Central */}
      <div className="flex-1 flex flex-col bg-white/10 backdrop-blur-xl">
        {activeConversation ? (
          <>
            {/* Header del Chat */}
            <div 
              className="p-4 bg-white/20 backdrop-blur-xl cursor-pointer hover:bg-white/25 transition-all duration-300"
              onClick={toggleRightPanel}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {activeConversation.contact.avatarUrl ? (
                      <img 
                        src={activeConversation.contact.avatarUrl} 
                        alt={activeConversation.contact.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
                        onError={(e) => { 
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center font-semibold text-white"
                      style={{ display: activeConversation.contact.avatarUrl ? 'none' : 'flex' }}
                    >
                      {formatAvatar(activeConversation.contact.avatar, activeConversation.contact.name)}
                    </div>
                    {activeConversation.contact.status === 'online' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{activeConversation.contact.name}</h3>
                    <p className="text-sm text-gray-600">{activeConversation.contact.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  {/*  B?SQUEDA EXPANDIBLE ELEGANTE */}
                  <div className={`flex items-center transition-all duration-300 ease-in-out ${
                    showSearchBar ? 'bg-white rounded-lg shadow-lg px-3 py-1.5' : ''
                  }`}>
                    {!showSearchBar ? (
                      <button 
                        onClick={() => setShowSearchBar(true)}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-300 text-gray-600"
                        title="Buscar en chat"
                      >
                        <Search className="w-4 h-4" />
                      </button>

                    ) : (
                      <>
                        <Search className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            const query = e.target.value;
                            setSearchQuery(query);
                            if (query.trim()) {
                              handleSearchMessages(query);
                            } else {
                              setMessageSearchResults([]);
                              setCurrentSearchIndex(0);
                            }
                          }}
                          placeholder="Buscar..."
                          className="outline-none text-sm bg-transparent w-32 md:w-48 animate-fadeIn"
                          autoFocus
                        />
                        
                        {(searchResults || []).length > 0 && (
                          <>
                            <span className="text-xs text-gray-500 whitespace-nowrap ml-2 mr-1">
                              {currentSearchIndex + 1}/{(searchResults || []).length}
                            </span>
                            <button
                              onClick={() => setCurrentSearchIndex(Math.max(0, currentSearchIndex - 1))}
                              disabled={currentSearchIndex === 0}
                              className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30"
                            >
                              <ChevronUp className="w-3 h-3 text-gray-600" />
                            </button>
                            <button
                              onClick={() => setCurrentSearchIndex(Math.min((searchResults || []).length - 1, currentSearchIndex + 1))}
                              disabled={currentSearchIndex === (searchResults || []).length - 1}
                              className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30 mr-1"
                            >
                              <ChevronDown className="w-3 h-3 text-gray-600" />
                            </button>
                          </>
                        )}
                        
                        <button
                          onClick={() => {
                            setShowSearchBar(false);
                            setSearchQuery('');
                            setMessageSearchResults([]);
                            setCurrentSearchIndex(0);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <X className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      </>
                    )}

                  {/*  Controles de navegaci??n entre coincidencias */}
                  {searchTerm && searchResults && totalMatches > 0 && (
                    <div className="flex items-center gap-1 bg-white/20 rounded-lg px-2 py-1.5 ml-2">
                      <span className="text-xs text-gray-700 font-semibold">
                        {currentMatchIndex + 1}/{totalMatches}
                      </span>
                      <div className="w-px h-4 bg-gray-400 mx-1"></div>
                      <button
                        onClick={() => {
                          const newIndex = currentMatchIndex > 0 ? currentMatchIndex - 1 : totalMatches - 1;
                          setCurrentMatchIndex(newIndex);
                          const marks = document.querySelectorAll('[data-match-index]');
                          marks[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="p-1 hover:bg-white/40 rounded transition-all"
                        title="Anterior (???)"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-gray-700" />
                      </button>
                      <button
                        onClick={() => {
                          const newIndex = currentMatchIndex < totalMatches - 1 ? currentMatchIndex + 1 : 0;
                          setCurrentMatchIndex(newIndex);
                          const marks = document.querySelectorAll('[data-match-index]');
                          marks[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="p-1 hover:bg-white/40 rounded transition-all"
                        title="Siguiente (???)"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-gray-700" />
                      </button>
                    </div>
                  )}

                  </div>
                  
                  {/*  SILENCIAR */}
                  <button 
                    onClick={handleMuteConversation}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      mutedConversations.has(activeConversation.id)
                        ? 'bg-red-500 text-white shadow-lg' 
                        : 'bg-white/20 hover:bg-white/30 text-gray-600'
                    }`}
                    title={mutedConversations.has(activeConversation.id) ? 'Activar notificaciones' : 'Silenciar chat'}
                  >
                    {mutedConversations.has(activeConversation.id) ? (
                      <BellOff className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </button>
                  
                  <button 
                    onClick={handleOpenEditModal}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-300 text-gray-600"
                    title="Editar contacto"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={toggleRightPanel}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-300"
                  >
                    <MoreHorizontal className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="h-[2px] bg-gray-200/30 relative group">
              <div className="absolute inset-x-0 -top-1 -bottom-1" />
            </div>

            {/* Mensajes */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 relative"
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/*  DRAG & DROP OVERLAY */}
              {isDragging && (
                <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm border-4 border-dashed border-blue-500 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-blue-800">Suelta los archivos aqu??</p>
                    <p className="text-sm text-blue-600 mt-2">Im?genes, documentos y m?s</p>
                  </div>
                </div>
              )}
              {/*  MENSAJE FIJADO */}
              {pinnedMessage && (
                <div className="sticky top-0 z-10 bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded-r-lg shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Pin className="w-4 h-4 text-yellow-600" />
                        <span className="text-xs font-semibold text-yellow-800">Mensaje fijado</span>
                      </div>
                      <p className="text-sm text-gray-700">{pinnedMessage.content}</p>
                    </div>
                    <button
                      onClick={() => setPinnedMessage(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* 🚀 SKELETON LOADER mientras cargan mensajes */}
              {activeConversation?._isLoading && filteredMessages.length === 0 && (
                <div className="space-y-4 animate-pulse">
                  {/* Mensaje del contacto (izquierda) */}
                  <div className="flex justify-start">
                    <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-gray-200/50">
                      <div className="h-4 bg-gray-300/60 rounded w-48 mb-2"></div>
                      <div className="h-3 bg-gray-300/40 rounded w-32"></div>
                    </div>
                  </div>
                  {/* Mensaje del agente (derecha) */}
                  <div className="flex justify-end">
                    <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-blue-200/50">
                      <div className="h-4 bg-blue-300/60 rounded w-56 mb-2"></div>
                      <div className="h-3 bg-blue-300/40 rounded w-24"></div>
                    </div>
                  </div>
                  {/* Mensaje del contacto (izquierda) */}
                  <div className="flex justify-start">
                    <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-gray-200/50">
                      <div className="h-4 bg-gray-300/60 rounded w-40 mb-2"></div>
                      <div className="h-4 bg-gray-300/50 rounded w-52 mb-2"></div>
                      <div className="h-3 bg-gray-300/40 rounded w-20"></div>
                    </div>
                  </div>
                  {/* Mensaje del agente (derecha) */}
                  <div className="flex justify-end">
                    <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-blue-200/50">
                      <div className="h-4 bg-blue-300/60 rounded w-44"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🚀 BOTÓN CARGAR MÁS MENSAJES */}
              {activeConversation?._hasMoreMessages && !activeConversation?._isLoading && (
                <div className="flex justify-center py-3">
                  <button
                    onClick={() => loadConversationMessages(activeConversation.id, true)}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Cargar mensajes anteriores
                  </button>
                </div>
              )}

              {/* ✨ Renderizar mensajes (sin duplicados) */}
              {filteredMessages.map((message: any, index: number) => (
                <React.Fragment key={message.id}>
                  {/* Separador de "Nuevos mensajes" */}
                  {newMessageSeparatorIndex === index && (
                    <div className="flex items-center my-4 animate-fade-in">
                      <div className="flex-1 border-t border-green-400/50"></div>
                      <span className="px-4 py-1 bg-green-500/20 text-green-700 text-xs font-semibold rounded-full backdrop-blur-sm border border-green-400/30">
                        Nuevos mensajes
                      </span>
                      <div className="flex-1 border-t border-green-400/50"></div>
                    </div>
                  )}
                  
                  {/* Mensaje con Men?? Contextual */}
                  <div 
                    id={`message-${message.id}`}
                    data-message-id={message.id}
                    className={`flex ${message.sender === 'agent' ? 'justify-end' : 'justify-start'} group`}
                  >
                    {/* Contenedor de mensaje + bot??n */}
                    <div className="flex items-center gap-2 relative">
                      {/* Bot??n ANTES de la burbuja (para mensajes del contacto) */}
                      {message.sender === 'contact' && (
                        <button
                          onClick={() => setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id)}
                          className="p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        </button>
                      )}

                      {/* Burbuja del mensaje */}
                      <div 
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative ${
                          searchResults && Array.isArray(searchResults) && searchResults.includes(message.id)
                            ? messageSearchResults[currentSearchIndex] === message.id
                              ? 'ring-4 ring-yellow-400 !bg-yellow-200 !text-gray-900 shadow-lg'
                              : 'ring-2 ring-yellow-200 !bg-yellow-50 !text-gray-900 shadow-md'
                            : message.sender === 'agent'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-white/30 text-gray-800 backdrop-blur-xl border border-white/20 shadow-md shadow-gray-400/20'
                        }`}
                        id={`message-${message.id}`}
                      >
                        {/* Indicador de mensaje destacado */}
                        {starredMessages.has(message.id) && (
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 absolute top-1 right-1" />
                        )}
                        
                        <p className="text-sm">{searchTerm && searchResults ? highlightSearchTerm(message.content, searchTerm, index) : message.content}</p>

                        {/*  Renderizar archivos adjuntos (im?genes, audios, documentos) */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((att: any, idx: number) => (
                              <div key={idx}>
                                {att.file_type?.includes('image') ? (
                                  <img 
                                    src={att.data_url} 
                                    alt="Imagen adjunta" 
                                    className="max-w-full max-h-64 rounded-lg cursor-pointer shadow-md hover:shadow-lg transition-shadow"
                                    
                                    title="Imagen adjunta"
                                  />
                                ) : att.file_type?.includes('audio') ? (
                                  <div className="bg-white/40 p-2 rounded-lg">
                                    <audio controls className="w-full max-w-xs">
                                      <source src={att.data_url} type={att.file_type} />
                                      Tu navegador no soporta el elemento de audio.
                                    </audio>
                                  </div>
                                ) : (
                                  <a 
                                    href={att.data_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-2 p-2 bg-white/50 rounded-lg hover:bg-white/70 transition-colors"
                                  >
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-xs font-medium text-gray-700">{att.file_name || 'Archivo adjunto'}</span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-end space-x-1 mt-1">
                          <p className={`text-xs ${
                            searchResults && Array.isArray(searchResults) && searchResults.includes(message.id)
                              ? 'text-gray-600'
                              : message.sender === 'agent' 
                              ? 'text-blue-100' 
                              : 'text-gray-500'
                          }`}>
                            {formatTimestamp(message.timestamp || message.created_at)}
                          </p>
                          {/* Estado del mensaje tipo WhatsApp */}
                          {message.sender === 'agent' && (
                            <MessageStatus 
                              status={message.status || (message._isOptimistic ? 'sending' : 'delivered')} 
                              isHighlighted={searchResults && Array.isArray(searchResults) && searchResults.includes(message.id)}
                            />
                          )}
                        </div>
                      </div>

                      {/* Bot??n DESPU?S de la burbuja (para mensajes propios) */}
                      {message.sender === 'agent' && (
                        <button
                          onClick={() => setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id)}
                          className="p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        </button>
                      )}

                      {/* Men?? Contextual */}
                      {messageMenuOpen === message.id && (
                        <div className={`absolute top-12 ${message.sender === 'agent' ? 'right-0' : 'left-0'} z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px] animate-fade-in`}>
                          <button
                            onClick={() => handleReplyToMessage(message)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <Reply className="w-4 h-4" />
                            <span>Responder</span>
                          </button>
                          <button
                            onClick={() => handleStarMessage(message.id)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <Star className={`w-4 h-4 ${starredMessages.has(message.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            <span>{starredMessages.has(message.id) ? 'Quitar destacado' : 'Destacar'}</span>
                          </button>
                          <button
                            onClick={() => handleCopyMessage(message.content)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copiar</span>
                          </button>
                          <button
                            onClick={() => handleForwardMessage(message.content)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <Forward className="w-4 h-4" />
                            <span>Reenviar</span>
                          </button>
                          <button
                            onClick={() => handlePinMessage(message)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <Pin className="w-4 h-4" />
                            <span>Fijar</span>
                          </button>
                          <div className="border-t border-gray-200 my-1"></div>
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              ))}
              
              {!filteredMessages.length && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Cargando mensajes...</p>
                </div>
              )}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/30 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* ?? NUEVO: Marcador invisible para auto-scroll */}
              <div ref={messagesEndRef} className="h-0" />
            </div>

            {/* Input de Mensaje */}
            <div className="border-t border-white/20 bg-white/20 backdrop-blur-xl">
              {/*  BARRA DE RESPUESTA */}
              {replyingTo && (
                <div className="px-4 pt-3 pb-2 border-b border-white/20 bg-blue-50/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 border-l-4 border-blue-500 pl-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Reply className="w-3 h-3 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-800">Respondiendo a {replyingTo.sender_name}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{replyingTo.content}</p>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="text-gray-400 hover:text-gray-600 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/*  INDICADOR "ESCRIBIENDO..." */}
              {isContactTyping && (
                <div className="px-4 py-2 bg-gray-50/50">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">{activeConversation.contact.name} est? escribiendo...</span>
                  </div>
                </div>
              )}

              <div className="p-4">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                  <button type="button" className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-300">
                    <Paperclip className="w-4 h-4 text-gray-600" />
                  </button>
                  
                  <div className="flex-1 relative">
                    <input
                      ref={messageInputRef}
                      id="message-input"
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={replyingTo ? "Escribe tu respuesta..." : "Escribe un mensaje..."}
                      className="w-full px-4 py-3 bg-white/40 rounded-xl text-gray-800 placeholder-gray-400 outline-none focus:bg-white/50 backdrop-blur-xl transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                      disabled={isTyping}
                    />
                  </div>
                  
                  {/*  BOT?N DE AUDIO */}
                  {!isRecording ? (
                    <button 
                      type="button"
                      onMouseDown={handleStartRecording}
                      className="p-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl transition-all duration-300"
                      title="Mant??n presionado para grabar"
                    >
                      <Mic className="w-4 h-4 text-gray-900" />
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onMouseUp={handleStopRecording}
                      onClick={handleStopRecording}
                      className="p-3 bg-red-500 rounded-xl animate-pulse"
                      title="Suelta para enviar"
                    >
                      <div className="flex items-center space-x-2">
                        <StopCircle className="w-4 h-4 text-white" />
                        <span className="text-white text-sm font-mono">{recordingDuration}s</span>
                      </div>
                    </button>
                  )}
                  
                  <button 
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-300"
                  >
                    <Smile className="w-4 h-4 text-gray-600" />
                  </button>
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim() || isTyping}
                    className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </form>

                {/*  EMOJI PICKER SIMPLE */}
                {showEmojiPicker && (
                  <div className="absolute bottom-20 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-3 grid grid-cols-8 gap-2 z-50">
                    {['', '', '', '', '', '', '??', '', '', '', '', '', '', '??', '??', ''].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleAddEmoji(emoji)}
                        className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="mx-auto mb-6">
                <img 
                  src="/logo-withmia.webp" 
                  alt="WITHMIA Logo" 
                  className="w-40 h-40 mx-auto hover:scale-110 transition-transform duration-300"
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Selecciona una conversación</h3>
              <p className="text-gray-500">Elige una conversación para empezar a chatear</p>
            </div>
          </div>
        )}
      </div>

      {/*  GALER?A MULTIMEDIA MODAL */}
      {showMediaGallery && activeConversation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-500 to-purple-600">
              <h3 className="text-lg font-semibold text-white">Multimedia compartida</h3>
              <button
                onClick={() => setShowMediaGallery(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200 flex space-x-2">
              <button
                onClick={() => setMediaFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  mediaFilter === 'all' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todo
              </button>
              <button
                onClick={() => setMediaFilter('images')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  mediaFilter === 'images' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Im?genes</span>
              </button>
              <button
                onClick={() => setMediaFilter('files')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  mediaFilter === 'files' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <File className="w-4 h-4" />
                <span>Archivos</span>
              </button>
              <button
                onClick={() => setMediaFilter('links')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  mediaFilter === 'links' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Enlaces</span>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              {(() => {
                const { images, files, links } = getMediaFromConversation();
                
                if (mediaFilter === 'images' || mediaFilter === 'all') {
                  return (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Im?genes ({images.length})</h4>
                      <div className="grid grid-cols-4 gap-3 mb-6">
                        {images.map((img, idx) => (
                          <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all cursor-pointer">
                            <img 
                              src={img.data_url || img.file_url} 
                              alt="Media"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                
                if (mediaFilter === 'files' || mediaFilter === 'all') {
                  return (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Archivos ({(files || []).length})</h4>
                      <div className="space-y-2 mb-6">
                        {files.map((file, idx) => (
                          <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <File className="w-8 h-8 text-gray-500" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{file.file_name || 'Archivo'}</p>
                              <p className="text-sm text-gray-500">{(file.file_size / 1024).toFixed(2)} KB</p>
                            </div>
                            <a 
                              href={file.data_url || file.file_url} 
                              download
                              className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                            >
                              <Upload className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                
                if (mediaFilter === 'links' || mediaFilter === 'all') {
                  return (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Enlaces ({links.length})</h4>
                      <div className="space-y-2">
                        {links.map((link, idx) => (
                          <a 
                            key={idx} 
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <FileText className="w-8 h-8 text-blue-500" />
                            <p className="flex-1 text-blue-600 hover:underline truncate">{link.url}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {isRightPanelVisible && (
        <div className="w-1 bg-gray-200/30 relative">
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>
      )}

      {/* Panel Derecho - Informaci??n del Contacto */}
      {isRightPanelVisible && (
        <div className="w-80 bg-white/20 backdrop-blur-2xl p-4 space-y-6 animate-slide-in-right relative">
          <button
            onClick={toggleRightPanel}
            className="absolute top-3 left-3 p-1.5 bg-white/10 hover:bg-white/30 rounded-lg transition-all duration-300 group z-10"
            title="Cerrar panel"
          >
            <svg 
              className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {activeConversation ? (
            <>
              <div className="text-center">
                {activeConversation.contact.avatarUrl ? (
                  <img 
                    src={activeConversation.contact.avatarUrl} 
                    alt={activeConversation.contact.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg mx-auto mb-3"
                    onError={(e) => { 
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        e.currentTarget.nextElementSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div 
                  className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center font-bold text-white text-xl mx-auto mb-3"
                  style={{ display: activeConversation.contact.avatarUrl ? 'none' : 'flex' }}
                >
                  {formatAvatar(activeConversation.contact.avatar, activeConversation.contact.name)}
                </div>
                <h3 className="font-bold text-gray-800">{activeConversation.contact.name}</h3>
                <p className="text-gray-600 text-sm">{activeConversation.contact.email}</p>
                <p className="text-gray-800 text-sm font-medium mt-2">{activeConversation.contact.phone_number}</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Tag className="w-4 h-4 mr-2" />
                  Etiquetas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeConversation.labels.map((label: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full">
                      #{label}
                    </span>
                  ))}
                  <button className="px-2 py-1 bg-white/20 hover:bg-white/30 text-gray-600 text-xs rounded-full transition-colors flex items-center">
                    <Plus className="w-3 h-3 mr-1" />
                    Agregar
                  </button>
                </div>
              </div>

              {/*  GALER?A MULTIMEDIA */}
              <div>
                <button 
                  onClick={() => setShowMediaGallery(!showMediaGallery)}
                  className={`w-full p-3 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center ${
                    showMediaGallery 
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg' 
                      : 'bg-white/20 hover:bg-white/30 text-gray-700'
                  }`}
                >
                  <Grid className="w-4 h-4 mr-2" />
                  {showMediaGallery ? 'Ocultar Multimedia' : 'Ver Multimedia Compartida'}
                </button>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Informaci??n
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(activeConversation.status)}`}>
                      {activeConversation.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prioridad:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(activeConversation.priority)}`}>
                      {activeConversation.priority}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Acciones R?pidas</h4>
                <div className="space-y-2">
                  <button className="w-full p-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm text-gray-700 transition-colors flex items-center">
                    <Archive className="w-4 h-4 mr-2" />
                    Archivar Conversación
                  </button>
                  <button className="w-full p-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm text-gray-700 transition-colors flex items-center">
                    <Star className="w-4 h-4 mr-2" />
                    Marcar como Favorito
                  </button>
                  <button className="w-full p-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm text-gray-700 transition-colors flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Resolver Conversaci??n
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Selecciona una conversación para ver detalles</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de progreso de descarga */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fade-in">
            <div className="text-center">
              {/* ?cono seg??n fase */}
              <div className="mb-6">
                {downloadPhase === 'complete' ? (
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                ) : downloadPhase === 'error' ? (
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-10 h-10 text-white" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
                    <Download className="w-10 h-10 text-white animate-pulse" />
                  </div>
                )}
              </div>

              {/* Título según fase */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {downloadPhase === 'fetching' && 'Descargando...'}
                {downloadPhase === 'processing' && 'Procesando...'}
                {downloadPhase === 'generating' && 'Generando Excel...'}
                {downloadPhase === 'complete' && '✅ ¡Completado!'}
                {downloadPhase === 'error' && 'Error'}
              </h3>

              {/* Status */}
              <p className="text-gray-600 mb-6">
                {downloadStatus}
              </p>

              {/* Barra de progreso */}
              {downloadPhase !== 'error' && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{downloadProgress}%</p>
                </div>
              )}

              {/* Fase indicator */}
              {downloadPhase !== 'complete' && downloadPhase !== 'error' && (
                <div className="flex justify-center space-x-2 mt-6">
                  <div className={`w-2 h-2 rounded-full ${downloadPhase === 'fetching' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                  <div className={`w-2 h-2 rounded-full ${downloadPhase === 'processing' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                  <div className={`w-2 h-2 rounded-full ${downloadPhase === 'generating' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de editar contacto */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full border border-white/20 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Editar Contacto</h3>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Campo Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ej: Juan P??rez"
                  className="w-full px-4 py-2.5 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Campo Tel??fono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tel??fono
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Ej: +52 55 1234 5678"
                  className="w-full px-4 py-2.5 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Campo Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electr??nico
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Ej: correo@ejemplo.com"
                  className="w-full px-4 py-2.5 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 bg-gray-50/50 border-t border-gray-200/50 rounded-b-2xl">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveContact}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl font-medium"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 border border-green-400/20">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Componentes de Notificaciones */}

      {/* ??? Visor de Im?genes Estilo WhatsApp */}
      {imageViewerOpen && selectedImageUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black flex flex-col"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
        >
          {/* Header con bot??n cerrar */}
          <div className="flex items-center justify-between p-4 bg-black/50">
            <div className="flex-1"></div>
            <button
              onClick={() => {
                setImageViewerOpen(false);
                setSelectedImageUrl(null);
              }}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
              title="Cerrar (ESC)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Contenedor de la imagen */}
          <div 
            className="flex-1 flex items-center justify-center p-4 overflow-hidden"
            onClick={() => {
              setImageViewerOpen(false);
              setSelectedImageUrl(null);
            }}
          >
            <img 
              src={selectedImageUrl} 
              alt="Vista previa" 
              className="max-w-full max-h-full object-contain select-none"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />
          </div>

          {/* Footer con acciones */}
          <div className="flex items-center justify-center gap-4 p-4 bg-black/50">
            <a
              href={selectedImageUrl}
              download
              className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
              title="Descargar imagen"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
            <a
              href={selectedImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
              title="Abrir en nueva pesta??a"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}

      <NotificationToast 
        toasts={notifications.toasts}
        onDismiss={notifications.dismissToast}
        onClickToast={(conversationId) => {
          const conv = conversations.find((c: any) => c.id === conversationId);
          if (conv) _setActiveConversation(conv);
        }}
      />
      <NotificationCenter 
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
        notifications={notifications.notificationHistory}
        unreadCount={notifications.unreadCount}
        onMarkAsRead={notifications.markAsRead}
        onMarkAllAsRead={notifications.markAllAsRead}
        onClearAll={() => {
          notifications.markAllAsRead();
          setShowNotificationCenter(false);
        }}
        onClickNotification={(conversationId) => {
          const conversation = conversations.find(c => c.id === conversationId);
          if (conversation) {
            handleSelectConversation(conversation);
            setShowNotificationCenter(false);
          }
        }}
      />
      <NotificationSettings notifications={notifications} />

      {/* FASE 3: Componentes de filtros avanzados */}
      <AdvancedFilters
        isOpen={showAdvancedFilters}
        conversations={conversations}
        currentUserId={undefined}
        onApplyFilters={(filters) => {
          setAppliedFilters(filters);
          setShowAdvancedFilters(false);
        }}
        onClose={() => setShowAdvancedFilters(false)}
      />
    </div>
  );
};

export default ConversationsInterface;
