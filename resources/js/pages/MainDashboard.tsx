import { Head, router } from '@inertiajs/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import ConversationsInterface from '../components/ConversationsInterface';
import TeamsManagement from '../components/TeamsManagement';
import WhatsAppQRModal from '../components/WhatsAppQRModal';
import MetricsDashboard from '../components/MetricsDashboard';
import Conocimientos from '../components/dashboard/Conocimientos';
import Entrenamiento from '../components/dashboard/Entrenamiento';
import AdminPanel from '../components/dashboard/AdminPanel';
import IntegrationSection from '../components/IntegrationSection';
import { NotificationBell } from '../components/NotificationBell';
import NotificationToast from '../components/NotificationToast';
import { GlobalNotificationProvider, useGlobalNotifications } from '../contexts/GlobalNotificationContext';
import { useConversations, useAgents, useTeams } from "../hooks/useChatwoot";
import { useReverb } from "../hooks/useReverb";
import {
  MessageCircle,
  Users,
  TrendingUp,
  Search,
  BarChart3,
  BookOpen,
  Phone,
  Mail,
  Calendar,
  FileText,
  Target,
  Zap,
  ChevronRight,
  ChevronLeft,
  Clock,
  Star,
  Heart,
  Smile,
  Coffee,
  Sparkles,
  ArrowRight,
  Eye,
  MessageSquare,
  UserPlus,
  Activity,
  Briefcase,
  Award,
  Lightbulb,
  Rocket,
  Shield,
  Globe,
  Wifi,
  Battery,
  Database,
  Code,
  ShoppingCart,
  ShoppingBag,
  CalendarDays,
  HardDrive,
  Cloud,
  FileSpreadsheet,
  Store,
  Instagram,
  Facebook,
  Settings,
  Package,
  GraduationCap
} from 'lucide-react';

// ====== IMPORTAR UTILIDADES DE SEGURIDAD ======
import {
  secureStorage,
  CsrfTokenManager,
  sanitizeText,
  getSafeText,
  validators,
  secureFetch,
  ApiError,
  checkRateLimit
} from '../utils/security-utils';

// ====== IMPORTAR HOOK DE PERMISOS ======
import { usePermissions } from '../hooks/usePermissions';

interface User {
  id: number;
  name: string;
  email: string;
  company_name?: string;
  company_slug?: string;
  chatwoot_inbox_id?: number;
  chatwoot_agent_id?: number;
  role?: string;
}

interface Company {
  name: string;
  email?: string;
}

interface Chatwoot {
  account_id?: number;
  inbox_id?: number;
  provisioned_at?: string;
  available?: boolean;
}

interface Stats {
  conversations: number;
  leads: number;
  conversion_rate: number;
  active_tools: number;
}

interface Props {
  user: User;
  company?: Company;
  chatwoot?: Chatwoot;
  stats?: Stats;
  onboardingData?: any;
  companySlug: string;
}

// ====== COMPONENTE: MENo� DESPLEGABLE DE USUARIO ======
interface UserMenuDropdownProps {
  user: {
    firstName: string;
    email: string;
    plan?: string;
    logo_url?: string;
    company?: string;
  };
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function UserMenuDropdown({ user, isCollapsed, onToggleCollapse }: UserMenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHelpSubmenu, setShowHelpSubmenu] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset logo error when logo_url changes
  useEffect(() => {
    setLogoError(false);
  }, [user.logo_url]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowHelpSubmenu(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const helpSubmenuItems = [
    {
      icon: BookOpen,
      label: 'Centro de ayuda',
      onClick: null,
      className: 'text-neutral-400 cursor-not-allowed hover:bg-transparent',
      isDisabled: true
    },
    {
      icon: MessageCircle,
      label: 'Contactar soporte',
      onClick: null,
      className: 'text-neutral-400 cursor-not-allowed hover:bg-transparent',
      isDisabled: true
    },
    {
      icon: FileText,
      label: 'Documentación',
      onClick: null,
      className: 'text-neutral-400 cursor-not-allowed hover:bg-transparent',
      isDisabled: true
    },
    {
      icon: MessageSquare,
      label: 'Preguntas frecuentes',
      onClick: null,
      className: 'text-neutral-400 cursor-not-allowed hover:bg-transparent',
      isDisabled: true
    },
    {
      icon: Users,
      label: 'Comunidad',
      onClick: null,
      className: 'text-neutral-400 cursor-not-allowed hover:bg-transparent',
      isDisabled: true
    }
  ];

  const menuItems = [
    {
      icon: Mail,
      label: user.email,
      onClick: null,
      className: 'text-neutral-500 cursor-default hover:bg-transparent pointer-events-none',
      isEmail: true
    },
    {
      icon: Coffee,
      label: 'Perfil',
      onClick: null,
      className: 'text-neutral-400 cursor-not-allowed hover:bg-transparent',
      isDisabled: true
    },
    {
      icon: Settings,
      label: 'Configuración',
      onClick: null,
      className: 'text-neutral-400 cursor-not-allowed hover:bg-transparent',
      isDisabled: true
    },
    {
      icon: Heart,
      label: 'Ayuda',
      onClick: () => setShowHelpSubmenu(!showHelpSubmenu),
      className: 'text-neutral-700 hover:bg-neutral-50',
      hasSubmenu: true
    },
    {
      type: 'divider' as const
    },
    {
      icon: ChevronRight,
      label: 'Cerrar sesión',
      onClick: () => {
        window.location.href = '/logout';
      },
      className: 'text-red-600 hover:bg-red-50',
      isDanger: true
    }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Menu - Aparece ARRIBA */}
      {isOpen && (
        <div 
          className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-neutral-200 z-[100]"
          style={{
            minWidth: isCollapsed ? '320px' : 'auto',
            animation: 'slideUpMenu 0.2s ease-out',
            overflow: 'visible'
          }}
        >
          {/* Lista de opciones */}
          <div className="py-2 relative" style={{ overflow: 'visible' }}>
            {menuItems.map((item, index) => {
              if (item.type === 'divider') {
                return (
                  <div key={`divider-${index}`} className="h-px bg-neutral-200 my-2 mx-3" />
                );
              }

              const Icon = item.icon;

              return (
                <div 
                  key={index} 
                  className="relative"
                >
                  <button
                    onClick={() => {
                      if (item.onClick) {
                        item.onClick();
                        if (!item.hasSubmenu) {
                          setIsOpen(false);
                          setShowHelpSubmenu(false);
                        }
                      }
                    }}
                    disabled={item.isEmail}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-all duration-150 ${item.className}`}
                  >
                    <div className="flex items-center gap-3">
                      {Icon && (
                        <div className={`flex items-center justify-center ${item.isEmail ? 'text-neutral-400' : item.isDanger ? 'text-red-500' : 'text-neutral-600'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                      )}
                      <span className={`text-sm ${item.isEmail ? 'font-normal text-xs' : 'font-medium'} ${item.isDanger ? 'text-red-600' : ''}`}>
                        {item.label}
                      </span>
                    </div>
                    
                    {item.hasSubmenu && (
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    )}
                  </button>

                  {/* Submeno� de Ayuda */}
                  {item.hasSubmenu && showHelpSubmenu && (
                    <div 
                      className="absolute left-full bg-white rounded-xl shadow-2xl border border-neutral-200 min-w-[220px] z-[9999]"
                      style={{ 
                        animation: 'slideInRight 0.2s ease-out',
                        top: '-30px',
                        marginLeft: '4px'
                      }}
                    >
                      <div className="py-2">
                        {helpSubmenuItems.map((subItem, subIndex) => {
                          const SubIcon = subItem.icon;
                          return (
                            <button
                              key={subIndex}
                              onClick={() => {
                                if (subItem.onClick) {
                                  subItem.onClick();
                                  setIsOpen(false);
                                  setShowHelpSubmenu(false);
                                }
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-150 ${
                                subItem.isDisabled 
                                  ? 'text-neutral-400 cursor-not-allowed hover:bg-transparent' 
                                  : 'text-neutral-700 hover:bg-neutral-50'
                              }`}
                            >
                              <SubIcon className="w-4 h-4 text-neutral-500" />
                              <span className="text-sm font-medium">{subItem.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User Profile Button */}
      <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all duration-200">
        <button 
          onClick={() => {
            if (isCollapsed) {
              onToggleCollapse();
            } else {
              setIsOpen(!isOpen);
            }
          }}
          className="flex items-center w-full hover:bg-neutral-50 rounded-lg px-2 py-1.5 transition-all duration-200"
        >
          {isCollapsed ? (
            // Versio�n compacta - solo avatar
            <div className="flex flex-col items-center w-full">
              <div className="relative">
                {user.logo_url && !logoError ? (
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-md overflow-hidden hover:scale-105 transition-transform">
                    <img 
                      src={user.logo_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                      onError={() => setLogoError(true)}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br from-purple-500 to-purple-700">
                    <span className="text-base font-bold text-white">
                      {user.firstName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
            </div>
          ) : (
            // Versio�n expandida - completa
            <div className="flex items-center space-x-3 w-full">
              <div className="relative flex-shrink-0">
                {user.logo_url && !logoError ? (
                  <img 
                    src={user.logo_url} 
                    alt="" 
                    className="w-10 h-10 rounded-xl object-cover shadow-md"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br from-purple-500 to-purple-700">
                    <span className="text-base font-bold text-white">
                      {user.firstName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
              
              <div className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-neutral-800 truncate text-sm">
                  {user.company}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-neutral-500 font-medium">
                    {user.plan || 'Gratis'}
                  </span>
                </div>
              </div>

              {/* Indicador de meno� (tres puntos verticales) */}
              <div className={`transition-transform duration-200 flex items-center justify-center ${isOpen ? 'rotate-90' : ''}`}>
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 20 20" 
                  fill="none" 
                  className="text-neutral-400"
                >
                  <circle cx="10" cy="5" r="1.5" fill="currentColor" />
                  <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                  <circle cx="10" cy="15" r="1.5" fill="currentColor" />
                </svg>
              </div>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

export default function Dashboard({ user, company, chatwoot, stats, onboardingData, companySlug }: Props) {
  
  // ====== REVERB WEBSOCKETS ======
  const { subscribe, leave } = useReverb();
  
  // ====== PERMISOS DEL USUARIO ======
  const { isAdmin, isAgent, hasPermission } = usePermissions();
  
  // ====== INBOX ID ======
  const inboxId = chatwoot?.inbox_id || user.chatwoot_inbox_id || null;
  
  useEffect(() => {
    if (inboxId) {
      console.log('✅ Inbox ID disponible:', inboxId);
    } else {
      console.warn('!��� No se encontro� inbox_id. El WebSocket de conversaciones no estaro� disponible.');
    }
  }, [inboxId]);
  
  // ====== VALIDACIo�N DE SEGURIDAD ======
  useEffect(() => {
    // Validar companySlug
    if (!validators.isValidCompanySlug(companySlug)) {
      console.error('🛡�� SEGURIDAD: Company slug invo�lido');
      window.location.href = '/error';
      return;
    }
    
    // Validar user
    if (!user || !user.id || !user.name || !user.email) {
      console.error('🛡�� SEGURIDAD: Datos de usuario invo�lidos');
      window.location.href = '/login';
      return;
    }
    
    // Validar email
    if (!validators.isValidEmail(user.email)) {
      console.error('🛡�� SEGURIDAD: Email de usuario invo�lido');
      window.location.href = '/login';
      return;
    }
    
    // Validar nombre (contra XSS)
    if (!validators.isSafeString(user.name)) {
      console.error('🛡�� SEGURIDAD: Nombre de usuario contiene caracteres peligrosos');
      window.location.href = '/login';
      return;
    }
    
    console.log('✅ Validaciones de seguridad pasadas');
  }, [user, companySlug]);
  
  const [mounted, setMounted] = useState(false);
  // Restaurar sección guardada o usar 'dashboard' por defecto
  // Si hay query param 'conversation', forzar a 'chats'
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== 'undefined') {
      // Si hay query param conversation, ir directamente a chats
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('conversation')) {
        console.log('🔀 Query param conversation detectado, forzando activeSection a chats');
        localStorage.setItem('dashboardActiveSection', 'chats');
        return 'chats';
      }
      return localStorage.getItem('dashboardActiveSection') || 'dashboard';
    }
    return 'dashboard';
  });
  
  // ====== NAVEGACIÓN LIBRE - TODOS LOS USUARIOS PUEDEN ACCEDER A TODAS LAS SECCIONES ======
  // La lógica de permisos se manejará dentro de cada sección individual si es necesario
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  // Restaurar estado de WhatsApp desde secureStorage (encriptado)
  const [whatsAppStatus, setWhatsAppStatus] = useState<'disconnected' | 'connected' | 'open'>(() => {
    if (typeof window !== 'undefined') {
      const cached = secureStorage.get<{connected: boolean, state: string, timestamp: number}>(`whatsapp:status:${companySlug}`);
      if (cached) {
        return cached.connected ? 'connected' : 'disconnected';
      }
    }
    return 'disconnected';
  });
  
  // Estado para configuraciones de WhatsApp (Evolution API)
  const [whatsAppSettings, setWhatsAppSettings] = useState({
    rejectCall: false,
    groupsIgnore: false,
    alwaysOnline: false,
    readMessages: true,
    syncFullHistory: true,
    readStatus: true
  });
  const [isUpdatingWhatsAppSettings, setIsUpdatingWhatsAppSettings] = useState(false);

  const [notification, setNotification] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({show: false, message: '', type: 'success'});
  
  // Estado para controlar el colapso del sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });

  // Funcio�n para mostrar notificaciones
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({show: true, message, type});
    setTimeout(() => setNotification({show: false, message: '', type: 'success'}), 3000);
  };

  // Funcio�n para verificar el status de WhatsApp con seguridad mejorada
  const checkWhatsAppStatus = async () => {
    try {
      const response = await secureFetch(
        `/api/evolution-whatsapp/status/${companySlug}`,
        {
          method: 'GET',
          requireCsrf: false,
          timeout: 20000, // 20 segundos para Evolution API
          rateLimitKey: `whatsapp-status-${companySlug}`,
          rateLimitConfig: {
            maxCalls: 10,
            timeWindow: 60000,
            blockDuration: 30000
          }
        }
      );
      const data = await response.json();
      
      // Guardar de forma segura y encriptada
      secureStorage.set(`whatsapp:status:${companySlug}`, {
        connected: data.connected,
        state: data.state,
        timestamp: Date.now()
      });
      
      // Evolution API returns: { success: boolean, connected: boolean, state: string }
      if (data.success && (data.connected || data.state === 'open')) {
        setWhatsAppStatus(data.state || "connected");
      } else {
        setWhatsAppStatus("disconnected");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`🚨 Error al verificar WhatsApp: ${error.message}`);
        showNotification(error.message, 'error');
        
        // Si es error de autenticacio�n, redirigir al login
        if (error.type === 'auth') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      } else {
        console.error("Error inesperado:", error);
      }
    }
  };

  // Funcio�n para desconectar WhatsApp con seguridad mejorada
  const disconnectWhatsApp = async () => {
    try {
      const response = await secureFetch(
        `/api/evolution-whatsapp/disconnect/${companySlug}`,
        {
          method: 'POST',
          requireCsrf: true,
          rateLimitKey: `whatsapp-disconnect-${companySlug}`,
          rateLimitConfig: {
            maxCalls: 3,
            timeWindow: 60000,
            blockDuration: 60000
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        // Actualizar estado local sin recargar
        setWhatsAppStatus('disconnected');
        secureStorage.remove(`whatsapp:status:${companySlug}`);
        showNotification("✅ WhatsApp desconectado exitosamente", 'success');
      } else {
        showNotification("❌ Error al desconectar WhatsApp", 'error');
      }
    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`🚨 Error al desconectar WhatsApp: ${error.message}`);
        showNotification(error.message, 'error');
      } else {
        console.error("Error inesperado:", error);
        showNotification("❌ Error al desconectar WhatsApp", 'error');
      }
    }
  };

  // Funcio�n para obtener configuraciones de WhatsApp (Evolution API)
  const fetchWhatsAppSettings = async () => {
    try {
      const response = await secureFetch(
        `/api/evolution-whatsapp/settings/${companySlug}`,
        { method: 'GET', requireCsrf: false, timeout: 20000 }
      );
      const data = await response.json();
      if (data.success && data.settings) {
        setWhatsAppSettings({
          rejectCall: data.settings.rejectCall || false,
          groupsIgnore: data.settings.groupsIgnore || false,
          alwaysOnline: data.settings.alwaysOnline || false,
          readMessages: data.settings.readMessages ?? true,
          syncFullHistory: data.settings.syncFullHistory ?? true,
          readStatus: data.settings.readStatus ?? true
        });
      }
    } catch (error) {
      console.error("Error al obtener configuraciones de WhatsApp:", error);
    }
  };

  // Funcio�n para actualizar configuraciones de WhatsApp (Evolution API)
  const updateWhatsAppSettings = async (settings: typeof whatsAppSettings) => {
    setIsUpdatingWhatsAppSettings(true);
    try {
      const response = await secureFetch(
        `/api/evolution-whatsapp/settings/${companySlug}`,
        {
          method: 'POST',
          requireCsrf: true,
          body: JSON.stringify(settings)
        }
      );
      const data = await response.json();
      if (data.success) {
        setWhatsAppSettings(settings);
        showNotification("✅ Configuraciones guardadas exitosamente", 'success');
      } else {
        showNotification("❌ Error al guardar configuraciones", 'error');
      }
    } catch (error) {
      console.error("Error al actualizar configuraciones de WhatsApp:", error);
      showNotification("❌ Error al guardar configuraciones", 'error');
    } finally {
      setIsUpdatingWhatsAppSettings(false);
    }
  };

  // Integración real con Chatwoot
  const { conversations } = useConversations();
  const { agents } = useAgents();
  const { teams, fetchTeams } = useTeams();
  
  // Refrescar teams cuando se monta el componente
  useEffect(() => {
    fetchTeams();
  }, []);
  
  // Escuchar eventos de cambios en teams (crear/eliminar desde TeamsManagement)
  useEffect(() => {
    const handleTeamsChanged = () => {
      fetchTeams();
    };
    
    window.addEventListener('teams-changed', handleTeamsChanged);
    return () => {
      window.removeEventListener('teams-changed', handleTeamsChanged);
    };
  }, [fetchTeams]);
  
  // También refrescar cuando se cambia a la sección de equipos
  useEffect(() => {
    if (activeSection === 'people') {
      fetchTeams();
    }
  }, [activeSection]);

  // Función para contar Integraciones realmente conectadas
  const getConnectedIntegrationsCount = () => {
    let connected = 0;
    
    // WhatsApp - verificar estado real
    if (whatsAppStatus === 'connected' || whatsAppStatus === 'open') {
      connected++;
    }
    
    // Instagram - NO conectado (pro�ximamente)
    // connected++; // Comentado hasta que esto� realmente conectado
    
    // Messenger - NO conectado (pro�ximamente)  
    // connected++; // Comentado hasta que esto� realmente conectado
    
    // WhatsApp API Oficial - NO conectado (configurar cuando esto� listo)
    // connected++; // Comentado hasta que esto� realmente conectado
    
    // Chat WEB Plugins WordPress - NO conectado (configurar cuando esto� listo)
    // connected++; // Comentado hasta que esto� realmente conectado
    
    // Gmail - NO conectado (configurar cuando esto� listo)
    // connected++; // Comentado hasta que esto� realmente conectado
    
    return connected;
  };
  
  const integrationsCount = getConnectedIntegrationsCount();

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Escuchar evento para navegar a conversación sin recargar página
  useEffect(() => {
    const handleNavigateToConversation = (event: CustomEvent) => {
      const { conversationId } = event.detail;
      // Navegando a conversación sin recargar
      
      // 🔔 LIMPIAR NOTIFICACIONES INMEDIATAMENTE al navegar
      // Esto asegura que se limpien aunque la conversación ya esté seleccionada
      window.dispatchEvent(new CustomEvent('clearNotifications', {
        detail: { conversationId }
      }));
      
      // 1. Cambiar sección a chats (sin recargar)
      localStorage.setItem('dashboardActiveSection', 'chats');
      setActiveSection('chats');
      
      // 2. Emitir evento para que ConversationsInterface seleccione la conversación
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('selectConversation', {
          detail: { conversationId }
        }));
      }, 100);
    };
    
    window.addEventListener('navigateToConversation', handleNavigateToConversation as EventListener);
    return () => {
      window.removeEventListener('navigateToConversation', handleNavigateToConversation as EventListener);
    };
  }, []);

  // Verificar status de WhatsApp con Reverb (WebSocket en tiempo real)
  useEffect(() => {
    // Carga inicial
    checkWhatsAppStatus();
    fetchWhatsAppSettings(); // Cargar configuraciones de WhatsApp
    
    // Subscribirse a eventos de WhatsApp en tiempo real
    const channelName = `company.${companySlug}.whatsapp`;
    subscribe(channelName, 'WhatsAppStatusChanged', (data: any) => {
      console.log('📡 WhatsApp status actualizado vo�a WebSocket:', data);
      // Actualizar estado directamente sin hacer request
      if (data.status) {
        setWhatsappConnected(data.status.connected || false);
        setWhatsappQr(data.status.qrCode || null);
      }
    });
    
    return () => {
      leave(channelName);
    };
  }, [companySlug, subscribe, leave]);

  // Guardar estado del sidebar en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
    }
  }, [sidebarCollapsed]);

  // Funcio�n para manejar navegacio�n (mantener embed dentro del dashboard)
  // OPTIMIZADO: flushSync para forzar actualizacio�n COMPLETAMENTE so�ncrona
  const handleNavigation = useCallback((itemId: string) => {
    // Prevenir clicks duplicados si ya estamos en esa seccio�n
    if (itemId === activeSection) return;
    
    // Actualizacio�n so�ncrona a localStorage ANTES de cualquier render
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboardActiveSection', itemId);
    }
    
    // flushSync fuerza a React a aplicar INMEDIATAMENTE este cambio
    // Esto evita cualquier estado intermedio o parpadeo
    flushSync(() => {
      setActiveSection(itemId);
    });
  }, [activeSection]);

  const safeUser = {
    name: getSafeText(user?.name || 'Usuario'),
    firstName: getSafeText((user?.name || 'Usuario').split(' ')[0]),
    email: getSafeText(user?.email || 'usuario@ejemplo.com'),
    company: getSafeText(onboardingData?.company_name || 'Mi Empresa'),
  };

  const safeStats = {
    conversations: (conversations || []).filter(c => c.status === "open").length,
    leads: stats?.leads || 34,
    conversion_rate: stats?.conversion_rate || 28,
    revenue: 15847,
    growth: 23.5,
    satisfaction: 98
  };

  // Datos humanizados mejorados con mas contexto
  const recentActivities = [
    { 
      name: 'Maria Gonzalez', 
      action: 'Acaba de hacer una pregunta sobre pricing', 
      time: '2 min', 
      avatar: 'M', 
      color: 'from-rose-400 to-pink-500', 
      status: 'lead',
      priority: 'high',
      channel: 'WhatsApp'
    },
    { 
      name: 'Carlos Ruiz', 
      action: 'Program� demo para ma�ana 10:00 AM', 
      time: '8 min', 
      avatar: 'C', 
      color: 'from-blue-400 to-indigo-500', 
      status: 'cliente',
      priority: 'medium',
      channel: 'Website'
    },
    { 
      name: 'Ana L�pez', 
      action: 'Solicit� cotizaci�n personalizada', 
      time: '15 min', 
      avatar: 'A', 
      color: 'from-emerald-400 to-green-500', 
      status: 'interested',
      priority: 'high',
      channel: 'Email'
    },
    { 
      name: 'Roberto Silva', 
      action: 'Compartió feedback positivo ⭐⭐⭐⭐⭐', 
      time: '32 min', 
      avatar: 'R', 
      color: 'from-purple-400 to-violet-500', 
      status: 'cliente',
      priority: 'low',
      channel: 'WhatsApp'
    }
  ];

  // Obtener permisos del usuario
  const userPermissions = user?.permissions || {};
  const isAdmin = user?.role === 'admin';

  // Función para verificar si tiene permiso para una sección
  const hasPermission = (permissionKey: string): boolean => {
    // Admins siempre tienen acceso
    if (isAdmin) return true;
    // Verificar permiso custom del usuario
    if (userPermissions[permissionKey] !== undefined) {
      return userPermissions[permissionKey];
    }
    // Permisos por defecto para agentes
    const defaultAgentPermissions: Record<string, boolean> = {
      'sidebar.dashboard': true,
      'sidebar.chats': true,
      'sidebar.teams': true,
      'sidebar.integrations': false,
      'sidebar.knowledge': false,
      'sidebar.training': false,
      'sidebar.calendar': false,
      'sidebar.products': false,
      'teams.manage': false,
      'teams.create': false,
      'teams.delete': false,
      'members.invite': false,
    };
    return defaultAgentPermissions[permissionKey] ?? false;
  };

  const allSidebarItems = [
    // Dashboard - visible para todos
    { 
      id: 'dashboard', 
      label: 'Inicio', 
      icon: Sparkles, 
      count: null,
      gradient: 'from-amber-500 to-yellow-500',
      permission: 'sidebar.dashboard'
    },
    // Conversaciones - todos
    { 
      id: 'chats', 
      label: 'Conversaciones', 
      icon: MessageCircle, 
      count: (conversations || []).filter(c => c.status === "open").length,
      gradient: 'from-blue-500 to-indigo-500',
      permission: 'sidebar.chats'
    },
    // Equipo - todos
    { 
      id: 'people', 
      label: 'Equipo', 
      icon: Users, 
      count: teams && teams.length > 0 ? teams.length : null,
      gradient: 'from-emerald-500 to-green-500',
      permission: 'sidebar.teams'
    },
    // Integraciones - solo admin por defecto
    { 
      id: 'insights', 
      label: 'Integración', 
      icon: Lightbulb, 
      count: integrationsCount,
      gradient: 'from-gray-500 to-slate-600',
      permission: 'sidebar.integrations'
    },
    // Conocimientos - solo admin por defecto
    { 
      id: 'knowledge', 
      label: 'Conocimientos', 
      icon: BookOpen, 
      count: null,
      gradient: 'from-cyan-500 to-blue-500',
      permission: 'sidebar.knowledge'
    },
    // Entrenamiento - solo admin por defecto
    { 
      id: 'training', 
      label: 'Entrenamiento', 
      icon: GraduationCap, 
      count: null,
      gradient: 'from-violet-500 to-purple-500',
      permission: 'sidebar.training'
    },
    // Calendario - solo admin por defecto
    { 
      id: 'calendar', 
      label: 'Calendario', 
      icon: Calendar, 
      count: null,
      gradient: 'from-rose-500 to-pink-500',
      permission: 'sidebar.calendar'
    },
    // Productos - solo admin por defecto
    { 
      id: 'reports', 
      label: 'Productos', 
      icon: Package, 
      count: null,
      gradient: 'from-orange-500 to-red-500',
      permission: 'sidebar.products'
    },
    // Admin Panel - solo si es admin
    ...(isAdmin ? [{
      id: 'admin',
      label: 'Admin',
      icon: Shield,
      count: null,
      gradient: 'from-purple-600 to-indigo-600',
      isExternal: true,
      href: '/admin/dashboard',
      permission: 'admin'
    }] : [])
  ];

  // Filtrar items según permisos
  const sidebarItems = allSidebarItems.filter(item => 
    item.permission === 'admin' ? isAdmin : hasPermission(item.permission)
  );
  ];

  if (!mounted) {
    return <div className="min-h-screen bg-gradient-to-br from-white via-white to-white/95"></div>;
  }

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return '¡Buenos días';
    if (hour < 18) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  const getTimeIcon = () => {
    const hour = currentTime.getHours();
    if (hour < 6) return '🌙';
    if (hour < 12) return '🌅';
    if (hour < 18) return '☀️';
    if (hour < 21) return '🌆';
    return '🌙';
  };

  return (
    <GlobalNotificationProvider inboxId={inboxId}>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-hidden">
        {/* Sidebar Premium - MEJORADO: Mejor contraste */}
        <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200/80 flex-shrink-0 shadow-xl shadow-slate-300/40 transition-all duration-150 ease-out relative`}>
          
          {/* Header del Sidebar */}
          <div className="p-4 border-b border-slate-200/70">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-4'}`}>
              <div className="relative cursor-pointer" onClick={() => setSidebarCollapsed(false)} title="Expandir sidebar">
                <img
                  src="/logo-withmia.webp"
                  alt="WITHMIA Logo"
                  className="w-12 h-12 rounded-lg object-contain shadow-md hover:scale-105 transition-transform"
                />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1">
                  <h1 className="font-bold text-neutral-800 tracking-tight leading-tight" style={{ fontSize: '14px' }}>{safeUser.company}</h1>
                  <p className="text-neutral-600 font-semibold" style={{ fontSize: '11px' }}>{user?.role === 'admin' ? 'Administrador' : 'Agente'}</p>
                  <p className="text-neutral-500 font-medium" style={{ fontSize: '9px' }}>WITH YOU, WITH<strong>MIA</strong> ®</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Premium */}
          <nav className={`p-4 space-y-1 ${sidebarCollapsed ? 'px-2' : ''}`}>
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                title={sidebarCollapsed ? item.label : ''}
                className={`group w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-3 rounded-lg ${
                  activeSection === item.id
                    ? 'bg-gradient-to-r from-white to-white/95 shadow-lg shadow-white/30 opacity-100 border border-white/50'
                    : 'hover:bg-white/60 hover:opacity-100'
                }`}
              >
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-4'}`}>
                  <div className={`p-2 rounded-lg ${
                    activeSection === item.id 
                      ? `bg-gradient-to-r ${item.gradient} shadow-lg` 
                      : 'bg-white/90 group-hover:bg-white/95'
                  }`}>
                    <item.icon className={`w-5 h-5 ${
                      activeSection === item.id ? 'text-white' : 'text-neutral-500'
                    }`} />
                  </div>
                  {!sidebarCollapsed && (
                    <div className="text-left">
                      <span className={`font-semibold text-xs ${
                        activeSection === item.id ? 'text-neutral-800' : 'text-neutral-600'
                      }`}>
                        {item.label}
                      </span>
                      {activeSection === item.id && (
                        <div className="text-xs text-neutral-400 font-medium">Sección activa</div>
                      )}
                    </div>
                  )}
                </div>
                
                {!sidebarCollapsed && (item.count !== null && item.count !== undefined) && (
                  <div className={`!flex !items-center !space-x-2 !bg-transparent !shadow-none ${
                    activeSection === item.id ? '' : ''
                  } transition-none transform-none`}>
                    <span className="!text-xs !px-2 !py-1 !rounded-full !font-medium !bg-gray-100 !text-gray-600 !border !border-gray-200 !min-w-[24px] !h-6 !flex !items-center !justify-center !opacity-100 !transform-none">
                      {item.count}
                    </span>
                    {item.id !== 'insights' && item.id !== 'chats' && item.id !== 'people' && item.id !== 'calendar' && (
                      <ChevronRight className={`w-5 h-5 text-slate-400 ${
                        activeSection === item.id ? 'text-neutral-500 rotate-90' : 'group-hover:translate-x-0.5'
                      }`} />
                    )}
                  </div>
                )}
              </button>
            ))}
          </nav>

          {/* User Profile Premium con Meno� Desplegable */}
          <div className="absolute bottom-3 inset-x-3">
            <UserMenuDropdown 
              user={{
                firstName: safeUser.firstName,
                email: safeUser.email,
                plan: 'Gratis',
                logo_url: onboardingData?.logo_url,
                company: safeUser.company
              }}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(false)}
            />
          </div>

          {/* Version Info with Collapse Button */}
          {!sidebarCollapsed && (
            <div className="absolute bottom-22 inset-x-3">
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="text-xs font-medium text-neutral-400">Versión 1.0.0</p>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1 hover:bg-slate-100 rounded transition-all duration-200 text-neutral-400 hover:text-neutral-600"
                  title="Contraer sidebar"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Header Premium */}
          <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 px-8 py-3.5 relative z-10">
            <div className="flex items-center justify-between">
              
              {/* Hero Greeting */}
              <div className="flex items-center space-x-6">
                <div>
                  <div className="flex items-center space-x-2.5 mb-1">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-neutral-700 to-neutral-600 bg-clip-text text-transparent">
                      {getGreeting()}, {safeUser.firstName}!
                    </h1>
                    <span className="text-xl">{getTimeIcon()}</span>
                  </div>
                  <p className="text-sm text-neutral-500 font-medium">
                    {currentTime.toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              
              {/* Action Bar */}
              <div className="flex items-center space-x-4">
                <NotificationBell />
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-hidden">
            
            {/* Contenido Condicional */}
            {activeSection === 'chats' ? (
              <div className="h-full w-full">
                {/* Chat completamente integrado sin márgenes */}
                <div className="w-full h-full">
                  <ConversationsInterface currentAgentId={user.chatwoot_agent_id} />
                </div>
              </div>
            ) : activeSection === 'people' ? (
              <div className="h-full w-full">
                <TeamsManagement />
              </div>
            ) : activeSection === 'insights' ? (
              <IntegrationSection
                whatsAppStatus={whatsAppStatus}
                whatsAppSettings={whatsAppSettings}
                onConnectWhatsApp={() => setShowWhatsAppModal(true)}
                onDisconnectWhatsApp={disconnectWhatsApp}
                onUpdateSettings={updateWhatsAppSettings}
                isUpdatingSettings={isUpdatingWhatsAppSettings}
              />
            ) : activeSection === 'knowledge' ? (
              <div className="h-full overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
                <Conocimientos 
                  user={user} 
                  company={{
                    id: user.company_id,
                    name: user.company_name,
                    slug: companySlug,
                    description: user.company_description,
                    settings: company?.settings
                  }}
                />
              </div>
            ) : activeSection === 'training' ? (
              <div className="h-full overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
                <Entrenamiento 
                  user={user} 
                  company={{
                    id: user.company_id,
                    name: user.company_name,
                    slug: companySlug,
                    description: user.company_description,
                    settings: company?.settings
                  }}
                  onboardingData={{
                    company_name: user.company_name || '',
                    company_description: user.company_description || '',
                    has_website: user.has_website || false,
                    website: user.website || '',
                    client_type: user.client_type || null
                  }}
                />
              </div>
            ) : activeSection === 'calendar' ? (
              <div className="min-h-[700px] p-8">
                {/* Seccio�n Calendario */}
                <div className="max-w-7xl mx-auto">
                  <div className="mb-8">
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="p-4 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl shadow-lg">
                        <Calendar className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <h1 className="text-4xl font-bold text-neutral-800">Calendario</h1>
                        <p className="text-lg text-neutral-500">Gestiona tus citas y eventos</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/95 backdrop-blur-sm rounded-xl p-12 border border-slate-200 shadow-xl text-center">
                    <div className="max-w-md mx-auto">
                      <div className="mb-6">
                        <Calendar className="w-20 h-20 mx-auto text-rose-500" />
                      </div>
                      <h2 className="text-2xl font-bold text-neutral-800 mb-4">Sistema de Calendario</h2>
                      <p className="text-neutral-500 mb-6">
                        Aquí podrás gestionar tus citas, reuniones y eventos. 
                        Integra con Google Calendar y sincroniza automáticamente tus reservas.
                      </p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg">
                        <Sparkles className="w-5 h-5" />
                        <span className="font-medium">🔜 Próximamente disponible</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeSection === 'reports' ? (
              <div className="min-h-[700px] p-8">
                {/* Sección Productos */}
                <div className="max-w-7xl mx-auto">
                  <div className="mb-8">
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="p-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg">
                        <Package className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <h1 className="text-4xl font-bold text-neutral-800">Productos</h1>
                        <p className="text-lg text-neutral-500">Catálogo de productos y servicios</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/95 backdrop-blur-sm rounded-xl p-12 border border-slate-200 shadow-xl text-center">
                    <div className="max-w-md mx-auto">
                      <div className="mb-6">
                        <Package className="w-20 h-20 mx-auto text-orange-500" />
                      </div>
                      <h2 className="text-2xl font-bold text-neutral-800 mb-4">Catálogo de Productos</h2>
                      <p className="text-neutral-500 mb-6">
                        Gestiona tu catálogo de productos y servicios. 
                        MIA podrá responder preguntas sobre precios, disponibilidad y características de tus productos.
                      </p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg">
                        <Sparkles className="w-5 h-5" />
                        <span className="font-medium">🔜 Próximamente disponible</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeSection === 'admin' ? (
              <AdminPanel />
            ) : (
              <div className="h-full overflow-y-auto">
                {/* Dashboard Principal con Metricas Completas - FASE 3 */}
                <div className="p-6">
                  <MetricsDashboard
                    conversations={conversations || []}
                    currentUserId={undefined}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <WhatsAppQRModal
        instanceName={companySlug}
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onConnected={() => {
          // Recargar p+��+��-��������-��gina para actualizar todo el dashboard
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }}
      />

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`px-6 py-4 rounded-lg shadow-2xl backdrop-blur-md border ${
            notification.type === 'success' 
              ? 'bg-green-50/95 border-green-200 text-green-800' 
              : 'bg-red-50/95 border-red-200 text-red-800'
          }`}>
            <p className="font-medium text-sm">{notification.message}</p>
          </div>
        </div>
      )}
      
      {/* Global Notification Toast - Navegaci�n a conversaciones */}
      <GlobalNotificationToast activeSection={activeSection} companySlug={companySlug} />
    </GlobalNotificationProvider>
  );
}

// Componente separado para manejar toasts globales con navegación
function GlobalNotificationToast({ activeSection, companySlug }: { activeSection: string; companySlug: string }) {
  const globalNotifications = useGlobalNotifications();
  
  const handleToastClick = (conversationId: number) => {
    // Toast click
    
    // Dismiss the toast
    globalNotifications?.dismissToast(conversationId);
    
    // Siempre emitir evento para navegar a la conversación sin recargar
    // El evento cambiará la sección a 'chats' y seleccionará la conversación
    window.dispatchEvent(new CustomEvent('navigateToConversation', {
      detail: { conversationId }
    }));
  };
  
  if (!globalNotifications) return null;
  
  return (
    <NotificationToast 
      toasts={globalNotifications.toasts || []}
      onDismiss={(id) => globalNotifications.dismissToast(id)}
      onClickToast={handleToastClick}
    />
  );
}

