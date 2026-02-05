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
  // Iconos para tipos de archivo
  Video,
  Music,
  FileType,
  // Nuevos iconos para Fase 3
  Filter
} from 'lucide-react';
import { useConversations } from '../hooks/useChatwoot';
import { useGlobalNotifications, WebSocketMessageEvent } from '../contexts/GlobalNotificationContext';
// NOTA: useNotifications eliminado - ahora usamos el sistema unificado GlobalNotificationContext
import NotificationToast from './NotificationToast.tsx';
// FASE 3: Nuevos componentes y hooks (Filtros)
import AdvancedFilters from './AdvancedFilters';
import { useMessagePagination } from '../hooks/useMessagePagination';
// NOTA: useEnhancedNotifications eliminado - usamos GlobalNotificationContext centralizado
import NotificationCenter from './NotificationCenter.tsx';
import NotificationSettings from './NotificationSettings.tsx';
// ?? OPTIMIZACIONES: Utilidades extraídas para mejor performance
import { formatTimestamp } from '../utils/dateFormatter';
import { getPriorityColor, getStatusColor } from '../utils/conversationColors';
import debugLog from '../utils/debugLogger';
// 🏷️ NUEVOS: Componentes de gestión de conversaciones
import ConversationActionsDropdown from './ConversationActionsDropdown';
import AssignAgentDropdown from './AssignAgentDropdown';
import LabelsManager from './LabelsManager';

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
  const formatLastMessagePreview = (message, attachments?: any[]) => {
    // 🆕 NUEVO: Si no hay contenido pero hay attachments, mostrar tipo de archivo
    if ((!message || message.trim() === '') && attachments && attachments.length > 0) {
      const attachment = attachments[0];
      const fileType = attachment.file_type || attachment.content_type || '';
      const fileName = attachment.data_url?.split('/').pop() || attachment.file_name || 'archivo';
      
      if (fileType.startsWith('image/')) return '📷 Imagen';
      if (fileType.startsWith('video/')) return '🎥 Video';
      if (fileType.startsWith('audio/')) return '🎵 Audio';
      if (fileType.includes('pdf')) return '📄 PDF';
      if (fileType.includes('document') || fileType.includes('word')) return '📄 Documento';
      if (fileType.includes('sheet') || fileType.includes('excel')) return '📊 Hoja de cálculo';
      
      return `📎 ${fileName}`;
    }
    
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
      return "📷 Imagen";
    }
    
    // URL larga generica
    if (cleanMessage.startsWith("http") && cleanMessage.length > 50) {
      return "🔗 Enlace";
    }
    
    // Multimedia (incluir .oga, .opus, .aac para audios de WhatsApp)
    if (/\.(mp3|wav|ogg|oga|opus|m4a|aac|amr|3gp)$/i.test(cleanMessage)) return "🎵 Audio";
    if (/\.(mp4|mov|avi|webm|mkv)$/i.test(cleanMessage)) return "🎥 Video";
    if (/\.(pdf|doc|docx|xls|xlsx)$/i.test(cleanMessage)) return "📄 Documento";
    
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

  // Helper: Obtiene la URL del avatar a través del proxy si es de Chatwoot
  const getAvatarProxyUrl = (avatarUrl: string | null | undefined, contactName?: string): string | null => {
    if (!avatarUrl) return null;
    // Si es una URL de Chatwoot Railway, usar el proxy
    if (avatarUrl.includes('chatwoot') && avatarUrl.includes('railway.app')) {
      const nameParam = contactName ? `&name=${encodeURIComponent(contactName)}` : '';
      return `/img-proxy?url=${encodeURIComponent(avatarUrl)}${nameParam}`;
    }
    // Para otras URLs, retornar directamente
    return avatarUrl;
  };

// Props del componente
interface ConversationsInterfaceProps {
  currentAgentId?: number;
}

const ConversationsInterface: React.FC<ConversationsInterfaceProps> = ({ currentAgentId }) => {
  // 🔔 SISTEMA UNIFICADO: Usamos el contexto global para notificaciones
  // (ya no usamos useNotifications() - todo está en GlobalNotificationContext)
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
    addMessageToCache, // ✅ NUEVO: Para agregar mensaje a caché
    // 🏷️ NUEVOS: Funciones de asignación y estado
    assignConversation,
    changeConversationStatus,
    updateConversationLabels
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
  
  // 7. Contact Info Panel (Panel de informacion)
  const [showContactInfo, setShowContactInfo] = useState(false);
  
  // 8. Muted Conversations (Silenciadas) - Persistir en localStorage
  const [mutedConversations, setMutedConversations] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('mutedConversations');
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading muted conversations:', e);
    }
    return new Set();
  });
  
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
  const [isUploadingFile, setIsUploadingFile] = useState(false); // 📤 Estado de carga de archivo
  const [uploadProgress, setUploadProgress] = useState<string>(''); // Nombre del archivo subiendo
  
  // 4. Audio Messages (Mensajes de voz)
  const [isRecording, setIsRecording] = useState(false);
  const [isSendingAudio, setIsSendingAudio] = useState(false); // 🎤 Estado de envío de audio
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  
  // 🎬 Estados para visor de media fullscreen con navegación (estilo WhatsApp)
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaGallery, setMediaGallery] = useState<Array<{url: string, type: 'image' | 'video'}>>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [mediaZoom, setMediaZoom] = useState(1); // 🔍 Zoom level (1 = 100%)
  const [mediaPan, setMediaPan] = useState({ x: 0, y: 0 }); // 🖱️ Pan position
  const [isMediaDragging, setIsMediaDragging] = useState(false); // 🖱️ Dragging state for media viewer
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // 🖱️ Drag start position
  
  // 🎬 Helper: Abrir visor de media con galería completa de la conversación
  const openMediaViewer = useCallback((clickedUrl: string, clickedType: 'image' | 'video') => {
    // Recolectar todos los medias de los mensajes de la conversación activa
    const allMedia: Array<{url: string, type: 'image' | 'video'}> = [];
    
    if (activeConversation?.messages) {
      activeConversation.messages.forEach((msg: any) => {
        if (msg.attachments) {
          msg.attachments.forEach((att: any) => {
            const rawUrl = att.file_url || att.data_url || att.url || '';
            const fileType = att.file_type || att.content_type || '';
            
            if (!rawUrl) return;
            
            const attachmentUrl = rawUrl.includes('chatwoot') 
              ? `/img-proxy?url=${encodeURIComponent(rawUrl)}`
              : rawUrl;
            
            if (fileType.includes('image')) {
              allMedia.push({ url: attachmentUrl, type: 'image' });
            } else if (fileType.includes('video') || /\.(mp4|mov|avi|webm|mkv)$/i.test(rawUrl)) {
              allMedia.push({ url: attachmentUrl, type: 'video' });
            }
          });
        }
      });
    }
    
    // Si no encontramos medias, al menos agregar el clickeado
    if (allMedia.length === 0) {
      allMedia.push({ url: clickedUrl, type: clickedType });
    }
    
    // Encontrar el índice del media clickeado
    const clickedIndex = allMedia.findIndex(m => m.url === clickedUrl);
    
    setMediaGallery(allMedia);
    setCurrentMediaIndex(clickedIndex >= 0 ? clickedIndex : 0);
    setMediaZoom(1); // Reset zoom al abrir
    setMediaPan({ x: 0, y: 0 }); // Reset pan al abrir
    setMediaViewerOpen(true);
  }, [activeConversation?.messages]);
  
  // 🎬 Navegación de la galería
  const goToPreviousMedia = useCallback(() => {
    setCurrentMediaIndex(prev => (prev > 0 ? prev - 1 : mediaGallery.length - 1));
    setMediaZoom(1); // Reset zoom al cambiar
    setMediaPan({ x: 0, y: 0 }); // Reset pan al cambiar
  }, [mediaGallery.length]);
  
  const goToNextMedia = useCallback(() => {
    setCurrentMediaIndex(prev => (prev < mediaGallery.length - 1 ? prev + 1 : 0));
    setMediaZoom(1); // Reset zoom al cambiar
    setMediaPan({ x: 0, y: 0 }); // Reset pan al cambiar
  }, [mediaGallery.length]);
  
  // 🔍 Handler para zoom con scroll
  const handleMediaWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.min(Math.max(0.5, mediaZoom + delta), 3);
    setMediaZoom(newZoom);
    // Si vuelve a zoom 1, resetear pan
    if (newZoom <= 1) {
      setMediaPan({ x: 0, y: 0 });
    }
  }, [mediaZoom]);
  
  // 🖱️ Handlers para arrastrar imagen con zoom
  const handleMediaMouseDown = useCallback((e: React.MouseEvent) => {
    if (mediaZoom > 1) {
      e.preventDefault();
      setIsMediaDragging(true);
      setDragStart({ x: e.clientX - mediaPan.x, y: e.clientY - mediaPan.y });
    }
  }, [mediaZoom, mediaPan]);
  
  const handleMediaMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMediaDragging && mediaZoom > 1) {
      e.preventDefault();
      setMediaPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isMediaDragging, mediaZoom, dragStart]);
  
  const handleMediaMouseUp = useCallback(() => {
    setIsMediaDragging(false);
  }, []);
  
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
  
  // 📜 NUEVO: Ref para auto-scroll de mensajes
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  
  // ?? NUEVO: Ref para auto-scroll de mensajes
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  // ?? NUEVO: Ref para evitar stale closure en callbacks de tiempo real
  const activeConversationRef = useRef<any | null>(null);
  
  // ?? DEDUPLICACI?N: Ref para evitar procesar eventos WebSocket duplicados
  const processedEventsRef = useRef<Set<string>>(new Set());
  
  // 🔗 Cache de link previews (para evitar fetch repetidos)
  const [linkPreviews, setLinkPreviews] = useState<Record<string, {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    loading?: boolean;
    error?: boolean;
  }>>({});
  
  // 🔗 Función para extraer URLs de un texto
  const extractUrls = useCallback((text: string): string[] => {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
    const matches = text.match(urlRegex) || [];
    // Filtrar URLs de attachments que ya se muestran como media
    return matches.filter(url => 
      !url.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm|mp3|wav|pdf|doc)$/i) &&
      !url.includes('chatwoot') &&
      !url.includes('active_storage')
    );
  }, []);
  
  // 🔗 Función para obtener preview de un enlace (usando API de metadata)
  const fetchLinkPreview = useCallback(async (url: string) => {
    // Si ya tenemos el preview cacheado o está cargando, no volver a fetch
    if (linkPreviews[url] && !linkPreviews[url].error) return;
    
    // Marcar como cargando
    setLinkPreviews(prev => ({ ...prev, [url]: { loading: true } }));
    
    try {
      // Usar un servicio de metadata (openlinkpreview, microlink, etc.) o nuestro propio proxy
      // Aquí usamos una API pública gratuita
      const response = await axios.get(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
      
      if (response.data?.status === 'success' && response.data?.data) {
        const data = response.data.data;
        setLinkPreviews(prev => ({
          ...prev,
          [url]: {
            title: data.title || new URL(url).hostname,
            description: data.description,
            image: data.image?.url,
            siteName: data.publisher || new URL(url).hostname,
            loading: false
          }
        }));
      } else {
        // Fallback: al menos mostrar el dominio
        setLinkPreviews(prev => ({
          ...prev,
          [url]: {
            title: new URL(url).hostname,
            siteName: new URL(url).hostname,
            loading: false
          }
        }));
      }
    } catch (error) {
      // En caso de error, mostrar preview básico
      try {
        setLinkPreviews(prev => ({
          ...prev,
          [url]: {
            title: new URL(url).hostname,
            siteName: new URL(url).hostname,
            loading: false,
            error: true
          }
        }));
      } catch {
        setLinkPreviews(prev => ({
          ...prev,
          [url]: { loading: false, error: true }
        }));
      }
    }
  }, [linkPreviews]);
  
  // 🔗 Componente para renderizar preview de enlace estilo WhatsApp
  const LinkPreviewCard: React.FC<{ url: string; preview: any }> = ({ url, preview }) => {
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const youtubeId = isYouTube ? url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1] : null;
    
    return (
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-2 rounded-lg overflow-hidden border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm max-w-[300px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Imagen de preview o thumbnail de YouTube */}
        {(preview.image || youtubeId) && (
          <div className="relative w-full h-36 bg-gray-100">
            <img 
              src={youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : preview.image}
              alt={preview.title || 'Preview'}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            {isYouTube && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                  <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                </div>
              </div>
            )}
          </div>
        )}
        {/* Información del enlace */}
        <div className="p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {preview.siteName || new URL(url).hostname}
          </p>
          {preview.title && (
            <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
              {preview.title}
            </p>
          )}
          {preview.description && (
            <p className="text-xs text-gray-600 line-clamp-2">
              {preview.description}
            </p>
          )}
        </div>
      </a>
    );
  };
  
  //  OPTIMIZACIÓN: Función con debounce para recargar conversaciones
  const debouncedFetchConversations = useCallback(() => {
    // Cancelar reload pendiente si existe
    if (reloadDebounceRef.current) {
      clearTimeout(reloadDebounceRef.current);
    }
    
    // Si ya hay un reload en progreso, marcar que hay uno pendiente
    if (isPendingReloadRef.current) {
      debugLog.log('?? Reload ya en progreso, agendando siguiente...');
      return;
    }
    
    // Verificar si pas?? suficiente tiempo desde el ??ltimo reload (m??nimo 2 segundos)
    const now = Date.now();
    const timeSinceLastReload = now - lastReloadTimestampRef.current;
    
    if (timeSinceLastReload < 2000) {
      // Agendar reload despu??s del tiempo m??nimo
      const delay = 2000 - timeSinceLastReload;
      debugLog.log(`?? Agendando reload en ${delay}ms...`);
      
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
      debugLog.log('??? Conversaciones actualizadas');
    } catch (error) {
      debugLog.error('??? Error actualizando conversaciones:', error);
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
  
  // � Escuchar evento para refrescar conversaciones cuando hay mensajes pendientes
  useEffect(() => {
    const handleRefreshConversations = () => {
      if (fetchUpdatedConversations) {
        fetchUpdatedConversations();
      }
    };
    
    window.addEventListener('refreshConversations', handleRefreshConversations);
    return () => {
      window.removeEventListener('refreshConversations', handleRefreshConversations);
    };
  }, [fetchUpdatedConversations]);
  
  // �🔔 Escuchar evento selectConversation desde NotificationBell y query params
  const pendingConversationRef = useRef<number | null>(null);
  const hasCheckedQueryParamRef = useRef(false);
  
  // Efecto separado para manejar query params - se ejecuta solo una vez al montar
  useEffect(() => {
    if (hasCheckedQueryParamRef.current) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const conversationParam = urlParams.get('conversation');
    if (conversationParam) {
      const conversationId = parseInt(conversationParam, 10);
      if (!isNaN(conversationId)) {
        // Query param detectado
        pendingConversationRef.current = conversationId;
        hasCheckedQueryParamRef.current = true;
        // Limpiar query param inmediatamente para evitar problemas
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);
  
  useEffect(() => {
    // Función para seleccionar conversación por ID
    const selectConversationById = (conversationId: number) => {
      // selectConversationById llamado
      
      if (!conversations || conversations.length === 0) {
        // Guardar para intentar después cuando se carguen las conversaciones
        pendingConversationRef.current = conversationId;
        // Guardando conversación pendiente
        return false;
      }
      
      const conversation = conversations.find((c: any) => c.id === conversationId);
      if (conversation) {
        // Seleccionando conversación
        pendingConversationRef.current = null; // Limpiar pendiente
        _setActiveConversation({
          ...conversation,
          messages: [],
          unread_count: 0,
          _isLoading: true
        });
        loadConversationMessages(conversationId);
        if (markConversationAsRead) {
          markConversationAsRead(conversationId);
        }
        return true;
      } else {
        console.log('❌ Conversación no encontrada en lista:', conversationId);
      }
      return false;
    };

    // Si hay una conversación pendiente y ahora tenemos conversaciones, seleccionarla
    if (pendingConversationRef.current && conversations && conversations.length > 0) {
      console.log('🔔 Intentando seleccionar conversación pendiente:', pendingConversationRef.current);
      selectConversationById(pendingConversationRef.current);
    }

    // Escuchar evento personalizado
    const handleSelectEvent = (event: CustomEvent) => {
      const { conversationId } = event.detail;
      if (conversationId) {
        selectConversationById(conversationId);
      }
    };

    window.addEventListener('selectConversation', handleSelectEvent as EventListener);
    return () => {
      window.removeEventListener('selectConversation', handleSelectEvent as EventListener);
    };
  }, [conversations, _setActiveConversation, loadConversationMessages, markConversationAsRead]);
  
  //  Auto-focus del input cuando se abre una conversación (como WhatsApp)
  useEffect(() => {
    if (activeConversation && messageInputRef.current) {
      // Peque??o delay para asegurar que el DOM esté listo
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    }
  }, [activeConversation?.id]); // Solo cuando cambie la conversación activa

  // 🔄 Ref para evitar cargas múltiples en infinite scroll
  const isLoadingMoreRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  // 🔄 Infinite scroll para cargar más mensajes al llegar al tope (usando scroll event)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // Debounce: no cargar si ya cargamos hace menos de 2 segundos
      const now = Date.now();
      if (now - lastLoadTimeRef.current < 2000) return;
      
      // Si el usuario está cerca del tope (menos de 50px del inicio)
      const isNearTop = container.scrollTop < 50;
      
      // Debug: mostrar estado actual
      if (isNearTop) {
        console.log('🔍 Estado scroll:', {
          scrollTop: container.scrollTop,
          hasMoreMessages: activeConversation?._hasMoreMessages,
          isLoading: activeConversation?._isLoading,
          isLoadingMore: isLoadingMoreRef.current,
          messagesCount: activeConversation?.messages?.length
        });
      }
      
      // Cargar si: está cerca del tope, no está cargando, y tiene mensajes (asumimos que siempre hay más si no sabemos)
      const hasMore = activeConversation?._hasMoreMessages !== false; // true o undefined = intentar cargar
      
      if (isNearTop && 
          hasMore && 
          !activeConversation?._isLoading && 
          !isLoadingMoreRef.current &&
          activeConversation?.messages?.length > 0) {
        
        console.log('📜 Cargando más mensajes...');
        isLoadingMoreRef.current = true;
        lastLoadTimeRef.current = now;
        
        // Guardar altura actual antes de cargar
        const prevScrollHeight = container.scrollHeight;
        
        loadConversationMessages(activeConversation.id, true)
          .then(() => {
            // Esperar a que React renderice los nuevos mensajes
            setTimeout(() => {
              const newScrollHeight = container.scrollHeight;
              const addedHeight = newScrollHeight - prevScrollHeight;
              console.log('✅ Mensajes cargados:', { prevHeight: prevScrollHeight, newHeight: newScrollHeight, added: addedHeight });
              // Mover el scroll hacia abajo por la cantidad de contenido nuevo
              if (addedHeight > 0) {
                container.scrollTop = addedHeight + 50; // +50 para no re-disparar inmediatamente
              }
              isLoadingMoreRef.current = false;
            }, 150);
          })
          .catch((err) => {
            console.error('❌ Error cargando mensajes:', err);
            isLoadingMoreRef.current = false;
          });
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeConversation?.id, activeConversation?._hasMoreMessages, activeConversation?._isLoading, activeConversation?.messages?.length, loadConversationMessages]);
  
  // 🎯 SISTEMA UNIFICADO DE NOTIFICACIONES
  const globalNotifications = useGlobalNotifications();
  const isConnected = globalNotifications?.isWebSocketConnected ?? false;
  const wsConnected = isConnected;
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  
  // ✅ Funciones de badges del contexto global
  const incrementBadge = globalNotifications?.incrementBadge;
  const clearBadge = globalNotifications?.clearBadge;
  const conversationBadges = globalNotifications?.conversationBadges;
  const initializeBadges = globalNotifications?.initializeBadges;
  
  // ✅ Inicializar badges cuando se cargan las conversaciones (solo la primera vez - controlado en el contexto)
  useEffect(() => {
    if (conversations && conversations.length > 0 && initializeBadges) {
      initializeBadges(conversations);
    }
  }, [conversations, initializeBadges]);
  
  // 🔌 SUSCRIPCIÓN AL WEBSOCKET UNIFICADO
  const debouncedFetchConversationsRef = useRef(debouncedFetchConversations);
  const updateMessagesCacheRef = useRef(updateMessagesCache);
  const addMessageToCacheRef = useRef(addMessageToCache);
  const globalNotificationsRef = useRef(globalNotifications);
  const hasSubscribedRef = useRef(false);
  
  useEffect(() => {
    debouncedFetchConversationsRef.current = debouncedFetchConversations;
    updateMessagesCacheRef.current = updateMessagesCache;
    addMessageToCacheRef.current = addMessageToCache;
    globalNotificationsRef.current = globalNotifications;
  });
  
  // Suscripción estable al WebSocket - solo se ejecuta cuando cambian las dependencias críticas
  useEffect(() => {
    // Solo suscribirse si tenemos todo lo necesario
    if (!globalNotifications || !realtimeEnabled || !userInboxId) {
      return;
    }
    
    // Evitar suscripciones duplicadas - solo suscribirse una vez
    if (hasSubscribedRef.current) {
      console.log('🔌 [ConversationsInterface] Ya suscrito, ignorando');
      return;
    }
    hasSubscribedRef.current = true;
    
    // Log solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('🔌 [ConversationsInterface] Suscribiéndose a WebSocket');
    }
    
    const unsubscribe = globalNotifications.subscribeToMessages((wsEvent: WebSocketMessageEvent) => {
      setLastEventTime(new Date());
      
      if (wsEvent.type === 'conversation_updated') {
        // ✅ FIX: No recargar del servidor inmediatamente para evitar parpadeo de badges
        // Solo actualizar si es un cambio de estado (open/resolved/pending)
        const newStatus = wsEvent.event?.status;
        if (newStatus) {
          setConversations((prev: any[]) => 
            prev.map(conv => 
              conv.id === wsEvent.conversationId 
                ? { ...conv, status: newStatus }
                : conv
            )
          );
        }
        // Ya no llamamos a debouncedFetchConversationsRef.current() aquí
        // porque causa parpadeo de los badges al sobrescribir con datos del servidor
        return;
      }
      
      if (wsEvent.type === 'message_updated') {
        // 📝 Actualizar estado del mensaje (sent, delivered, read)
        const messageId = wsEvent.message?.id;
        const newStatus = wsEvent.message?.status;
        
        if (messageId && newStatus) {
          debugLog.log(`📝 Actualizando estado de mensaje ${messageId} a ${newStatus}`);
          
          _setActiveConversation((prev: any) => {
            if (!prev || !prev.messages) return prev;
            
            const updatedMessages = prev.messages.map((msg: any) => {
              if (msg.id === messageId || (msg._isOptimistic && msg.source_id === wsEvent.message?.source_id)) {
                return { ...msg, status: newStatus, _isOptimistic: false };
              }
              return msg;
            });
            
            return { ...prev, messages: updatedMessages };
          });
        }
        return;
      }
      
      if (wsEvent.type === 'new_message') {
        const event = wsEvent.event;
        const conversationId = wsEvent.conversationId;
        
        // 🔒 DEDUPLICACIÓN - usar solo el ID del mensaje (sin Date.now que cambia)
        const messageId = wsEvent.message?.id || event?.message?.id;
        const eventId = `msg-${conversationId}-${messageId}`;
        if (processedEventsRef.current.has(eventId)) {
          return;
        }
        processedEventsRef.current.add(eventId);
        
        // Limpiar eventos antiguos
        if (processedEventsRef.current.size > 100) {
          const iterator = processedEventsRef.current.values();
          const firstItem = iterator.next().value;
          if (firstItem) processedEventsRef.current.delete(firstItem);
        }

        debugLog.log('📩 [UNIFIED-SUBSCRIBER] Nuevo mensaje:', conversationId);

        // ✅ Determinar si es mensaje entrante
        const messageType = event?.message?.message_type;
        const isOutgoing = messageType === 1 || messageType === 'outgoing';
        const isActiveConversation = activeConversationRef.current?.id === conversationId;
        
        // ✅ Incrementar badge en contexto global si es mensaje entrante y no está activa
        if (!isOutgoing && !isActiveConversation && globalNotificationsRef.current?.incrementBadge) {
          globalNotificationsRef.current.incrementBadge(conversationId);
        }

        // 🔄 ACTUALIZACIÓN de la lista de conversaciones
        setConversations((prevConversations: any[]) => {
          const newTimestamp = event?.timestamp || event?.message?.created_at || new Date().toISOString();
          const existingIndex = prevConversations.findIndex((conv: any) => conv.id === conversationId);

          let updated;
          if (existingIndex !== -1) {
            updated = prevConversations.map((conv: any) => {
              if (conv.id === conversationId) {
                // ✅ Obtener badge del contexto global
                const globalBadge = globalNotificationsRef.current?.conversationBadges?.get(conversationId) || 0;
                
                return {
                  ...conv,
                  last_message: {
                    content: event?.message?.content || '',
                    created_at: event?.message?.created_at || newTimestamp,
                    timestamp: new Date(newTimestamp).getTime() / 1000,
                    message_type: event?.message?.message_type || 0,
                    sender: event?.sender || event?.message?.sender
                  },
                  unread_count: globalBadge,
                  updated_at: newTimestamp,
                  timestamp: new Date(newTimestamp).getTime() / 1000,
                  last_activity_at: new Date(newTimestamp).getTime() / 1000
                };
              }
              return conv;
            });
          } else {
            // Nueva conversación
            const sender = event?.sender || event?.message?.sender || { name: 'Nuevo contacto' };
            const newConv = {
              id: conversationId,
              inbox_id: event?.inbox_id,
              status: 'open',
              unread_count: 1,
              meta: { sender, assignee: null, team: null },
              contact: {
                id: sender.id || 0,
                name: sender.name || 'Nuevo contacto',
                email: sender.email || '',
                phone_number: sender.phone_number || '',
                avatarUrl: sender.thumbnail || sender.avatar || null
              },
              last_message: {
                content: event?.message?.content || '',
                created_at: event?.message?.created_at || newTimestamp,
                timestamp: new Date(newTimestamp).getTime() / 1000,
                message_type: event?.message?.message_type || 0,
                sender
              },
              labels: [],
              timestamp: new Date(newTimestamp).getTime() / 1000,
              last_activity_at: new Date(newTimestamp).getTime() / 1000,
              created_at: newTimestamp,
              updated_at: newTimestamp
            };
            const alreadyExists = prevConversations.some(c => c.id === conversationId);
            updated = alreadyExists ? prevConversations : [newConv, ...prevConversations];
          }

          return updated.sort((a: any, b: any) => {
            const timeA = a.last_activity_at || a.timestamp || 0;
            const timeB = b.last_activity_at || b.timestamp || 0;
            return timeB - timeA;
          });
        });

        // 💬 Agregar mensaje a la conversación activa si corresponde
        const currentActiveConv = activeConversationRef.current;
        
        // Debug desactivado en producción
        
        // Usar comparación numérica para evitar problemas de tipos
        if (currentActiveConv && Number(currentActiveConv.id) === Number(conversationId)) {
          const rawMsgType = wsEvent.message?.message_type;
          const normalizedMsgType = (rawMsgType === 'outgoing' || rawMsgType === 1) ? 1 : 0;
          const normalizedSender = normalizedMsgType === 1 ? 'agent' : 'contact';
          
          // Mensaje agregado silenciosamente
          
          const newMessage = {
            id: wsEvent.message?.id || Date.now(),
            content: wsEvent.message?.content || '',
            message_type: normalizedMsgType,
            created_at: wsEvent.message?.created_at || new Date().toISOString(),
            sender: normalizedSender,
            attachments: wsEvent.message?.attachments || [],
            source_id: wsEvent.message?.source_id || null,
            content_type: wsEvent.message?.content_type || 'text',
            private: wsEvent.message?.private || false,
            status: wsEvent.message?.status || 'sent'
          };
          
          _setActiveConversation((prev: any) => {
            if (!prev || Number(prev.id) !== Number(conversationId)) return prev;
            
            const existingMessages = prev.messages || [];
            
            // Verificar duplicados
            const messageExists = existingMessages.some((m: any) => {
              if (m.id === newMessage.id) return true;
              if (newMessage.message_type === 1 || newMessage.sender === 'agent') {
                const isOptimistic = m._isOptimistic || String(m.id).startsWith('temp-') || String(m.id).startsWith('pending-');
                if (isOptimistic && m.content === newMessage.content) return true;
              }
              return false;
            });
            
            if (messageExists) {
              // Reemplazar mensaje optimista con el real
              const updatedMessages = existingMessages.map((m: any) => {
                if ((m._isOptimistic || String(m.id).startsWith('temp-')) && 
                    m.content === newMessage.content && 
                    (newMessage.message_type === 1 || newMessage.sender === 'agent')) {
                  return { ...newMessage, _isOptimistic: false };
                }
                return m;
              });
              if (updateMessagesCacheRef.current) updateMessagesCacheRef.current(prev.id, updatedMessages);
              return { ...prev, messages: updatedMessages };
            }
            
            const newMessages = [...existingMessages, newMessage];
            if (updateMessagesCacheRef.current) updateMessagesCacheRef.current(prev.id, newMessages);
            return { ...prev, messages: newMessages };
          });
        } else if (addMessageToCacheRef.current && conversationId) {
          // Agregar al caché para conversación inactiva
          const rawMsgType = wsEvent.message?.message_type;
          const normalizedMsgType = (rawMsgType === 'outgoing' || rawMsgType === 1) ? 1 : 0;
          const newMessage = {
            id: wsEvent.message?.id || Date.now(),
            content: wsEvent.message?.content || '',
            message_type: normalizedMsgType,
            created_at: wsEvent.message?.created_at || new Date().toISOString(),
            sender: normalizedMsgType === 1 ? 'agent' : 'contact',
            attachments: wsEvent.message?.attachments || [],
          };
          addMessageToCacheRef.current(conversationId, newMessage);
        }
      }
    });
    
    return () => {
      hasSubscribedRef.current = false;
      unsubscribe();
    };
  }, [globalNotifications, realtimeEnabled, userInboxId]);

  //  HOOK DE NOTIFICACIONES
  // ELIMINADO: Declaración duplicada de notifications
  
  // 📊 NUEVO: Referencias para virtualización
  const conversationsListRef = useRef<HTMLDivElement>(null);
  
  //  Mensajes filtrados (sin privados, ordenados por fecha)
  // ⚡ MEJORADO: Filtrar mensajes optimistas cuando ya existe mensaje real con mismo contenido
  const filteredMessages = useMemo(() => {
    if (!activeConversation) return [];
    
    const allMessages = activeConversation.messages || [];
    
    // 🔒 PRIMERO: Deduplicar por ID de mensaje (mismo ID = mismo mensaje)
    const seenIds = new Set<string | number>();
    const uniqueMessages = allMessages.filter((m: any) => {
      const id = m.id;
      if (seenIds.has(id)) {
        return false; // Ya vimos este ID, es duplicado
      }
      seenIds.add(id);
      return true;
    });
    
    // Obtener contenidos de mensajes reales (no optimistas)
    // Un mensaje es "real" si tiene ID numérico y NO tiene flags optimistas
    const realMessageContents = new Set(
      uniqueMessages
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
    const deduplicatedMessages = uniqueMessages.filter((m: any) => {
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
          debugLog.log('🔄 Filtrando mensaje optimista duplicado:', m.content?.substring(0, 30));
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

  // Función para abrir el panel derecho (sin toggle)
  const openRightPanel = () => {
    setIsRightPanelVisible(true);
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
        debugLog.log(' Buscando en backend:', searchTerm);
        
        const response = await axios.get('/api/chatwoot/conversations/search', {
          params: { q: searchTerm }
        });

        debugLog.log('??? Resultados de búsqueda:', response.data);
        
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
            debugLog.log(' Avatar para', conv.contact?.name, ':', avatarUrl);
            
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
          debugLog.log(` Encontradas ${mappedResults.length} conversaciones con avatarUrl mapeado`);
        } else {
          setSearchResults([]);
          debugLog.warn('?? B??squeda sin resultados');
        }
      } catch (error: any) {
        debugLog.error('??? Error en búsqueda:', error.response?.data || error.message);
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
      
      // Aplicar filtro de pestaña sobre los resultados de búsqueda
      const result = searchResults.filter((conversation: any) => {
        if (selectedFilter === 'all') return true;
        if (selectedFilter === 'mine') return currentAgentId ? conversation.assignee_id === currentAgentId : conversation.assignee_id;
        if (selectedFilter === 'unassigned') return !conversation.assignee_id;
        return true;
      });
      
      debugLog.log(' Resultados después de filtro de pestaña:', result.length);
      return result;
    }
    
    if (!searchTerm) {
      // Sin busqueda, aplicar solo filtro de pestana
      const result = (conversations || []).filter(conversation => {
        if (selectedFilter === 'all') return true;
        if (selectedFilter === 'mine') return currentAgentId ? conversation.assignee_id === currentAgentId : conversation.assignee_id;
        if (selectedFilter === 'unassigned') return !conversation.assignee_id;
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
        debugLog.log('??? Match encontrado:', {
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
      if (selectedFilter === 'mine') return matchesSearch && (currentAgentId ? conversation.assignee_id === currentAgentId : conversation.assignee_id);
      if (selectedFilter === 'unassigned') return matchesSearch && !conversation.assignee_id;
      return matchesSearch;
    });
    
    debugLog.log(' Con búsqueda, resultados:', result.length);

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
        result = result.filter(conv => {
          // ✅ SOLO usar el Map global
          const globalBadge = conversationBadges?.get(conv.id) ?? 0;
          return globalBadge > 0;
        });
      }

      if (appliedFilters.assignedTo) {
        if (appliedFilters.assignedTo === 'me') {
          result = result.filter(conv => currentAgentId ? conv.assignee_id === currentAgentId : conv.assignee_id);
        } else if (appliedFilters.assignedTo === 'unassigned') {
          result = result.filter(conv => !conv.assignee_id);
        } else if (appliedFilters.assignedTo === 'others') {
          result = result.filter(conv => conv.assignee_id && (currentAgentId ? conv.assignee_id !== currentAgentId : true));
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
  }, [conversations, searchTerm, selectedFilter, searchResults?.length ?? 0, appliedFilters, currentAgentId]);

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
      debugLog.log(`💾 Guardando ${activeConversation.messages.length} mensajes de conversación ${activeConversation.id} en caché antes de cambiar`);
      updateMessagesCache(activeConversation.id, activeConversation.messages);
    }
    
    // 🚀 Mostrar conversación inmediatamente
    _setActiveConversation({
      ...conversation,
      messages: [],
      unread_count: 0,
      _isLoading: true
    });
    
    // ✅ Limpiar badge en el SISTEMA UNIFICADO
    if (clearBadge) {
      clearBadge(conversation.id);
    }
    
    // Actualizar lista de conversaciones
    setConversations((prev: Conversation[]) => 
      prev.map((conv: Conversation) => 
        conv.id === conversation.id ? { ...conv, unread_count: 0 } : conv
      )
    );
    
    // Limpiar notificaciones de esta conversación
    window.dispatchEvent(new CustomEvent('clearNotifications', {
      detail: { conversationId: conversation.id }
    }));
    
    // Cargar mensajes en background
    loadConversationMessages(conversation.id);
    
    // Marcar como leída en backend
    if (markConversationAsRead) {
      markConversationAsRead(conversation.id).then(() => {
        debugLog.log('✅ Conversación marcada como leída');
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
        debugLog.log(' Agregando mensaje optimista:', tempId, 'Total mensajes:', (newMessages || []).length);
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
          debugLog.log('✅ Mensaje enviado, actualizando status a sent:', result);
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
          
          // ✅ El mensaje real llegará por WebSocket (broadcast desde el backend)
          // Ya no es necesario hacer reload manual
        })
        .catch((error) => {
          debugLog.error('❌ Error sending message:', error);
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
      
      // 🔄 El reload después de 1.5s sincronizará con el mensaje real de Chatwoot
      
    } catch (error) {
      debugLog.error('Error preparing message:', error);
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
    
    debugLog.log(` B??squeda: "${query}" - ${(results || []).length} resultados encontrados`, results);
  };

  // 8 MUTE - Silenciar conversación (persiste en localStorage)
  const handleMuteConversation = (conversationId?: number) => {
    const id = conversationId || activeConversation?.id;
    if (!id) return;
    
    setMutedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        console.log(`🔔 Notificaciones activadas para conversación ${id}`);
      } else {
        newSet.add(id);
        console.log(`🔕 Notificaciones silenciadas para conversación ${id}`);
      }
      // Persistir en localStorage
      localStorage.setItem('mutedConversations', JSON.stringify([...newSet]));
      // Exponer globalmente para el sistema de notificaciones
      (window as any).__mutedConversations = newSet;
      return newSet;
    });
  };

  // 🏷️ HANDLERS PARA GESTIÓN DE CONVERSACIONES
  
  // Asignar conversación a un agente
  const handleAssignConversation = async (agentId: number | null) => {
    if (!activeConversation) return;
    try {
      await assignConversation(activeConversation.id, agentId);
      // Actualizar la conversación localmente
      setConversations((prev: Conversation[]) => 
        prev.map((conv: Conversation) => 
          conv.id === activeConversation.id 
            ? { ...conv, assignee_id: agentId } 
            : conv
        )
      );
      debugLog.log(`✅ Conversación ${activeConversation.id} asignada a agente ${agentId}`);
    } catch (error) {
      console.error('Error asignando conversación:', error);
    }
  };

  // Cambiar estado de la conversación
  const handleChangeStatus = async (status: string, snoozedUntil?: number) => {
    if (!activeConversation) return;
    try {
      await changeConversationStatus(activeConversation.id, status, snoozedUntil);
      // Actualizar la conversación localmente
      setConversations((prev: Conversation[]) => 
        prev.map((conv: Conversation) => 
          conv.id === activeConversation.id 
            ? { ...conv, status: status as 'open' | 'resolved' | 'pending' } 
            : conv
        )
      );
      debugLog.log(`✅ Estado de conversación ${activeConversation.id} cambiado a ${status}`);
    } catch (error) {
      console.error('Error cambiando estado:', error);
    }
  };

  // Actualizar etiquetas de la conversación
  const handleUpdateLabels = async (labels: string[]) => {
    if (!activeConversation) return;
    try {
      await updateConversationLabels(activeConversation.id, labels);
      // Actualizar la conversación activa
      _setActiveConversation((prev: Conversation | null) => 
        prev ? { ...prev, labels } : null
      );
      // Actualizar la lista de conversaciones
      setConversations((prev: Conversation[]) => 
        prev.map((conv: Conversation) => 
          conv.id === activeConversation.id 
            ? { ...conv, labels } 
            : conv
        )
      );
      debugLog.log(`✅ Etiquetas actualizadas para conversación ${activeConversation.id}:`, labels);
    } catch (error) {
      console.error('Error actualizando etiquetas:', error);
    }
  };
  
  // Exponer mutedConversations globalmente al montar
  React.useEffect(() => {
    (window as any).__mutedConversations = mutedConversations;
  }, [mutedConversations]);

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
  const dragCounter = useRef<number>(0); // Contador para manejar elementos hijos
  
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    // Solo ocultar cuando salimos completamente del contenedor
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0; // Resetear contador
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
    
    // Validar tamaño máximo (16MB para WhatsApp)
    const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB
    if (file.size > MAX_FILE_SIZE) {
      alert(`El archivo es demasiado grande. Máximo 16MB.\nTamaño actual: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }
    
    setIsUploadingFile(true);
    setUploadProgress(file.name);
    
    // 🚀 Crear mensaje optimista para mostrar inmediatamente en el chat
    const tempId = `temp-file-${Date.now()}-${Math.random()}`;
    const nowTimestamp = Math.floor(Date.now() / 1000);
    const optimisticMessage = {
      id: tempId,
      content: `📎 ${file.name}`,
      created_at: new Date().toISOString(),
      timestamp: nowTimestamp,
      message_type: 'outgoing',
      sender: 'agent',
      conversation_id: activeConversation.id,
      status: 'sending',
      _isOptimistic: true,
      attachments: [{
        file_type: file.type,
        file_name: file.name,
        data_url: URL.createObjectURL(file) // Para preview local
      }]
    };
    
    // Agregar mensaje optimista al chat inmediatamente
    if (activeConversation.messages) {
      const newMessages = [...activeConversation.messages, optimisticMessage];
      _setActiveConversation({
        ...activeConversation,
        messages: newMessages
      });
      
      // 🆕 NUEVO: También actualizar sidebar inmediatamente (UI optimista)
      setConversations((prevConversations: any[]) => {
        return prevConversations.map((conv: any) => {
          if (conv.id === activeConversation.id) {
            return {
              ...conv,
              last_message: {
                content: `📎 ${file.name}`,
                created_at: new Date().toISOString(),
                timestamp: nowTimestamp,
                message_type: 1,
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
    }
    
    try {
      debugLog.log('📤 Enviando archivo como base64:', file.name, 'tipo:', file.type, 'tamaño:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
      
      // Convertir archivo a base64 para evitar límites de upload PHP
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remover el prefijo "data:mime/type;base64,"
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // Obtener CSRF token
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      
      // Enviar como JSON con base64 (evita límites de upload PHP)
      const response = await fetch(`/api/chatwoot-proxy/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_base64: base64,
          file_name: file.name,
          file_type: file.type,
          conversation_id: activeConversation.id
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        debugLog.log('✅ Archivo enviado:', file.name);
        
        // Actualizar mensaje optimista a "sent"
        _setActiveConversation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages?.map(msg => 
              msg.id === tempId 
                ? { ...msg, status: 'sent', id: data.payload?.id || tempId }
                : msg
            ) || []
          };
        });
        
        // También actualizar sidebar
        setConversations((prevConversations: any[]) => {
          return prevConversations.map((conv: any) => {
            if (conv.id === activeConversation.id) {
              return {
                ...conv,
                last_message: {
                  content: `📎 ${file.name}`,
                  created_at: new Date().toISOString(),
                  timestamp: nowTimestamp,
                  message_type: 1,
                  sender: { name: 'Yo' }
                },
                updated_at: new Date().toISOString(),
                last_activity_at: nowTimestamp
              };
            }
            return conv;
          });
        });
      } else {
        debugLog.error('❌ Error del servidor:', data);
        // Remover mensaje optimista si falló
        _setActiveConversation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages?.filter(msg => msg.id !== tempId) || []
          };
        });
        alert(`Error al enviar archivo: ${data.message || data.error || 'Error desconocido'}`);
      }
    } catch (error) {
      debugLog.error('💥 Error enviando archivo:', error);
      // Remover mensaje optimista si hubo error
      _setActiveConversation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages?.filter(msg => msg.id !== tempId) || []
        };
      });
      alert('Error de conexión al enviar archivo');
    } finally {
      setIsUploadingFile(false);
      setUploadProgress('');
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
      
      // Contador de duración
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      debugLog.error('🎤 Error al iniciar grabación:', error);
      alert('No se pudo acceder al micrófono');
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
    
    setIsSendingAudio(true);
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio-message.webm');
    formData.append('conversation_id', activeConversation.id.toString());
    formData.append('message_type', 'outgoing');
    formData.append('content', '🎤 Mensaje de voz');
    
    try {
      debugLog.log('🎤 Enviando audio, tamaño:', audioBlob.size, 'tipo:', audioBlob.type);
      
      // Obtener CSRF token
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      
      const response = await fetch(`/api/chatwoot-proxy/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json'
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        debugLog.log('✅ Audio enviado');
        // Refrescar la conversación para ver el mensaje
        if (typeof fetchConversations === 'function') {
          await fetchConversations();
        }
      } else {
        debugLog.error('❌ Error del servidor:', data);
        alert(`Error al enviar audio: ${data.message || 'Error desconocido'}`);
      }
    } catch (error) {
      debugLog.error('💥 Error enviando audio:', error);
      alert('Error de conexión al enviar audio');
    } finally {
      setIsSendingAudio(false);
    }
  };

  // 3 MULTIMEDIA GALLERY - Extraer multimedia de la conversación
  const getMediaFromConversation = () => {
    if (!activeConversation?.messages) return { images: [], files: [], links: [] };
    
    const images: any[] = [];
    const files: any[] = [];
    const links: any[] = [];
    
    // Helper para detectar si es imagen
    const isImage = (att: any): boolean => {
      // Verificar por file_type o content_type
      const mimeType = att.file_type || att.content_type || '';
      if (mimeType.startsWith('image/')) return true;
      
      // Verificar por extensión en la URL
      const url = att.data_url || att.file_url || att.url || att.thumb_url || '';
      const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i;
      if (imageExtensions.test(url)) return true;
      
      // Verificar por nombre de archivo
      const fileName = att.file_name || att.name || '';
      if (imageExtensions.test(fileName)) return true;
      
      return false;
    };
    
    // Helper para detectar tipo de archivo (video, audio, pdf, etc.)
    const getFileCategory = (att: any, fileName: string): string => {
      const mimeType = (att.file_type || att.content_type || '').toLowerCase();
      const nameLower = fileName.toLowerCase();
      
      // Video
      if (mimeType.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(nameLower)) {
        return 'video';
      }
      
      // Audio
      if (mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|oga|m4a|aac|flac|wma)$/i.test(nameLower)) {
        return 'audio';
      }
      
      // PDF
      if (mimeType === 'application/pdf' || /\.pdf$/i.test(nameLower)) {
        return 'pdf';
      }
      
      // Documentos de Word
      if (mimeType.includes('word') || /\.(doc|docx)$/i.test(nameLower)) {
        return 'word';
      }
      
      // Hojas de cálculo
      if (mimeType.includes('sheet') || mimeType.includes('excel') || /\.(xls|xlsx|csv)$/i.test(nameLower)) {
        return 'spreadsheet';
      }
      
      return 'file';
    };
    
    // Helper para obtener nombre de archivo
    const getFileName = (att: any): string => {
      // Prioridad: file_name > name > extraer de URL
      if (att.file_name) return att.file_name;
      if (att.name) return att.name;
      
      // Intentar extraer de la URL
      const url = att.data_url || att.file_url || att.url || '';
      if (url) {
        try {
          const urlPath = new URL(url).pathname;
          const fileName = urlPath.split('/').pop();
          if (fileName && fileName.includes('.')) return decodeURIComponent(fileName);
        } catch {
          // Si falla el parsing de URL, intentar extraer directamente
          const match = url.match(/\/([^\/\?]+\.[^\/\?]+)(\?|$)/);
          if (match) return decodeURIComponent(match[1]);
        }
      }
      
      return 'Archivo';
    };
    
    activeConversation.messages.forEach((msg: any) => {
      // Buscar archivos en attachments
      if (msg.attachments && Array.isArray(msg.attachments)) {
        msg.attachments.forEach((att: any) => {
          const fileName = getFileName(att);
          const fileCategory = getFileCategory(att, fileName);
          const enrichedAtt = { 
            ...att, 
            message_id: msg.id,
            file_name: fileName, // Asegurar que siempre tenga nombre
            file_category: fileCategory // Tipo de archivo para el icono
          };
          
          if (isImage(att)) {
            images.push(enrichedAtt);
          } else {
            files.push(enrichedAtt);
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
    
    debugLog.log('📎 Media encontrada:', { images: images.length, files: files.length, links: links.length });
    
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

  // ✅ ARREGLADO: Auto-scroll inteligente - solo si el usuario está cerca del fondo
  useEffect(() => {
    if (activeConversation?.messages && (activeConversation?.messages || []).length > 0) {
      const currentMessageCount = (activeConversation?.messages || []).length;
      const container = messagesContainerRef.current;
      
      // Detectar si hay nuevos mensajes (no es el primer load)
      if (previousMessageCount > 0 && currentMessageCount > previousMessageCount) {
        // ✅ VERIFICAR: Solo mostrar separador si el último mensaje NO es tuyo
        const lastMessage = activeConversation.messages[activeConversation.messages.length - 1];
        const esIncoming = lastMessage?.message_type === 0 || lastMessage?.message_type === 'incoming';
        const esOutgoing = lastMessage?.message_type === 1 || lastMessage?.message_type === 'outgoing';
        
        debugLog.log('📨 Nuevos mensajes detectados:', currentMessageCount - previousMessageCount);
        
        // Solo mostrar separador si es mensaje INCOMING (de otro usuario)
        if (esIncoming) {
          setNewMessageSeparatorIndex(previousMessageCount);
          setTimeout(() => {
            setNewMessageSeparatorIndex(null);
          }, 3000);
        }
        
        // ✅ NUEVO: Solo hacer scroll si el usuario está cerca del fondo O si es su propio mensaje
        if (container) {
          const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
          const isNearBottom = distanceFromBottom < 150; // Menos de 150px del fondo
          
          // Hacer scroll si: está cerca del fondo O si es su propio mensaje
          if (isNearBottom || esOutgoing) {
            requestAnimationFrame(() => {
              if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
              }
            });
          } else {
            debugLog.log('🛑 Usuario leyendo mensajes anteriores - NO hacer scroll automático');
          }
        }
      } else if (previousMessageCount === 0) {
        // Primer load - scroll instantáneo
        setTimeout(() => scrollToBottom('auto'), 100);
      }
      
      // Actualizar contador
      setPreviousMessageCount(currentMessageCount);
    }
  }, [activeConversation?.id, activeConversation?.messages?.length ?? 0, scrollToBottom]);
  
  // ✅ ARREGLADO: Solo hacer scroll al fondo en primera carga de conversación
  // (Eliminado MutationObserver agresivo que causaba scroll no deseado)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !activeConversation) return;

    // Solo scroll al fondo cuando se cambia de conversación (primera carga)
    // NO usar MutationObserver que causa scroll agresivo al cargar imágenes/videos
    
    // Scroll inicial solo una vez
    const scrollToBottomOnce = () => {
      if ((searchResults || []).length > 0) {
        return; // No hacer scroll si hay búsqueda activa
      }
      
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      });
    };

    // Solo hacer scroll inicial al cambiar de conversación
    scrollToBottomOnce();
    
  }, [activeConversation?.id]); // Solo cuando cambia la conversación, NO en cada mensaje

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
            debugLog.log(' Scroll al mensaje que coincide:', firstMatchIndex);
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
      debugLog.log(` Total de coincidencias de "${searchTerm}":`, count);
    } else {
      setTotalMatches(0);
      setCurrentMatchIndex(0);
    }
  }, [activeConversation?.id, activeConversation?.messages?.length ?? 0, searchTerm, searchResults?.length ?? 0]);


  
  // ?? Ejecutar scroll cuando se active el trigger
  useEffect(() => {
    if (shouldScrollToBottom) {
      debugLog.log(' Haciendo scroll autom?tico...');
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
      
      debugLog.log(' DEBUG - Abriendo modal de edici??n:', {
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
      
      debugLog.log(' Valores a setear:', {
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
      debugLog.error('?? No hay conversación activa');
    }
  };

  const handleSaveContact = async () => {
    debugLog.log(' handleSaveContact llamado', {
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
      debugLog.error('No se pudo obtener el ID del contacto', {
        'contact': activeConversation?.contact,
        'meta': activeConversation?.meta,
        'contact_inbox': activeConversation?.contact_inbox
      });
      setToastMessage('Error: No hay contacto activo');
      setShowToast(true);
      return;
    }

    try {
      debugLog.log('Guardando contacto:', {
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
          name: editName || editPhone, // Si no hay nombre, usar el telefono
          email: editEmail,
          phone_number: editPhone
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.message || 'Error actualizando contacto');
      }

      const result = await updateResponse.json();
      debugLog.log('Contacto actualizado exitosamente:', result);

      // Actualizar el estado local de la conversación activa Y la lista de conversaciones inmediatamente
      const newName = editName || editPhone;
      
      if (activeConversation) {
        const updatedConversation = {
          ...activeConversation,
          contact: {
            ...activeConversation.contact,
            name: newName,
            email: editEmail,
            phone_number: editPhone
          }
        };
        _setActiveConversation(updatedConversation);
        
        // Actualizar también en la lista de conversaciones inmediatamente
        setConversations(prev => prev.map(conv => 
          conv.id === activeConversation.id 
            ? { ...conv, contact: { ...conv.contact, name: newName, email: editEmail, phone_number: editPhone } }
            : conv
        ));
      }

      // Recargar conversaciones en background para sincronizar con servidor
      fetchUpdatedConversations();
      
      // Mostrar toast de exito
      setToastMessage('Contacto actualizado exitosamente');
      setShowToast(true);
      
      // Cerrar modal
      setIsEditModalOpen(false);
    } catch (error) {
      debugLog.error('Error guardando contacto:', error);
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
      debugLog.log('📊 Iniciando descarga de conversación:', activeConversation.id);
      
      // Crear workbook
      const wb = XLSX.utils.book_new();
      
      // ===== HOJA 1: INFORMACION GENERAL =====
      const contacto = activeConversation.meta?.sender || activeConversation.contact || {};
      const telefono = contacto.phone_number || contacto.identifier || 'N/A';
      const email = contacto.email || 'N/A';
      
      const infoData = [
        ['INFORMACION DE LA CONVERSACION'],
        [''],
        ['ID Conversacion:', activeConversation.id],
        ['Contacto:', activeConversation.contact?.name || 'Sin nombre'],
        ['Email:', email],
        ['Telefono:', telefono],
        ['Estado:', activeConversation.status === 'open' ? 'Abierta' : activeConversation.status === 'resolved' ? 'Resuelta' : activeConversation.status],
        ['Prioridad:', activeConversation.priority || 'Normal'],
        ['Agente asignado:', activeConversation.assignee?.name || 'No asignado'],
        ['Mensajes no leidos:', activeConversation.unread_count || 0],
        ['Total de mensajes:', activeConversation.messages?.length || 0],
        ['Fecha de exportacion:', new Date().toLocaleString('es-ES')],
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
      
      debugLog.log('✅ Excel descargado exitosamente:', filename);
      setIsSettingsOpen(false);
      
    } catch (error) {
      debugLog.error('❌ Error al descargar chat:', error);
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
      
      debugLog.log('📤 Solicitando exportación de conversaciones con mensajes...');

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
      debugLog.log(`✅ Recibidas ${(conversationsWithMessages || []).length} conversaciones con mensajes`);

      // Fase 2: Processing (30-60%)
      setDownloadPhase('processing');
      setDownloadProgress(35);
      setDownloadStatus('Organizando informacion de contactos...');
      
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
      
      debugLog.log('✅ Excel generado exitosamente:', filename);
      
      // Cerrar modal después de 3 segundos
      setTimeout(() => {
        setIsDownloadModalOpen(false);
      }, 3000);

    } catch (error) {
      debugLog.error('?? Error descargando conversaciones:', error);
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
    
    // Cargar más cuando llega al 80% del scroll
    if (scrollPercentage > 0.8) {
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
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Error de Conexión</h3>
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
                <span>🔍 No se encontraron resultados para "{searchTerm}"</span>
              ) : (
                <span>🔍 {searchResults.length} conversación{searchResults.length !== 1 ? 'es' : ''} encontrada{searchResults.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}
          
          {/* Filtros de conversaciones */}
          <div className="flex space-x-2 flex-wrap gap-y-1">
            {[
              { 
                id: 'all', 
                label: 'Todas', 
                count: (conversations || []).length,
                icon: '📋'
              },
              { 
                id: 'mine', 
                label: 'Mías', 
                count: (conversations || []).filter(c => 
                  currentAgentId ? c.assignee_id === currentAgentId : c.assignee_id
                ).length,
                icon: '👤'
              },
              { 
                id: 'unassigned', 
                label: 'Sin asignar', 
                count: (conversations || []).filter(c => !c.assignee_id).length,
                icon: '📭'
              }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 flex items-center space-x-1 ${
                  selectedFilter === filter.id
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white/30 text-gray-700 hover:bg-white/50 border border-gray-200/50'
                }`}
              >
                <span>{filter.icon}</span>
                <span>{filter.label}</span>
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  selectedFilter === filter.id 
                    ? 'bg-white/30 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {filter.count}
                </span>
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
                    key={`${conversation.id}-${(conversation.labels || []).join(',')}`}
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
                            src={getAvatarProxyUrl(conversation.contact.avatarUrl, conversation.contact.name) || ''} 
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
                        
                        <p className="text-sm text-gray-600 truncate mb-2">{formatLastMessagePreview(conversation.last_message.content, conversation.last_message.attachments)}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(conversation.priority)}`}>
                              {conversation.priority}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(conversation.status)}`}>
                              {conversation.status}
                            </span>
                          </div>
                          
                          {(() => {
                            // ✅ SOLO usar el Map global - sin fallback al servidor
                            const badgeCount = conversationBadges?.get(conversation.id) ?? 0;
                            return badgeCount > 0 ? (
                              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                {badgeCount}
                              </span>
                            ) : null;
                          })()}
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
          
          {/* Indicador de carga al hacer scroll - Solo mostrar cuando realmente está cargando más páginas */}
          {conversationsLoading && hasMorePages && (conversations || []).length > 0 && (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
              <span className="text-sm text-gray-600">Cargando más...</span>
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
      <div 
        className="flex-1 flex flex-col bg-white/10 backdrop-blur-xl relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* DRAG & DROP OVERLAY - Nivel superior */}
        {isDragging && activeConversation && (
          <div className="absolute inset-0 z-50 bg-blue-600/40 backdrop-blur-sm border-4 border-dashed border-blue-400 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-white/95 p-8 rounded-2xl shadow-2xl transform scale-110">
              <Upload className="w-20 h-20 text-blue-600 mx-auto mb-4 animate-bounce" />
              <p className="text-2xl font-bold text-blue-800">Suelta los archivos aquí</p>
              <p className="text-sm text-blue-600 mt-2">Imágenes, videos, documentos (máx 16MB)</p>
            </div>
          </div>
        )}
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
                        src={getAvatarProxyUrl(activeConversation.contact.avatarUrl, activeConversation.contact.name) || ''} 
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
                          className="outline-none text-sm text-gray-900 bg-transparent w-32 md:w-48 animate-fadeIn placeholder:text-gray-500"
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
                    onClick={() => handleMuteConversation(activeConversation.id)}
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

              {/* 🏷️ BARRA DE HERRAMIENTAS DE CONVERSACIÓN */}
              <div className="flex items-center gap-2 mt-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {/* Estado de la conversación */}
                <ConversationActionsDropdown
                  conversationId={activeConversation.id}
                  currentStatus={activeConversation.status || 'open'}
                  onChangeStatus={handleChangeStatus}
                />

                {/* Asignar agente */}
                <AssignAgentDropdown
                  conversationId={activeConversation.id}
                  currentAssignee={activeConversation.assignee}
                  onAssign={handleAssignConversation}
                />

                {/* Gestionar etiquetas */}
                <LabelsManager
                  conversationId={activeConversation.id}
                  currentLabels={activeConversation.labels || []}
                  onUpdateLabels={handleUpdateLabels}
                />

                {/* Etiquetas actuales (badges) */}
                {activeConversation.labels && activeConversation.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-2">
                    {activeConversation.labels.slice(0, 3).map((label: string) => (
                      <span 
                        key={label}
                        className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full"
                      >
                        {label}
                      </span>
                    ))}
                    {activeConversation.labels.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{activeConversation.labels.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="h-[2px] bg-gray-200/30 relative group">
              <div className="absolute inset-x-0 -top-1 -bottom-1" />
            </div>

            {/* Mensajes */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 relative"
            >
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

              {/* � Trigger invisible para infinite scroll (carga más mensajes al llegar al tope) */}
              <div 
                ref={loadMoreTriggerRef} 
                className="h-4 w-full"
                aria-hidden="true"
              />
              
              {/* Indicador de carga de mensajes anteriores */}
              {activeConversation?._isLoading && (
                <div className="flex justify-center py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    <span>Cargando mensajes anteriores...</span>
                  </div>
                </div>
              )}
              
              {/* Indicador de que hay más mensajes por cargar */}
              {activeConversation?._hasMoreMessages && !activeConversation?._isLoading && filteredMessages.length > 0 && (
                <div className="flex justify-center py-2">
                  <div className="text-xs text-gray-400 italic">
                    ↑ Scroll arriba para cargar más
                  </div>
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
                        
                        {/* Contenido del mensaje */}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {searchTerm && searchResults ? highlightSearchTerm(message.content, searchTerm, index) : message.content}
                        </p>
                        
                        {/* 🔗 Link Previews estilo WhatsApp */}
                        {(() => {
                          const urls = extractUrls(message.content);
                          if (urls.length === 0) return null;
                          
                          // Fetch preview para URLs que no tenemos
                          urls.forEach(url => {
                            if (!linkPreviews[url]) {
                              fetchLinkPreview(url);
                            }
                          });
                          
                          return urls.map((url, urlIdx) => {
                            const preview = linkPreviews[url];
                            if (!preview || preview.loading) {
                              return (
                                <div key={urlIdx} className="mt-2 p-3 rounded-lg bg-gray-100 animate-pulse max-w-[300px]">
                                  <div className="h-24 bg-gray-200 rounded mb-2"></div>
                                  <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
                                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                                </div>
                              );
                            }
                            return <LinkPreviewCard key={urlIdx} url={url} preview={preview} />;
                          });
                        })()}

                        {/* Renderizar archivos adjuntos (imágenes, audios, documentos) */}
                        {/* ✅ Filtrar attachments vacíos o inválidos */}
                        {message.attachments && message.attachments.filter((att: any) => {
                          // Solo mostrar attachments que tengan URL válida
                          const url = att.file_url || att.data_url || att.url || '';
                          return url && url.length > 0;
                        }).length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.filter((att: any) => {
                              const url = att.file_url || att.data_url || att.url || '';
                              return url && url.length > 0;
                            }).map((att: any, idx: number) => {
                              // ✅ Chatwoot usa file_url, también soportar data_url como fallback
                              const rawUrl = att.file_url || att.data_url || att.url || '';
                              const fileType = att.file_type || att.content_type || '';
                              
                              // ✅ Usar proxy para URLs de Chatwoot (evitar CORS)
                              const attachmentUrl = rawUrl && rawUrl.includes('chatwoot') 
                                ? `/img-proxy?url=${encodeURIComponent(rawUrl)}`
                                : rawUrl;
                              
                              return (
                              <div key={idx}>
                                {fileType.includes('image') ? (
                                  <div 
                                    className="relative cursor-pointer"
                                    onClick={() => openMediaViewer(attachmentUrl, 'image')}
                                  >
                                    <img 
                                      src={attachmentUrl} 
                                      alt="Imagen adjunta" 
                                      className="max-w-full max-h-64 rounded-lg shadow-md hover:shadow-lg hover:brightness-95 transition-all"
                                      onError={(e) => {
                                        // Mostrar placeholder en lugar de ocultar
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const placeholder = target.nextElementSibling as HTMLElement;
                                        if (placeholder) placeholder.style.display = 'flex';
                                      }}
                                      title="Click para ver en grande"
                                    />
                                    {/* Placeholder para imagen no disponible */}
                                    <div 
                                      className="hidden items-center justify-center bg-gray-200 rounded-lg p-4 min-w-[150px] min-h-[100px]"
                                      style={{ display: 'none' }}
                                    >
                                      <div className="text-center text-gray-500">
                                        <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-xs">Imagen no disponible</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : fileType.includes('video') || /\.(mp4|mov|avi|webm|mkv)$/i.test(rawUrl) ? (
                                  /* 🎬 VIDEO: Thumbnail real generado por el servidor */
                                  <div 
                                    className="relative rounded-xl overflow-hidden shadow-lg max-w-[280px] h-40 cursor-pointer group"
                                    onClick={() => openMediaViewer(attachmentUrl, 'video')}
                                  >
                                    {/* Imagen del thumbnail generada por ffmpeg en el servidor */}
                                    <img 
                                      src={`/video-thumbnail.php?url=${encodeURIComponent(rawUrl)}`}
                                      alt="Video thumbnail"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // Si falla, mostrar gradient de fallback
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const fallback = target.nextElementSibling as HTMLElement;
                                        if (fallback) fallback.style.display = 'block';
                                      }}
                                    />
                                    {/* Fallback gradient si no carga el thumbnail */}
                                    <div 
                                      className="absolute inset-0 hidden"
                                      style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                      }}
                                    ></div>
                                    
                                    {/* Overlay oscuro para contraste */}
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"></div>
                                    
                                    {/* Botón de play central */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform backdrop-blur-sm">
                                        <Play className="w-8 h-8 text-gray-800 ml-1" fill="currentColor" />
                                      </div>
                                    </div>
                                    
                                    {/* Indicador de video (esquina inferior derecha) */}
                                    <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs font-medium flex items-center gap-1.5">
                                      <Film className="w-3.5 h-3.5" />
                                      <span>Video</span>
                                    </div>
                                  </div>
                                ) : fileType.includes('audio') || /\.(mp3|wav|ogg|oga|m4a|aac|webm)$/i.test(rawUrl) ? (
                                  /* 🎵 AUDIO: Reproductor estilo WhatsApp */
                                  <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 p-3 rounded-xl max-w-[280px] border border-emerald-200/50">
                                    {/* Icono de audio/micrófono */}
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                                      <Mic className="w-5 h-5 text-white" />
                                    </div>
                                    {/* Reproductor de audio nativo mejorado */}
                                    <audio 
                                      controls 
                                      className="flex-1 h-8"
                                      style={{ 
                                        minWidth: '150px',
                                        maxWidth: '200px'
                                      }}
                                    >
                                      <source 
                                        src={attachmentUrl} 
                                        type={
                                          rawUrl.endsWith('.oga') ? 'audio/ogg' :
                                          rawUrl.endsWith('.ogg') ? 'audio/ogg' :
                                          rawUrl.endsWith('.mp3') ? 'audio/mpeg' :
                                          rawUrl.endsWith('.wav') ? 'audio/wav' :
                                          rawUrl.endsWith('.m4a') ? 'audio/mp4' :
                                          rawUrl.endsWith('.aac') ? 'audio/aac' :
                                          rawUrl.endsWith('.webm') ? 'audio/webm' :
                                          fileType.includes('/') ? fileType : 'audio/mpeg'
                                        } 
                                      />
                                      Tu navegador no soporta el elemento de audio.
                                    </audio>
                                  </div>
                                ) : attachmentUrl ? (
                                  <a 
                                    href={attachmentUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-2 p-2 bg-white/50 rounded-lg hover:bg-white/70 transition-colors"
                                  >
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-xs font-medium text-gray-700">{att.file_name || att.name || 'Archivo adjunto'}</span>
                                  </a>
                                ) : null}
                              </div>
                              );
                            })}
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
                    <span className="text-xs text-gray-500">{activeConversation.contact.name} está escribiendo...</span>
                  </div>
                </div>
              )}

              {/* 📤 INDICADOR DE SUBIDA DE ARCHIVO */}
              {isUploadingFile && (
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <Paperclip className="w-4 h-4 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-blue-700">Enviando archivo...</span>
                      <p className="text-xs text-blue-500 truncate">{uploadProgress}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 🎤 INDICADOR DE ENVÍO DE AUDIO */}
              {isSendingAudio && (
                <div className="px-4 py-3 bg-green-50 border-b border-green-100">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      <Mic className="w-4 h-4 text-green-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-sm font-medium text-green-700">Enviando mensaje de voz...</span>
                  </div>
                </div>
              )}

              <div className="p-4">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                  {/* 📎 BOTÓN PARA ADJUNTAR ARCHIVOS */}
                  <label className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-300 cursor-pointer">
                    <Paperclip className="w-4 h-4 text-gray-600" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          for (const file of Array.from(files)) {
                            await handleSendAttachment(file);
                          }
                          e.target.value = ''; // Reset input
                        }
                      }}
                      disabled={isUploadingFile}
                    />
                  </label>
                  
                  <div className="flex-1 relative">
                    <input
                      ref={messageInputRef}
                      id="message-input"
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={replyingTo ? "Escribe tu respuesta..." : "Escribe un mensaje..."}
                      className="w-full px-4 py-3 bg-white/40 rounded-xl text-gray-800 placeholder-gray-400 outline-none focus:bg-white/50 backdrop-blur-xl transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                      disabled={isTyping || isUploadingFile}
                    />
                  </div>
                  
                  {/*  BOT?N DE AUDIO */}
                  {!isRecording ? (
                    <button 
                      type="button"
                      onMouseDown={handleStartRecording}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-300"
                      title="Mant??n presionado para grabar"
                    >
                      <Mic className="w-5 h-5 text-gray-600" />
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

      {/*  GALERÍA MULTIMEDIA MODAL */}
      {showMediaGallery && activeConversation && (
        <div 
          className="fixed inset-0 bg-gray-100 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowMediaGallery(false); }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Multimedia compartida</h3>
              <button
                onClick={() => setShowMediaGallery(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200 flex space-x-2">
              <button
                onClick={() => setMediaFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  mediaFilter === 'all' 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todo
              </button>
              <button
                onClick={() => setMediaFilter('images')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  mediaFilter === 'images' 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Imágenes</span>
              </button>
              <button
                onClick={() => setMediaFilter('files')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  mediaFilter === 'files' 
                    ? 'bg-gray-800 text-white' 
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
                    ? 'bg-gray-800 text-white' 
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
                
                // Si el filtro es "all", mostrar todas las secciones
                if (mediaFilter === 'all') {
                  return (
                    <>
                      {/* Sección Imágenes */}
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-700 mb-3">Imágenes ({images.length})</h4>
                        {images.length > 0 ? (
                          <div className="grid grid-cols-4 gap-3">
                            {images.map((img, idx) => {
                              const rawUrl = img.file_url || img.data_url || img.url || img.thumb_url || '';
                              const proxyUrl = rawUrl && rawUrl.includes('chatwoot')
                                ? `/img-proxy?url=${encodeURIComponent(rawUrl)}`
                                : rawUrl;
                              return (
                                <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-gray-400 transition-all cursor-pointer">
                                  <img 
                                    src={proxyUrl} 
                                    alt={img.file_name || 'Imagen'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm">No hay imágenes</p>
                        )}
                      </div>
                      
                      {/* Sección Videos */}
                      {(() => {
                        const videos = files.filter(f => f.file_category === 'video');
                        return videos.length > 0 ? (
                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-700 mb-3">Videos ({videos.length})</h4>
                            <div className="grid grid-cols-2 gap-4">
                              {videos.map((file, idx) => {
                                const rawUrl = file.file_url || file.data_url || file.url || '';
                                const proxyUrl = rawUrl && rawUrl.includes('chatwoot')
                                  ? `/img-proxy?url=${encodeURIComponent(rawUrl)}`
                                  : rawUrl;
                                return (
                                  <div key={idx} className="bg-black rounded-lg overflow-hidden">
                                    <video 
                                      src={proxyUrl}
                                      controls
                                      className="w-full aspect-video object-contain bg-black"
                                      preload="metadata"
                                      poster=""
                                    />
                                    <div className="p-2 bg-gray-100">
                                      <p className="text-sm font-medium text-gray-700 truncate">{file.file_name}</p>
                                      <p className="text-xs text-gray-500">{file.file_size ? (file.file_size / 1024).toFixed(2) + ' KB' : ''}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null;
                      })()}
                      
                      {/* Sección Audios */}
                      {(() => {
                        const audios = files.filter(f => f.file_category === 'audio');
                        return audios.length > 0 ? (
                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-700 mb-3">Audios ({audios.length})</h4>
                            <div className="space-y-3">
                              {audios.map((file, idx) => {
                                const rawUrl = file.file_url || file.data_url || file.url || '';
                                const proxyUrl = rawUrl && rawUrl.includes('chatwoot')
                                  ? `/img-proxy?url=${encodeURIComponent(rawUrl)}`
                                  : rawUrl;
                                return (
                                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <Music className="w-6 h-6 text-green-500" />
                                      <p className="font-medium text-gray-700 truncate flex-1">{file.file_name}</p>
                                      <span className="text-xs text-gray-500">{file.file_size ? (file.file_size / 1024).toFixed(2) + ' KB' : ''}</span>
                                    </div>
                                    <audio 
                                      src={proxyUrl}
                                      controls
                                      className="w-full h-10"
                                      preload="metadata"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null;
                      })()}
                      
                      {/* Sección PDFs */}
                      {(() => {
                        const pdfs = files.filter(f => f.file_category === 'pdf');
                        return pdfs.length > 0 ? (
                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-700 mb-3">PDFs ({pdfs.length})</h4>
                            <div className="grid grid-cols-2 gap-4">
                              {pdfs.map((file, idx) => {
                                const rawUrl = file.file_url || file.data_url || file.url || '';
                                const proxyUrl = rawUrl && rawUrl.includes('chatwoot')
                                  ? `/img-proxy?url=${encodeURIComponent(rawUrl)}`
                                  : rawUrl;
                                return (
                                  <div key={idx} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                                    <div className="h-32 bg-red-50 flex items-center justify-center">
                                      <FileType className="w-16 h-16 text-red-400" />
                                    </div>
                                    <div className="p-3 flex items-center justify-between">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium text-gray-700 truncate text-sm">{file.file_name}</p>
                                        <p className="text-xs text-gray-500">{file.file_size ? (file.file_size / 1024).toFixed(2) + ' KB' : ''}</p>
                                      </div>
                                      <a 
                                        href={proxyUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null;
                      })()}
                      
                      {/* Sección Otros Archivos */}
                      {(() => {
                        const otherFiles = files.filter(f => !['video', 'audio', 'pdf'].includes(f.file_category));
                        return otherFiles.length > 0 ? (
                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-700 mb-3">Otros archivos ({otherFiles.length})</h4>
                            <div className="space-y-2">
                              {otherFiles.map((file, idx) => {
                                const rawUrl = file.file_url || file.data_url || file.url || '';
                                const proxyUrl = rawUrl && rawUrl.includes('chatwoot')
                                  ? `/img-proxy?url=${encodeURIComponent(rawUrl)}`
                                  : rawUrl;
                                
                                const renderFileIcon = () => {
                                  switch (file.file_category) {
                                    case 'word':
                                      return <FileText className="w-8 h-8 text-blue-500" />;
                                    case 'spreadsheet':
                                      return <FileText className="w-8 h-8 text-green-600" />;
                                    default:
                                      return <File className="w-8 h-8 text-gray-500" />;
                                  }
                                };
                                
                                return (
                                  <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    {renderFileIcon()}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-800 truncate">{file.file_name}</p>
                                      <p className="text-sm text-gray-500">{file.file_size ? (file.file_size / 1024).toFixed(2) + ' KB' : ''}</p>
                                    </div>
                                    <a 
                                      href={proxyUrl} 
                                      download={file.file_name}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null;
                      })()}
                      
                      {/* Mensaje si no hay archivos */}
                      {files.length === 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-700 mb-3">Archivos (0)</h4>
                          <p className="text-gray-400 text-sm">No hay archivos</p>
                        </div>
                      )}
                      
                      {/* Sección Enlaces */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3">Enlaces ({links.length})</h4>
                        {links.length > 0 ? (
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
                        ) : (
                          <p className="text-gray-400 text-sm">No hay enlaces</p>
                        )}
                      </div>
                    </>
                  );
                }
                
                // Filtros individuales
                if (mediaFilter === 'images') {
                  return (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Imágenes ({images.length})</h4>
                      <div className="grid grid-cols-4 gap-3">
                        {images.map((img, idx) => {
                          const rawUrl = img.file_url || img.data_url || img.url || img.thumb_url || '';
                          const proxyUrl = rawUrl && rawUrl.includes('chatwoot')
                            ? `/img-proxy?url=${encodeURIComponent(rawUrl)}`
                            : rawUrl;
                          return (
                            <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-gray-400 transition-all cursor-pointer">
                              <img 
                                src={proxyUrl} 
                                alt={img.file_name || 'Imagen'}
                                className="w-full h-full object-cover"
                                onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                
                if (mediaFilter === 'files') {
                  const videos = files.filter(f => f.file_category === 'video');
                  const audios = files.filter(f => f.file_category === 'audio');
                  const pdfs = files.filter(f => f.file_category === 'pdf');
                  const otherFiles = files.filter(f => !['video', 'audio', 'pdf'].includes(f.file_category));
                  
                  return (
                    <div className="space-y-6">
                      {/* Videos */}
                      {videos.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3">Videos ({videos.length})</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {videos.map((file, idx) => {
                              const rawUrl = file.file_url || file.data_url || file.url || '';
                              const proxyUrl = rawUrl && rawUrl.includes('chatwoot')
                                ? `/img-proxy?url=${encodeURIComponent(rawUrl)}`
                                : rawUrl;
                              return (
                                <div key={idx} className="bg-black rounded-lg overflow-hidden">
                                  <video src={proxyUrl} controls className="w-full aspect-video object-contain bg-black" preload="metadata" poster="" />
                                  <div className="p-2 bg-gray-100">
                                    <p className="text-sm font-medium text-gray-700 truncate">{file.file_name}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Audios */}
                      {audios.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3">Audios ({audios.length})</h4>
                          <div className="space-y-3">
                            {audios.map((file, idx) => {
                              const rawUrl = file.file_url || file.data_url || file.url || '';
                              const proxyUrl = rawUrl && rawUrl.includes('chatwoot')
                                ? `/img-proxy?url=${encodeURIComponent(rawUrl)}`
                                : rawUrl;
                              return (
                                <div key={idx} className="bg-gray-50 rounded-lg p-3">
                                  <p className="font-medium text-gray-700 truncate mb-2">{file.file_name}</p>
                                  <audio src={proxyUrl} controls className="w-full h-10" preload="metadata" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* PDFs */}
                      {pdfs.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3">PDFs ({pdfs.length})</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {pdfs.map((file, idx) => {
                              const rawUrl = file.file_url || file.data_url || file.url || '';
                              const proxyUrl = rawUrl && rawUrl.includes('chatwoot')
                                ? `/img-proxy?url=${encodeURIComponent(rawUrl)}`
                                : rawUrl;
                              return (
                                <div key={idx} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                                  <div className="h-24 bg-red-50 flex items-center justify-center">
                                    <FileType className="w-12 h-12 text-red-400" />
                                  </div>
                                  <div className="p-3 flex items-center justify-between">
                                    <p className="font-medium text-gray-700 truncate text-sm flex-1">{file.file_name}</p>
                                    <a href={proxyUrl} target="_blank" rel="noopener noreferrer" className="ml-2 p-1.5 bg-red-500 text-white rounded hover:bg-red-600">
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Otros archivos */}
                      {otherFiles.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3">Otros ({otherFiles.length})</h4>
                          <div className="space-y-2">
                            {otherFiles.map((file, idx) => {
                              const rawUrl = file.file_url || file.data_url || file.url || '';
                              const proxyUrl = rawUrl && rawUrl.includes('chatwoot')
                                ? `/img-proxy?url=${encodeURIComponent(rawUrl)}`
                                : rawUrl;
                              return (
                                <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                  <File className="w-8 h-8 text-gray-500" />
                                  <p className="font-medium text-gray-800 truncate flex-1">{file.file_name}</p>
                                  <a href={proxyUrl} download={file.file_name} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800">
                                    <Download className="w-4 h-4" />
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {files.length === 0 && (
                        <p className="text-gray-400 text-sm">No hay archivos</p>
                      )}
                    </div>
                  );
                }
                
                if (mediaFilter === 'links') {
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
                
                return null;
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

      {/* Panel Derecho - Informacion del Contacto */}
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
                    src={getAvatarProxyUrl(activeConversation.contact.avatarUrl, activeConversation.contact.name) || ''} 
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
                  <LabelsManager
                    conversationId={activeConversation.id}
                    currentLabels={activeConversation.labels || []}
                    onUpdateLabels={handleUpdateLabels}
                    className="inline-flex"
                  />
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Editar Contacto</h3>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Campo Nombre */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* Campo Teléfono */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Ej: +56 9 1234 5678"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* Campo Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Ej: correo@ejemplo.com"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2.5 text-gray-800 hover:bg-gray-200 rounded-lg transition-colors font-medium"
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

      {/* NotificationToast ahora está en MainDashboard para funcionar en todas las secciones */}
      <NotificationCenter 
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
        notifications={globalNotifications?.notificationHistory || []}
        unreadCount={globalNotifications?.unreadCount || 0}
        onMarkAsRead={(id) => globalNotifications?.markAsRead(id)}
        onMarkAllAsRead={() => globalNotifications?.markAllAsRead()}
        onClearAll={() => {
          globalNotifications?.markAllAsRead();
          setShowNotificationCenter(false);
        }}
        onClickNotification={(conversationId) => {
          const conversation = conversations.find(c => c.id === conversationId);
          if (conversation) {
            handleSelectConversation(conversation);
            setShowNotificationCenter(false);
          }
        }}
        onRemoveNotification={(id) => globalNotifications?.removeNotification(id)}
        onRemoveNotificationsByConversation={(conversationId) => globalNotifications?.removeNotificationsByConversation(conversationId)}
      />
      {/* NotificationSettings eliminado - ahora usa GlobalNotificationContext */}

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

      {/* 🎬 Modal Fullscreen para Videos/Imágenes con Galería - Estilo Claro */}
      {mediaViewerOpen && mediaGallery.length > 0 && (
        <div 
          className="fixed inset-0 z-[9999] bg-gray-100/95 backdrop-blur-sm flex flex-col"
          onClick={() => setMediaViewerOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') goToPreviousMedia();
            if (e.key === 'ArrowRight') goToNextMedia();
            if (e.key === 'Escape') setMediaViewerOpen(false);
          }}
          tabIndex={0}
        >
          {/* Header con contador, descargar y botón de cerrar */}
          <div className="flex-shrink-0 p-4 flex justify-between items-center bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
            <div className="text-gray-700 flex items-center space-x-3">
              <span className="text-sm font-medium">
                {mediaGallery[currentMediaIndex]?.type === 'video' ? '🎬 Video' : '🖼️ Imagen'}
              </span>
              {mediaGallery.length > 1 && (
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                  {currentMediaIndex + 1} / {mediaGallery.length}
                </span>
              )}
              {mediaZoom !== 1 && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  {Math.round(mediaZoom * 100)}%
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {/* Botón Descargar */}
              <a
                href={mediaGallery[currentMediaIndex]?.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Descargar</span>
              </a>
              {/* Botón Cerrar */}
              <button
                onClick={(e) => { e.stopPropagation(); setMediaViewerOpen(false); }}
                className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Área principal del media con zoom */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {/* Flecha Izquierda */}
            {mediaGallery.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goToPreviousMedia(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/90 hover:bg-white shadow-lg text-gray-700 transition-all hover:scale-110"
              >
                <ChevronUp className="w-8 h-8 rotate-[-90deg]" />
              </button>
            )}

            {/* Flecha Derecha */}
            {mediaGallery.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goToNextMedia(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/90 hover:bg-white shadow-lg text-gray-700 transition-all hover:scale-110"
              >
                <ChevronDown className="w-8 h-8 rotate-[-90deg]" />
              </button>
            )}

            {/* Contenido del media con zoom y pan */}
            <div 
              className="flex items-center justify-center p-4 select-none"
              onClick={(e) => e.stopPropagation()}
              onWheel={handleMediaWheel}
              onMouseDown={handleMediaMouseDown}
              onMouseMove={handleMediaMouseMove}
              onMouseUp={handleMediaMouseUp}
              onMouseLeave={handleMediaMouseUp}
              style={{ 
                cursor: isMediaDragging ? 'grabbing' : (mediaZoom > 1 ? 'grab' : 'zoom-in'),
                userSelect: 'none'
              }}
            >
              {mediaGallery[currentMediaIndex]?.type === 'video' ? (
                <video 
                  key={currentMediaIndex}
                  controls
                  autoPlay
                  className="max-w-[85vw] max-h-[70vh] rounded-lg shadow-xl"
                  style={{ outline: 'none' }}
                >
                  <source src={mediaGallery[currentMediaIndex]?.url} type="video/mp4" />
                  Tu navegador no soporta el elemento de video.
                </video>
              ) : (
                <img 
                  key={currentMediaIndex}
                  src={mediaGallery[currentMediaIndex]?.url} 
                  alt={`Media ${currentMediaIndex + 1}`}
                  className="max-w-[85vw] max-h-[70vh] object-contain rounded-lg shadow-xl select-none"
                  style={{ 
                    transform: `scale(${mediaZoom}) translate(${mediaPan.x / mediaZoom}px, ${mediaPan.y / mediaZoom}px)`,
                    transition: isMediaDragging ? 'none' : 'transform 0.15s ease-out',
                    pointerEvents: 'none' // Evitar que la imagen interfiera con el drag
                  }}
                  draggable={false}
                  onDoubleClick={() => { 
                    setMediaZoom(prev => prev === 1 ? 2 : 1); 
                    setMediaPan({ x: 0, y: 0 }); 
                  }}
                />
              )}
            </div>
          </div>

          {/* Footer solo con miniaturas (más compacto) */}
          {mediaGallery.length > 1 && (
            <div className="flex-shrink-0 py-3 px-4 bg-white/90 backdrop-blur-sm border-t border-gray-200">
              <div className="flex justify-center space-x-2 overflow-x-auto">
                {mediaGallery.map((media, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(idx); setMediaZoom(1); setMediaPan({ x: 0, y: 0 }); }}
                    className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shadow-sm ${
                      idx === currentMediaIndex 
                        ? 'border-blue-500 scale-110 shadow-md' 
                        : 'border-gray-300 opacity-70 hover:opacity-100 hover:border-gray-400'
                    }`}
                  >
                    {media.type === 'video' ? (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Play className="w-4 h-4 text-gray-600" />
                      </div>
                    ) : (
                      <img 
                        src={media.url} 
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationsInterface;




