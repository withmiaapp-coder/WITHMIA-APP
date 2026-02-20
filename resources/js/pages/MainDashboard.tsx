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
import SettingsPage from './settings/SettingsPage';
import ProfilePage from './profile/ProfilePage';
import SubscriptionPage from './subscription/SubscriptionPage';
import IntegrationSection from '../components/IntegrationSection';
import CalendarSection from '../components/CalendarSection';
import ProductsSection from '../components/ProductsSection';
import { NotificationBell } from '../components/NotificationBell';
import NotificationToast from '../components/NotificationToast';
import { GlobalNotificationProvider, useGlobalNotifications } from '../contexts/GlobalNotificationContext';
import { useConversations, useAgents, useTeams } from "../hooks/useChatwoot";
import { useReverb } from "../hooks/useReverb";
import {
  MessageCircle,
  Users,
  TrendingUp,
  BookOpen,
  Mail,
  Calendar,
  FileText,
  ChevronRight,
  ChevronLeft,
  Clock,
  Heart,
  Coffee,
  Sparkles,
  MessageSquare,
  Lightbulb,
  Shield,
  ShoppingCart,
  ShoppingBag,
  CalendarDays,
  Store,
  Instagram,
  Facebook,
  Settings,
  Package,
  GraduationCap,
  CreditCard
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
  full_name?: string;
  phone?: string;
  company_name?: string;
  company_slug?: string;
  company_id?: number;
  company_description?: string;
  has_website?: boolean;
  website?: string;
  client_type?: string;
  chatwoot_inbox_id?: number;
  chatwoot_agent_id?: number;
  role?: string;
  logo_url?: string;
}

interface Company {
  name: string;
  email?: string;
  settings?: Record<string, any>;
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

interface PlanInfo {
  name: string;
  status: string;
  badge_color: string;
  trial_days?: number | null;
  billing_cycle?: string;
  ends_at?: string | null;
}

interface Props {
  user: User;
  company?: Company;
  chatwoot?: Chatwoot;
  stats?: Stats;
  onboardingData?: any;
  companySlug: string;
  prefetchedTeams?: any[];
  prefetchedAgents?: any[];
  isSuperAdmin?: boolean;
  planInfo?: PlanInfo;
}

// ====== COMPONENTE: MENo� DESPLEGABLE DE USUARIO ======
interface UserMenuDropdownProps {
  user: {
    firstName: string;
    email: string;
    plan?: string;
    planBadgeColor?: string;
    planStatus?: string;
    trialDays?: number | null;
    logo_url?: string;
    company?: string;
  };
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToSubscription?: () => void;
}

function UserMenuDropdown({ user, isCollapsed, onToggleCollapse, onNavigateToProfile, onNavigateToSettings, onNavigateToSubscription }: UserMenuDropdownProps) {
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

  const helpSubmenuItems: Array<{icon: any; label: string; onClick: (() => void) | null; className: string; isDisabled: boolean}> = [
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
      onClick: onNavigateToProfile || null,
      className: onNavigateToProfile ? 'text-neutral-700 hover:bg-neutral-50' : 'text-neutral-400 cursor-not-allowed hover:bg-transparent',
      isDisabled: !onNavigateToProfile
    },
    {
      icon: Settings,
      label: 'Configuración',
      onClick: () => {
        if (onNavigateToSettings) {
          onNavigateToSettings();
          setIsOpen(false);
        }
      },
      className: 'text-neutral-700 hover:bg-neutral-50',
      isDisabled: false
    },
    {
      icon: CreditCard,
      label: 'Suscripción',
      onClick: () => {
        if (onNavigateToSubscription) {
          onNavigateToSubscription();
          setIsOpen(false);
        }
      },
      className: 'text-neutral-700 hover:bg-neutral-50',
      isDisabled: false
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
                  <span className={`text-xs font-medium inline-flex items-center gap-1 ${
                    user.planBadgeColor === 'green' ? 'text-emerald-600' :
                    user.planBadgeColor === 'amber' ? 'text-amber-600' :
                    user.planBadgeColor === 'red' ? 'text-red-500' :
                    'text-neutral-500'
                  }`}>
                    {user.planBadgeColor === 'green' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    )}
                    {user.plan || 'Gratis'}
                    {user.planStatus === 'trialing' && user.trialDays != null && (
                      <span className="text-[10px] text-amber-500 font-normal">
                        ({user.trialDays}d)
                      </span>
                    )}
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

// ====== COMPONENTE: RELOJ (aislado para evitar re-renders del dashboard) ======
function DashboardClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return '¡Buenos días';
    if (hour < 18) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  const getTimeIcon = () => {
    const hour = now.getHours();
    if (hour < 6) return '🌙';
    if (hour < 12) return '🌅';
    if (hour < 18) return '☀️';
    if (hour < 21) return '🌆';
    return '🌙';
  };

  return { greeting: getGreeting(), icon: getTimeIcon(), date: now };
}

function ClockDisplay({ firstName }: { firstName: string }) {
  const { greeting, icon, date } = DashboardClock();
  return (
    <div>
      <div className="flex items-center space-x-2.5 mb-1">
        <h1 className="text-xl font-bold bg-gradient-to-r from-neutral-700 to-neutral-600 bg-clip-text text-transparent">
          {greeting}, {firstName}!
        </h1>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-sm text-neutral-500 font-medium">
        {date.toLocaleDateString('es-ES', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </p>
    </div>
  );
}

export default function Dashboard({ user, company, chatwoot, stats, onboardingData, companySlug, prefetchedTeams, prefetchedAgents, isSuperAdmin, planInfo }: Props) {
  
  // ====== REVERB WEBSOCKETS ======
  const { subscribe, leave } = useReverb();
  
  // ====== PERMISOS DEL USUARIO ======
  const { isAdmin, isAgent, isSuperAdmin: isSuperAdminFromPerms, hasPermission, loading: permissionsLoading } = usePermissions();
  
  // Super admin: puede venir de la prop Inertia O del hook de permisos
  const isSuperAdminResolved = isSuperAdmin || isSuperAdminFromPerms || user?.role === 'superadmin';
  
  // ====== INBOX ID ======
  const inboxId = chatwoot?.inbox_id || user.chatwoot_inbox_id || null;
  
  // 🚀 PREFETCH: Inicializar cache con datos del servidor
  useEffect(() => {
    if (prefetchedTeams && prefetchedTeams.length > 0) {
      // Inyectar datos prefetch al cache global de teams
      (window as any).__prefetchedTeams = prefetchedTeams;
    }
    if (prefetchedAgents && prefetchedAgents.length > 0) {
      // Inyectar datos prefetch al cache global de agents
      (window as any).__prefetchedAgents = prefetchedAgents;
    }
  }, [prefetchedTeams, prefetchedAgents]);
  
  useEffect(() => {
    if (inboxId) {
      // Inbox ID available
    }
  }, [inboxId]);
  
  // ====== VALIDACIo�N DE SEGURIDAD ======
  useEffect(() => {
    // Validar companySlug
    if (!validators.isValidCompanySlug(companySlug)) {
      window.location.href = '/error';
      return;
    }
    
    // Validar user
    if (!user || !user.id || !user.name || !user.email) {
      window.location.href = '/login';
      return;
    }
    
    // Validar email
    if (!validators.isValidEmail(user.email)) {
      window.location.href = '/login';
      return;
    }
    
    // Validar nombre (contra XSS)
    if (!validators.isSafeString(user.name)) {
      window.location.href = '/login';
      return;
    }
  }, [user, companySlug]);
  
  const [mounted, setMounted] = useState(false);
  // Restaurar sección guardada o usar 'dashboard' por defecto
  // Si hay query param 'conversation', forzar a 'chats'
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      // Si hay query param conversation, ir directamente a chats
      if (urlParams.get('conversation')) {
        localStorage.setItem('dashboardActiveSection', 'chats');
        return 'chats';
      }
      // Si hay query param section (e.g., from payment callback)
      const sectionParam = urlParams.get('section');
      if (sectionParam) {
        localStorage.setItem('dashboardActiveSection', sectionParam);
        return sectionParam;
      }
      return localStorage.getItem('dashboardActiveSection') || 'dashboard';
    }
    return 'dashboard';
  });
  
  // ====== NAVEGACIÓN LIBRE - TODOS LOS USUARIOS PUEDEN ACCEDER A TODAS LAS SECCIONES ======
  // La lógica de permisos se manejará dentro de cada sección individual si es necesario
  const [currentTime] = useState(new Date());
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

  // Estado de integraciones de calendario (para el contador del sidebar)
  const [calendarIntegrationsCount, setCalendarIntegrationsCount] = useState(0);
  const [productIntegrationsCount, setProductIntegrationsCount] = useState(0);

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
        showNotification(error.message, 'error');
        
        // Si es error de autenticacio�n, redirigir al login
        if (error.type === 'auth') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      } else {
        // Error handled silently
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
        showNotification(error.message, 'error');
      } else {
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
      // Error handled silently
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
      showNotification("❌ Error al guardar configuraciones", 'error');
    } finally {
      setIsUpdatingWhatsAppSettings(false);
    }
  };

  // Integración real con Chatwoot
  const { conversations } = useConversations();
  const { agents } = useAgents();
  const { teams, fetchTeams } = useTeams();
  
  // NOTA: useTeams ya tiene un useEffect interno que carga los teams al montar
  // No es necesario llamar fetchTeams() manualmente aquí
  
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

  // Verificar integraciones de calendario conectadas
  const checkCalendarIntegrations = useCallback(async () => {
    try {
      const endpoints = [
        '/api/calendar/status',
        '/api/outlook/status',
        '/api/calendly/status',
        '/api/reservo/status',
        '/api/agendapro/status',
      ];
      const results = await Promise.allSettled(
        endpoints.map(url => secureFetch(url, { requireCsrf: false, timeout: 8000 }).then(r => r.json()))
      );
      let count = 0;
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value?.connected) count++;
      }
      setCalendarIntegrationsCount(count);
    } catch {
      // silently fail
    }
  }, []);

  // Cargar integraciones de calendario al montar
  useEffect(() => {
    checkCalendarIntegrations();
    // Load product integrations count
    (async () => {
      try {
        const res = await secureFetch('/api/product-integrations/status', { requireCsrf: false, timeout: 8000 });
        const data = await res.json();
        const integrations = data.integrations || {};
        let count = 0;
        for (const [key, val] of Object.entries(integrations)) {
          if (key !== 'manual' && key !== 'total_products' && (val as any)?.connected) count++;
        }
        setProductIntegrationsCount(count);
      } catch {}
    })();
  }, [checkCalendarIntegrations]);

  // Función para contar Integraciones realmente conectadas
  const getConnectedIntegrationsCount = () => {
    let connected = 0;
    
    // WhatsApp
    if (whatsAppStatus === 'connected' || whatsAppStatus === 'open') {
      connected++;
    }
    
    // Calendario (Google, Outlook, Calendly, Reservo, AgendaPro)
    connected += calendarIntegrationsCount;

    // Producto integrations (WooCommerce, Shopify, MercadoLibre)
    connected += productIntegrationsCount;
    
    return connected;
  };
  
  const integrationsCount = getConnectedIntegrationsCount();

  useEffect(() => {
    setMounted(true);
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
      
      // 1. Guardar en localStorage como backup (si el evento se pierde por timing)
      localStorage.setItem('pendingConversationId', String(conversationId));
      
      // 2. Cambiar sección a chats (sin recargar)
      localStorage.setItem('dashboardActiveSection', 'chats');
      setActiveSection('chats');
      
      // 3. Emitir evento con retry progresivo para que ConversationsInterface seleccione la conversación
      const tryDispatch = (attempt: number) => {
        window.dispatchEvent(new CustomEvent('selectConversation', {
          detail: { conversationId }
        }));
        // Si aún estamos pendientes y no hemos superado intentos, reintentar
        if (attempt < 5 && localStorage.getItem('pendingConversationId') === String(conversationId)) {
          setTimeout(() => tryDispatch(attempt + 1), 200 * (attempt + 1));
        }
      };
      setTimeout(() => tryDispatch(0), 150);
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
      // Actualizar estado directamente sin hacer request
      if (data.status) {
        setWhatsAppStatus(data.status.connected ? 'connected' : 'disconnected');
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
    name: getSafeText(user?.full_name || user?.name || 'Usuario'),
    firstName: getSafeText((user?.full_name || user?.name || 'Usuario').split(' ')[0]),
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

  // Sidebar items con permisos - usa isAdmin y hasPermission del hook usePermissions()
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
    // Admin Panel - SOLO para super-admin (controlado desde el servidor)
    ...(isSuperAdminResolved ? [{
      id: 'admin',
      label: 'Admin',
      icon: Shield,
      count: null,
      gradient: 'from-purple-600 to-indigo-600',
      permission: 'superadmin'
    }] : [])
  ];

  // Filtrar items según permisos
  const sidebarItems = allSidebarItems.filter(item => 
    item.permission === 'superadmin' ? !!isSuperAdminResolved : 
    item.permission === 'admin' ? isAdmin : hasPermission(item.permission)
  );

  // Mostrar loading mientras se cargan permisos para evitar flash de contenido admin
  if (!mounted || permissionsLoading) {
    return <div className="min-h-screen bg-gradient-to-br from-white via-white to-white/95"></div>;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días';
    if (hour < 18) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  const getTimeIcon = () => {
    const hour = new Date().getHours();
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
                  <p className="text-neutral-600 font-semibold" style={{ fontSize: '11px' }}>{user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'admin' ? 'Administrador' : 'Agente'}</p>
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

          {/* User Profile Premium con Menú Desplegable */}
          <div className="absolute bottom-3 inset-x-3">
            <UserMenuDropdown 
              user={{
                firstName: safeUser.firstName,
                email: safeUser.email,
                plan: planInfo?.name || 'Gratis',
                planBadgeColor: planInfo?.badge_color || 'gray',
                planStatus: planInfo?.status || 'free',
                trialDays: planInfo?.trial_days ?? null,
                logo_url: onboardingData?.logo_url,
                company: safeUser.company
              }}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(false)}
              onNavigateToProfile={() => handleNavigation('profile')}
              onNavigateToSettings={() => handleNavigation('settings')}
              onNavigateToSubscription={() => handleNavigation('subscription')}
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
                <ClockDisplay firstName={safeUser.firstName} />
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
                onIntegrationChange={checkCalendarIntegrations}
                onNavigateToProducts={() => setActiveSection('reports')}
              />
            ) : activeSection === 'knowledge' ? (
              <div className="h-full overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
                <Conocimientos 
                  user={user} 
                  company={{
                    id: user.company_id as number,
                    name: user.company_name || '',
                    slug: companySlug,
                    description: user.company_description,
                    settings: company?.settings
                  }}
                />
              </div>
            ) : activeSection === 'training' ? (
              <div className="h-full overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
                <Entrenamiento 
                  user={{...user, client_type: (user.client_type as "interno" | "externo" | undefined) ?? undefined}} 
                  company={{
                    id: user.company_id as number,
                    name: user.company_name || '',
                    slug: companySlug,
                    description: user.company_description,
                    settings: company?.settings
                  }}
                  onboardingData={{
                    company_name: onboardingData?.company_name || user.company_name || '',
                    company_description: onboardingData?.company_description || user.company_description || '',
                    has_website: onboardingData?.has_website || user.has_website || false,
                    website: onboardingData?.website || user.website || '',
                    client_type: (onboardingData?.client_type || user.client_type) as "interno" | "externo" | null,
                    logo_url: onboardingData?.logo_url,
                    assistant_name: onboardingData?.assistant_name || 'WITHMIA'
                  }}
                />
              </div>
            ) : activeSection === 'calendar' ? (
              <CalendarSection user={user} company={company} />
            ) : activeSection === 'reports' ? (
              <ProductsSection user={user} company={company} />
            ) : activeSection === 'settings' ? (
              <SettingsPage />
            ) : activeSection === 'admin' ? (
              <AdminPanel />
            ) : activeSection === 'profile' ? (
              <ProfilePage user={user} />
            ) : activeSection === 'subscription' ? (
              <SubscriptionPage />
            ) : (
              <div className="h-full overflow-y-auto">
                {/* Dashboard Principal con Metricas Completas - FASE 3 */}
                <div className="p-6">
                  <MetricsDashboard
                    conversations={conversations || []}
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
    // ✅ Limpiar TODO para esta conversación: badges + notificaciones + toasts
    if (globalNotifications?.clearBadge) {
      globalNotifications.clearBadge(conversationId);
    }
    
    // Navegar a la conversación sin recargar
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

