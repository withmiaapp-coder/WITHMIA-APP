import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import * as XLSX from 'xlsx';
import { useVirtualizer } from '@tanstack/react-virtual';
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
// FASE 3: Nuevos componentes y hooks (Busqueda y Filtros)
import SearchGlobal from './SearchGlobal';
import AdvancedFilters from './AdvancedFilters';
import { useMessagePagination } from '../hooks/useMessagePagination';
import { useEnhancedNotifications } from '../hooks/useEnhancedNotifications';
import NotificationCenter from './NotificationCenter.tsx';
import NotificationSettings from './NotificationSettings.tsx';
// Ô£¿ OPTIMIZACIONES: Utilidades extra├¡das para mejor performance
import { formatTimestamp } from '../utils/dateFormatter';
import { getPriorityColor, getStatusColor } from '../utils/conversationColors';

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
  status?: 'sent' | 'delivered' | 'read';
}

const ConversationsInterface: React.FC = () => {
  const notifications = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    const saved = localStorage.getItem('conversationsPanelWidth');
    return saved ? parseFloat(saved) : 33;
  });
  const [isResizing, setIsResizing] = useState(false);
  
  // Ô£à Usar hooks optimizados de Chatwoot
  const {
    conversations,
    activeConversation,
    loading: conversationsLoading,
    error: conversationsError,
    sendMessage,
    loadConversationMessages,
    setActiveConversation: _setActiveConversation,
    userInboxId,
    fetchUpdatedConversations,
    loadMoreConversations,
    hasMorePages,
    totalConversations,
    currentPage
  } = useConversations();
  
  // Estados locales
  const [isTyping, setIsTyping] = useState(false);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // FASE 3: Estados para nuevos componentes (Busqueda y Filtros)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<any | null>(null);
  
  // Ô£à NUEVO: Estado para separador de "nuevos mensajes"
  const [newMessageSeparatorIndex, setNewMessageSeparatorIndex] = useState<number | null>(null);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  
  // ­ƒöÑ NUEVOS ESTADOS - FUNCIONES DE WHATSAPP
  // 1. Reply/Quote (Responder)
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  
  // 2. Starred Messages (Mensajes destacados)
  const [starredMessages, setStarredMessages] = useState<Set<number>>(new Set());
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  
  // 3. Search (B├║squeda)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  
  // 4. Typing Indicator (Escribiendo...)
  const [isContactTyping, setIsContactTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 5. Message Actions (Menu contextual)
  const [messageMenuOpen, setMessageMenuOpen] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // 6. Pinned Messages (Mensajes fijados)
  const [pinnedMessage, setPinnedMessage] = useState<any | null>(null);
  
  // 7. Contact Info Panel (Panel de informaci├│n)
  const [showContactInfo, setShowContactInfo] = useState(false);
  
  // 8. Muted Conversations (Silenciadas)
  const [mutedConversations, setMutedConversations] = useState<Set<number>>(new Set());
  
  // ­ƒåò FASE 3 - FUNCIONES AVANZADAS
  // 1. Search Bar Visual (Barra de b├║squeda expandible)
  const [showSearchBar, setShowSearchBar] = useState(false);
  
  // 2. Multimedia Gallery (Galer├¡a multimedia)
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
  
  // Ô£à NUEVO: Ref para auto-scroll de mensajes
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  
  // Ô£à NUEVO: Ref para auto-scroll de mensajes
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  // Ô£à NUEVO: Ref para evitar stale closure en callbacks de tiempo real
  const activeConversationRef = useRef<any | null>(null);
  
  // ­ƒøí´©Å DEDUPLICACI├ôN: Ref para evitar procesar eventos WebSocket duplicados
  const processedEventsRef = useRef<Set<string>>(new Set());
  
  // Mantener ref actualizada
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);
  
  // ­ƒÄ» Auto-focus del input cuando se abre una conversaci├│n (como WhatsApp)
  useEffect(() => {
    if (activeConversation && messageInputRef.current) {
      // Peque├▒o delay para asegurar que el DOM est├® listo
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    }
  }, [activeConversation?.id]); // Solo cuando cambie la conversaci├│n activa
  
  // Ô£à NUEVO: Usar hook combinado de tiempo real con polling inteligente
  const {
    isConnected,
    wsConnected,
    lastEventTime,
    pollingInterval,
    consecutiveEmptyPolls,
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
      fetchUpdatedConversations();
    },
    onNewMessage: async (event) => {
      // ­ƒøí´©Å DEDUPLICACI├ôN: Crear ID ├║nico del evento
      const eventId = `${event?.message?.id || 'unknown'}-${event?.timestamp || Date.now()}`;

      console.log('­ƒô¿ ========== NUEVO MENSAJE RECIBIDO ==========');
      console.log('­ƒåö EventID:', eventId);
      console.log('­ƒôª Evento completo:', JSON.stringify(event, null, 2));
      console.log('­ƒôè Conversaci├│n activa ID:', activeConversationRef.current?.id);
      console.log('­ƒôè Conversation ID del evento:', event?.conversation_id);
      console.log('­ƒôè ┬┐Coinciden?:', event?.conversation_id === activeConversationRef.current?.id);

      // Verificar duplicados
      if (processedEventsRef.current.has(eventId)) {
        console.log('ÔÅ¡´©Å Evento duplicado, omitiendo');
        return;
      }

      processedEventsRef.current.add(eventId);

      // Limpiar eventos antiguos
      if (processedEventsRef.current.size > 50) {
        const firstItem = processedEventsRef.current.values().next().value;
        processedEventsRef.current.delete(firstItem);
      }

      const currentActiveConv = activeConversationRef.current;

      // NUEVO: Intentar m├║ltiples formas de obtener el conversation_id
      const conversationId = event?.conversation_id || event?.conversation?.id || event?.message?.conversation_id;
      
      console.log('­ƒöì Conversation ID encontrado:', conversationId);

      if (currentActiveConv) {
        console.log("Ô£à Hay conversaci├│n activa - Recargando mensajes...");
        try {
          await loadConversationMessages(currentActiveConv.id);
          console.log('Ô£à Mensajes recargados exitosamente');
        } catch (error) {
          console.error('ÔØî Error recargando mensajes:', error);
        }
      } else {
        console.log('Ôä╣´©Å Mensaje de otra conversaci├│n o no hay conversaci├│n activa');
      }
    },
    minPollingInterval: 30,
    maxPollingInterval: 300
  });

  //  HOOK DE NOTIFICACIONES
  // ELIMINADO: Declaraci├│n duplicada de notifications
  
  // Ô£à NUEVO: Referencias para virtualizaci├│n
  const conversationsListRef = useRef<HTMLDivElement>(null);
  
  // ­ƒÜÇ MEMOIZAR mensajes deduplicados para evitar re-renders innecesarios
  const uniqueActiveMessages = useMemo(() => {
    if (!activeConversation?.messages) return [];
    const messages = activeConversation.messages;
    
    // Deduplicar por ID Y por contenido+timestamp cercano (para mensajes duplicados del backend)
    const seen = new Map();
    const deduped: any[] = [];
    
    messages.forEach((msg: any) => {
      // Crear clave compuesta: contenido + timestamp redondeado a 5 segundos
      const timestamp = new Date(msg.created_at).getTime();
      const roundedTs = Math.floor(timestamp / 5000) * 5000; // Redondear a 5 segundos
      const contentKey = `${msg.content?.substring(0, 50)}-${roundedTs}-${msg.message_type}`;
      
      // Si ya vimos este contenido en el mismo per├¡odo de 5 segundos
      if (seen.has(contentKey)) {
        const existingMsg = seen.get(contentKey);
        
        // Si el mensaje existente es optimista y este es real, reemplazar
        if (existingMsg._isOptimistic && !msg._isOptimistic) {
          // Reemplazar mensaje optimista con el real
          const index = deduped.findIndex((m: any) => m.id === existingMsg.id);
          if (index !== -1) {
            deduped[index] = msg;
            seen.set(contentKey, msg);
          }
          console.log('Ô£à Mensaje optimista reemplazado por el real:', {
            temp_id: existingMsg.id,
            real_id: msg.id,
            content: msg.content?.substring(0, 30)
          });
          return;
        }
        
        // Si ambos son reales, es duplicado del backend
        if (!msg._isOptimistic && !existingMsg._isOptimistic) {
          console.log('­ƒùæ´©Å Mensaje duplicado detectado (mismo contenido):', {
            id: msg.id,
            content: msg.content?.substring(0, 30),
            duplicate_of: existingMsg.id
          });
          return;
        }
      }
      
      seen.set(contentKey, msg);
      deduped.push(msg);
    });
    
    return deduped;
  }, [activeConversation?.messages]);
  
  // Manejadores para redimensionamiento
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Funci├│n para toggle del panel derecho
  const toggleRightPanel = () => {
    setIsRightPanelVisible(!isRightPanelVisible);
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      if (newWidth >= 23 && newWidth <= 50) {
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

  const filteredConversations = (conversations || []).filter(conversation => {
    const matchesSearch = conversation.contact?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
                         conversation.last_message?.content?.toLowerCase()?.includes(searchTerm.toLowerCase());
    
    if (selectedFilter === 'all') return matchesSearch;
    if (selectedFilter === 'mine') return matchesSearch && conversation.assignee_id === 1;
    if (selectedFilter === 'assigned') return matchesSearch && conversation.assignee_id && conversation.assignee_id !== 1;
    return matchesSearch;
  });

  // ­ƒÜÇ VIRTUALIZACI├ôN: Solo renderiza items visibles (mejora 80% el performance)
  const rowVirtualizer = useVirtualizer({
    count: (filteredConversations || []).length,
    getScrollElement: () => conversationsListRef.current,
    estimateSize: () => 80, // Altura estimada de cada conversaci├│n en px
    overscan: 5, // Renderizar 5 items extra arriba/abajo para scroll suave
    enabled: (filteredConversations || []).length > 20 // Solo activar con >20 items
  });

  const handleSelectConversation = async (conversation: Conversation) => {
    await loadConversationMessages(conversation.id);
    
    // ÔÅ▒´©Å Esperar 2 segundos antes de marcar como le├¡da (para que se vea la notificaci├│n)
    setTimeout(() => {
      if (activeConversationRef.current?.id === conversation.id) {
        // Todav├¡a est├í en esta conversaci├│n, marcar como le├¡da
        const updatedConversations = conversations.map(conv =>
          conv.id === conversation.id ? { ...conv, unread_count: 0 } : conv
        );
        // No actualizamos el estado aqu├¡ porque ya se marca en useChatwoot
      }
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeConversation) return;

    try {
      // Si est├í respondiendo, agregar el contexto
      let messageContent = newMessage;
      if (replyingTo) {
        messageContent = `> ${replyingTo.sender_name}: ${replyingTo.content}\n\n${newMessage}`;
      }
      
      // ­ƒÜÇ UI OPTIMISTA: Agregar mensaje temporal inmediatamente
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticMessage = {
        id: tempId,
        content: messageContent,
        created_at: new Date().toISOString(),
        message_type: 'outgoing',
        sender: 'agent', // Ô£à String directo, no objeto
        conversation_id: activeConversation.id,
        status: 'sending', // Marcador especial
        _isOptimistic: true // Flag para identificar mensajes temporales
      };
      
      // Agregar al estado local temporalmente
      if (activeConversation.messages) {
        // Ô£à IMPORTANTE: Crear nuevo array para que useMemo detecte el cambio
        const newMessages = [...activeConversation.messages, optimisticMessage];
        console.log('­ƒÜÇ Agregando mensaje optimista:', tempId, 'Total mensajes:', (newMessages || []).length);
        // Forzar re-render con nuevo objeto Y nuevo array
        _setActiveConversation({ 
          ...activeConversation, 
          messages: newMessages 
        });
      }
      
      // Limpiar UI inmediatamente (sin delay)
      setNewMessage('');
      setReplyingTo(null);
      
      // ­ƒÜÇ Enviar al servidor SIN ESPERAR (fire-and-forget)
      sendMessage(activeConversation.id, messageContent).catch((error) => {
        console.error('Error sending message:', error);
        // TODO: Marcar mensaje optimista como error con un icono de "!"
      });
      
      // Ô£à El polling detectar├í el mensaje real y reemplazar├í el optimista
      
    } catch (error) {
      console.error('Error preparing message:', error);
    }
  };

  // ­ƒöÑ FUNCIONES DE WHATSAPP
  
  // 1´©ÅÔâú REPLY - Responder a un mensaje
  const handleReplyToMessage = (message: any) => {
    setReplyingTo(message);
    setMessageMenuOpen(null);
    // Focus en el input
    document.getElementById('message-input')?.focus();
  };

  // 2´©ÅÔâú STAR - Destacar mensaje
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

  // 3´©ÅÔâú COPY - Copiar mensaje
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    setMessageMenuOpen(null);
    // Mostrar notificaci├│n temporal
    alert('Mensaje copiado al portapapeles');
  };

  // 4´©ÅÔâú FORWARD - Reenviar mensaje (simplificado - copiar al portapapeles)
  const handleForwardMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    setMessageMenuOpen(null);
    alert('Mensaje copiado. P├®galo en otra conversaci├│n.');
  };

  // 5´©ÅÔâú DELETE - Eliminar mensaje (solo visual)
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

  // 6´©ÅÔâú PIN - Fijar mensaje
  const handlePinMessage = (message: any) => {
    setPinnedMessage(message);
    setMessageMenuOpen(null);
  };

  // 7´©ÅÔâú SEARCH - Buscar en mensajes
  const handleSearchMessages = (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !activeConversation) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    // Filtrar mensajes que contienen el query y guardar sus IDs
    const results = activeConversation.messages
      .filter((msg: any) => 
        msg.content && msg.content.toLowerCase().includes(query.toLowerCase())
      )
      .map((msg: any) => msg.id);

    setSearchResults(results);
    setCurrentSearchIndex(0);

    // Scroll al primer resultado
    if ((results || []).length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`message-${results[0]}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
    
    console.log(`­ƒöì B├║squeda: "${query}" - ${(results || []).length} resultados encontrados`, results);
  };

  // 8´©ÅÔâú MUTE - Silenciar conversaci├│n
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

  // 9´©ÅÔâú TYPING INDICATOR - Simular "escribiendo..."
  const handleTypingIndicator = () => {
    // En una implementaci├│n real, esto vendr├¡a del WebSocket
    setIsContactTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsContactTyping(false);
    }, 3000);
  };

  // ­ƒöƒ EMOJI - Agregar emoji al mensaje
  const handleAddEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // ­ƒåò FASE 3 - HANDLERS PARA FUNCIONES AVANZADAS

  // 1´©ÅÔâú DRAG & DROP - Manejar archivos arrastrados
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
        console.log('­ƒôÄ Archivo enviado:', file.name);
      }
    } catch (error) {
      console.error('ÔØî Error enviando archivo:', error);
    }
  };

  // 2´©ÅÔâú AUDIO MESSAGES - Grabar mensajes de voz
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
      
      // Contador de duraci├│n
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('ÔØî Error al iniciar grabaci├│n:', error);
      alert('No se pudo acceder al micr├│fono');
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
    formData.append('content', '­ƒÄñ Mensaje de voz');
    
    try {
      const response = await fetch(`/api/chatwoot-proxy/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (response.ok) {
        console.log('­ƒÄñ Audio enviado');
      }
    } catch (error) {
      console.error('ÔØî Error enviando audio:', error);
    }
  };

  // 3´©ÅÔâú MULTIMEDIA GALLERY - Extraer multimedia de la conversaci├│n
  const getMediaFromConversation = () => {
    if (!activeConversation?.messages) return { images: [], files: [], links: [] };
    
    const images: any[] = [];
    const files: any[] = [];
    const links: any[] = [];
    
    activeConversation.messages.forEach((msg: any) => {
      // Buscar im├ígenes en attachments
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


  // Ô£à NUEVO: Funci├│n para hacer scroll al final de los mensajes
  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'auto') => {
    const container = messagesContainerRef.current;
    console.log('­ƒô£ scrollToBottom llamado - behavior:', behavior, 'container existe:', !!container);
    if (container) {
      console.log('­ƒôÅ Container scrollHeight:', container.scrollHeight, 'scrollTop actual:', container.scrollTop);
      if (behavior === 'smooth') {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        // Scroll instant├íneo m├ís confiable
        container.scrollTop = container.scrollHeight;
      }
      console.log('Ô£à Scroll ejecutado - nuevo scrollTop:', container.scrollTop);
    } else {
      console.error('ÔØî messagesContainerRef.current es null!');
    }
  }, []);

  // Ô£à NUEVO: Auto-scroll cuando se carga una conversaci├│n o llegan mensajes nuevos
  useEffect(() => {
    if (activeConversation?.messages && (activeConversation?.messages || []).length > 0) {
      const currentMessageCount = (activeConversation?.messages || []).length;
      
      // Detectar si hay nuevos mensajes (no es el primer load)
      if (previousMessageCount > 0 && currentMessageCount > previousMessageCount) {
        console.log('­ƒåò Nuevos mensajes detectados:', currentMessageCount - previousMessageCount);
        
        // Hay mensajes nuevos - mostrar separador en el ├¡ndice del ├║ltimo mensaje antiguo
        setNewMessageSeparatorIndex(previousMessageCount);
        
        // Ô£à SCROLL INMEDIATO Y GARANTIZADO
        requestAnimationFrame(() => {
          const container = messagesContainerRef.current;
          if (container) {
            console.log('­ƒô£ Forzando scroll inmediato - scrollHeight:', container.scrollHeight);
            container.scrollTop = container.scrollHeight;
            console.log('Ô£à Scroll ejecutado - scrollTop:', container.scrollTop);
          }
        });
        
        // Ocultar separador despu├®s de 3 segundos
        setTimeout(() => {
          setNewMessageSeparatorIndex(null);
        }, 3000);
      } else if (previousMessageCount === 0) {
        // Primer load - scroll instant├íneo
        console.log('­ƒôÑ Primera carga de mensajes');
        setTimeout(() => scrollToBottom('auto'), 100);
      }
      
      // Actualizar contador
      setPreviousMessageCount(currentMessageCount);
    }
  }, [activeConversation?.id, activeConversation?.messages?.length, scrollToBottom]);
  
  // ­ƒöÑ NUEVO: Mantener scroll SIEMPRE en el fondo (MutationObserver)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !activeConversation) return;

    console.log('­ƒæü´©Å Iniciando observer para mantener scroll al fondo');

    // Funci├│n para forzar scroll al fondo
    const scrollToBottomImmediate = () => {
      // ­ƒÜ½ NO hacer scroll autom├ítico si hay b├║squeda activa
      if ((searchResults || []).length > 0) {
        console.log('­ƒöì B├║squeda activa - cancelando auto-scroll');
        return;
      }
      
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      });
    };

    // Observer que detecta cambios en el DOM (nuevos mensajes, im├ígenes cargadas, etc)
    const observer = new MutationObserver(() => {
      console.log('­ƒöä DOM mutado - haciendo scroll al fondo');
      scrollToBottomImmediate();
    });

    // Observar cambios en el contenedor
    observer.observe(container, {
      childList: true,        // Detectar cuando se agregan/eliminan hijos
      subtree: true,          // Observar todos los descendientes
      attributes: true,       // Detectar cambios de atributos (ej: im├ígenes cargadas)
      characterData: true     // Detectar cambios de texto
    });

    // Scroll inicial
    scrollToBottomImmediate();

    // Cleanup
    return () => {
      console.log('­ƒøæ Deteniendo observer de scroll');
      observer.disconnect();
    };
  }, [activeConversation?.id, activeConversation?.messages, (searchResults || []).length]);
  
  // Ô£à Ejecutar scroll cuando se active el trigger
  useEffect(() => {
    if (shouldScrollToBottom) {
      console.log('Ô¼ç´©Å Haciendo scroll autom├ítico...');
      setTimeout(() => scrollToBottom('smooth'), 150);
      setShouldScrollToBottom(false);
    }
  }, [shouldScrollToBottom, scrollToBottom]);
  
  // Ô£à Resetear contador cuando cambia de conversaci├│n
  useEffect(() => {
    setPreviousMessageCount(0);
    setNewMessageSeparatorIndex(null);
    // ­ƒåò Limpiar b├║squeda al cambiar de conversaci├│n
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
    setShowSearchBar(false);
  }, [activeConversation?.id]);

  // Ô£à NUEVO: Cerrar men├║ de settings al hacer click fuera
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

  // FASE 3: Atajos de teclado para busqueda global y filtros avanzados
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Busqueda global: Ctrl+K
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
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
      const messageId = searchResults[currentSearchIndex];
      setTimeout(() => {
        const element = document.getElementById(`message-${messageId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [currentSearchIndex, searchResults]);

  // Funciones para el modal de editar contacto
  const handleOpenEditModal = () => {
    if (activeConversation) {
      const contact = activeConversation.contact;
      
      console.log('­ƒöì DEBUG - Abriendo modal de edici├│n:', {
        'activeConversation completo': activeConversation,
        'contact': contact,
        'contact.name': contact?.name,
        'contact.phone_number': contact?.phone_number,
        'contact.email': contact?.email,
        'contact.id': contact?.id
      });
      
      // ­ƒöì L├ôGICA BASADA EN LA BD DE CHATWOOT:
      // - phone_number: SIEMPRE tiene el n├║mero correcto (ej: +56984680080)
      // - name: Puede ser el nombre real O el n├║mero si no tiene nombre
      // - identifier: Es el WhatsApp ID (ej: 56984680080@s.whatsapp.net)
      
      const phoneNumber = contact?.phone_number || contact?.name || '';
      const nameValue = contact?.name || '';
      
      // Determinar si 'name' es solo un n├║mero (sin nombre real asignado)
      // o si es un nombre real (con letras/caracteres especiales)
      const isPhoneNumber = /^[+\d]+$/.test(nameValue);
      
      console.log('­ƒôØ Valores a setear:', {
        phoneNumber,
        nameValue,
        isPhoneNumber,
        'nombre final': isPhoneNumber ? '' : nameValue,
        'tel├®fono final': phoneNumber
      });
      
      // Si name es solo el n├║mero, dejamos el campo nombre vac├¡o para que el usuario lo complete
      // Si name tiene letras/caracteres, es un nombre real
      setEditName(isPhoneNumber ? '' : nameValue);
      
      // SIEMPRE usar phone_number como fuente confiable del tel├®fono
      setEditPhone(phoneNumber);
      
      setEditEmail(contact?.email || '');
      setIsEditModalOpen(true);
    } else {
      console.error('ÔØî No hay conversaci├│n activa');
    }
  };

  const handleSaveContact = async () => {
    console.log('­ƒÆ¥ handleSaveContact llamado', {
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
      console.error('ÔØî No se pudo obtener el ID del contacto', {
        'contact': activeConversation?.contact,
        'meta': activeConversation?.meta,
        'contact_inbox': activeConversation?.contact_inbox
      });
      setToastMessage('ÔØî Error: No hay contacto activo');
      setShowToast(true);
      return;
    }

    try {
      console.log('­ƒôØ Guardando contacto:', {
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
          name: editName || editPhone, // Si no hay nombre, usar el tel├®fono
          email: editEmail,
          phone_number: editPhone
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.message || 'Error actualizando contacto');
      }

      const result = await updateResponse.json();
      console.log('Ô£à Contacto actualizado exitosamente:', result);

      // Actualizar el estado local de la conversaci├│n activa
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
      
      // Mostrar toast de ├®xito
      setToastMessage('┬íContacto actualizado exitosamente!');
      setShowToast(true);
      
      // Cerrar modal
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error guardando contacto:', error);
      setToastMessage('Error al actualizar el contacto');
      setShowToast(true);
      
      // Ocultar toast de error despu├®s de 3 segundos
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

  // Handlers para opciones del men├║
  const handleDownloadChat = () => {
    if (!activeConversation) {
      alert('Por favor selecciona una conversaci├│n primero');
      return;
    }
    
    try {
      console.log('­ƒôÑ Iniciando descarga de conversaci├│n:', activeConversation.id);
      
      // Crear workbook
      const wb = XLSX.utils.book_new();
      
      // ===== HOJA 1: INFORMACI├ôN GENERAL =====
      const contacto = activeConversation.meta?.sender || activeConversation.contact || {};
      const telefono = contacto.phone_number || contacto.identifier || 'N/A';
      const email = contacto.email || 'N/A';
      
      const infoData = [
        ['INFORMACI├ôN DE LA CONVERSACI├ôN'],
        [''],
        ['ID Conversaci├│n:', activeConversation.id],
        ['Contacto:', activeConversation.contact?.name || 'Sin nombre'],
        ['Email:', email],
        ['Tel├®fono:', telefono],
        ['Estado:', activeConversation.status === 'open' ? 'Abierta' : activeConversation.status === 'resolved' ? 'Resuelta' : activeConversation.status],
        ['Prioridad:', activeConversation.priority || 'Normal'],
        ['Agente asignado:', activeConversation.assignee?.name || 'No asignado'],
        ['Mensajes no le├¡dos:', activeConversation.unread_count || 0],
        ['Total de mensajes:', activeConversation.messages?.length || 0],
        ['Fecha de exportaci├│n:', new Date().toLocaleString('es-ES')],
        [''],
        ['Etiquetas:', activeConversation.labels?.join(', ') || 'Sin etiquetas']
      ];
      
      const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
      wsInfo['!cols'] = [{ wch: 25 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, wsInfo, 'Informaci├│n');
      
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
      
      // ===== HOJA 3: ESTAD├ìSTICAS =====
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
        ['ESTAD├ìSTICAS DE LA CONVERSACI├ôN'],
        [''],
        ['M├®trica', 'Valor'],
        ['Total de mensajes', (activeConversation.messages?.length || 0).toString()],
        ['Mensajes del agente', mensajesAgente.toString()],
        ['Mensajes del cliente', mensajesCliente.toString()],
        ['Mensajes no le├¡dos', (activeConversation.unread_count || 0).toString()],
        [''],
        ['Primer mensaje', fechaPrimer ? new Date(fechaPrimer * 1000).toLocaleString('es-ES') : 'N/A'],
        ['├Ültimo mensaje', fechaUltimo ? new Date(fechaUltimo * 1000).toLocaleString('es-ES') : 'N/A'],
        [''],
        ['Estado actual', activeConversation.status || 'N/A'],
        ['Prioridad', activeConversation.priority || 'Normal'],
        ['Canal', activeConversation.channel || 'Desconocido']
      ];
      
      const wsStats = XLSX.utils.aoa_to_sheet(statsData);
      wsStats['!cols'] = [{ wch: 30 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, wsStats, 'Estad├¡sticas');
      
      // Generar nombre de archivo seguro
      const nombreContacto = (activeConversation.contact?.name || 'sin-nombre')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 30);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `Conversacion_${nombreContacto}_${timestamp}.xlsx`;
      
      // Descargar archivo
      XLSX.writeFile(wb, filename);
      
      console.log('Ô£à Excel descargado exitosamente:', filename);
      setIsSettingsOpen(false);
      
    } catch (error) {
      console.error('ÔØî Error al descargar chat:', error);
      alert('Error al generar el archivo Excel. Por favor intenta de nuevo.');
    }
  };

  // Ô£à Funci├│n mejorada con modal de progreso
  const handleDownloadAllConversations = async () => {
    try {
      // Abrir modal y resetear estado
      setIsDownloadModalOpen(true);
      setDownloadProgress(0);
      setDownloadPhase('fetching');
      setDownloadStatus('Conectando con el servidor...');
      setIsSettingsOpen(false);
      
      console.log('­ƒôÑ Solicitando exportaci├│n de conversaciones con mensajes...');

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
      console.log(`Ô£à Recibidas ${(conversationsWithMessages || []).length} conversaciones con mensajes`);

      // Fase 2: Processing (30-60%)
      setDownloadPhase('processing');
      setDownloadProgress(35);
      setDownloadStatus('Organizando informaci├│n de contactos...');
      
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
        
        // ­ƒöä Buscar datos actualizados del contacto en el estado local
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
          // ­ƒöä Buscar datos actualizados del contacto en el estado local
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
      setDownloadStatus(`Ô£à ┬íCompletado! ${(conversationsWithMessages || []).length} conversaciones con ${totalMensajes} mensajes`);
      
      console.log('Ô£à Excel generado exitosamente:', filename);
      
      // Cerrar modal despu├®s de 3 segundos
      setTimeout(() => {
        setIsDownloadModalOpen(false);
      }, 3000);

    } catch (error) {
      console.error('ÔØî Error descargando conversaciones:', error);
      setDownloadPhase('error');
      setDownloadStatus(`ÔØî Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setDownloadProgress(0);
      
      // Cerrar modal despu├®s de 5 segundos en error
      setTimeout(() => {
        setIsDownloadModalOpen(false);
      }, 5000);
    }
  };
  const handleScroll = () => {
    if (!conversationsListRef.current || !hasMorePages || conversationsLoading) return;
    
    const { scrollTop, scrollHeight, clientHeight } = conversationsListRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    // Cargar m├ís cuando llega al 80% del scroll
    if (scrollPercentage > 0.8) {
      console.log('­ƒôä Cargando m├ís conversaciones...');
      loadMoreConversations();
    }
  };

  // Ô£¿ OPTIMIZACI├ôN: Funciones extra├¡das a ../utils/ para mejor performance y reutilizaci├│n
  // formatTimestamp, getPriorityColor, getStatusColor ahora se importan desde ../utils/

  // ­ƒøí´©Å GUARDIA: Prevenir render si conversations es undefined
  if (!conversations) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ­ƒøí´©Å GUARDIA: Prevenir render si conversations es undefined
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
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Error de Conexi├│n</h3>
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
                  {(conversations || []).length} de {totalConversations} {hasMorePages && '(m├ís disponibles)'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Bot├│n de Notificaciones */}
              <button
                onClick={() => notifications.toggleCenter()}
                className='p-2 bg-white/70 hover:bg-white/90 shadow-sm hover:shadow rounded-xl transition-all duration-300 backdrop-blur-sm border border-gray-200/30 relative'
                title='Notificaciones'
              >
                <Bell className='w-4 h-4 text-gray-700' />
                {notifications.unreadCount > 0 && (
                  <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold'>
                    {notifications.unreadCount}
                  </span>
                )}
              </button>

              {/* FASE 3: Botones de busqueda, filtros y metricas */}
              <button
                onClick={() => setShowGlobalSearch(true)}
                className="p-2 bg-white/70 hover:bg-white/90 shadow-sm hover:shadow rounded-xl transition-all duration-300 backdrop-blur-sm border border-gray-200/30"
                title="Busqueda global (Ctrl+K)"
              >
                <Search className="w-4 h-4 text-blue-600" />
              </button>

              <button
                onClick={() => setShowAdvancedFilters(true)}
                className="p-2 bg-white/70 hover:bg-white/90 shadow-sm hover:shadow rounded-xl transition-all duration-300 backdrop-blur-sm border border-gray-200/30 relative"
                title="Filtros avanzados (Ctrl+F)"
              >
                <Filter className="w-4 h-4 text-purple-600" />
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
                  title="Configuraci├│n"
                >
                  <Settings className="w-4 h-4 text-gray-700" />
                </button>
                
                {/* Menu desplegable */}
                {isSettingsOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-fade-in">
                    <button
                      onClick={() => {
                        // TODO: Implementar cambio de tema
                        alert('Funcionalidad de Tema proximamente');
                        setIsSettingsOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2"
                    >
                      <span>🎨</span>
                      <span>Personalizacion</span>
                    </button>
                    
                    <button
                      onClick={handleDownloadChat}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2"
                      disabled={!activeConversation}
                    >
                      <span>📥</span>
                      <span>Descargar chat</span>
                    </button>

                    <button
                      onClick={handleDownloadAllConversations}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2"
                    >
                      <span>📦</span>
                      <span>Descargar todas</span>
                    </button>
                  </div>

                )}
              </div>
            </div>
          </div>
          
          {/* Barra de B├║squeda */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              className="w-full pl-10 pr-4 py-2 bg-white/30 border border-white/30 rounded-xl text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 backdrop-blur-xl transition-all duration-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filtros */}
          <div className="flex space-x-2">
            {[
              { id: 'all', label: 'Todo', count: (conversations || []).length },
              { id: 'mine', label: 'M├¡o', count: (conversations || []).filter(c => c.assignee_id === 1).length },
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

        {/* ­ƒÜÇ Lista VIRTUALIZADA de Conversaciones - Mejora 80% performance */}
        <div 
          ref={conversationsListRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
        >
          {(filteredConversations || []).length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay conversaciones</p>
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
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white ${
                          conversation.priority === 'urgent' 
                            ? 'bg-gradient-to-r from-red-500 to-red-600'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}>
                          {conversation.contact.avatar}
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
                        
                        <p className="text-sm text-gray-600 truncate mb-2">{conversation.last_message.content}</p>
                        
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
          
          {/* Ô£à Indicador de carga al hacer scroll */}
          {conversationsLoading && (conversations || []).length > 0 && (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
              <span className="text-sm text-gray-600">Cargando m├ís...</span>
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
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center font-semibold text-white">
                      {activeConversation.contact.avatar}
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
                  {/* ­ƒöì B├ÜSQUEDA EXPANDIBLE ELEGANTE */}
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
                              setSearchResults([]);
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
                            setSearchResults([]);
                            setCurrentSearchIndex(0);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <X className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      </>
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
              {/* ­ƒôÄ DRAG & DROP OVERLAY */}
              {isDragging && (
                <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm border-4 border-dashed border-blue-500 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-blue-800">Suelta los archivos aqu├¡</p>
                    <p className="text-sm text-blue-600 mt-2">Im├ígenes, documentos y m├ís</p>
                  </div>
                </div>
              )}
              {/* ­ƒôî MENSAJE FIJADO */}
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

              {/* Ô£à Renderizar mensajes memoizados (sin duplicados) */}
              {uniqueActiveMessages.map((message: any, index: number) => (
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
                  
                  {/* Mensaje con Men├║ Contextual */}
                  <div 
                    id={`message-${message.id}`}
                    className={`flex ${message.sender === 'agent' ? 'justify-end' : 'justify-start'} group`}
                  >
                    {/* Contenedor de mensaje + bot├│n */}
                    <div className="flex items-center gap-2 relative">
                      {/* Bot├│n ANTES de la burbuja (para mensajes del contacto) */}
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
                          searchResults.includes(message.id)
                            ? searchResults[currentSearchIndex] === message.id
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
                        
                        <p className="text-sm">{message.content}</p>

                        {/* ­ƒôÄ Renderizar archivos adjuntos (im├ígenes, audios, documentos) */}
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
                            searchResults.includes(message.id)
                              ? 'text-gray-600'
                              : message.sender === 'agent' 
                              ? 'text-blue-100' 
                              : 'text-gray-500'
                          }`}>
                            {formatTimestamp(message.timestamp)}
                          </p>
                          {/* Doble check azul para mensajes enviados */}
                          {message.sender === 'agent' && (
                            <CheckCheck className={`w-3 h-3 ${
                              searchResults.includes(message.id) ? 'text-gray-600' : 'text-blue-200'
                            }`} />
                          )}
                        </div>
                      </div>

                      {/* Bot├│n DESPU├ëS de la burbuja (para mensajes propios) */}
                      {message.sender === 'agent' && (
                        <button
                          onClick={() => setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id)}
                          className="p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        </button>
                      )}

                      {/* Men├║ Contextual */}
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
              
              {!uniqueActiveMessages.length && (
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
              
              {/* Ô£à NUEVO: Marcador invisible para auto-scroll */}
              <div ref={messagesEndRef} className="h-0" />
            </div>

            {/* Input de Mensaje */}
            <div className="border-t border-white/20 bg-white/20 backdrop-blur-xl">
              {/* Ôå®´©Å BARRA DE RESPUESTA */}
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

              {/* Ôî¿´©Å INDICADOR "ESCRIBIENDO..." */}
              {isContactTyping && (
                <div className="px-4 py-2 bg-gray-50/50">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">{activeConversation.contact.name} est├í escribiendo...</span>
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
                  
                  {/* ­ƒÄñ BOT├ôN DE AUDIO */}
                  {!isRecording ? (
                    <button 
                      type="button"
                      onMouseDown={handleStartRecording}
                      className="p-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl transition-all duration-300"
                      title="Mant├®n presionado para grabar"
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

                {/* ­ƒÿè EMOJI PICKER SIMPLE */}
                {showEmojiPicker && (
                  <div className="absolute bottom-20 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-3 grid grid-cols-8 gap-2 z-50">
                    {['­ƒÿè', '­ƒÿé', 'ÔØñ´©Å', '­ƒæì', '­ƒÄë', '­ƒöÑ', 'Ô£¿', '­ƒÆ»', '­ƒÖî', '­ƒæÅ', '­ƒñØ', '­ƒÆ¬', '­ƒÄ»', 'Ô£à', 'ÔØî', 'ÔÜá´©Å'].map(emoji => (
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
                  src="/logo-withmia.png" 
                  alt="WITHMIA Logo" 
                  className="w-40 h-40 mx-auto hover:scale-110 transition-transform duration-300"
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Selecciona una conversaci├│n</h3>
              <p className="text-gray-500">Elige una conversaci├│n para empezar a chatear</p>
            </div>
          </div>
        )}
      </div>

      {/* ­ƒôè GALER├ìA MULTIMEDIA MODAL */}
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
                <span>Im├ígenes</span>
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
                      <h4 className="font-semibold text-gray-700 mb-3">Im├ígenes ({images.length})</h4>
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

      {/* Panel Derecho - Informaci├│n del Contacto */}
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
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center font-bold text-white text-xl mx-auto mb-3">
                  {activeConversation.contact.avatar}
                </div>
                <h3 className="font-bold text-gray-800">{activeConversation.contact.name}</h3>
                <p className="text-gray-600 text-sm">{activeConversation.contact.email}</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                  activeConversation.contact.status === 'online' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {activeConversation.contact.status === 'online' ? 'En l├¡nea' : 'Desconectado'}
                </span>
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

              {/* ­ƒôè GALER├ìA MULTIMEDIA */}
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
                  Informaci├│n
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
                <h4 className="font-semibold text-gray-800 mb-3">Acciones R├ípidas</h4>
                <div className="space-y-2">
                  <button className="w-full p-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm text-gray-700 transition-colors flex items-center">
                    <Archive className="w-4 h-4 mr-2" />
                    Archivar Conversaci├│n
                  </button>
                  <button className="w-full p-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm text-gray-700 transition-colors flex items-center">
                    <Star className="w-4 h-4 mr-2" />
                    Marcar como Favorito
                  </button>
                  <button className="w-full p-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm text-gray-700 transition-colors flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Resolver Conversaci├│n
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Selecciona una conversaci├│n para ver detalles</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de progreso de descarga */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fade-in">
            <div className="text-center">
              {/* ├ìcono seg├║n fase */}
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

              {/* T├¡tulo seg├║n fase */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {downloadPhase === 'fetching' && 'Descargando...'}
                {downloadPhase === 'processing' && 'Procesando...'}
                {downloadPhase === 'generating' && 'Generando Excel...'}
                {downloadPhase === 'complete' && '┬íCompletado!'}
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
                  placeholder="Ej: Juan P├®rez"
                  className="w-full px-4 py-2.5 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Campo Tel├®fono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tel├®fono
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
                  Correo electr├│nico
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

      {/* ­ƒû╝´©Å Visor de Im├ígenes Estilo WhatsApp */}
      {imageViewerOpen && selectedImageUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black flex flex-col"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
        >
          {/* Header con bot├│n cerrar */}
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
              title="Abrir en nueva pesta├▒a"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}

      <NotificationToast notifications={notifications} />
      <NotificationCenter notifications={notifications} />
      <NotificationSettings notifications={notifications} />

      {/* FASE 3: Componentes de busqueda, filtros y metricas */}
      <SearchGlobal
        isOpen={showGlobalSearch}
        conversations={conversations}
        onSelectConversation={(conv) => {
          _setActiveConversation(conv);
          setShowGlobalSearch(false);
        }}
        onClose={() => setShowGlobalSearch(false)}
      />

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
