import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { useVirtualizer } from '@tanstack/react-virtual';
import axios from 'axios';
import { useTheme } from '@/contexts/ThemeContext';
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
  Filter,
  Ban
} from 'lucide-react';
import { useConversations, useLabels, labelsGlobalCache } from '../hooks/useChatwoot';
import { useGlobalNotifications, WebSocketMessageEvent } from '../contexts/GlobalNotificationContext';
import AdvancedFilters, { FilterConfig } from './AdvancedFilters';
import { useMessagePagination } from '../hooks/useMessagePagination';
import NotificationCenter from './NotificationCenter';
import NotificationSettings from './NotificationSettings';
import { formatTimestamp } from '../utils/dateFormatter';
import { getPriorityColor, getStatusColor } from '../utils/conversationColors';
import debugLog from '../utils/debugLogger';
import ConversationActionsDropdown from './ConversationActionsDropdown';
import AssignAgentDropdown from './AssignAgentDropdown';
import LabelsManager from './LabelsManager';
import MessageStatus from './conversations/MessageStatus';
import { formatLastMessagePreview, formatAvatar, getAvatarProxyUrl } from '../utils/conversationHelpers';
import type { Conversation, Message, MessageAttachment, Label, ConversationStatus } from '../types/chatwoot';

/** Extended attachment with all URL variants used in this component */
interface ResolvedAttachment extends MessageAttachment {
  proxy_url?: string;
  file_url?: string;
  url?: string;
  thumb_url?: string;
  name?: string;
  message_id?: number | string;
  file_category?: string;
  [key: string]: unknown;
}

/** Canned response from Chatwoot API */
interface CannedResponse {
  id: number | string;
  short_code: string;
  content: string;
}

/** Contact note from Chatwoot API */
interface ContactNote {
  id: number;
  content: string;
  created_at: number;
  user?: { name?: string };
}

/** Link preview metadata */
interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  loading?: boolean;
  error?: boolean;
}

/** Search result from backend */
interface SearchResult {
  conversation_id: number;
  matching_message?: Message;
}

/**
 * Resuelve la URL de un attachment.
 * Si tiene ID numérico > 0 y NO es un blob local, usa el proxy que cachea y
 * obtiene URLs frescas de Chatwoot Active Storage (resolviendo expiración).
 * Para blob: URLs (previews locales/optimistas) las devuelve tal cual.
 */
const resolveAttachmentUrl = (att: ResolvedAttachment): string => {
  // Si el backend devuelve una URL firmada (proxy_url), usarla directamente
  if (att?.proxy_url) {
    return att.proxy_url;
  }
  const rawUrl = att?.data_url || att?.file_url || att?.url || att?.thumb_url || '';
  // URLs locales de preview (blob:, data:) se usan directo
  if (!rawUrl || rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) {
    return rawUrl;
  }
  // Fallback: proxy CORS para URLs de Chatwoot, o URL directa
  if (rawUrl.includes('chatwoot')) {
    return `/img-proxy?url=${encodeURIComponent(rawUrl)}`;
  }
  return rawUrl;
};

// Props del componente
interface ConversationsInterfaceProps {
  currentAgentId?: number;
}

const ConversationsInterface: React.FC<ConversationsInterfaceProps> = ({ currentAgentId }) => {
  const { hasTheme, isDark } = useTheme();

  // ═══════════════════════════════════════════════════════════
  // Theme styles memo — uses CSS variables from ThemeContext
  // When hasTheme=true, applies palette colors; when false, falls back to Tailwind defaults
  // ═══════════════════════════════════════════════════════════
  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      // Main containers
      containerBg: isDark ? 'var(--theme-content-bg)' : 'var(--theme-content-bg)',
      panelBg: isDark ? 'var(--theme-sidebar-bg)' : 'var(--theme-content-card-bg)',
      panelBorder: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      // Header
      headerBg: isDark ? 'var(--theme-header-bg)' : 'var(--theme-header-bg)',
      headerBorder: isDark ? 'var(--theme-header-border)' : 'var(--theme-header-border)',
      // Text
      textPrimary: 'var(--theme-text-primary)',
      textSecondary: 'var(--theme-text-secondary)',
      textMuted: 'var(--theme-text-muted)',
      // Buttons / interactive
      buttonBg: isDark ? 'var(--theme-sidebar-hover)' : 'var(--theme-content-card-bg)',
      buttonBorder: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      buttonHoverBg: isDark ? 'var(--theme-sidebar-active-bg)' : 'rgba(255,255,255,0.9)',
      // Input
      inputBg: isDark ? 'rgba(255,255,255,0.04)' : 'var(--theme-content-card-bg)',
      inputBorder: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      inputText: 'var(--theme-text-primary)',
      // Badges / tabs
      badgeBg: isDark ? 'var(--theme-badge-bg)' : 'var(--theme-badge-bg)',
      badgeText: isDark ? 'var(--theme-badge-text)' : 'var(--theme-badge-text)',
      badgeBorder: isDark ? 'var(--theme-badge-border)' : 'var(--theme-badge-border)',
      // Conversation cards
      cardBorder: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      cardHover: isDark ? 'var(--theme-sidebar-hover)' : 'var(--theme-sidebar-hover)',
      cardActive: isDark ? 'var(--theme-sidebar-active-bg)' : 'var(--theme-sidebar-active-bg)',
      // Dropdown/popover
      dropdownBg: isDark ? 'var(--theme-sidebar-bg)' : 'var(--theme-content-card-bg)',
      dropdownBorder: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      dropdownHover: isDark ? 'var(--theme-sidebar-hover)' : 'var(--theme-sidebar-hover)',
      // Chat area
      chatBg: isDark ? 'var(--theme-content-bg)' : 'var(--theme-content-bg)',
      chatHeaderBg: isDark ? 'var(--theme-header-bg)' : 'var(--theme-header-bg)',
      chatHeaderBorder: isDark ? 'var(--theme-header-border)' : 'var(--theme-header-border)',
      // Dividers
      divider: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      // Icons
      iconColor: isDark ? 'var(--theme-icon-inactive)' : 'var(--theme-icon-inactive)',
      // Right panel
      rightPanelBg: isDark ? 'var(--theme-sidebar-bg)' : 'var(--theme-content-card-bg)',
      // Message bubbles (incoming)
      incomingBubbleBg: isDark ? 'var(--theme-sidebar-bg)' : 'var(--theme-content-card-bg)',
      incomingBubbleBorder: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      // Accent colors
      accent: 'var(--theme-accent)',
      accentLight: 'var(--theme-accent-light)',
    };
  }, [hasTheme, isDark]);

  // Helper to apply container/card themed styles
  const themed = (base?: React.CSSProperties): React.CSSProperties | undefined => {
    if (!t) return base;
    return {
      background: t.panelBg,
      borderColor: t.panelBorder,
      ...(base || {}),
    };
  };

  // 🏷️ Labels con colores reales (cache global compartido)
  useLabels(); // Solo para inicializar la carga de labels al montar
  const getLabelColor = (labelTitle: string): string => {
    const found = labelsGlobalCache.data.find((l: Label) => l.title === labelTitle);
    return found?.color || '#6b7280';
  };

  // 🔔 SISTEMA UNIFICADO: Usamos el contexto global para notificaciones
  // (ya no usamos useNotifications() - todo está en GlobalNotificationContext)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<unknown[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  // Estado para navegación entre coincidencias de búsqueda
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  
  //  OPTIMIZACIÓN: Debounce timer para recargas
  const reloadDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastReloadTimestampRef = useRef<number>(0);
  const isPendingReloadRef = useRef<boolean>(false);

  // Función para normalizar texto (quitar acentos/diacríticos)
  const normalizeText = (text: string) => 
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Función para resaltar términos de búsqueda con estilo profesional
  const highlightSearchTerm = (text: string, term: string, messageIndex: number) => {
    if (!term || !text) return text;

    // Buscar posiciones usando texto normalizado (sin acentos)
    const normalizedText = normalizeText(text);
    const normalizedTerm = normalizeText(term);
    const parts: (string | React.JSX.Element)[] = [];
    let lastIndex = 0;
    let matchCounter = 0;
    let searchFrom = 0;

    while (searchFrom < normalizedText.length) {
      const matchPos = normalizedText.indexOf(normalizedTerm, searchFrom);
      if (matchPos === -1) break;

      // Agregar texto antes del match (del texto original con acentos)
      if (matchPos > lastIndex) {
        parts.push(text.substring(lastIndex, matchPos));
      }

      // Agregar el match resaltado (del texto original)
      const matchEnd = matchPos + normalizedTerm.length;
      parts.push(
        <mark
          key={`match-${matchCounter}`}
          data-match-index={matchCounter}
          className="bg-yellow-300 text-gray-900 px-0.5 rounded font-medium"
        >
          {text.substring(matchPos, matchEnd)}
        </mark>
      );
      matchCounter++;
      lastIndex = matchEnd;
      searchFrom = matchEnd;
    }

    // Agregar el resto del texto
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
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
    updateMessagesCache,
    addMessageToCache,
    // Funciones de gestión
    assignConversation,
    changeConversationStatus,
    updateConversationLabels,
    deleteConversation,
    deleteMessage,
    updateConversationPriority,
    // Respuestas rápidas
    getCannedResponses,
    createCannedResponse,
    deleteCannedResponse,
    // Notas de contacto
    getContactNotes,
    createContactNote,
    deleteContactNote,
    // Duplicados
    getDuplicatesDiagnosis,
    forceMergeDuplicates
  } = useConversations();
  
  // Estados locales
  const [isTyping, setIsTyping] = useState(false);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // FASE 3: Estados para filtros avanzados
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterConfig | null>(null);
  
  // ?? NUEVO: Estado para separador de "nuevos mensajes"
  const [newMessageSeparatorIndex, setNewMessageSeparatorIndex] = useState<number | null>(null);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  
  //  NUEVOS ESTADOS - FUNCIONES DE WHATSAPP
  // 1. Reply/Quote (Responder)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  // 2. Starred Messages (Mensajes destacados)
  const [starredMessages, setStarredMessages] = useState<Set<number>>(new Set());
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  
  // 3. Search (Búsqueda en mensajes - NO CONFUNDIR con búsqueda global)
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
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  
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
      debugLog.error('Error loading muted conversations:', e);
    }
    return new Set();
  });
  
  //  FASE 3 - FUNCIONES AVANZADAS
  // 1. Search Bar Visual (Barra de búsqueda expandible)
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  
  //  FASE 4 - NUEVAS FEATURES CHATWOOT
  // 0. Prioridad dropdown
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [priorityMenuPos, setPriorityMenuPos] = useState<{top: number; left: number}>({top: 0, left: 0});
  const priorityBtnRef = useRef<HTMLButtonElement>(null);

  // 1. Respuestas rápidas (Canned Responses)
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [cannedFilter, setCannedFilter] = useState('');
  
  // 2. Notas de contacto
  const [contactNotes, setContactNotes] = useState<ContactNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  
  // 3. Diálogos de confirmación
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  // 2. Multimedia Gallery (Galería multimedia)
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'images' | 'files' | 'links'>('all');
  
  // 3. Drag & Drop (Arrastrar y soltar archivos)
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false); // 📤 Estado de carga de archivo
  const [uploadProgress, setUploadProgress] = useState<string>(''); // Nombre del archivo subiendo
  
  // 📎 STAGED FILE: archivo preparado para enviar (preview antes de enviar)
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedFilePreviewUrl, setStagedFilePreviewUrl] = useState<string | null>(null);
  const [fileCaption, setFileCaption] = useState<string>('');
  const fileCaptionInputRef = useRef<HTMLInputElement>(null);
  
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
      activeConversation.messages.forEach((msg: Message) => {
        if (msg.attachments) {
          (msg.attachments as ResolvedAttachment[]).forEach((att: ResolvedAttachment) => {
            const rawUrl = att.data_url || att.file_url || att.url || att.thumb_url || '';
            // file_type puede ser int (0=image,1=audio,2=video) o string
            const rawFileType = att.file_type ?? att.content_type ?? '';
            const fileType = String(rawFileType).toLowerCase();
            
            if (!rawUrl && !(Number(att?.id) > 0)) return;
            
            // ✅ Usar proxy inteligente
            const attachmentUrl = resolveAttachmentUrl(att);
            
            // ✅ Detectar imágenes enviadas como documento
            const attContentType = String(att.content_type || '').toLowerCase();
            const attFileName = String(att.file_name || att.name || '').toLowerCase();
            const attIsImage = fileType === 'image' || fileType.includes('image/') || fileType === '0'
              || attContentType.startsWith('image/')
              || /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif)$/i.test(attFileName);
            
            if (attIsImage) {
              allMedia.push({ url: attachmentUrl, type: 'image' });
            } else if (fileType === 'video' || fileType.includes('video/') || fileType === '2' || /\.(mp4|mov|avi|webm|mkv)$/i.test(rawUrl)) {
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
  const [showToastNotif, setShowToastNotif] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    setToastType(type);
    setShowToastNotif(true);
    toastTimerRef.current = setTimeout(() => setShowToastNotif(false), 3500);
  };
  
  // 📜 NUEVO: Ref para auto-scroll de mensajes
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  // ?? NUEVO: Ref para auto-scroll de mensajes
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  // ?? NUEVO: Ref para evitar stale closure en callbacks de tiempo real
  const activeConversationRef = useRef<Conversation | null>(null);
  
  // ?? DEDUPLICACIÓN: Ref para evitar procesar eventos WebSocket duplicados
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
    // Strip trailing punctuation that's part of surrounding text, not the URL
    // e.g. "visit https://example.com/path." → "https://example.com/path"
    const cleaned = matches.map(url => url.replace(/[.,;:!?)]+$/, ''));
    // Filtrar URLs de attachments que ya se muestran como media
    return cleaned.filter(url => 
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
      // Usar fetch nativo sin credentials para evitar CORS conflict
      // (axios global tiene withCredentials=true que choca con Access-Control-Allow-Origin: *)
      const raw = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
      if (!raw.ok) {
        // microlink returned 4xx/5xx — mark as error silently
        setLinkPreviews(prev => ({ ...prev, [url]: { error: true, loading: false } }));
        return;
      }
      const responseData = await raw.json();
      
      if (responseData?.status === 'success' && responseData?.data) {
        const data = responseData.data;
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
  const LinkPreviewCard: React.FC<{ url: string; preview: LinkPreview }> = ({ url, preview }) => {
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
    
    // Verificar si pasó suficiente tiempo desde el último reload (mínimo 2 segundos)
    const now = Date.now();
    const timeSinceLastReload = now - lastReloadTimestampRef.current;
    
    if (timeSinceLastReload < 2000) {
      // Agendar reload después del tiempo mínimo
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
  
  // ✅ Escuchar evento para refrescar conversaciones cuando hay mensajes pendientes (polling fallback)
  useEffect(() => {
    const handleRefreshConversations = () => {
      if (fetchUpdatedConversations) {
        fetchUpdatedConversations();
      }
      // También refrescar mensajes de la conversación activa
      if (activeConversationRef.current?.id && loadConversationMessages) {
        loadConversationMessages(activeConversationRef.current.id);
      }
    };
    
    window.addEventListener('refreshConversations', handleRefreshConversations);
    return () => {
      window.removeEventListener('refreshConversations', handleRefreshConversations);
    };
  }, [fetchUpdatedConversations, loadConversationMessages]);
  
  // ï¿½🔔 Escuchar evento selectConversation desde NotificationBell y query params
  const pendingConversationRef = useRef<number | null>(null);
  const activeConversationIdRef = useRef<number | null>(null);
  const hasCheckedQueryParamRef = useRef(false);
  
  // Mantener ref de activeConversation.id actualizada para evitar stale closures
  useEffect(() => {
    activeConversationIdRef.current = activeConversation?.id ?? null;
  }, [activeConversation?.id]);
  
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
      
      if (!conversations || conversations.length === 0) {
        // Guardar para intentar después cuando se carguen las conversaciones
        pendingConversationRef.current = conversationId;
        return false;
      }
      
      const conversation = conversations.find((c: Conversation) => c.id === conversationId);
      if (conversation) {
        pendingConversationRef.current = null; // Limpiar pendiente
        localStorage.removeItem('pendingConversationId');
        
        // ✅ FIX: Si esta conversación ya está activa (o cargándose), no resetear
        // Esto evita que retries del evento sobreescriban mensajes ya cargados
        const currentActiveId = activeConversation?.id ?? activeConversationIdRef.current;
        if (currentActiveId === conversationId) {
          // Ya está seleccionada, solo limpiar badges
          if (clearBadge) clearBadge(conversationId);
          return true;
        }
        
        _setActiveConversation({
          ...conversation,
          messages: [],
          unread_count: 0,
          _isLoading: true
        });
        // ✅ Limpiar TODAS las notificaciones: badges + campana + toasts
        if (clearBadge) {
          clearBadge(conversationId);
        }
        // Actualizar unread_count en la lista local
        setConversations((prev: Conversation[]) => 
          prev.map((conv: Conversation) => 
            conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
          )
        );
        loadConversationMessages(conversationId);
        if (markConversationAsRead) {
          markConversationAsRead(conversationId);
        }
        return true;
      } else {
        // 🔧 FIX: Conversación no encontrada en lista actual.
        // Guardar como pendiente y refrescar lista de conversaciones.
        pendingConversationRef.current = conversationId;
        if (fetchUpdatedConversations) {
          fetchUpdatedConversations();
        }
      }
      return false;
    };

    // Si hay una conversación pendiente y ahora tenemos conversaciones, seleccionarla
    if (pendingConversationRef.current && conversations && conversations.length > 0) {
      selectConversationById(pendingConversationRef.current);
    }
    
    // 🔧 FIX: Revisar localStorage al montar (backup del setTimeout)
    const storedPending = localStorage.getItem('pendingConversationId');
    if (storedPending && conversations && conversations.length > 0) {
      const pendingId = parseInt(storedPending, 10);
      if (!isNaN(pendingId) && !pendingConversationRef.current) {
        selectConversationById(pendingId);
      }
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
  }, [conversations, _setActiveConversation, loadConversationMessages, markConversationAsRead, fetchUpdatedConversations]);
  
  //  Auto-focus del input cuando se abre una conversación (como WhatsApp)
  useEffect(() => {
    if (activeConversation && messageInputRef.current) {
      // Pequeño delay para asegurar que el DOM esté listo
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    }
  }, [activeConversation?.id]); // Solo cuando cambie la conversación activa

  // 🔄 Ref para evitar cargas múltiples en infinite scroll
  const isLoadingMoreRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  // 🔄 Función reutilizable para cargar más mensajes
  const triggerLoadMore = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || !activeConversation) return;

    const hasMore = activeConversation?._hasMoreMessages !== false;
    if (!hasMore || activeConversation?._isLoading || isLoadingMoreRef.current || !activeConversation?.messages?.length) {
      return;
    }

    isLoadingMoreRef.current = true;
    lastLoadTimeRef.current = Date.now();

    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;

    loadConversationMessages(activeConversation.id, true)
      .then(() => {
        // Doble rAF para asegurar que React ha renderizado y el browser hizo layout
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const newScrollHeight = container.scrollHeight;
            const addedHeight = newScrollHeight - prevScrollHeight;
            if (addedHeight > 0) {
              container.scrollTop = prevScrollTop + addedHeight;
            }
            // Mantener el flag activo 500ms más para bloquear cualquier scroll-to-bottom async
            setTimeout(() => {
              isLoadingMoreRef.current = false;
            }, 500);
          });
        });
      })
      .catch((err) => {
        console.error('âŒ [LoadMore] Error:', err);
        isLoadingMoreRef.current = false;
      });
  }, [activeConversation?.id, activeConversation?._hasMoreMessages, activeConversation?._isLoading, activeConversation?.messages?.length, loadConversationMessages]);

  // 🔄 Infinite scroll para cargar más mensajes al llegar al tope (usando scroll event)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // Debounce: no cargar si ya cargamos hace menos de 1.5 segundos
      const now = Date.now();
      if (now - lastLoadTimeRef.current < 1500) return;
      
      // Si el usuario está cerca del tope (menos de 100px del inicio)
      const isNearTop = container.scrollTop < 100;
      
      if (isNearTop) {
        triggerLoadMore();
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => container.removeEventListener('scroll', handleScroll);
  }, [triggerLoadMore]);

  // 🔄 Auto-check: si los mensajes no llenan el container, auto-cargar más
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !activeConversation?.messages?.length) return;
    if (activeConversation?._isLoading) return;

    // Esperar a que el DOM renderice
    const timer = setTimeout(() => {
      // Si el contenido no llena el container (no hay scrollbar), intentar cargar más
      if (container.scrollHeight <= container.clientHeight && activeConversation?._hasMoreMessages !== false) {
        triggerLoadMore();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [activeConversation?.id, activeConversation?.messages?.length, activeConversation?._isLoading, activeConversation?._hasMoreMessages, triggerLoadMore]);
  
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
    
    const unsubscribe = globalNotifications.subscribeToMessages((wsEvent: WebSocketMessageEvent) => {
      setLastEventTime(new Date());
      
      if (wsEvent.type === 'conversation_assigned') {
        // Actualizar asignación en la lista de conversaciones en tiempo real
        const assignee = wsEvent.conversation?.assignee || null;
        const assigneeId = wsEvent.conversation?.assignee_id ?? assignee?.id ?? null;
        
        setConversations((prev: Conversation[]) =>
          prev.map(conv =>
            conv.id === wsEvent.conversationId
              ? { ...conv, assignee_id: assigneeId, assignee }
              : conv
          )
        );

        // Si la conversación activa es la asignada, actualizar también
        _setActiveConversation((prev: Conversation | null) => {
          if (prev && prev.id === wsEvent.conversationId) {
            return { ...prev, assignee_id: assigneeId, assignee };
          }
          return prev;
        });
        return;
      }

      if (wsEvent.type === 'conversation_updated') {
        // Actualizar estado si viene incluido
        const newStatus = wsEvent.event?.status || wsEvent.conversation?.status;
        if (newStatus) {
          setConversations((prev: Conversation[]) => 
            prev.map(conv => 
              conv.id === wsEvent.conversationId 
                ? { ...conv, status: newStatus }
                : conv
            )
          );
        } else {
          // Si no hay status, refrescar la lista de conversaciones
          // (puede ser nueva conversación, cambio de asignación, etc.)
          debouncedFetchConversationsRef.current?.();
        }
        return;
      }
      
      if (wsEvent.type === 'message_updated') {
        // 📝 Actualizar estado del mensaje (sent, delivered, read)
        const messageId = wsEvent.message?.id;
        const newStatus = wsEvent.message?.status;
        
        if (messageId && newStatus) {
          debugLog.log(`📝 Actualizando estado de mensaje ${messageId} a ${newStatus}`);
          
          _setActiveConversation((prev: Conversation | null) => {
            if (!prev || !prev.messages) return prev;
            
            const updatedMessages = prev.messages.map((msg: Message) => {
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
        
        // 🔒 DEDUPLICACIÓN - solo por IDs (sin hash de contenido para evitar falsos positivos)
        const messageId = wsEvent.message?.id || event?.message?.id;
        const sourceId = wsEvent.message?.source_id || event?.message?.source_id;
        
        // Generar claves de deduplicación solo por IDs únicos
        const dedupKeys = [
          messageId ? `msg-${conversationId}-${messageId}` : null,
          sourceId ? `src-${sourceId}` : null,
        ].filter((k): k is string => Boolean(k));
        
        // Verificar si alguna clave ya existe
        const isDuplicate = dedupKeys.length > 0 && dedupKeys.some(key => processedEventsRef.current.has(key));
        if (isDuplicate) {
          return;
        }
        
        // Marcar todas las claves como procesadas
        dedupKeys.forEach(key => {
          if (key) processedEventsRef.current.add(key);
        });
        
        // Limpiar eventos antiguos (mantener últimos 200)
        if (processedEventsRef.current.size > 200) {
          const iterator = processedEventsRef.current.values();
          for (let i = 0; i < 50; i++) {
            const item = iterator.next().value;
            if (item) processedEventsRef.current.delete(item);
          }
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
        setConversations((prevConversations: Conversation[]) => {
          const newTimestamp = event?.timestamp || event?.message?.created_at || new Date().toISOString();
          const existingIndex = prevConversations.findIndex((conv: Conversation) => conv.id === conversationId);

          let updated;
          if (existingIndex !== -1) {
            updated = prevConversations.map((conv: Conversation) => {
              if (conv.id === conversationId) {
                // ✅ Obtener badge del contexto global
                const globalBadge = globalNotificationsRef.current?.conversationBadges?.get(conversationId) || 0;
                
                // ✅ Construir contenido: si viene vacío pero hay attachments, generar preview
                const msgContent = event?.message?.content || '';
                const msgAttachments = event?.message?.attachments || [];
                let displayContent = msgContent;
                if ((!msgContent || msgContent.trim() === '') && msgAttachments.length > 0) {
                  const att = msgAttachments[0];
                  const ft = String(att.file_type || att.content_type || '').toLowerCase();
                  const fn = decodeURIComponent(att.file_name || att.data_url?.split('/').pop() || 'archivo');
                  const attFn = String(att.file_name || att.name || '').toLowerCase();
                  if (ft.startsWith('image') || ft === '0' || /\.(jpg|jpeg|png|gif|webp)$/i.test(attFn)) displayContent = '📷 Imagen';
                  else if (ft.startsWith('video') || ft === '2') displayContent = '🎥 Video';
                  else if (ft.startsWith('audio') || ft === '1') displayContent = '🎵 Audio';
                  else if (ft.includes('pdf')) displayContent = '📄 PDF';
                  else if (ft.includes('document') || ft.includes('word')) displayContent = '📄 Documento';
                  else if (ft.includes('sheet') || ft.includes('excel')) displayContent = '📊 Hoja de cálculo';
                  else displayContent = `📎 ${fn}`;
                }
                
                return {
                  ...conv,
                  last_message: {
                    content: displayContent,
                    timestamp: new Date(newTimestamp).getTime() / 1000,
                    sender: String(event?.sender?.name || event?.message?.sender?.name || 'contact'),
                    attachments: msgAttachments
                  },
                  unread_count: globalBadge,
                  updated_at: newTimestamp,
                  timestamp: new Date(newTimestamp).getTime() / 1000,
                  last_activity_at: new Date(newTimestamp).getTime() / 1000
                } as Conversation;
              }
              return conv;
            });
          } else {
            // Nueva conversación
            const sender = event?.sender || event?.message?.sender || { name: 'Nuevo contacto' };
            // ✅ Construir contenido para nueva conversación con soporte attachments
            const newMsgContent = event?.message?.content || '';
            const newMsgAttachments = event?.message?.attachments || [];
            let newDisplayContent = newMsgContent;
            if ((!newMsgContent || newMsgContent.trim() === '') && newMsgAttachments.length > 0) {
              const att = newMsgAttachments[0];
              const ft = String(att.file_type || att.content_type || '').toLowerCase();
              const fn = att.file_name || att.data_url?.split('/').pop() || 'archivo';
              if (ft.startsWith('image') || ft === '0') newDisplayContent = '📷 Imagen';
              else if (ft.startsWith('video') || ft === '2') newDisplayContent = '🎥 Video';
              else if (ft.startsWith('audio') || ft === '1') newDisplayContent = '🎵 Audio';
              else if (ft.includes('pdf')) newDisplayContent = '📄 PDF';
              else newDisplayContent = `📎 ${fn}`;
            }
            
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
                content: newDisplayContent,
                timestamp: new Date(newTimestamp).getTime() / 1000,
                sender: String(sender?.name || 'contact'),
                attachments: newMsgAttachments
              },
              labels: [],
              timestamp: new Date(newTimestamp).getTime() / 1000,
              last_activity_at: new Date(newTimestamp).getTime() / 1000,
              created_at: newTimestamp,
              updated_at: newTimestamp
            } as unknown as Conversation;
            const alreadyExists = prevConversations.some(c => c.id === conversationId);
            updated = alreadyExists ? prevConversations : [newConv, ...prevConversations];
          }

          return updated.sort((a: Conversation, b: Conversation) => {
            const timeA = Number(a.last_activity_at || a.timestamp || 0);
            const timeB = Number(b.last_activity_at || b.timestamp || 0);
            return timeB - timeA;
          });
        });

        // 💬 Agregar mensaje a la conversación activa si corresponde
        const currentActiveConv = activeConversationRef.current;
        
        // Debug desactivado en producción
        
        // Usar comparación numérica para evitar problemas de tipos
        if (currentActiveConv && Number(currentActiveConv.id) === Number(conversationId)) {
          const rawMsgType = wsEvent.message?.message_type;
          const normalizedMsgType = (rawMsgType === 'outgoing' || rawMsgType === 1) ? 'outgoing' : 'incoming';
          const normalizedSender = normalizedMsgType === 'outgoing' ? 'agent' : 'contact';
          
          // Mensaje agregado silenciosamente
          
          const newMessage: Message = {
            id: wsEvent.message?.id || Date.now(),
            content: wsEvent.message?.content || '',
            message_type: normalizedMsgType,
            created_at: wsEvent.message?.created_at || new Date().toISOString(),
            timestamp: wsEvent.message?.created_at || Date.now(),
            sender: normalizedSender,
            attachments: wsEvent.message?.attachments || [],
            source_id: wsEvent.message?.source_id || null,
            content_type: wsEvent.message?.content_type || 'text',
            private: wsEvent.message?.private || false,
            status: wsEvent.message?.status || 'sent'
          };
          
          _setActiveConversation((prev: Conversation | null) => {
            if (!prev || Number(prev.id) !== Number(conversationId)) return prev;
            
            const existingMessages = prev.messages || [];
            
            // 🔒 Verificar duplicados - comparación robusta
            const messageExists = existingMessages.some((m: Message) => {
              // Comparar por ID (numérico para evitar string vs number)
              if (Number(m.id) === Number(newMessage.id)) return true;
              // Comparar por source_id (ID de WhatsApp)
              if (newMessage.source_id && m.source_id === newMessage.source_id) return true;
              // Verificar mensajes optimistas por contenido
              const isOptimistic = m._isOptimistic || String(m.id).startsWith('temp-') || String(m.id).startsWith('pending-') || String(m.id).startsWith('sent-');
              if (isOptimistic && m.content === newMessage.content) return true;
              return false;
            });
            
            if (messageExists) {
              // Reemplazar mensaje optimista con el real
              const updatedMessages = existingMessages.map((m: Message) => {
                const isOptimistic = m._isOptimistic || String(m.id).startsWith('temp-') || String(m.id).startsWith('pending-') || String(m.id).startsWith('sent-');
                if (isOptimistic && m.content === newMessage.content) {
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
          const normalizedMsgType = (rawMsgType === 'outgoing' || rawMsgType === 1) ? 'outgoing' : 'incoming';
          const newMessage: Message = {
            id: wsEvent.message?.id || Date.now(),
            content: wsEvent.message?.content || '',
            message_type: normalizedMsgType,
            created_at: wsEvent.message?.created_at || new Date().toISOString(),
            timestamp: wsEvent.message?.created_at || Date.now(),
            sender: normalizedMsgType === 'outgoing' ? 'agent' : 'contact',
            attachments: wsEvent.message?.attachments || [],
            status: 'sent'
          };
          addMessageToCacheRef.current(conversationId, newMessage);
        }
      }
    });
    
    return () => {
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
    
    // 🔒 DEDUPLICACIÓN ROBUSTA: por ID numérico Y por source_id
    const seenIds = new Set<number>();
    const seenSourceIds = new Set<string>();
    const uniqueMessages = allMessages.filter((m: Message) => {
      const numId = Number(m.id);
      const sourceId = m.source_id;
      
      // Si ya vimos este ID numérico, es duplicado
      if (!isNaN(numId) && seenIds.has(numId)) return false;
      // Si ya vimos este source_id (WhatsApp ID), es duplicado
      if (sourceId && seenSourceIds.has(sourceId)) return false;
      
      if (!isNaN(numId)) seenIds.add(numId);
      if (sourceId) seenSourceIds.add(sourceId);
      return true;
    });
    
    // Obtener contenidos de mensajes reales (no optimistas)
    // Un mensaje es "real" si tiene ID numérico y NO tiene flags optimistas
    const realMessageContents = new Set(
      uniqueMessages
        .filter((m: Message) => {
          const isReal = (
            typeof m.id === 'number' &&
            !m._isOptimistic &&
            !String(m.id).startsWith('temp-') &&
            !String(m.id).startsWith('pending-')
          );
          return isReal;
        })
        .map((m: Message) => m.content?.trim())
    );
    
    // Filtrar: excluir mensajes optimistas/pending cuyo contenido ya existe en mensajes reales
    const deduplicatedMessages = uniqueMessages.filter((m: Message) => {
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
      const timeA = Number(a.timestamp) || new Date(a.created_at).getTime() / 1000;
      const timeB = Number(b.timestamp) || new Date(b.created_at).getTime() / 1000;
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

  //  BÚSQUEDA GLOBAL EN BACKEND - busca en TODOS los mensajes de la BD
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        debugLog.log(' Buscando en backend:', searchTerm);
        
        const response = await axios.get('/api/chatwoot-proxy/conversations/search', {
          params: { q: searchTerm }
        });

        debugLog.log('✅ Resultados de búsqueda:', response.data);
        
        if (response.data.success && Array.isArray(response.data.data)) {
          // El backend retorna { conversation_id, matching_message } por cada conversación que matchea
          setSearchResults(response.data.data);
          debugLog.log(` Encontradas ${response.data.data.length} conversaciones con mensajes que matchean`);
        } else {
          setSearchResults([]);
        }
      } catch (error: unknown) {
        debugLog.error('âŒ Error en búsqueda:', error instanceof Error ? error.message : error);
        setSearchResults(null); // null = usar filtrado local como fallback
      } finally {
        setIsSearching(false);
      }
    }, 500);

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
    
    let result: Conversation[];

    if (!searchTerm) {
      // Sin búsqueda, aplicar solo filtro de pestaña
      result = (conversations || []).filter(conversation => {
        if (selectedFilter === 'all') return true;
        if (selectedFilter === 'mine') return currentAgentId ? conversation.assignee_id === currentAgentId : conversation.assignee_id;
        if (selectedFilter === 'unassigned') return !conversation.assignee_id;
        return true;
      });
      debugLog.log('✅ Sin búsqueda, resultados:', result.length);
    } else {
    
      // Con búsqueda activa: combinar resultados del backend + búsqueda local
      const searchNorm = normalizeText(searchTerm);
      
      // Crear mapa de matching_message del backend (conversation_id => matching_message)
      const backendMatchMap = new Map<number, Message | null>();
      if (searchResults && Array.isArray(searchResults)) {
        searchResults.forEach((r: unknown) => {
          const sr = r as { conversation_id?: number; matching_message?: Message };
          if (sr.conversation_id != null) {
            backendMatchMap.set(sr.conversation_id, sr.matching_message || null);
          }
        });
      }
      
      result = (conversations || []).map(conversation => {
      
      // 1. Buscar en nombre del contacto (sin acentos)
      const nameMatch = conversation.contact?.name ? normalizeText(conversation.contact.name).includes(searchNorm) : false;
      
      // 2. Buscar en el último mensaje (sin acentos)
      const lastMessageMatch = conversation.last_message?.content ? normalizeText(conversation.last_message.content).includes(searchNorm) : false;
      
      // 3. Buscar en mensajes cargados en memoria
      let matchingMessage: Message | null = null;
      const allMessagesMatch = conversation.messages?.some((msg: Message) => {
        if (msg.content && normalizeText(msg.content).includes(searchNorm)) {
          matchingMessage = msg;
          return true;
        }
        return false;
      });
      
      // 4. Si el backend encontró un match en mensajes para esta conversación, usarlo
      const hasBackendMatch = backendMatchMap.has(conversation.id);
      const backendMatchMsg = backendMatchMap.get(conversation.id);
      
      // Prioridad: mensaje local encontrado > mensaje del backend > last_message match
      if (!matchingMessage && backendMatchMsg) {
        matchingMessage = backendMatchMsg;
      }
      if (!matchingMessage && lastMessageMatch && conversation.last_message) {
        matchingMessage = conversation.last_message as unknown as Message;
      }
      
      // 5. Buscar en etiquetas (sin acentos)
      const labelMatch = conversation.labels?.some((label: string) => {
        return normalizeText(label).includes(searchNorm);
      });
      
      // 6. Buscar en email o teléfono
      const contactMatch = (conversation.contact?.email ? normalizeText(conversation.contact.email).includes(searchNorm) : false) ||
                           conversation.contact?.phone_number?.includes(searchTerm);
      
      // Combinar: match local O match del backend
      const matchesSearch = !!(nameMatch || lastMessageMatch || allMessagesMatch || hasBackendMatch || labelMatch || contactMatch);
      
      // Aplicar filtro de pestaña
      let passesFilter = false;
      if (selectedFilter === 'all') passesFilter = matchesSearch;
      else if (selectedFilter === 'mine') passesFilter = matchesSearch && (currentAgentId ? conversation.assignee_id === currentAgentId : !!conversation.assignee_id);
      else if (selectedFilter === 'unassigned') passesFilter = matchesSearch && !conversation.assignee_id;
      else passesFilter = matchesSearch;
      
      if (!passesFilter) return null;
      
      // Adjuntar mensaje que matcheó para mostrar como preview y scroll
      return { ...conversation, _matchingMessage: matchingMessage };
      }).filter(Boolean) as Conversation[];
      
      debugLog.log(' Con búsqueda, resultados:', result.length);
    } // end else (searchTerm)

    if (appliedFilters) {
      if (appliedFilters.status && appliedFilters.status.length > 0) {
        result = result.filter(conv => (appliedFilters.status as string[]).includes(conv.status as string));
      }

      if (appliedFilters.priority && appliedFilters.priority.length > 0) {
        result = result.filter(conv => {
          const priority = conv.priority || 'none';
          return (appliedFilters.priority as string[]).includes(priority as string);
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
              convDate = new Date(Number(conv.last_activity_at) * 1000);
            } else if (conv.timestamp) {
              // timestamp puede estar en segundos o milisegundos
              const ts = Number(conv.timestamp);
              convDate = new Date(ts > 10000000000 ? ts : ts * 1000);
            } else if (conv.updated_at) {
              // updated_at puede ser ISO string o timestamp
              if (typeof conv.updated_at === 'string') {
                convDate = new Date(conv.updated_at);
              } else {
                convDate = new Date(conv.updated_at > 10000000000 ? conv.updated_at : conv.updated_at * 1000);
              }
            } else if (conv.last_message?.timestamp) {
              const lmTs = Number(conv.last_message.timestamp);
              convDate = new Date(lmTs > 10000000000 ? lmTs : lmTs * 1000);
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
    if (activeConversation?.id && activeConversation?.messages && activeConversation.messages.length > 0 && updateMessagesCache) {
      debugLog.log(`💾 Guardando ${activeConversation.messages.length} mensajes de conversación ${activeConversation.id} en caché antes de cambiar`);
      updateMessagesCache(activeConversation.id, activeConversation.messages);
    }
    
    // ï¿½ Limpiar archivo stageado al cambiar de conversación
    cancelStagedFile();
    
    // ï¿½🚀 Mostrar conversación inmediatamente
    _setActiveConversation({
      ...conversation,
      messages: [],
      unread_count: 0,
      _isLoading: true
    });
    
    // ✅ Limpiar badge en el SISTEMA UNIFICADO (limpia badges + campana + toasts)
    if (clearBadge) {
      clearBadge(conversation.id);
    }
    
    // Actualizar lista de conversaciones
    setConversations((prev: Conversation[]) => 
      prev.map((conv: Conversation) => 
        conv.id === conversation.id ? { ...conv, unread_count: 0 } : conv
      )
    );
    
    // Cargar mensajes en background
    loadConversationMessages(conversation.id);
    
    // Si hay búsqueda activa, scroll al mensaje que coincide después de cargar
    if (searchTerm && (conversation as Conversation & { _matchingMessage?: Message })._matchingMessage) {
      const matchMsg = (conversation as Conversation & { _matchingMessage?: Message })._matchingMessage;
      const matchId = matchMsg?.id;
      const matchContent = matchMsg?.content || '';
      const searchNorm = normalizeText(searchTerm);
      
      const tryScroll = (attempts: number) => {
        if (attempts <= 0) return;
        setTimeout(() => {
          // Intento 1: buscar por ID exacto del mensaje
          let el = document.getElementById(`message-${matchId}`);
          
          // Intento 2: si no encontró por ID, buscar entre los mensajes renderizados por contenido
          if (!el && matchContent) {
            const allMsgEls = document.querySelectorAll('[id^="message-"]');
            for (const msgEl of allMsgEls) {
              const contentEl = msgEl.querySelector('.message-content, .whitespace-pre-wrap, p');
              if (contentEl && normalizeText(contentEl.textContent || '').includes(searchNorm)) {
                el = msgEl as HTMLElement;
                break;
              }
            }
          }
          
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Flash highlight amarillo
            el.style.transition = 'box-shadow 0.3s, background-color 0.3s';
            el.style.boxShadow = '0 0 0 2px #facc15';
            el.style.backgroundColor = 'rgba(250, 204, 21, 0.15)';
            setTimeout(() => {
              el!.style.boxShadow = '';
              el!.style.backgroundColor = '';
            }, 2500);
          } else {
            tryScroll(attempts - 1);
          }
        }, 600);
      };
      tryScroll(8); // Intentar hasta ~5 segundos
    }
    
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
        setConversations((prevConversations: Conversation[]) => {
          return prevConversations.map((conv: Conversation) => {
            if (conv.id === activeConversation.id) {
              return {
                ...conv,
                last_message: {
                  content: messageContent,
                  timestamp: nowTimestamp,
                  sender: 'agent',
                  attachments: []
                },
                updated_at: new Date().toISOString(),
                last_activity_at: nowTimestamp
              } as Conversation;
            }
            return conv;
          }).sort((a: Conversation, b: Conversation) => {
            const timeA = Number(a.last_activity_at || a.timestamp || 0);
            const timeB = Number(b.last_activity_at || b.timestamp || 0);
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
          _setActiveConversation((prev: Conversation | null) => {
            if (!prev || !prev.messages) return prev;
            const updatedMessages = prev.messages.map((msg: Message) => {
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
          debugLog.error('âŒ Error sending message:', error);
          // Marcar mensaje como fallido
          _setActiveConversation((prev: Conversation | null) => {
            if (!prev || !prev.messages) return prev;
            return {
              ...prev,
              messages: prev.messages.map((msg: Message) => {
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
  const handleReplyToMessage = (message: Message) => {
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
    // Mostrar notificación temporal
    triggerToast('Mensaje copiado al portapapeles');
  };

  // 4 FORWARD - Copiar texto del mensaje
  const handleForwardMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    setMessageMenuOpen(null);
  };

  // 5 DELETE - Eliminar mensaje (con confirmación y API real)
  const handleDeleteMessage = (messageId: number) => {
    setMessageMenuOpen(null);
    if (!activeConversation) return;
    
    setConfirmDialog({
      show: true,
      title: 'Eliminar mensaje',
      message: '¿Estás seguro de que quieres eliminar este mensaje? Esta acción no se puede deshacer.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteMessage(activeConversation.id, messageId);
          // Actualizar UI local
          const updatedMessages = (activeConversation.messages || []).filter((m: Message) => m.id !== messageId);
          _setActiveConversation({
            ...activeConversation,
            messages: updatedMessages
          });
        } catch (error) {
          debugLog.error('Error eliminando mensaje:', error);
        }
        setConfirmDialog(prev => ({ ...prev, show: false }));
      }
    });
  };

  // 6 PIN - Fijar mensaje
  const handlePinMessage = (message: Message) => {
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

    // Filtrar mensajes que contienen el query y guardar sus IDs (sin acentos)
    const queryNorm = normalizeText(query);
    const results = (activeConversation.messages || [])
      .filter((msg: Message) => 
        msg.content && normalizeText(msg.content).includes(queryNorm)
      )
      .map((msg: Message) => Number(msg.id));

    setMessageSearchResults(results);
    setCurrentSearchIndex(0);

    // Scroll al primer resultado
    if ((results || []).length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`message-${results[0]}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
    
    debugLog.log(` Búsqueda: "${query}" - ${(results || []).length} resultados encontrados`, results);
  };

  // 8 MUTE - Silenciar conversación (persiste en localStorage)
  const handleMuteConversation = (conversationId?: number) => {
    const id = conversationId || activeConversation?.id;
    if (!id) return;
    
    setMutedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      // Persistir en localStorage
      localStorage.setItem('mutedConversations', JSON.stringify([...newSet]));
      // Exponer globalmente para el sistema de notificaciones
      (window as unknown as { __mutedConversations: Set<number> }).__mutedConversations = newSet;
      return newSet;
    });
  };

  // 🏷️ HANDLERS PARA GESTIÓN DE CONVERSACIONES
  
  // Asignar conversación a un agente
  const handleAssignConversation = async (agentId: number | null) => {
    if (!activeConversation) return;
    try {
      const result = await assignConversation(activeConversation.id, agentId);
      // Actualizar la conversación activa (el hook ya actualiza setConversations)
      _setActiveConversation((prev: Conversation | null) => 
        prev ? { ...prev, assignee_id: agentId, assignee: result?.assignee || null } : null
      );
      debugLog.log(`✅ Conversación ${activeConversation.id} asignada a agente ${agentId}`);
    } catch (error) {
      debugLog.error('Error asignando conversación:', error);
    }
  };

  // Cambiar estado de la conversación
  const handleChangeStatus = async (status: string, snoozedUntil?: number) => {
    if (!activeConversation) return;
    try {
      await changeConversationStatus(
        activeConversation.id, 
        status as 'open' | 'resolved' | 'pending' | 'snoozed', 
        snoozedUntil
      );
      // Actualizar la conversación activa (el hook ya actualiza setConversations)
      _setActiveConversation((prev: Conversation | null) => 
        prev ? { ...prev, status: status as 'open' | 'resolved' | 'pending' | 'snoozed' } : null
      );
      debugLog.log(`✅ Estado de conversación ${activeConversation.id} cambiado a ${status}`);
    } catch (error) {
      debugLog.error('Error cambiando estado:', error);
    }
  };

  // Actualizar etiquetas de la conversación
  const handleUpdateLabels = async (labels: string[]) => {
    if (!activeConversation) return;
    try {
      await updateConversationLabels(activeConversation.id, labels);
      // Actualizar la conversación activa (el hook ya actualiza setConversations)
      _setActiveConversation((prev: Conversation | null) => 
        prev ? { ...prev, labels } : null
      );
      debugLog.log(`✅ Etiquetas actualizadas para conversación ${activeConversation.id}:`, labels);
    } catch (error) {
      debugLog.error('Error actualizando etiquetas:', error);
    }
  };

  // Eliminar conversación completa
  const handleDeleteConversation = () => {
    if (!activeConversation) return;
    setConfirmDialog({
      show: true,
      title: 'Eliminar conversación',
      message: `¿Estás seguro de que quieres eliminar la conversación con ${activeConversation.contact?.name}? Esta acción eliminará todos los mensajes y no se puede deshacer.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteConversation(activeConversation.id);
          _setActiveConversation(null);
        } catch (error) {
          debugLog.error('Error eliminando conversación:', error);
        }
        setConfirmDialog(prev => ({ ...prev, show: false }));
      }
    });
  };

  // Actualizar prioridad
  const handleUpdatePriority = async (priority: string | null) => {
    if (!activeConversation) return;
    try {
      await updateConversationPriority(activeConversation.id, priority);
      _setActiveConversation((prev: Conversation | null) => prev ? { ...prev, priority } : null);
    } catch (error) {
      debugLog.error('Error actualizando prioridad:', error);
    }
  };

  // Cargar respuestas rápidas
  const loadCannedResponses = useCallback(async () => {
    const responses = await getCannedResponses();
    setCannedResponses(responses);
  }, [getCannedResponses]);

  // Detectar "/" en el input para mostrar respuestas rápidas
  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Detectar si el usuario está escribiendo un shortcode "/"
    if (value.startsWith('/')) {
      const filter = value.slice(1).toLowerCase();
      setCannedFilter(filter);
      if (!showCannedResponses) {
        loadCannedResponses();
        setShowCannedResponses(true);
      }
    } else {
      setShowCannedResponses(false);
      setCannedFilter('');
    }
  };

  // Seleccionar respuesta rápida
  const handleSelectCannedResponse = (response: CannedResponse) => {
    setNewMessage(response.content);
    setShowCannedResponses(false);
    setCannedFilter('');
    document.getElementById('message-input')?.focus();
  };

  // Cargar notas del contacto activo
  const loadContactNotes = useCallback(async () => {
    if (!activeConversation?.contact?.id) return;
    const notes = await getContactNotes(activeConversation.contact.id);
    setContactNotes(notes);
  }, [activeConversation?.contact?.id, getContactNotes]);

  // Crear nota
  const handleCreateNote = async () => {
    if (!newNoteText.trim() || !activeConversation?.contact?.id) return;
    try {
      const note = await createContactNote(activeConversation.contact.id, newNoteText.trim());
      if (note) {
        setContactNotes(prev => [note, ...prev]);
      }
      setNewNoteText('');
    } catch (error) {
      debugLog.error('Error creando nota:', error);
    }
  };

  // Eliminar nota
  const handleDeleteNote = async (noteId: number) => {
    if (!activeConversation?.contact?.id) return;
    try {
      await deleteContactNote(activeConversation.contact.id, noteId);
      setContactNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (error) {
      debugLog.error('Error eliminando nota:', error);
    }
  };

  // Cargar notas cuando cambie la conversación activa
  useEffect(() => {
    if (activeConversation?.contact?.id && showNotes) {
      loadContactNotes();
    }
  }, [activeConversation?.contact?.id, showNotes]);

  // Merge duplicados
  const handleMergeDuplicates = () => {
    setConfirmDialog({
      show: true,
      title: 'Fusionar duplicados',
      message: '¿Deseas fusionar automáticamente las conversaciones duplicadas? Se mantendrá la más reciente.',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await forceMergeDuplicates();
          // Recargar conversaciones
          window.location.reload();
        } catch (error) {
          debugLog.error('Error fusionando duplicados:', error);
        }
        setConfirmDialog(prev => ({ ...prev, show: false }));
      }
    });
  };

  // Exponer mutedConversations globalmente al montar
  React.useEffect(() => {
    (window as unknown as { __mutedConversations: Set<number> }).__mutedConversations = mutedConversations;
  }, [mutedConversations]);

  // 9 TYPING INDICATOR - Simular "escribiendo..."
  const handleTypingIndicator = () => {
    // En una implementación real, esto vendría del WebSocket
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
      // Stagear el primer archivo para preview (solo 1 a la vez)
      stageFile(files[0]);
      setDraggedFiles([]);
    }
  };

  // 📎 Stagear archivo para preview antes de enviar
  const stageFile = (file: File) => {
    // Validar tamaño máximo (16MB para WhatsApp)
    const MAX_FILE_SIZE = 16 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      triggerToast(`Archivo demasiado grande. Máximo 16MB (actual: ${(file.size / 1024 / 1024).toFixed(2)}MB)`, 'warning');
      return;
    }
    // Limpiar preview anterior
    if (stagedFilePreviewUrl) URL.revokeObjectURL(stagedFilePreviewUrl);
    setStagedFile(file);
    setStagedFilePreviewUrl(URL.createObjectURL(file));
    setFileCaption('');
    // Focus en el input de caption después de renderizar
    setTimeout(() => fileCaptionInputRef.current?.focus(), 100);
  };

  // 📎 Cancelar archivo stageado
  const cancelStagedFile = () => {
    if (stagedFilePreviewUrl) URL.revokeObjectURL(stagedFilePreviewUrl);
    setStagedFile(null);
    setStagedFilePreviewUrl(null);
    setFileCaption('');
  };

  // 📎 Enviar archivo stageado con caption opcional
  const sendStagedFile = async () => {
    if (!stagedFile) return;
    const caption = fileCaption.trim() || undefined;
    const file = stagedFile;
    cancelStagedFile(); // Limpiar preview inmediatamente
    await handleSendAttachment(file, caption);
  };

  const handleSendAttachment = async (file: File, caption?: string) => {
    if (!activeConversation) return;
    
    // Validar tamaño máximo (16MB para WhatsApp)
    const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB
    if (file.size > MAX_FILE_SIZE) {
      triggerToast(`Archivo demasiado grande. Máximo 16MB (actual: ${(file.size / 1024 / 1024).toFixed(2)}MB)`, 'warning');
      return;
    }
    
    setIsUploadingFile(true);
    setUploadProgress(file.name);
    
    // 🚀 Crear mensaje optimista para mostrar inmediatamente en el chat
    const tempId = `temp-file-${Date.now()}-${Math.random()}`;
    const nowTimestamp = Math.floor(Date.now() / 1000);
    const displayContent = caption ? `📎 ${file.name}\n${caption}` : `📎 ${file.name}`;
    const optimisticMessage = {
      id: tempId,
      content: displayContent,
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
      setConversations((prevConversations: Conversation[]) => {
        return prevConversations.map((conv: Conversation) => {
          if (conv.id === activeConversation.id) {
            return {
              ...conv,
              last_message: {
                content: displayContent,
                timestamp: nowTimestamp,
                sender: 'agent',
                attachments: []
              },
              updated_at: new Date().toISOString(),
              last_activity_at: nowTimestamp
            } as Conversation;
          }
          return conv;
        }).sort((a: Conversation, b: Conversation) => {
          const timeA = Number(a.last_activity_at || a.timestamp || 0);
          const timeB = Number(b.last_activity_at || b.timestamp || 0);
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
          conversation_id: activeConversation.id,
          ...(caption ? { content: caption } : {})
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
        setConversations((prevConversations: Conversation[]) => {
          return prevConversations.map((conv: Conversation) => {
            if (conv.id === activeConversation.id) {
              return {
                ...conv,
                last_message: {
                  content: displayContent,
                  timestamp: nowTimestamp,
                  sender: 'agent',
                  attachments: []
                },
                updated_at: new Date().toISOString(),
                last_activity_at: nowTimestamp
              } as Conversation;
            }
            return conv;
          });
        });
      } else {
        debugLog.error('âŒ Error del servidor:', data);
        // Remover mensaje optimista si falló
        _setActiveConversation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages?.filter(msg => msg.id !== tempId) || []
          };
        });
        triggerToast(`Error al enviar archivo: ${data.message || data.error || 'Error desconocido'}`, 'error');
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
      triggerToast('Error de conexión al enviar archivo', 'error');
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
      triggerToast('No se pudo acceder al micrófono', 'error');
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
    
    // UI Optimista: mostrar mensaje inmediatamente
    const tempId = `temp-audio-${Date.now()}-${Math.random()}`;
    const nowTimestamp = Math.floor(Date.now() / 1000);
    const optimisticMessage = {
      id: tempId,
      content: '🎤 Mensaje de voz',
      created_at: new Date().toISOString(),
      timestamp: nowTimestamp,
      message_type: 'outgoing',
      sender: 'agent',
      conversation_id: activeConversation.id,
      status: 'sending',
      _isOptimistic: true,
      attachments: [{ file_type: 'audio', file_name: 'audio-message.webm', data_url: URL.createObjectURL(audioBlob) }]
    };
    
    if (activeConversation.messages) {
      _setActiveConversation({ ...activeConversation, messages: [...activeConversation.messages, optimisticMessage] });
      setConversations((prev: Conversation[]) => prev.map((conv: Conversation) => 
        conv.id === activeConversation.id ? { ...conv, last_message: { content: '🎤 Mensaje de voz', timestamp: nowTimestamp, sender: 'agent', attachments: [] }, updated_at: new Date().toISOString(), last_activity_at: nowTimestamp } as Conversation : conv
      ).sort((a: Conversation, b: Conversation) => Number(b.last_activity_at || b.timestamp || 0) - Number(a.last_activity_at || a.timestamp || 0)));
    }
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio-message.webm');
    formData.append('conversation_id', activeConversation.id.toString());
    formData.append('message_type', 'outgoing');
    formData.append('content', '🎤 Mensaje de voz');
    
    try {
      debugLog.log('🎤 Enviando audio, tamaño:', audioBlob.size, 'tipo:', audioBlob.type);
      
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
        _setActiveConversation(prev => {
          if (!prev) return prev;
          return { ...prev, messages: prev.messages?.map((msg: Message) => msg.id === tempId ? { ...msg, status: 'sent', id: data.payload?.id || tempId } : msg) || [] };
        });
      } else {
        debugLog.error('âŒ Error del servidor:', data);
        _setActiveConversation(prev => {
          if (!prev) return prev;
          return { ...prev, messages: prev.messages?.filter((msg: Message) => msg.id !== tempId) || [] };
        });
        triggerToast(`Error al enviar audio: ${data.message || 'Error desconocido'}`, 'error');
      }
    } catch (error) {
      debugLog.error('💥 Error enviando audio:', error);
      _setActiveConversation(prev => {
        if (!prev) return prev;
        return { ...prev, messages: prev.messages?.filter((msg: Message) => msg.id !== tempId) || [] };
      });
      triggerToast('Error de conexión al enviar audio', 'error');
    } finally {
      setIsSendingAudio(false);
    }
  };

  // 3 MULTIMEDIA GALLERY - Extraer multimedia de la conversación
  const getMediaFromConversation = () => {
    if (!activeConversation?.messages) return { images: [], files: [], links: [] };
    
    const images: ResolvedAttachment[] = [];
    const files: ResolvedAttachment[] = [];
    const links: { url: string; message_id?: number | string; created_at?: string | number }[] = [];
    
    // Helper para detectar si es imagen
    const isImage = (att: ResolvedAttachment): boolean => {
      // Verificar por file_type o content_type (puede ser int: 0=image, o string)
      const rawType = att.file_type ?? att.content_type ?? '';
      const mimeType = String(rawType).toLowerCase();
      if (mimeType === 'image' || mimeType === '0' || mimeType.startsWith('image/')) return true;
      
      // ✅ Verificar content_type por separado (imágenes enviadas como documento)
      const contentType = String(att.content_type || '').toLowerCase();
      if (contentType.startsWith('image/')) return true;
      
      // Verificar por extensión en la URL (data_url primero, es lo que devuelve el backend)
      const url = att.data_url || att.file_url || att.url || att.thumb_url || '';
      const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i;
      if (imageExtensions.test(url)) return true;
      
      // Verificar por nombre de archivo
      const fileName = att.file_name || att.name || '';
      if (imageExtensions.test(fileName)) return true;
      
      return false;
    };
    
    // Helper para detectar tipo de archivo (video, audio, pdf, etc.)
    const getFileCategory = (att: ResolvedAttachment, fileName: string): string => {
      // file_type puede ser int (0=image,1=audio,2=video,3=file) o string
      const rawType = att.file_type ?? att.content_type ?? '';
      const mimeType = String(rawType).toLowerCase();
      const nameLower = fileName.toLowerCase();
      
      // Video
      if (mimeType === 'video' || mimeType === '2' || mimeType.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(nameLower)) {
        return 'video';
      }
      
      // Audio
      if (mimeType === 'audio' || mimeType === '1' || mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|oga|m4a|aac|flac|wma)$/i.test(nameLower)) {
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
    const getFileName = (att: ResolvedAttachment): string => {
      // Prioridad: file_name > name > extraer de URL
      if (att.file_name && att.file_name !== 'Archivo') return att.file_name;
      if (att.name) return att.name;
      
      // Intentar extraer de la URL (data_url primero, es lo que devuelve el backend)
      const url = att.data_url || att.file_url || att.url || att.thumb_url || '';
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
    
    activeConversation.messages.forEach((msg: Message) => {
      // Buscar archivos en attachments
      if (msg.attachments && Array.isArray(msg.attachments)) {
        (msg.attachments as ResolvedAttachment[]).forEach((att: ResolvedAttachment) => {
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
    // 🚫 NUNCA hacer scroll al fondo mientras se cargan mensajes anteriores
    if (isLoadingMoreRef.current) {
      return;
    }
    const container = messagesContainerRef.current;
    debugLog.log('scrollToBottom llamado - behavior:', behavior, 'container existe:', !!container);
    if (container) {
      if (behavior === 'smooth') {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, []);

  // ✅ ARREGLADO: Auto-scroll inteligente - solo si el usuario está cerca del fondo
  useEffect(() => {
    if (activeConversation?.messages && (activeConversation?.messages || []).length > 0) {
      const currentMessageCount = (activeConversation?.messages || []).length;
      const container = messagesContainerRef.current;
      
      // Detectar si hay nuevos mensajes (no es el primer load)
      if (previousMessageCount > 0 && currentMessageCount > previousMessageCount) {
        // 🚫 Si estamos cargando mensajes más antiguos (loadMore), NO hacer scroll al fondo
        if (isLoadingMoreRef.current) {
          debugLog.log('🛑 LoadMore en progreso - NO hacer scroll automático al fondo');
          setPreviousMessageCount(currentMessageCount);
          return;
        }
        
        // ✅ VERIFICAR: Solo mostrar separador si el último mensaje NO es tuyo
        const lastMessage = activeConversation.messages[activeConversation.messages.length - 1];
        const esIncoming = lastMessage?.message_type === 'incoming' || lastMessage?.message_type === 'incoming';
        const esOutgoing = lastMessage?.message_type === 'outgoing' || lastMessage?.message_type === 'outgoing';
        
        debugLog.log('📨 Nuevos mensajes detectados:', currentMessageCount - previousMessageCount);
        
        // Solo mostrar separador si es mensaje INCOMING (de otro usuario)
        if (esIncoming) {
          setNewMessageSeparatorIndex(previousMessageCount);
          setTimeout(() => {
            setNewMessageSeparatorIndex(null);
          }, 3000);
        }
        
        // ✅ NUEVO: Solo hacer scroll si el usuario está cerca del fondo O si es su propio mensaje
        if (container && !isLoadingMoreRef.current) {
          const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
          const isNearBottom = distanceFromBottom < 150; // Menos de 150px del fondo
          
          // Hacer scroll si: está cerca del fondo O si es su propio mensaje
          if (isNearBottom || esOutgoing) {
            requestAnimationFrame(() => {
              if (messagesContainerRef.current && !isLoadingMoreRef.current) {
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
      if (isLoadingMoreRef.current) {
        return; // No hacer scroll durante loadMore
      }
      
      requestAnimationFrame(() => {
        if (messagesContainerRef.current && !isLoadingMoreRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      });
    };

    // Solo hacer scroll inicial al cambiar de conversación (no durante loadMore)
    if (!isLoadingMoreRef.current) {
      scrollToBottomOnce();
    }
    
  }, [activeConversation?.id]); // Solo cuando cambia la conversación, NO en cada mensaje

  //  Scroll automático al primer mensaje que coincide con la búsqueda
  useEffect(() => {
    if (searchTerm && searchResults && activeConversation?.messages) {
      // Esperar a que los mensajes se rendericen
      setTimeout(() => {
        // Buscar el primer mensaje que contiene el término (sin acentos)
        const messages = activeConversation.messages || [];
        const searchNorm = normalizeText(searchTerm);
        const firstMatchIndex = messages.findIndex((msg: Message) => 
          msg.content ? normalizeText(msg.content).includes(searchNorm) : false
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
      const searchNorm = normalizeText(searchTerm);
      activeConversation.messages.forEach((msg: Message) => {
        if (msg.content) {
          const contentNorm = normalizeText(msg.content);
          let pos = 0;
          while ((pos = contentNorm.indexOf(searchNorm, pos)) !== -1) {
            count++;
            pos += searchNorm.length;
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
      // Filtros avanzados: Ctrl+Shift+F (no overrides browser's Ctrl+F)
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setShowAdvancedFilters(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // FASE 3: Scroll automatico al navegar resultados de busqueda
  useEffect(() => {
    if (messageSearchResults.length > 0 && currentSearchIndex < messageSearchResults.length) {
      const messageId = messageSearchResults[currentSearchIndex];
      setTimeout(() => {
        const element = document.getElementById(`message-${messageId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [currentSearchIndex, messageSearchResults]);

  // Funciones para el modal de editar contacto
  const handleOpenEditModal = () => {
    if (activeConversation) {
      const contact = activeConversation.contact;
      
      debugLog.log(' DEBUG - Abriendo modal de edición:', {
        'activeConversation completo': activeConversation,
        'contact': contact,
        'contact.name': contact?.name,
        'contact.phone_number': contact?.phone_number,
        'contact.email': contact?.email,
        'contact.id': contact?.id
      });
      
      //  L?GICA BASADA EN LA BD DE CHATWOOT:
      // - phone_number: SIEMPRE tiene el número correcto (ej: +56984680080)
      // - name: Puede ser el nombre real O el número si no tiene nombre
      // - identifier: Es el WhatsApp ID (ej: 56984680080@s.whatsapp.net)
      
      const phoneNumber = contact?.phone_number || contact?.name || '';
      const nameValue = contact?.name || '';
      
      // Determinar si 'name' es solo un número (sin nombre real asignado)
      // o si es un nombre real (con letras/caracteres especiales)
      const isPhoneNumber = /^[+\d]+$/.test(nameValue);
      
      debugLog.log(' Valores a setear:', {
        phoneNumber,
        nameValue,
        isPhoneNumber,
        'nombre final': isPhoneNumber ? '' : nameValue,
        'teléfono final': phoneNumber
      });
      
      // Si name es solo el número, dejamos el campo nombre vacío para que el usuario lo complete
      // Si name tiene letras/caracteres, es un nombre real
      setEditName(isPhoneNumber ? '' : nameValue);
      
      // SIEMPRE usar phone_number como fuente confiable del teléfono
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
      || (activeConversation as unknown as { contact_inbox?: { contact_id?: number } })?.contact_inbox?.contact_id;

    if (!contactId) {
      debugLog.error('No se pudo obtener el ID del contacto', {
        'contact': activeConversation?.contact,
        'meta': activeConversation?.meta,
        'contact_inbox': activeConversation?.contact_inbox
      });
      triggerToast('Error: No hay contacto activo', 'error');
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
      triggerToast('Contacto actualizado exitosamente');
      
      // Cerrar modal
      setIsEditModalOpen(false);
    } catch (error) {
      debugLog.error('Error guardando contacto:', error);
      triggerToast('Error al actualizar el contacto', 'error');
    }
  };

  // Handlers para opciones del men??
  const handleDownloadChat = () => {
    if (!activeConversation) {
      triggerToast('Selecciona una conversación primero', 'warning');
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
          const timeA = Number(a.created_at || a.timestamp || 0);
          const timeB = Number(b.created_at || b.timestamp || 0);
          return timeA - timeB;
        });
        
        mensajesOrdenados.forEach((msg: Message) => {
          const timestamp = msg.created_at || msg.timestamp;
          const fecha = timestamp ? new Date(Number(timestamp) * 1000).toLocaleString('es-ES') : 'Sin fecha';
          const esAgente = msg.message_type === 'outgoing' || msg.sender === 'agent';
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
      const mensajesAgente = activeConversation.messages?.filter((m: Message) => 
        m.message_type === 'outgoing' || m.sender === 'agent'
      ).length || 0;
      
      const mensajesCliente = activeConversation.messages?.filter((m: Message) => 
        m.message_type === 'incoming' || m.sender === 'user'
      ).length || 0;
      
      const primerMensaje = activeConversation.messages?.[0];
      const ultimoMensaje = activeConversation.messages?.[(activeConversation?.messages || []).length - 1];
      
      const fechaPrimer = primerMensaje?.created_at || primerMensaje?.timestamp;
      const fechaUltimo = ultimoMensaje?.created_at || ultimoMensaje?.timestamp;
      
      const statsData = [
        ['ESTAD?STICAS DE LA CONVERSACI?N'],
        [''],
        ['Métrica', 'Valor'],
        ['Total de mensajes', (activeConversation.messages?.length || 0).toString()],
        ['Mensajes del agente', mensajesAgente.toString()],
        ['Mensajes del cliente', mensajesCliente.toString()],
        ['Mensajes no leídos', (activeConversation.unread_count || 0).toString()],
        [''],
        ['Primer mensaje', fechaPrimer ? new Date(Number(fechaPrimer) * 1000).toLocaleString('es-ES') : 'N/A'],
        ['?ltimo mensaje', fechaUltimo ? new Date(Number(fechaUltimo) * 1000).toLocaleString('es-ES') : 'N/A'],
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
      debugLog.error('âŒ Error al descargar chat:', error);
      triggerToast('Error al generar el archivo Excel', 'error');
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

      const conversationsWithMessages = result.data.sort((a: Conversation, b: Conversation) => a.id - b.id);
      
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

      conversationsWithMessages.forEach((conv: Conversation, index: number) => {
        // Actualizar progreso cada 10 conversaciones
        if (index % 10 === 0) {
          const progress = 35 + Math.floor((index / (conversationsWithMessages || []).length) * 25);
          setDownloadProgress(progress);
          setDownloadStatus(`Procesando contacto ${index + 1} de ${(conversationsWithMessages || []).length}...`);
        }
        
        //  Buscar datos actualizados del contacto en el estado local
        const localConv = conversations.find((c: Conversation) => c.id === conv.id);
        const contactData = localConv?.contact || conv.contact || {};
        
        const contacto = conv.meta?.sender || contactData || {};
        const telefono = contactData.phone_number || contacto.phone_number || contacto.identifier || 'N/A';
        const email = contactData.email || contacto.email || 'N/A';
        const nombreContacto = contactData.name || conv.contact?.name || 'Sin nombre';
        const fechaCreacion = conv.created_at ? 
          new Date(conv.created_at).toLocaleString('es-ES') : 'N/A';

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
      conversationsWithMessages.forEach((conv: Conversation, convIndex: number) => {
        // Actualizar progreso cada 5 conversaciones
        if (convIndex % 5 === 0) {
          const progress = 60 + Math.floor((convIndex / (conversationsWithMessages || []).length) * 35);
          setDownloadProgress(progress);
          setDownloadStatus(`Procesando mensajes ${convIndex + 1}/${(conversationsWithMessages || []).length}...`);
        }
        
        if (conv.messages && (conv?.messages || []).length > 0) {
          //  Buscar datos actualizados del contacto en el estado local
          const localConv = conversations.find((c: Conversation) => c.id === conv.id);
          const contactData = localConv?.contact || conv.contact || {};
          const nombreContacto = contactData.name || conv.contact?.name || 'Sin nombre';
          
          // Ordenar mensajes por created_at
          const mensajesOrdenados = [...conv.messages].sort((a, b) => Number(a.created_at || 0) - Number(b.created_at || 0));
          
          mensajesOrdenados.forEach((msg: Message) => {
            const fecha = new Date(Number(msg.created_at) * 1000).toLocaleString('es-ES');
            const remitente = msg.message_type === 'outgoing' 
              ? (conv.assignee?.name || 'Agente')
              : nombreContacto;
            const tipo = msg.message_type === 'outgoing' ? 'Agente' : 'Cliente';

            todosMensajesData.push([
              String(conv.id),
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

      const conversacionesAbiertas = conversationsWithMessages.filter((c: Conversation) => c.status === 'open').length;
      const conversacionesResueltas = conversationsWithMessages.filter((c: Conversation) => c.status === 'resolved').length;
      const totalNoLeidos = conversationsWithMessages.reduce((sum: number, c: Conversation) => sum + (c.unread_count || 0), 0);

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
      
      // Cerrar modal después de 5 segundos en error
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

  // ?? OPTIMIZACIÓN: Funciones extraídas a ../utils/ para mejor performance y reutilización
  // formatTimestamp, getPriorityColor, getStatusColor ahora se importan desde ../utils/

  // ?? GUARDIA: Prevenir render si conversations es undefined
  if (!conversations) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${!t ? 'border-blue-500' : ''}`} style={t ? { borderColor: t.accent } : undefined}></div>
      </div>
    );
  }

  // ?? GUARDIA: Prevenir render si conversations es undefined
  if (!conversations) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${!t ? 'border-blue-500' : ''}`} style={t ? { borderColor: t.accent } : undefined}></div>
      </div>
    );
  }

  if (conversationsLoading && (conversations || []).length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white/20 backdrop-blur-2xl">
        <div className="flex items-center space-x-3">
          <Loader2 className={`w-6 h-6 animate-spin ${!t ? 'text-blue-500' : ''}`} style={t ? { color: t.accent } : undefined} />
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
            className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center space-x-2 mx-auto ${!t ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
            style={t ? { backgroundColor: t.accent } : undefined}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex h-full backdrop-blur-3xl border overflow-hidden ${!t ? 'bg-white/10 border-white/20' : ''}`}
      style={t ? { background: t.containerBg, borderColor: t.panelBorder } : undefined}
    >
      
      {/* Lista de Conversaciones - Panel Izquierdo */}
      <div 
        className={`backdrop-blur-2xl flex flex-col shadow-sm border-r ${!t ? 'bg-white/35 border-white/30' : ''}`}
        style={{ width: `${leftPanelWidth}%`, ...(t ? { background: t.panelBg, borderColor: t.panelBorder } : {}) }}
      >
        
        {/* Header de Conversaciones */}
        <div className={`p-4 border-b backdrop-blur-xl shadow-sm ${!t ? 'bg-white/60 border-gray-200/40' : ''}`}
          style={t ? { background: t.headerBg, borderColor: t.headerBorder } : undefined}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg shadow-md ${!t ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : ''}`} style={t ? { background: t.accent } : undefined}>
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Conversaciones</h2>
                <p className={`text-sm ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                  {(conversations || []).length} de {totalConversations} {hasMorePages && '(m?s disponibles)'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* FASE 3: Boton de filtros avanzados */}
              <button
                onClick={() => setShowAdvancedFilters(true)}
                className={`p-2 shadow-sm hover:shadow rounded-xl transition-all duration-300 backdrop-blur-sm border relative ${!t ? 'bg-white/70 hover:bg-white/90 border-gray-200/30' : ''}`}
                style={t ? { background: t.buttonBg, borderColor: t.buttonBorder } : undefined}
                title="Filtros avanzados (Ctrl+F)"
              >
                <Filter className={`w-4 h-4 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.textPrimary } : undefined} />
                {appliedFilters && (
                  appliedFilters.dateRange !== 'all' ||
                  (appliedFilters.status && appliedFilters.status.length > 0) ||
                  (appliedFilters.priority && appliedFilters.priority.length > 0) ||
                  (appliedFilters.labels && appliedFilters.labels.length > 0) ||
                  appliedFilters.unreadOnly ||
                  (appliedFilters.assignedTo && appliedFilters.assignedTo !== 'all')
                ) && (
                  <span className='absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold'>
                    !
                  </span>
                )}
              </button>

              {/* Menu de configuracion */}
              <div className="relative" ref={settingsMenuRef}>
                <button 
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`p-2 shadow-sm hover:shadow rounded-xl transition-all duration-300 backdrop-blur-sm border ${!t ? 'bg-white/70 hover:bg-white/90 border-gray-200/30' : ''}`}
                  style={t ? { background: t.buttonBg, borderColor: t.buttonBorder } : undefined}
                  title="Configuración"
                >
                  <Settings className={`w-4 h-4 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.textPrimary } : undefined} />
                </button>
                
                {/* Menu desplegable */}
                {isSettingsOpen && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border py-2 z-50 animate-fade-in ${!t ? 'bg-white border-gray-200' : ''}`}
                    style={t ? { background: t.dropdownBg, borderColor: t.dropdownBorder } : undefined}
                  >
                    <button
                      onClick={handleDownloadChat}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center space-x-2 ${!t ? 'text-gray-700 hover:bg-gray-100' : ''}`}
                      style={t ? { color: t.textPrimary } : undefined}
                      disabled={!activeConversation}
                    >
                      <span></span>
                      <span>Descargar chat</span>
                    </button>

                    <button
                      onClick={handleDownloadAllConversations}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center space-x-2 ${!t ? 'text-gray-700 hover:bg-gray-100' : ''}`}
                      style={t ? { color: t.textPrimary } : undefined}
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
              <Loader2 className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 z-10 animate-spin ${!t ? 'text-blue-500' : ''}`} style={t ? { color: t.accent } : undefined} />
            ) : (
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 z-10 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
            )}
            <input
              type="text"
              placeholder="Buscar en todas las conversaciones"
              className={`w-full pl-10 pr-10 py-2 border rounded-xl backdrop-blur-xl transition-all duration-300 focus:ring-2 ${!t ? 'focus:ring-blue-400/50 focus:border-blue-300 bg-white/70 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:bg-white' : 'placeholder-gray-500'}`}
              style={t ? { background: t.inputBg, borderColor: t.inputBorder, color: t.inputText, '--tw-ring-color': t.accent } as React.CSSProperties : undefined}
              style={t ? { background: t.inputBg, borderColor: t.inputBorder, color: t.inputText } : undefined}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSearchResults(null);
                }}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${!t ? 'text-gray-400 hover:text-gray-600' : ''}`}
                style={t ? { color: t.textMuted } : undefined}
                title="Limpiar busqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Indicador de resultados de búsqueda */}
          {searchTerm && searchTerm.length >= 2 && !isSearching && (
            <div className={`mb-3 px-3 py-2.5 bg-gradient-to-r border rounded-xl text-xs font-semibold shadow-md backdrop-blur-sm ${!t ? 'from-blue-50 to-blue-100 border-blue-300 text-blue-800' : ''}`}
              style={t ? { background: t.panelBg, borderColor: t.panelBorder, color: t.textPrimary } : undefined}
            >
              {(filteredConversations || []).length === 0 ? (
                <span>🔍 No se encontraron resultados para "{searchTerm}"</span>
              ) : (
                <span>🔍 {(filteredConversations || []).length} conversación{(filteredConversations || []).length !== 1 ? 'es' : ''} encontrada{(filteredConversations || []).length !== 1 ? 's' : ''}</span>
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
                    ? (!t ? 'bg-blue-500 text-white shadow-md' : 'text-white shadow-md')
                    : !t ? 'bg-white/30 text-gray-700 hover:bg-white/50 border border-gray-200/50' : 'border'
                }`}
                style={selectedFilter === filter.id && t ? { backgroundColor: t.accent } : selectedFilter !== filter.id && t ? { background: t.buttonBg, borderColor: t.buttonBorder, color: t.textPrimary } : undefined}
              >
                <span>{filter.icon}</span>
                <span>{filter.label}</span>
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  selectedFilter === filter.id 
                    ? 'bg-white/30 text-white' 
                    : !t ? 'bg-gray-200 text-gray-600' : ''
                }`}
                  style={selectedFilter !== filter.id && t ? { background: t.badgeBg, color: t.badgeText } : undefined}
                >
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
              <MessageCircle className={`w-12 h-12 mx-auto mb-4 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
              <p className={`${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSecondary } : undefined}>
                {searchTerm 
                  ? `No se encontraron resultados para "${searchTerm}"`
                  : 'No hay conversaciones'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className={`mt-4 text-sm ${!t ? 'text-blue-600 hover:text-blue-700' : ''}`}
                  style={t ? { color: t.accent } : undefined}
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
                    className={`p-4 border-b cursor-pointer transition-all duration-300 ${!t ? 'border-gray-100/40 hover:bg-blue-50/60' : ''} ${
                      activeConversation?.id === conversation.id ? (!t ? 'border-r-4 border-r-blue-500 shadow-inner' : 'border-r-4 shadow-inner') : ''
                    } ${activeConversation?.id === conversation.id && !t ? 'bg-blue-50/80' : ''}`}
                    style={t ? { borderBottomColor: t.cardBorder, ...(activeConversation?.id === conversation.id ? { background: t.cardActive, borderRightColor: t.accent } : {}) } : undefined}
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
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white ${
                            conversation.priority === 'urgent'
                              ? 'bg-gradient-to-r from-red-500 to-red-600'
                              : (!t ? 'bg-gradient-to-r from-blue-500 to-blue-600' : '')
                          }`}
                          style={{ display: conversation.contact.avatarUrl ? 'none' : 'flex', ...(conversation.priority !== 'urgent' && t ? { background: t.accent } : {}) }}
                        >
                          {formatAvatar(conversation.contact.avatar, conversation.contact.name)}
                        </div>
                        {conversation.contact.status === 'online' && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-semibold truncate ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                            {searchTerm && conversation.contact?.name ? (() => {
                              const normName = normalizeText(conversation.contact.name);
                              const normSearch = normalizeText(searchTerm);
                              const pos = normName.indexOf(normSearch);
                              if (pos === -1) return conversation.contact.name;
                              const before = conversation.contact.name.substring(0, pos);
                              const match = conversation.contact.name.substring(pos, pos + normSearch.length);
                              const after = conversation.contact.name.substring(pos + normSearch.length);
                              return <>{before}<span className="bg-yellow-200 text-yellow-900 rounded px-0.5">{match}</span>{after}</>;
                            })() : conversation.contact.name}
                          </h4>
                          <span className={`text-xs ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{formatTimestamp(conversation.last_message.timestamp || 0)}</span>
                        </div>
                        
                        <p className={`text-sm truncate mb-2 ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSecondary } : undefined}>
                          {searchTerm && (conversation._matchingMessage as Message | undefined)?.content ? (
                            // Mostrar mensaje que coincide con la búsqueda (estilo WhatsApp)
                            (() => {
                              const matchMsg = conversation._matchingMessage as Message;
                              const content = matchMsg.content!;
                              const normContent = normalizeText(content);
                              const normSearch = normalizeText(searchTerm);
                              const matchPos = normContent.indexOf(normSearch);
                              if (matchPos === -1) return formatLastMessagePreview(content, matchMsg.attachments as { file_type?: string | number; content_type?: string; data_url?: string; file_name?: string }[]);
                              
                              // Mostrar contexto alrededor del match
                              const start = Math.max(0, matchPos - 20);
                              const prefix = start > 0 ? '...' : '';
                              const before = content.substring(start, matchPos);
                              const match = content.substring(matchPos, matchPos + normSearch.length);
                              const after = content.substring(matchPos + normSearch.length, matchPos + normSearch.length + 30);
                              const suffix = matchPos + normSearch.length + 30 < content.length ? '...' : '';
                              
                              return (
                                <>
                                  🔍 {prefix}{before}<span className="bg-yellow-200 text-yellow-900 font-semibold rounded px-0.5">{match}</span>{after}{suffix}
                                </>
                              );
                            })()
                          ) : (
                            formatLastMessagePreview(conversation.last_message.content, conversation.last_message.attachments)
                          )}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(conversation.priority || 'none')}`}>
                              {{ urgent: 'Urgente', high: 'Alta', medium: 'Media', low: 'Baja', none: 'Sin' }[conversation.priority as string] || conversation.priority}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(conversation.status || 'open')}`}>
                              {{ open: 'Abierta', resolved: 'Resuelta', pending: 'Pendiente', snoozed: 'Pospuesta' }[conversation.status as string] || conversation.status}
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
                            {conversation.labels.map((label, index) => (
                              <span 
                                key={index} 
                                className="px-2 py-0.5 text-xs rounded-full text-white"
                                style={{ backgroundColor: getLabelColor(label) }}
                              >
                                #{label}
                              </span>
                            ))}
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
              <Loader2 className={`w-5 h-5 animate-spin mr-2 ${!t ? 'text-blue-500' : ''}`} style={t ? { color: t.accent } : undefined} />
              <span className={`text-sm ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSecondary } : undefined}>Cargando más...</span>
            </div>
          )}
        </div>
      </div>

      {/* Divisor Redimensionable */}
      <div 
        className={`w-1 cursor-col-resize transition-all duration-200 relative group ${!t ? 'bg-gray-200/30 hover:bg-gray-300/50' : ''}`}
        style={t ? { background: t.divider } : undefined}
        onMouseDown={() => setIsResizing(true)}
      >
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-gray-400/10" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex flex-col gap-1">
            <div className={`w-0.5 h-1 rounded ${!t ? 'bg-gray-400/70' : ''}`} style={t ? { background: t.textMuted } : undefined}></div>
            <div className={`w-0.5 h-1 rounded ${!t ? 'bg-gray-400/70' : ''}`} style={t ? { background: t.textMuted } : undefined}></div>
            <div className={`w-0.5 h-1 rounded ${!t ? 'bg-gray-400/70' : ''}`} style={t ? { background: t.textMuted } : undefined}></div>
          </div>
        </div>
      </div>

      {/* Chat Principal - Panel Central */}
      <div 
        className={`flex-1 flex flex-col backdrop-blur-xl relative ${!t ? 'bg-white/10' : ''}`}
        style={t ? { background: t.chatBg } : undefined}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* DRAG & DROP OVERLAY - Nivel superior */}
        {isDragging && activeConversation && (
          <div className={`absolute inset-0 z-50 backdrop-blur-sm border-4 border-dashed flex items-center justify-center pointer-events-none ${!t ? 'bg-blue-600/40 border-blue-400' : ''}`} style={t ? { backgroundColor: `color-mix(in srgb, ${t.accent} 40%, transparent)`, borderColor: t.accent } : undefined}>
            <div className="text-center bg-white/95 p-8 rounded-2xl shadow-2xl transform scale-110">
              <Upload className={`w-20 h-20 mx-auto mb-4 animate-bounce ${!t ? 'text-blue-600' : ''}`} style={t ? { color: t.accent } : undefined} />
              <p className={`text-2xl font-bold ${!t ? 'text-blue-800' : ''}`} style={t ? { color: t.accent } : undefined}>Suelta los archivos aquí</p>
              <p className={`text-sm mt-2 ${!t ? 'text-blue-600' : ''}`} style={t ? { color: t.accent } : undefined}>Imágenes, videos, documentos (máx 16MB)</p>
            </div>
          </div>
        )}

        {/* 📎 MODAL PREVIEW DE ARCHIVO — estilo WhatsApp claro, solo panel derecho */}
        {stagedFile && !isUploadingFile && (
          <div className={`absolute inset-0 z-[60] flex flex-col ${!t ? 'bg-gray-50' : ''}`} style={t ? { background: t.containerBg } : undefined}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b shadow-sm ${!t ? 'bg-white border-gray-200' : ''}`} style={t ? { background: t.headerBg, borderColor: t.headerBorder } : undefined}>
              <button
                type="button"
                onClick={cancelStagedFile}
                className={`p-2 rounded-full transition-colors ${!t ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-800' : ''}`}
                style={t ? { color: t.textMuted } : undefined}
                title="Cancelar"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="text-center flex-1 min-w-0 px-4">
                <p className={`text-sm truncate font-medium ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{stagedFile.name}</p>
                <p className={`text-xs ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>{(stagedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <div className="w-10" /> {/* Spacer para centrar */}
            </div>

            {/* Preview area */}
            <div className={`flex-1 flex items-center justify-center p-6 overflow-hidden ${!t ? 'bg-gray-50' : ''}`} style={t ? { background: t.containerBg } : undefined}>
              {stagedFile.type.startsWith('image/') && stagedFilePreviewUrl ? (
                <img
                  src={stagedFilePreviewUrl}
                  alt={stagedFile.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              ) : stagedFile.type.startsWith('video/') && stagedFilePreviewUrl ? (
                <video
                  src={stagedFilePreviewUrl}
                  controls
                  className="max-w-full max-h-full rounded-lg shadow-lg"
                />
              ) : (
                <div className={`flex flex-col items-center gap-4 p-8 rounded-2xl shadow-md ${!t ? 'bg-white' : ''}`} style={t ? { background: t.panelBg } : undefined}>
                  <div className={`w-24 h-24 rounded-2xl flex items-center justify-center ${
                    stagedFile.type.includes('pdf') ? 'bg-red-50' :
                    stagedFile.type.startsWith('audio/') ? 'bg-green-50' :
                    stagedFile.type.includes('word') || stagedFile.type.includes('document') ? 'bg-blue-50' :
                    stagedFile.type.includes('sheet') || stagedFile.type.includes('excel') ? 'bg-emerald-50' :
                    'bg-gray-100'
                  }`}>
                    {stagedFile.type.includes('pdf') ? (
                      <FileText className="w-12 h-12 text-red-500" />
                    ) : stagedFile.type.startsWith('audio/') ? (
                      <Music className="w-12 h-12 text-green-500" />
                    ) : stagedFile.type.includes('word') || stagedFile.type.includes('document') ? (
                      <FileText className="w-12 h-12 text-blue-500" />
                    ) : stagedFile.type.includes('sheet') || stagedFile.type.includes('excel') ? (
                      <FileText className="w-12 h-12 text-emerald-500" />
                    ) : (
                      <File className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <p className={`text-lg font-medium text-center max-w-xs truncate ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{stagedFile.name}</p>
                  <p className={`text-sm ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                    {stagedFile.type.split('/').pop()?.toUpperCase() || 'Archivo'} · {(stagedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>

            {/* Footer: caption + send */}
            <div className={`px-4 py-3 border-t flex items-center gap-3 ${!t ? 'bg-white border-gray-200' : ''}`} style={t ? { background: t.headerBg, borderColor: t.headerBorder } : undefined}>
              <div className="flex-1">
                <input
                  ref={fileCaptionInputRef}
                  type="text"
                  value={fileCaption}
                  onChange={(e) => setFileCaption(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendStagedFile(); } }}
                  placeholder="Escribe un mensaje..."
                  className={`w-full px-4 py-2.5 rounded-full outline-none focus:ring-1 text-sm border ${!t ? 'focus:ring-blue-400 bg-gray-100 text-gray-800 placeholder-gray-400 border-gray-200' : 'placeholder-gray-500'}`}
                  style={t ? { background: t.inputBg, color: t.inputText, borderColor: t.inputBorder, '--tw-ring-color': t.accent } as React.CSSProperties : undefined}
                />
              </div>
              <button
                type="button"
                onClick={sendStagedFile}
                className={`p-3 rounded-full text-white transition-colors shadow-md flex-shrink-0 ${!t ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                style={t ? { backgroundColor: t.accent } : undefined}
                title="Enviar"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {activeConversation ? (
          <>
            {/* Header del Chat */}
            <div 
              className={`p-4 backdrop-blur-xl cursor-pointer transition-all duration-300 border-b ${!t ? 'bg-white/50 hover:bg-white/60 border-gray-200/30' : ''}`}
              style={t ? { background: t.chatHeaderBg, borderColor: t.chatHeaderBorder } : undefined}
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
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white ${!t ? 'bg-gradient-to-r from-blue-500 to-blue-600' : ''}`}
                      style={{ display: activeConversation.contact.avatarUrl ? 'none' : 'flex', ...(t ? { background: t.accent } : {}) }}
                    >
                      {formatAvatar(activeConversation.contact.avatar, activeConversation.contact.name)}
                    </div>
                    {activeConversation.contact.status === 'online' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <h3 className={`font-semibold ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{activeConversation.contact.name}</h3>
                    <p className={`text-sm ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSecondary } : undefined}>{activeConversation.contact.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  {/*  B?SQUEDA EXPANDIBLE ELEGANTE */}
                  <div className={`flex items-center transition-all duration-300 ease-in-out ${
                    showSearchBar ? (!t ? 'bg-white rounded-lg shadow-lg px-3 py-1.5' : 'rounded-lg shadow-lg px-3 py-1.5') : ''
                  }`}
                  style={showSearchBar && t ? { background: t.panelBg } : undefined}
                  >
                    {!showSearchBar ? (
                      <button 
                        onClick={() => setShowSearchBar(true)}
                        className={`p-2 rounded-lg transition-all duration-300 ${!t ? 'bg-white/20 hover:bg-white/30 text-gray-600' : ''}`}
                        style={t ? { background: t.buttonBg, color: t.iconColor } : undefined}
                      >
                        <Search className="w-4 h-4" />
                      </button>

                    ) : (
                      <>
                        <Search className={`w-4 h-4 mr-2 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
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
                          className={`outline-none text-sm bg-transparent w-32 md:w-48 animate-fadeIn ${!t ? 'text-gray-900 placeholder:text-gray-500' : 'placeholder:text-gray-500'}`}
                          style={t ? { color: t.textPrimary } : undefined}
                          autoFocus
                        />
                        
                        {messageSearchResults.length > 0 && (
                          <>
                            <span className="text-xs text-gray-500 whitespace-nowrap ml-2 mr-1">
                              {currentSearchIndex + 1}/{messageSearchResults.length}
                            </span>
                            <button
                              onClick={() => setCurrentSearchIndex(Math.max(0, currentSearchIndex - 1))}
                              disabled={currentSearchIndex === 0}
                              className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30"
                            >
                              <ChevronUp className="w-3 h-3 text-gray-600" />
                            </button>
                            <button
                              onClick={() => setCurrentSearchIndex(Math.min(messageSearchResults.length - 1, currentSearchIndex + 1))}
                              disabled={currentSearchIndex === messageSearchResults.length - 1}
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

                  {/* Controles de navegación duplicados eliminados - ya están arriba */}

                  </div>
                  
                  {/*  SILENCIAR */}
                  <button 
                    onClick={() => handleMuteConversation(activeConversation.id)}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      mutedConversations.has(activeConversation.id)
                        ? 'bg-red-500 text-white shadow-lg' 
                        : !t ? 'bg-white/20 hover:bg-white/30 text-gray-600' : ''
                    }`}
                    style={!mutedConversations.has(activeConversation.id) && t ? { background: t.buttonBg, color: t.iconColor } : undefined}
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
                    className={`p-2 rounded-lg transition-all duration-300 ${!t ? 'bg-white/20 hover:bg-white/30 text-gray-600' : ''}`}
                    style={t ? { background: t.buttonBg, color: t.iconColor } : undefined}
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={toggleRightPanel}
                    className={`p-2 rounded-lg transition-all duration-300 ${!t ? 'bg-white/20 hover:bg-white/30' : ''}`}
                    style={t ? { background: t.buttonBg } : undefined}
                  >
                    <MoreHorizontal className={`w-4 h-4 ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.iconColor } : undefined} />
                  </button>
                </div>
              </div>

              {/* 🏷️ BARRA DE HERRAMIENTAS DE CONVERSACIÓN */}
              <div className="flex items-center gap-2 mt-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {/* Estado de la conversación */}
                <ConversationActionsDropdown
                  conversationId={activeConversation.id}
                  currentStatus={(activeConversation.status || 'open') as 'open' | 'resolved' | 'pending' | 'snoozed'}
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

                {/* Prioridad */}
                <div className="relative">
                  <button
                    ref={priorityBtnRef}
                    onClick={(e) => {
                      if (!showPriorityMenu) {
                        const btn = e.currentTarget;
                        const rect = btn.getBoundingClientRect();
                        const menuWidth = 150;
                        const left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
                        setPriorityMenuPos({ top: rect.bottom + 4, left: Math.max(8, left) });
                      }
                      setShowPriorityMenu(!showPriorityMenu);
                    }}
                    className={`px-2 py-1 text-xs rounded-lg border transition-all duration-200 flex items-center gap-1 ${
                      activeConversation.priority 
                        ? {
                            urgent: 'bg-red-100 border-red-300 text-red-700',
                            high: 'bg-orange-100 border-orange-300 text-orange-700',
                            medium: 'bg-yellow-100 border-yellow-300 text-yellow-700',
                            low: 'bg-blue-100 border-blue-300 text-blue-700'
                          }[activeConversation.priority] || 'bg-gray-100 border-gray-200 text-gray-600'
                        : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Prioridad"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>{activeConversation.priority 
                      ? { urgent: 'Urgente', high: 'Alta', medium: 'Media', low: 'Baja' }[activeConversation.priority] 
                      : 'Prioridad'}</span>
                  </button>
                  {showPriorityMenu && createPortal(
                    <>
                      <div className="fixed inset-0" style={{ zIndex: 99998 }} onClick={() => setShowPriorityMenu(false)} />
                      <div 
                        className="bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[130px]"
                        style={{ position: 'fixed', zIndex: 99999, top: priorityMenuPos.top, left: priorityMenuPos.left }}
                      >
                        {[
                          { value: 'urgent', label: 'Urgente', color: 'text-red-600' },
                          { value: 'high', label: 'Alta', color: 'text-orange-600' },
                          { value: 'medium', label: 'Media', color: 'text-yellow-600' },
                          { value: 'low', label: 'Baja', color: 'text-blue-600' },
                          { value: null, label: 'Sin prioridad', color: 'text-gray-500' },
                        ].map(opt => (
                          <button
                            key={opt.value || 'none'}
                            onClick={() => { handleUpdatePriority(opt.value); setShowPriorityMenu(false); }}
                            className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2 ${opt.color} ${
                              activeConversation.priority === opt.value ? 'bg-gray-100 font-medium' : ''
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </>,
                    document.body
                  )}
                </div>

                {/* Etiquetas actuales (badges con X para eliminar) */}
                {activeConversation.labels && activeConversation.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-2">
                    {activeConversation.labels.map((label: string) => (
                      <span 
                        key={label}
                        className="inline-flex items-center px-2 py-0.5 text-xs rounded-full text-white group"
                        style={{ backgroundColor: getLabelColor(label) }}
                      >
                        {label}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateLabels(activeConversation.labels.filter((l: string) => l !== label));
                          }}
                          className="ml-1 hover:bg-white/30 rounded-full p-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
                          title="Eliminar etiqueta"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={`h-[2px] relative group ${!t ? 'bg-gray-200/30' : ''}`} style={t ? { background: t.divider } : undefined}>
              <div className="absolute inset-x-0 -top-1 -bottom-1" />
            </div>

            {/* Wrapper con fondo que cubre mensajes + input (estilo WhatsApp) */}
            <div 
              className="flex-1 flex flex-col min-h-0 relative"
              style={{
                backgroundImage: isDark 
                  ? (t ? `linear-gradient(${t.chatBg}, ${t.chatBg}), url(/fondo.webp)` : 'linear-gradient(rgba(17,24,39,0.92), rgba(17,24,39,0.92)), url(/fondo.webp)')
                  : (t ? `linear-gradient(${t.chatBg}, ${t.chatBg}), url(/fondo.webp)` : 'linear-gradient(rgba(255,255,255,0.82), rgba(255,255,255,0.82)), url(/fondo.webp)'),
                backgroundSize: 'cover, cover',
                backgroundPosition: 'center, center',
                backgroundRepeat: 'no-repeat, no-repeat',
              }}
            >
            {/* Mensajes */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 relative"
              onClick={(e) => {
                // Cerrar menú contextual al hacer click en el chat (si no se clickeó el botón del menú)
                if (messageMenuOpen !== null && !(e.target as HTMLElement).closest('[data-menu-trigger]') && !(e.target as HTMLElement).closest('[data-context-menu]')) {
                  setMessageMenuOpen(null);
                }
              }}
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

              {/* ï¿½ Trigger invisible para infinite scroll (carga más mensajes al llegar al tope) */}
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
              
              {/* Botón para cargar más mensajes anteriores */}
              {activeConversation?._hasMoreMessages && !activeConversation?._isLoading && filteredMessages.length > 0 && (
                <div className="flex justify-center py-3">
                  <button
                    onClick={() => triggerLoadMore()}
                    className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full transition-colors border ${!t ? 'text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-200' : ''}`}
                    style={t ? { color: t.accent, background: t.accentLight, borderColor: t.accent } : undefined}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>
                    Cargar mensajes anteriores
                  </button>
                </div>
              )}
              
              {/* Indicador de inicio de conversación */}
              {activeConversation?._hasMoreMessages === false && !activeConversation?._isLoading && filteredMessages.length > 0 && (
                <div className="flex justify-center py-3">
                  <div className="flex items-center gap-2 text-xs text-gray-400 italic">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Inicio de la conversación
                  </div>
                </div>
              )}

              {/* ✨ Renderizar mensajes (sin duplicados) */}
              {filteredMessages.map((message: Message, index: number) => (
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
                    {/* Contenedor de mensaje + botón */}
                    <div className="flex items-center gap-2 relative">
                      {/* Botón ANTES de la burbuja (para mensajes del contacto) */}
                      {message.sender === 'contact' && (
                        <button
                          data-menu-trigger
                          onClick={() => setMessageMenuOpen(messageMenuOpen === Number(message.id) ? null : Number(message.id))}
                          className={`p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity ${!t ? 'bg-white/80 hover:bg-white' : ''}`}
                          style={t ? { background: t.buttonBg } : undefined}
                        >
                          <ChevronDown className={`w-4 h-4 ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.iconColor } : undefined} />
                        </button>
                      )}

                      {/* Burbuja del mensaje */}
                      <div 
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative ${
                          messageSearchResults.length > 0 && messageSearchResults.includes(Number(message.id))
                            ? messageSearchResults[currentSearchIndex] === Number(message.id)
                              ? 'ring-4 ring-yellow-400 !bg-yellow-200 !text-gray-900 shadow-lg'
                              : 'ring-2 ring-yellow-200 !bg-yellow-50 !text-gray-900 shadow-md'
                            : message.sender === 'agent'
                            ? (!t ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-white shadow-lg')
                            : !t ? 'bg-white/80 text-gray-900 backdrop-blur-xl border border-gray-200/40 shadow-md shadow-gray-300/20' : 'border shadow-md'
                        }`}
                        style={
                          messageSearchResults.length > 0 && messageSearchResults.includes(Number(message.id))
                            ? undefined
                            : message.sender === 'agent'
                            ? (t ? { backgroundColor: t.accent } : undefined)
                            : (t ? { background: t.incomingBubbleBg, borderColor: t.incomingBubbleBorder, color: t.textPrimary } : undefined)
                        }
                        id={`message-${message.id}`}
                      >
                        {/* Indicador de mensaje destacado */}
                        {starredMessages.has(Number(message.id)) && (
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 absolute top-1 right-1" />
                        )}
                        
                        {/* Contenido del mensaje */}
                        {message.content === 'This message was deleted' ? (
                          <p className="text-sm whitespace-pre-wrap break-words italic text-gray-400 flex items-center gap-1.5">
                            <Ban className="w-3.5 h-3.5" />
                            Se eliminó este mensaje
                          </p>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {searchQuery ? highlightSearchTerm(message.content || '', searchQuery, index) : message.content}
                          </p>
                        )}
                        
                        {/* 🔗 Link Previews estilo WhatsApp */}
                        {(() => {
                          const urls = extractUrls(message.content || '');
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
                        {message.attachments && (message.attachments as ResolvedAttachment[]).filter((att: ResolvedAttachment) => {
                          // Solo mostrar attachments que tengan URL o ID válido
                          const url = att.data_url || att.file_url || att.url || att.thumb_url || '';
                          return (url && url.length > 0) || (Number(att?.id) > 0);
                        }).length > 0 && (
                          <div className="mt-2 space-y-2">
                            {(message.attachments as ResolvedAttachment[]).filter((att: ResolvedAttachment) => {
                              const url = att.data_url || att.file_url || att.url || att.thumb_url || '';
                              return (url && url.length > 0) || (Number(att?.id) > 0);
                            }).map((att: ResolvedAttachment, idx: number) => {
                              // ✅ Usar proxy inteligente que cachea y renueva URLs
                              const rawUrl = att.data_url || att.file_url || att.url || att.thumb_url || '';
                              // file_type puede ser int (0=image,1=audio,2=video,3=file) o string
                              const rawFileType = att.file_type ?? att.content_type ?? '';
                              const fileType = String(rawFileType).toLowerCase();
                              
                              // ✅ Usar resolveAttachmentUrl para URLs permanentes
                              const attachmentUrl = resolveAttachmentUrl(att);
                              
                              // ✅ Detectar imágenes enviadas como documento (content_type o extensión)
                              const contentType = String(att.content_type || '').toLowerCase();
                              const fileName = String(att.file_name || att.name || '').toLowerCase();
                              const isImage = fileType === 'image' || fileType.includes('image/') || fileType === '0'
                                || contentType.startsWith('image/')
                                || /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif)$/i.test(fileName);
                              
                              return (
                              <div key={idx}>
                                {isImage ? (
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
                                ) : (fileType === 'video' || fileType.includes('video/') || fileType === '2') || /\.(mp4|mov|avi|webm|mkv)$/i.test(rawUrl) ? (
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
                                ) : (fileType === 'audio' || fileType.includes('audio/') || fileType === '1') || /\.(mp3|wav|ogg|oga|m4a|aac|webm)$/i.test(rawUrl) ? (
                                  /* 🎵 AUDIO: Reproductor estilo WhatsApp */
                                  <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 p-3 rounded-xl max-w-[280px] border border-emerald-200/50">
                                    {/* Icono de audio/micrófono */}
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                                      <Mic className="w-5 h-5 text-white" />
                                    </div>
                                    {/* Reproductor de audio nativo mejorado */}
                                    <audio 
                                      controls 
                                      preload="auto"
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
                                  /* 📄 DOCUMENTO: Card profesional estilo WhatsApp */
                                  (() => {
                                    const docName = att.file_name || att.name || 'Archivo adjunto';
                                    const ext = docName.split('.').pop()?.toLowerCase() || '';
                                    const isOutgoing = message.sender === 'agent';
                                    
                                    // Colores e iconos por tipo de archivo
                                    const fileConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
                                      pdf: { color: 'text-red-600', bg: 'bg-red-100', icon: '📄', label: 'PDF' },
                                      doc: { color: 'text-blue-600', bg: 'bg-blue-100', icon: '📝', label: 'DOC' },
                                      docx: { color: 'text-blue-600', bg: 'bg-blue-100', icon: '📝', label: 'DOCX' },
                                      xls: { color: 'text-green-600', bg: 'bg-green-100', icon: '📊', label: 'XLS' },
                                      xlsx: { color: 'text-green-600', bg: 'bg-green-100', icon: '📊', label: 'XLSX' },
                                      csv: { color: 'text-green-600', bg: 'bg-green-100', icon: '📊', label: 'CSV' },
                                      ppt: { color: 'text-orange-600', bg: 'bg-orange-100', icon: '📑', label: 'PPT' },
                                      pptx: { color: 'text-orange-600', bg: 'bg-orange-100', icon: '📑', label: 'PPTX' },
                                      txt: { color: 'text-gray-600', bg: 'bg-gray-100', icon: '📃', label: 'TXT' },
                                      zip: { color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '🗜️', label: 'ZIP' },
                                      rar: { color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '🗜️', label: 'RAR' },
                                    };
                                    const config = fileConfig[ext] || { color: 'text-gray-600', bg: 'bg-gray-100', icon: '📎', label: ext.toUpperCase() || 'FILE' };
                                    
                                    // Tamaño del archivo si está disponible
                                    const fileSize = att.file_size ? (
                                      att.file_size > 1048576 
                                        ? `${(att.file_size / 1048576).toFixed(1)} MB`
                                        : att.file_size > 1024
                                          ? `${Math.round(att.file_size / 1024)} KB`
                                          : `${att.file_size} B`
                                    ) : null;
                                    
                                    return (
                                      <a 
                                        href={attachmentUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-3 p-3 rounded-xl max-w-[320px] border transition-all hover:shadow-md ${
                                          isOutgoing 
                                            ? (!t ? 'bg-blue-400/20 border-blue-300/40 hover:bg-blue-400/30' : '') 
                                            : 'bg-white/80 border-gray-200/60 hover:bg-white'
                                        }`}
                                        style={isOutgoing && t ? { background: t.accentLight, borderColor: t.accent } : undefined}
                                      >
                                        {/* Icono del tipo de archivo */}
                                        <div className={`flex-shrink-0 w-11 h-11 rounded-lg ${config.bg} flex items-center justify-center`}>
                                          <span className="text-xl">{config.icon}</span>
                                        </div>
                                        
                                        {/* Info del archivo */}
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm font-medium truncate ${isOutgoing ? 'text-white' : 'text-gray-800'}`}>
                                            {docName}
                                          </p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-xs font-semibold ${config.color} ${config.bg} px-1.5 py-0.5 rounded`}>
                                              {config.label}
                                            </span>
                                            {fileSize && (
                                              <span className={`text-xs ${isOutgoing ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {fileSize}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Icono de descarga */}
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                          isOutgoing ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 hover:bg-gray-200'
                                        } transition-colors`}>
                                          <svg className={`w-4 h-4 ${isOutgoing ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                          </svg>
                                        </div>
                                      </a>
                                    );
                                  })()
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
                            {formatTimestamp(message.timestamp || message.created_at || 0)}
                          </p>
                          {/* Estado del mensaje tipo WhatsApp */}
                          {message.sender === 'agent' && (
                            <MessageStatus 
                              status={message.status || (message._isOptimistic ? 'sending' : 'delivered')} 
                              isHighlighted={!!(searchResults && Array.isArray(searchResults) && searchResults.includes(message.id))}
                            />
                          )}
                        </div>
                      </div>

                      {/* Botón DESPUÉS de la burbuja (para mensajes propios) */}
                      {message.sender === 'agent' && (
                        <button
                          data-menu-trigger
                          onClick={() => setMessageMenuOpen(messageMenuOpen === Number(message.id) ? null : Number(message.id))}
                          className={`p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity ${!t ? 'bg-white/80 hover:bg-white' : ''}`}
                          style={t ? { background: t.buttonBg } : undefined}
                        >
                          <ChevronDown className={`w-4 h-4 ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.iconColor } : undefined} />
                        </button>
                      )}

                      {/* Menú Contextual */}
                      {messageMenuOpen === Number(message.id) && (
                        <div data-context-menu className={`absolute ${index >= filteredMessages.length - 3 ? 'bottom-12' : 'top-12'} ${message.sender === 'agent' ? 'right-0' : 'left-0'} z-50 rounded-lg shadow-xl border py-1 min-w-[180px] animate-fade-in ${!t ? 'bg-white border-gray-200 text-gray-800' : ''}`}
                          style={t ? { background: t.dropdownBg, borderColor: t.dropdownBorder, color: t.textPrimary } : undefined}
                        >
                          <button
                            onClick={() => handleReplyToMessage(message)}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 ${!t ? 'text-gray-800 hover:bg-gray-100' : ''}`}
                            style={t ? { color: t.textPrimary } : undefined}
                          >
                            <Reply className="w-4 h-4" />
                            <span>Responder</span>
                          </button>
                          <button
                            onClick={() => handleStarMessage(Number(message.id))}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 ${!t ? 'text-gray-800 hover:bg-gray-100' : ''}`}
                            style={t ? { color: t.textPrimary } : undefined}
                          >
                            <Star className={`w-4 h-4 ${starredMessages.has(Number(message.id)) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            <span>{starredMessages.has(Number(message.id)) ? 'Quitar destacado' : 'Destacar'}</span>
                          </button>
                          <button
                            onClick={() => handleCopyMessage(message.content || "")}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 ${!t ? 'text-gray-800 hover:bg-gray-100' : ''}`}
                            style={t ? { color: t.textPrimary } : undefined}
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copiar</span>
                          </button>
                          <button
                            onClick={() => handleForwardMessage(message.content || "")}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 ${!t ? 'text-gray-800 hover:bg-gray-100' : ''}`}
                            style={t ? { color: t.textPrimary } : undefined}
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copiar texto</span>
                          </button>
                          <button
                            onClick={() => handlePinMessage(message)}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 ${!t ? 'text-gray-800 hover:bg-gray-100' : ''}`}
                            style={t ? { color: t.textPrimary } : undefined}
                          >
                            <Pin className="w-4 h-4" />
                            <span>Fijar</span>
                          </button>
                          <div className={`border-t my-1 ${!t ? 'border-gray-200' : ''}`} style={t ? { borderColor: t.divider } : undefined}></div>
                          <button
                            onClick={() => handleDeleteMessage(Number(message.id))}
                            className={`w-full px-4 py-2 text-left text-sm text-red-600 flex items-center space-x-2 ${!t ? 'hover:bg-red-50' : ''}`}
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
                  <div className={`backdrop-blur-xl rounded-2xl px-4 py-2 ${!t ? 'bg-white/30 border border-white/20' : 'border'}`} style={t ? { background: t.incomingBubbleBg, borderColor: t.incomingBubbleBorder } : undefined}>
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

            {/* Input de Mensaje - estilo WhatsApp (sin fondo, integrado al chat) */}
            <div className="bg-transparent">
              {/*  BARRA DE RESPUESTA */}
              {replyingTo && (
                <div className={`px-4 pt-3 pb-2 border-b ${!t ? 'border-white/20 bg-blue-50/50' : ''}`} style={t ? { borderColor: t.divider, background: t.panelBg } : undefined}>
                  <div className="flex items-start justify-between">
                    <div className={`flex-1 border-l-4 pl-3 ${!t ? 'border-blue-500' : ''}`} style={t ? { borderColor: t.accent } : undefined}>
                      <div className="flex items-center space-x-2 mb-1">
                        <Reply className={`w-3 h-3 ${!t ? 'text-blue-600' : ''}`} style={t ? { color: t.accent } : undefined} />
                        <span className={`text-xs font-semibold ${!t ? 'text-blue-800' : ''}`} style={t ? { color: t.accent } : undefined}>Respondiendo a {replyingTo.sender_name}</span>
                      </div>
                      <p className={`text-sm truncate ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSecondary } : undefined}>{replyingTo.content}</p>
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
                <div className={`px-4 py-2 ${!t ? 'bg-gray-50/50' : ''}`} style={t ? { background: t.panelBg } : undefined}>
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
                <div className={`px-4 py-3 border-b ${!t ? 'bg-blue-50 border-blue-100' : ''}`} style={t ? { background: t.panelBg, borderColor: t.divider } : undefined}>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${!t ? 'border-blue-500' : ''}`} style={t ? { borderColor: t.accent, borderTopColor: 'transparent' } : undefined}></div>
                      <Paperclip className={`w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${!t ? 'text-blue-500' : ''}`} style={t ? { color: t.accent } : undefined} />
                    </div>
                    <div className="flex-1">
                      <span className={`text-sm font-medium ${!t ? 'text-blue-700' : ''}`} style={t ? { color: t.accent } : undefined}>Enviando archivo...</span>
                      <p className={`text-xs truncate ${!t ? 'text-blue-500' : ''}`} style={t ? { color: t.accent } : undefined}>{uploadProgress}</p>
                    </div>
                  </div>
                </div>
              )}



              {/* 🎤 INDICADOR DE ENVÍO DE AUDIO */}
              {isSendingAudio && (
                <div className={`px-4 py-3 border-b ${!t ? 'bg-green-50 border-green-100' : ''}`} style={t ? { background: t.panelBg, borderColor: t.divider } : undefined}>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      <Mic className="w-4 h-4 text-green-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-sm font-medium text-green-700">Enviando mensaje de voz...</span>
                  </div>
                </div>
              )}

              <div className="px-3 py-2">
                <form onSubmit={handleSendMessage} className="relative">
                  {/* Contenedor único estilo WhatsApp */}
                  <div className={`flex items-center border rounded-full px-2 py-1 transition-all ${!t ? 'bg-white/90 border-gray-200/40 focus-within:bg-white focus-within:border-gray-300' : ''}`}
                    style={t ? { background: t.inputBg, borderColor: t.inputBorder } : undefined}
                  >
                    
                    {/* 📎 BOTÓN PARA ADJUNTAR ARCHIVOS (dentro del input) */}
                    <label className={`p-2 rounded-full transition-all cursor-pointer flex-shrink-0 ${!t ? 'hover:bg-gray-100' : ''}`}>
                      <Paperclip className={`w-5 h-5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.iconColor } : undefined} />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            stageFile(files[0]);
                            e.target.value = '';
                          }
                        }}
                        disabled={isUploadingFile || !!stagedFile}
                      />
                    </label>

                    {/* 😊 BOTÓN EMOJI (dentro del input) */}
                    <div className="relative flex-shrink-0">
                      <button 
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-2 rounded-full transition-all ${!t ? 'hover:bg-gray-100' : ''}`}
                      >
                        <Smile className={`w-5 h-5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.iconColor } : undefined} />
                      </button>
                      {showEmojiPicker && (
                        <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                        <div ref={emojiPickerRef} className={`absolute bottom-full left-0 mb-2 w-64 rounded-xl shadow-2xl border p-2 z-50 ${!t ? 'bg-white border-gray-200' : ''}`} style={t ? { background: t.dropdownBg, borderColor: t.dropdownBorder } : undefined}>
                          <div className={`flex items-center justify-between mb-1.5 pb-1.5 border-b ${!t ? 'border-gray-100' : ''}`} style={t ? { borderColor: t.divider } : undefined}>
                            <span className={`text-xs font-medium ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Emoticonos</span>
                            <button type="button" onClick={() => setShowEmojiPicker(false)} className={`text-xs px-1 ${!t ? 'text-gray-400 hover:text-gray-600' : ''}`} style={t ? { color: t.textMuted } : undefined}>✕</button>
                          </div>
                          <div className="grid grid-cols-8 gap-0 max-h-40 overflow-y-auto">
                            {['😀', '😃', '😄', '😁', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😗', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '😏', '😌', '😴', '🤤', '😷', '🤒', '🤕', '🤢', '🥵', '🥶', '😎', '🤩', '🥳', '😤', '😡', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👻', '😺', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💗', '💓', '💘', '💝', '💟', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤙', '👋', '🙌', '👏', '🤝', '🙏', '💪', '🔥', '⭐', '✨', '🎉', '🎊', '💯', '✅', '🚀', '💬', '👀', '📎', '🎤', '📸', '💡', '⏰', '🎯', '🏆', '🌟', '💎'].map((emoji, i) => (
                              <button
                                key={`${emoji}-${i}`}
                                type="button"
                                onClick={() => handleAddEmoji(emoji)}
                                className={`text-lg rounded p-0.5 transition-colors text-center leading-none ${!t ? 'hover:bg-gray-100' : ''}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                        </>
                      )}
                    </div>

                    {/* INPUT DE TEXTO */}
                    <div className="flex-1 relative">
                      <input
                        ref={messageInputRef}
                        id="message-input"
                        type="text"
                        value={newMessage}
                        onChange={handleMessageInputChange}
                        placeholder={replyingTo ? "Escribe tu respuesta..." : "Escribe un mensaje... (/ para respuestas rápidas)"}
                        className={`w-full px-3 py-2 bg-transparent outline-none ${!t ? 'text-gray-900 placeholder-gray-400' : 'placeholder-gray-500'}`}
                        style={t ? { color: t.inputText } : undefined}
                        disabled={isTyping || isUploadingFile}
                      />
                      
                      {/* Popup de Respuestas Rápidas */}
                      {showCannedResponses && cannedResponses.length > 0 && (
                        <div className={`absolute bottom-full left-0 right-0 mb-2 rounded-lg shadow-xl border max-h-48 overflow-y-auto z-50 ${!t ? 'bg-white border-gray-200' : ''}`} style={t ? { background: t.dropdownBg, borderColor: t.dropdownBorder } : undefined}>
                          <div className={`px-3 py-2 border-b text-xs font-medium sticky top-0 ${!t ? 'border-gray-100 text-gray-500 bg-white' : ''}`} style={t ? { borderColor: t.divider, color: t.textMuted, background: t.dropdownBg } : undefined}>
                            Respuestas rápidas — escribe / para filtrar
                          </div>
                          {cannedResponses
                            .filter(r => !cannedFilter || r.short_code.toLowerCase().includes(cannedFilter) || r.content.toLowerCase().includes(cannedFilter))
                            .map(response => (
                              <button
                                key={response.id}
                                type="button"
                                onClick={() => handleSelectCannedResponse(response)}
                                className={`w-full px-3 py-2 text-left transition-colors border-b last:border-0 ${!t ? 'hover:bg-blue-50 border-gray-50' : ''}`}
                                style={t ? { borderColor: t.divider } : undefined}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${!t ? 'bg-gray-100 text-gray-600' : ''}`} style={t ? { background: t.badgeBg, color: t.badgeText } : undefined}>/{response.short_code}</span>
                                  <span className={`text-sm truncate ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{response.content}</span>
                                </div>
                              </button>
                            ))
                          }
                          {cannedResponses.filter(r => !cannedFilter || r.short_code.toLowerCase().includes(cannedFilter) || r.content.toLowerCase().includes(cannedFilter)).length === 0 && (
                            <div className={`px-3 py-2 text-xs text-center ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined}>No hay coincidencias</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 🎤 BOTÓN DE AUDIO (dentro del input) */}
                    {!isRecording ? (
                      <button 
                        type="button"
                        onMouseDown={handleStartRecording}
                        className={`p-2 rounded-full transition-all flex-shrink-0 ${!t ? 'hover:bg-gray-100' : ''}`}
                        title="Mantén presionado para grabar"
                      >
                        <Mic className={`w-5 h-5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.iconColor } : undefined} />
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onMouseUp={handleStopRecording}
                        onClick={handleStopRecording}
                        className="p-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"
                        title="Suelta para enviar"
                      >
                        <div className="flex items-center space-x-1">
                          <StopCircle className="w-4 h-4 text-white" />
                          <span className="text-white text-xs font-mono">{recordingDuration}s</span>
                        </div>
                      </button>
                    )}

                    {/* ✈️ BOTÓN ENVIAR (dentro del input) */}
                    <button 
                      type="submit" 
                      disabled={!newMessage.trim() || isTyping}
                      className={`p-2 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ml-1 ${!t ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                      style={t ? { backgroundColor: t.accent } : undefined}
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
            </div>{/* cierre wrapper fondo WhatsApp */}
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
              <h3 className={`text-lg font-semibold mb-2 ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSecondary } : undefined}>Selecciona una conversación</h3>
              <p className={`${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Elige una conversación para empezar a chatear</p>
            </div>
          </div>
        )}
      </div>

      {/*  GALERÍA MULTIMEDIA MODAL */}
      {showMediaGallery && activeConversation && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowMediaGallery(false); }}
        >
          <div 
            className={`rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden ${!t ? 'bg-white' : ''}`}
            style={t ? { background: t.panelBg } : undefined}
            style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
          >
            <div className={`p-4 border-b flex items-center justify-between ${!t ? 'border-gray-200 bg-gray-50' : ''}`} style={t ? { borderColor: t.headerBorder, background: t.headerBg } : undefined}>
              <h3 className={`text-lg font-semibold ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Multimedia compartida</h3>
              <button
                onClick={() => setShowMediaGallery(false)}
                className={`p-2 rounded-lg transition-colors ${!t ? 'hover:bg-gray-200' : ''}`}
              >
                <X className={`w-5 h-5 ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.iconColor } : undefined} />
              </button>
            </div>
            
            <div className={`p-4 border-b flex space-x-2 ${!t ? 'border-gray-200' : ''}`} style={t ? { borderColor: t.divider } : undefined}>
              <button
                onClick={() => setMediaFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  mediaFilter === 'all' 
                    ? 'bg-gray-800 text-white' 
                    : !t ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : ''
                }`}
                style={mediaFilter !== 'all' && t ? { background: t.buttonBg, color: t.textPrimary } : undefined}
              >
                Todo
              </button>
              <button
                onClick={() => setMediaFilter('images')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  mediaFilter === 'images' 
                    ? 'bg-gray-800 text-white' 
                    : !t ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : ''
                }`}
                style={mediaFilter !== 'images' && t ? { background: t.buttonBg, color: t.textPrimary } : undefined}
              >
                <span>Imágenes</span>
              </button>
              <button
                onClick={() => setMediaFilter('files')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  mediaFilter === 'files' 
                    ? 'bg-gray-800 text-white' 
                    : !t ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : ''
                }`}
                style={mediaFilter !== 'files' && t ? { background: t.buttonBg, color: t.textPrimary } : undefined}
              >
                <span>Archivos</span>
              </button>
              <button
                onClick={() => setMediaFilter('links')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  mediaFilter === 'links' 
                    ? 'bg-gray-800 text-white' 
                    : !t ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : ''
                }`}
                style={mediaFilter !== 'links' && t ? { background: t.buttonBg, color: t.textPrimary } : undefined}
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
                              const proxyUrl = resolveAttachmentUrl(img);
                              return (
                                <div key={idx} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-gray-400 transition-all cursor-pointer">
                                  <img 
                                    src={proxyUrl} 
                                    alt={img.file_name || 'Imagen'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const placeholder = target.nextElementSibling as HTMLElement;
                                      if (placeholder) placeholder.style.display = 'flex';
                                    }}
                                  />
                                  {/* Placeholder para imagen no disponible en galería */}
                                  <div className="hidden items-center justify-center bg-gray-200 rounded-lg w-full h-full absolute inset-0" style={{ display: 'none' }}>
                                    <div className="text-center text-gray-400">
                                      <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span className="text-xs">No disponible</span>
                                    </div>
                                  </div>
                                  {img.message_id && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteMessage(Number(img.message_id)); }}
                                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                                      title="Eliminar mensaje con esta imagen"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
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
                                const proxyUrl = resolveAttachmentUrl(file);
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
                                const proxyUrl = resolveAttachmentUrl(file);
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
                                      preload="auto"
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
                                const proxyUrl = resolveAttachmentUrl(file);
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
                        const otherFiles = files.filter(f => !['video', 'audio', 'pdf'].includes(f.file_category || ""));
                        return otherFiles.length > 0 ? (
                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-700 mb-3">Otros archivos ({otherFiles.length})</h4>
                            <div className="space-y-2">
                              {otherFiles.map((file, idx) => {
                                const proxyUrl = resolveAttachmentUrl(file);
                                
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
                                      <p className="font-medium text-gray-800 truncate">{decodeURIComponent(file.file_name || '')}</p>
                                      <p className="text-sm text-gray-500">{file.file_size ? (file.file_size / 1024).toFixed(2) + ' KB' : ''}</p>
                                    </div>
                                    <a 
                                      href={proxyUrl} 
                                      download={decodeURIComponent(file.file_name || '')}
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
                                <FileText className={`w-8 h-8 ${!t ? 'text-blue-500' : ''}`} style={t ? { color: t.accent } : undefined} />
                                <p className={`flex-1 hover:underline truncate ${!t ? 'text-blue-600' : ''}`} style={t ? { color: t.accent } : undefined}>{link.url}</p>
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
                          const proxyUrl = resolveAttachmentUrl(img);
                          return (
                            <div key={idx} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-gray-400 transition-all cursor-pointer">
                              <img 
                                src={proxyUrl} 
                                alt={img.file_name || 'Imagen'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const placeholder = target.nextElementSibling as HTMLElement;
                                  if (placeholder) placeholder.style.display = 'flex';
                                }}
                              />
                              {/* Placeholder para imagen no disponible */}
                              <div className="hidden items-center justify-center bg-gray-200 rounded-lg w-full h-full absolute inset-0" style={{ display: 'none' }}>
                                <div className="text-center text-gray-400">
                                  <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-xs">No disponible</span>
                                </div>
                              </div>
                              {img.message_id && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteMessage(Number(img.message_id)); }}
                                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                                  title="Eliminar mensaje con esta imagen"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
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
                  const otherFiles = files.filter(f => !['video', 'audio', 'pdf'].includes(f.file_category || ""));
                  
                  return (
                    <div className="space-y-6">
                      {/* Videos */}
                      {videos.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3">Videos ({videos.length})</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {videos.map((file, idx) => {
                              const proxyUrl = resolveAttachmentUrl(file);
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
                              const proxyUrl = resolveAttachmentUrl(file);
                              return (
                                <div key={idx} className="bg-gray-50 rounded-lg p-3">
                                  <p className="font-medium text-gray-700 truncate mb-2">{file.file_name}</p>
                                  <audio src={proxyUrl} controls className="w-full h-10" preload="auto" />
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
                              const proxyUrl = resolveAttachmentUrl(file);
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
                              const proxyUrl = resolveAttachmentUrl(file);
                              return (
                                <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                  <File className="w-8 h-8 text-gray-500" />
                                  <p className="font-medium text-gray-800 truncate flex-1">{decodeURIComponent(file.file_name || '')}</p>
                                  <a href={proxyUrl} download={decodeURIComponent(file.file_name || '')} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800">
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
                            <FileText className={`w-8 h-8 ${!t ? 'text-blue-500' : ''}`} style={t ? { color: t.accent } : undefined} />
                            <p className={`flex-1 hover:underline truncate ${!t ? 'text-blue-600' : ''}`} style={t ? { color: t.accent } : undefined}>{link.url}</p>
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
        <div className={`w-80 backdrop-blur-2xl p-4 space-y-6 animate-slide-in-right relative ${!t ? 'bg-white/20' : ''}`} style={t ? { background: t.rightPanelBg } : undefined}>
          <button
            onClick={toggleRightPanel}
            className={`absolute top-3 left-3 p-1.5 rounded-lg transition-all duration-300 group z-10 ${!t ? 'bg-white/10 hover:bg-white/30' : ''}`}
            style={t ? { background: t.buttonBg } : undefined}
            title="Cerrar panel"
          >
            <svg 
              className={`w-4 h-4 transition-colors ${!t ? 'text-gray-500 group-hover:text-gray-700' : ''}`}
              style={t ? { color: t.iconColor } : undefined} 
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
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div 
                  className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-xl mx-auto mb-3 ${!t ? 'bg-gradient-to-r from-blue-500 to-blue-600' : ''}`}
                  style={{ display: activeConversation.contact.avatarUrl ? 'none' : 'flex', ...(t ? { background: t.accent } : {}) }}
                >
                  {formatAvatar(activeConversation.contact.avatar, activeConversation.contact.name)}
                </div>
                <h3 className={`font-bold ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{activeConversation.contact.name}</h3>
                <p className={`text-sm ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSecondary } : undefined}>{activeConversation.contact.email}</p>
                <p className={`text-sm font-medium mt-2 ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{activeConversation.contact.phone_number}</p>
              </div>

              <div>
                <h4 className={`font-semibold mb-3 flex items-center ${!t ? 'text-gray-800' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                  <Tag className="w-4 h-4 mr-2" />
                  Etiquetas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeConversation.labels.map((label: string, index: number) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center px-2 py-1 text-xs rounded-full text-white group"
                      style={{ backgroundColor: getLabelColor(label) }}
                    >
                      #{label}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateLabels(activeConversation.labels.filter((l: string) => l !== label));
                        }}
                        className="ml-1 hover:bg-white/30 rounded-full p-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
                        title="Eliminar etiqueta"
                      >
                        <X className="w-3 h-3" />
                      </button>
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

              {/*  GALERÍA MULTIMEDIA */}
              <div>
                <button 
                  onClick={() => setShowMediaGallery(!showMediaGallery)}
                  className={`w-full p-3 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center ${
                    showMediaGallery 
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg' 
                      : !t ? 'bg-white/20 hover:bg-white/30 text-gray-700' : ''
                  }`}
                  style={!showMediaGallery && t ? { background: t.buttonBg, color: t.textPrimary } : undefined}
                >
                  <Grid className="w-4 h-4 mr-2" />
                  {showMediaGallery ? 'Ocultar Multimedia' : 'Ver Multimedia Compartida'}
                </button>
              </div>

              {/* 📝 NOTAS DEL CONTACTO */}
              <div>
                <button 
                  onClick={() => {
                    setShowNotes(!showNotes);
                    if (!showNotes) loadContactNotes();
                  }}
                  className={`w-full p-3 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center ${
                    showNotes 
                      ? 'bg-gray-700 text-white shadow-md' 
                      : !t ? 'bg-white/20 hover:bg-white/30 text-gray-700' : ''
                  }`}
                  style={!showNotes && t ? { background: t.buttonBg, color: t.textPrimary } : undefined}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {showNotes ? 'Ocultar Notas' : 'Notas del contacto'}
                </button>

                {showNotes && (
                  <div className="mt-3 space-y-3">
                    {/* Crear nota */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateNote()}
                        placeholder="Escribir nota..."
                        className={`flex-1 px-3 py-2 text-xs border rounded-lg outline-none focus:ring-1 ${!t ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-400' : 'placeholder-gray-500'}`}
                        style={t ? { background: t.inputBg, borderColor: t.inputBorder, color: t.inputText } : undefined}
                      />
                      <button
                        onClick={handleCreateNote}
                        disabled={!newNoteText.trim()}
                        className="px-3 py-2 bg-gray-700 text-white rounded-lg text-xs disabled:opacity-50 hover:bg-gray-800 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Lista de notas */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {contactNotes.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">Sin notas</p>
                      ) : (
                        contactNotes.map(note => (
                          <div key={note.id} className={`border rounded-lg p-2.5 group/note ${!t ? 'bg-white/70 border-gray-200/60' : ''}`} style={t ? { background: t.panelBg, borderColor: t.cardBorder } : undefined}>
                            <p className={`text-xs whitespace-pre-wrap ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{note.content}</p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[10px] text-gray-400">
                                {note.user?.name || 'Agente'} · {note.created_at ? new Date(note.created_at * 1000).toLocaleDateString() : ''}
                              </span>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="opacity-0 group-hover/note:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 🔀 HERRAMIENTAS ADMIN */}
              <div className={`pt-2 border-t ${!t ? 'border-gray-200/30' : ''}`} style={t ? { borderColor: t.divider } : undefined}>
                <button
                  onClick={handleDeleteConversation}
                  className={`w-full p-2.5 rounded-lg text-sm font-medium text-red-600 transition-all duration-300 flex items-center justify-center gap-2 ${!t ? 'hover:bg-red-50' : ''}`}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar conversación
                </button>
              </div>


            </>
          ) : (
            <div className={`text-center ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
              <User className={`w-12 h-12 mx-auto mb-3 opacity-50`} />
              <p>Selecciona una conversación para ver detalles</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de progreso de descarga */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fade-in ${!t ? 'bg-white' : ''}`} style={t ? { background: t.panelBg } : undefined}>
            <div className="text-center">
              {/* Ícono según fase */}
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
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${!t ? 'bg-blue-500' : ''}`} style={t ? { backgroundColor: t.accent } : undefined}>
                    <Download className="w-10 h-10 text-white animate-pulse" />
                  </div>
                )}
              </div>

              {/* Título según fase */}
              <h3 className={`text-2xl font-bold mb-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                {downloadPhase === 'fetching' && 'Descargando...'}
                {downloadPhase === 'processing' && 'Procesando...'}
                {downloadPhase === 'generating' && 'Generando Excel...'}
                {downloadPhase === 'complete' && '✅ ¡Completado!'}
                {downloadPhase === 'error' && 'Error'}
              </h3>

              {/* Status */}
              <p className={`mb-6 ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSecondary } : undefined}>
                {downloadStatus}
              </p>

              {/* Barra de progreso */}
              {downloadPhase !== 'error' && (
                <div className="mb-4">
                  <div className={`w-full rounded-full h-3 overflow-hidden ${!t ? 'bg-gray-200' : ''}`} style={t ? { background: t.buttonBg } : undefined}>
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ease-out ${!t ? 'bg-gradient-to-r from-blue-500 to-purple-600' : ''}`}
                      style={{ width: `${downloadProgress}%`, ...(t ? { background: t.accent } : {}) }}
                    />
                  </div>
                  <p className={`text-sm mt-2 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{downloadProgress}%</p>
                </div>
              )}

              {/* Fase indicator */}
              {downloadPhase !== 'complete' && downloadPhase !== 'error' && (
                <div className="flex justify-center space-x-2 mt-6">
                  <div className={`w-2 h-2 rounded-full ${downloadPhase === 'fetching' ? (!t ? 'bg-blue-500 animate-pulse' : 'animate-pulse') : 'bg-gray-300'}`} style={downloadPhase === 'fetching' && t ? { backgroundColor: t.accent } : undefined} />
                  <div className={`w-2 h-2 rounded-full ${downloadPhase === 'processing' ? (!t ? 'bg-blue-500 animate-pulse' : 'animate-pulse') : 'bg-gray-300'}`} style={downloadPhase === 'processing' && t ? { backgroundColor: t.accent } : undefined} />
                  <div className={`w-2 h-2 rounded-full ${downloadPhase === 'generating' ? (!t ? 'bg-blue-500 animate-pulse' : 'animate-pulse') : 'bg-gray-300'}`} style={downloadPhase === 'generating' && t ? { backgroundColor: t.accent } : undefined} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de editar contacto */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full border animate-in fade-in zoom-in duration-200 ${!t ? 'bg-white border-gray-200' : ''}`} style={t ? { background: t.panelBg, borderColor: t.panelBorder } : undefined}>
            {/* Header */}
            <div className={`flex items-center justify-between p-6 border-b ${!t ? 'border-gray-200' : ''}`} style={t ? { borderColor: t.divider } : undefined}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${!t ? 'bg-gradient-to-r from-blue-500 to-blue-600' : ''}`} style={t ? { background: t.accent } : undefined}>
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <h3 className={`text-xl font-semibold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Editar Contacto</h3>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className={`p-2 rounded-lg transition-colors ${!t ? 'hover:bg-gray-100' : ''}`}
              >
                <X className={`w-5 h-5 ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.iconColor } : undefined} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Campo Nombre */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${!t ? 'focus:ring-blue-500 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400' : 'placeholder:text-gray-500'}`}
                  style={t ? { background: t.inputBg, borderColor: t.inputBorder, color: t.inputText, '--tw-ring-color': t.accent } as React.CSSProperties : undefined}
                />
              </div>

              {/* Campo Teléfono */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Ej: +56 9 1234 5678"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${!t ? 'focus:ring-blue-500 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400' : 'placeholder:text-gray-500'}`}
                  style={t ? { background: t.inputBg, borderColor: t.inputBorder, color: t.inputText, '--tw-ring-color': t.accent } as React.CSSProperties : undefined}
                />
              </div>

              {/* Campo Email */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Ej: correo@ejemplo.com"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${!t ? 'focus:ring-blue-500 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400' : 'placeholder:text-gray-500'}`}
                  style={t ? { background: t.inputBg, borderColor: t.inputBorder, color: t.inputText, '--tw-ring-color': t.accent } as React.CSSProperties : undefined}
                />
              </div>
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-end space-x-3 p-6 border-t rounded-b-2xl ${!t ? 'bg-gray-50 border-gray-200' : ''}`} style={t ? { background: t.headerBg, borderColor: t.divider } : undefined}>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className={`px-4 py-2.5 rounded-lg transition-colors font-medium ${!t ? 'text-gray-800 hover:bg-gray-200' : ''}`}
                style={t ? { color: t.textPrimary } : undefined}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveContact}
                className={`px-6 py-2.5 text-white rounded-lg transition-all shadow-lg hover:shadow-xl font-medium ${!t ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' : ''}`}
                style={t ? { background: t.accent } : undefined}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToastNotif && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 duration-300">
          <div className={`px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 backdrop-blur-sm border ${
            toastType === 'success' ? 'bg-gradient-to-r from-green-500 to-green-600 border-green-400/30 text-white' :
            toastType === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600 border-red-400/30 text-white' :
            'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400/30 text-white'
          }`}>
            {toastType === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
            {toastType === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            {toastType === 'warning' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            <span className="font-medium text-sm">{toastMessage}</span>
            <button onClick={() => setShowToastNotif(false)} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </button>
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
          {/* Header con botón cerrar */}
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
              title="Abrir en nueva pestaña"
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
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-md flex flex-col"
          onClick={() => setMediaViewerOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') goToPreviousMedia();
            if (e.key === 'ArrowRight') goToNextMedia();
            if (e.key === 'Escape') setMediaViewerOpen(false);
          }}
          tabIndex={0}
        >
          {/* Header con contador, descargar y botón de cerrar */}
          <div className="flex-shrink-0 p-4 flex justify-between items-center bg-white/60 backdrop-blur-xl border-b border-gray-200/50 z-10">
            <div className="text-gray-700 flex items-center space-x-3">
              <span className="text-sm font-medium">
                {mediaGallery[currentMediaIndex]?.type === 'video' ? '🎬 Video' : '🖼️ Imagen'}
              </span>
              {mediaGallery.length > 1 && (
                <span className="text-xs text-gray-600 bg-gray-200/60 px-2 py-1 rounded-full">
                  {currentMediaIndex + 1} / {mediaGallery.length}
                </span>
              )}
              {mediaZoom !== 1 && (
                <span className={`text-xs px-2 py-1 rounded-full ${!t ? 'text-blue-600 bg-blue-100' : ''}`} style={t ? { color: t.accent, background: t.accentLight } : undefined}>
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
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-white text-sm transition-colors ${!t ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                style={t ? { backgroundColor: t.accent } : undefined}
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Descargar</span>
              </a>
              {/* Botón Cerrar */}
              <button
                onClick={(e) => { e.stopPropagation(); setMediaViewerOpen(false); }}
                className="p-2 rounded-lg bg-gray-200/60 hover:bg-gray-300/80 transition-colors"
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

          {/* Footer solo con miniaturas (compacto) */}
          {mediaGallery.length > 1 && (
            <div className="flex-shrink-0 py-2 px-4 bg-white/90 backdrop-blur-sm border-t border-gray-200">
              <div className="flex justify-center space-x-1.5 overflow-x-auto hide-scrollbar">
                {mediaGallery.map((media, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(idx); setMediaZoom(1); setMediaPan({ x: 0, y: 0 }); }}
                    className={`flex-shrink-0 w-9 h-9 rounded-md overflow-hidden border-2 transition-all ${
                      idx === currentMediaIndex 
                        ? (!t ? 'border-blue-500 scale-110 shadow-md' : 'scale-110 shadow-md')
                        : 'border-gray-300/60 opacity-60 hover:opacity-100 hover:border-gray-400'
                    }`}
                    style={idx === currentMediaIndex && t ? { borderColor: t.accent } : undefined}
                  >
                    {media.type === 'video' ? (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Play className="w-3 h-3 text-gray-600" />
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



      {/* Modal de confirmación genérico */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]"
          onClick={() => setConfirmDialog(prev => ({ ...prev, show: false }))}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                confirmDialog.variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                {confirmDialog.variant === 'danger' ? (
                  <Trash2 className="w-6 h-6 text-red-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                {confirmDialog.title}
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {confirmDialog.message}
              </p>
            </div>
            <div className="flex border-t border-gray-200">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, show: false }))}
                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, show: false }));
                }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-l border-gray-200 ${
                  confirmDialog.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-amber-600 hover:bg-amber-50'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationsInterface;




