import { Head, router } from '@inertiajs/react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { flushSync, createPortal } from 'react-dom';
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
import SupportTickets from '../components/SupportTickets';
import { NotificationBell } from '../components/NotificationBell';
import NotificationToast from '../components/NotificationToast';
import { ThemePicker } from '../components/ThemePicker';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { GlobalNotificationProvider, useGlobalNotifications } from '../contexts/GlobalNotificationContext';
import { useConversations, useAgents, useTeams } from "../hooks/useChatwoot";
import { fetchDailyQuote } from '../utils/dailyQuotes';
import type { DailyQuote } from '../utils/dailyQuotes';
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
  CreditCard,
  Headphones,
  Lock
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
  settings?: Record<string, unknown>;
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
  onboardingData?: {
    company_name?: string;
    company_description?: string;
    has_website?: boolean;
    website?: string;
    client_type?: string;
    logo_url?: string;
    assistant_name?: string;
    [key: string]: unknown;
  };
  companySlug: string;
  prefetchedTeams?: { id: number; name: string; [key: string]: unknown }[];
  prefetchedAgents?: { id: number; name: string; email: string; [key: string]: unknown }[];
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
  onNavigateToSupport?: () => void;
}

function UserMenuDropdown({ user, isCollapsed, onToggleCollapse, onNavigateToProfile, onNavigateToSettings, onNavigateToSubscription, onNavigateToSupport }: UserMenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHelpSubmenu, setShowHelpSubmenu] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [helpMenuPos, setHelpMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [menuPos, setMenuPos] = useState<{ bottom: number; left: number; width: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const helpBtnRef = useRef<HTMLButtonElement>(null);
  const { hasTheme, isDark, currentTheme } = useTheme();

  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      cardBg: 'var(--theme-content-card-bg)',
      cardBorder: 'var(--theme-content-card-border)',
      // Dropdown needs a SOLID opaque bg, not the translucent card-bg
      dropdownBg: isDark ? 'var(--theme-sidebar-bg)' : 'var(--theme-content-card-bg)',
      dropdownBorder: isDark ? 'var(--theme-glass-border)' : 'var(--theme-content-card-border)',
      text: 'var(--theme-text-primary)',
      textSec: 'var(--theme-text-secondary)',
      textMuted: 'var(--theme-text-muted)',
      accent: 'var(--theme-accent)',
      accentLight: 'var(--theme-accent-light)',
      itemBg: 'var(--theme-item-bg)',
    };
  }, [hasTheme, isDark]);

  // Reset logo error when logo_url changes
  useEffect(() => {
    setLogoError(false);
  }, [user.logo_url]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside both the trigger and the fixed dropdown
      const isOutside = dropdownRef.current && !dropdownRef.current.contains(target);
      // Also check if the click is on the portal-rendered dropdown or help submenu
      const fixedMenu = document.querySelector('[data-user-menu-dropdown]');
      const helpSubmenu = document.querySelector('[data-user-help-submenu]');
      const isOnFixedMenu = fixedMenu && fixedMenu.contains(target);
      const isOnHelpSubmenu = helpSubmenu && helpSubmenu.contains(target);
      if (isOutside && !isOnFixedMenu && !isOnHelpSubmenu) {
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

  const helpSubmenuItems: Array<{icon: React.ComponentType<{ className?: string }>; label: string; href?: string; onClick?: () => void; className: string; isDisabled: boolean}> = [
    {
      icon: BookOpen,
      label: 'Centro de ayuda',
      href: 'https://withmia.com/ayuda',
      className: isDark ? 'text-gray-200 hover:bg-white/5' : 'text-neutral-700 hover:bg-neutral-50',
      isDisabled: false
    },
    {
      icon: MessageCircle,
      label: 'Contactar soporte',
      onClick: () => {
        if (onNavigateToSupport) onNavigateToSupport();
      },
      className: isDark ? 'text-gray-200 hover:bg-white/5' : 'text-neutral-700 hover:bg-neutral-50',
      isDisabled: false
    },
    {
      icon: FileText,
      label: 'Documentación',
      href: 'https://withmia.com/docs',
      className: isDark ? 'text-gray-200 hover:bg-white/5' : 'text-neutral-700 hover:bg-neutral-50',
      isDisabled: false
    },
    {
      icon: MessageSquare,
      label: 'Preguntas frecuentes',
      href: 'https://withmia.com/faq',
      className: isDark ? 'text-gray-200 hover:bg-white/5' : 'text-neutral-700 hover:bg-neutral-50',
      isDisabled: false
    },
    {
      icon: Users,
      label: 'Comunidad',
      href: 'https://withmia.com/comunidad',
      className: isDark ? 'text-gray-200 hover:bg-white/5' : 'text-neutral-700 hover:bg-neutral-50',
      isDisabled: false
    }
  ];

  const menuItems = [
    {
      icon: Mail,
      label: user.email,
      onClick: null,
      className: isDark ? 'text-gray-400 cursor-default hover:bg-transparent pointer-events-none' : 'text-neutral-500 cursor-default hover:bg-transparent pointer-events-none',
      isEmail: true
    },
    {
      icon: Coffee,
      label: 'Perfil',
      onClick: onNavigateToProfile || null,
      className: onNavigateToProfile
        ? (isDark ? 'text-gray-200 hover:bg-white/5' : 'text-neutral-700 hover:bg-neutral-50')
        : (isDark ? 'text-gray-500 cursor-not-allowed hover:bg-transparent' : 'text-neutral-400 cursor-not-allowed hover:bg-transparent'),
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
      className: isDark ? 'text-gray-200 hover:bg-white/5' : 'text-neutral-700 hover:bg-neutral-50',
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
      className: isDark ? 'text-gray-200 hover:bg-white/5' : 'text-neutral-700 hover:bg-neutral-50',
      isDisabled: false
    },
    {
      icon: Heart,
      label: 'Ayuda',
      onClick: () => {
        if (!showHelpSubmenu && helpBtnRef.current) {
          const rect = helpBtnRef.current.getBoundingClientRect();
          const menuHeight = 5 * 44; // 5 items × ~44px
          let top = rect.top;
          // Si se sale por arriba de la pantalla, ajustar
          if (top + menuHeight > window.innerHeight) {
            top = window.innerHeight - menuHeight - 8;
          }
          if (top < 8) top = 8;
          setHelpMenuPos({ top, left: rect.right + 6 });
        }
        setShowHelpSubmenu(!showHelpSubmenu);
      },
      className: isDark ? 'text-gray-200 hover:bg-white/5' : 'text-neutral-700 hover:bg-neutral-50',
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
      className: isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50',
      isDanger: true
    }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Menu - Portal to body to escape sidebar stacking context */}
      {isOpen && menuPos && createPortal(
        <div 
          data-user-menu-dropdown
          className={`fixed rounded-2xl shadow-2xl border z-[9999] ${!t ? (isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-neutral-200') : ''}`}
          style={{
            width: isCollapsed ? 320 : menuPos.width,
            left: isCollapsed ? menuPos.left : menuPos.left,
            bottom: window.innerHeight - menuPos.bottom + 8,
            animation: 'slideUpMenu 0.2s ease-out',
            overflow: 'visible',
            ...(t ? { backgroundColor: t.dropdownBg, borderColor: t.dropdownBorder } : {})
          }}
        >
          {/* Lista de opciones */}
          <div className="py-2">
            {menuItems.map((item, index) => {
              if (item.type === 'divider') {
                return (
                  <div key={`divider-${index}`} className={`h-px my-2 mx-3 ${isDark ? 'bg-white/10' : 'bg-neutral-200'}`} />
                );
              }

              const Icon = item.icon;

              return (
                <div 
                  key={index} 
                  className="relative"
                >
                  <button
                    ref={item.hasSubmenu ? helpBtnRef : undefined}
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
                        <div className={`flex items-center justify-center ${item.isEmail ? (isDark ? 'text-gray-500' : 'text-neutral-400') : item.isDanger ? (isDark ? 'text-red-400' : 'text-red-500') : (isDark ? 'text-gray-400' : 'text-neutral-600')}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                      )}
                      <span className={`text-sm ${item.isEmail ? 'font-normal text-xs' : 'font-medium'} ${item.isDanger ? 'text-red-600' : ''}`}>
                        {item.label}
                      </span>
                    </div>
                    
                    {item.hasSubmenu && (
                      <ChevronRight 
                        className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-neutral-400'}`}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* Submenú de Ayuda - Portal to body */}
      {showHelpSubmenu && helpMenuPos && createPortal(
        <div 
          data-user-help-submenu
          className={`fixed rounded-xl shadow-2xl border min-w-[220px] z-[10000] ${!t ? (isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-gray-200') : ''}`}
          style={{ 
            animation: 'slideInRight 0.2s ease-out',
            top: helpMenuPos.top,
            left: helpMenuPos.left,
            ...(t ? { backgroundColor: t.dropdownBg, borderColor: t.dropdownBorder } : {})
          }}
        >
          <div className="py-2">
            {helpSubmenuItems.map((subItem, subIndex) => {
              const SubIcon = subItem.icon;
              const isInternal = !!subItem.onClick;

              const content = (
                <>
                  <SubIcon 
                    className="w-4 h-4"
                    style={t ? { color: t.textMuted } : undefined}
                  />
                  <span className="text-sm font-medium">{subItem.label}</span>
                </>
              );

              if (isInternal) {
                return (
                  <button
                    key={subIndex}
                    onClick={() => {
                      subItem.onClick!();
                      setIsOpen(false);
                      setShowHelpSubmenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-150 ${!t ? subItem.className : 'hover:opacity-80'}`}
                    style={t ? { color: t.textSec } : undefined}
                  >
                    {content}
                  </button>
                );
              }

              return (
                <a
                  key={subIndex}
                  href={subItem.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setIsOpen(false);
                    setShowHelpSubmenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-150 no-underline ${!t ? subItem.className : 'hover:opacity-80'}`}
                  style={t ? { color: t.textSec } : undefined}
                >
                  {content}
                </a>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* User Profile Button */}
      <div 
        ref={triggerRef}
        className={`p-3 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 ${!t ? (isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-neutral-200') : ''}`}
        style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}
      >
        <button 
          onClick={() => {
            if (isCollapsed) {
              onToggleCollapse();
            } else {
              if (!isOpen && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setMenuPos({ bottom: rect.top, left: rect.left, width: rect.width });
              }
              setIsOpen(!isOpen);
              setShowHelpSubmenu(false);
            }
          }}
          className={`flex items-center w-full rounded-lg px-2 py-1.5 transition-all duration-200 ${isDark ? 'hover:bg-white/5' : 'hover:bg-neutral-50'}`}
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
                  <div 
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${!t ? 'bg-neutral-800' : ''}`}
                    style={t ? { background: 'var(--theme-primary)' } : undefined}
                  >
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
                  <div 
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${!t ? 'bg-neutral-800' : ''}`}
                    style={t ? { background: 'var(--theme-primary)' } : undefined}
                  >
                    <span className="text-base font-bold text-white">
                      {user.firstName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
              
              <div className="flex-1 min-w-0 text-left">
                <p className={`font-semibold truncate text-sm ${isDark ? 'text-gray-200' : 'text-neutral-800'}`}>
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
                  className={isDark ? 'text-gray-500' : 'text-neutral-400'}
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
  const { hasTheme, isDark } = useTheme();
  const [dailyQuote, setDailyQuote] = useState<DailyQuote | null>(() => {
    // Only use cached quote (no random fallback that causes content flash)
    try {
      const today = new Date().toISOString().slice(0, 10);
      const storedDate = sessionStorage.getItem('withmia_daily_quote_v3_date');
      const stored = sessionStorage.getItem('withmia_daily_quote_v3');
      if (storedDate === today && stored) return JSON.parse(stored);
    } catch {}
    return null;
  });
  const [isLoading, setIsLoading] = useState(dailyQuote === null);

  useEffect(() => {
    if (dailyQuote) return; // Already have a cached quote
    let cancelled = false;
    fetchDailyQuote().then((q) => {
      if (!cancelled) {
        setDailyQuote(q);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const skeletonColor = hasTheme
    ? isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
    : '#e5e7eb';

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: hasTheme
                ? isDark ? 'rgba(255,255,255,0.06)' : 'var(--theme-primary-lighter)'
                : 'linear-gradient(to bottom right, #fef3c7, #ffedd5)',
            }}
          >
            <span className="text-sm">💡</span>
          </div>
        </div>
        {isLoading ? (
          <div className="min-w-0 flex-1 animate-pulse space-y-1.5">
            <div className="h-3.5 rounded-md w-[90%]" style={{ background: skeletonColor }} />
            <div className="h-3.5 rounded-md w-[70%]" style={{ background: skeletonColor }} />
            <div className="h-3 rounded-md w-[40%] mt-1" style={{ background: skeletonColor }} />
          </div>
        ) : dailyQuote ? (
          <div className="min-w-0 animate-fade-in">
            <p 
              className="text-[13px] font-medium italic leading-snug" 
              style={{ 
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                color: hasTheme ? 'var(--theme-text-primary)' : '#374151',
              }} 
              title={dailyQuote.quote}
            >
              &ldquo;{dailyQuote.quote}&rdquo;
            </p>
            <p 
              className="text-[11px] font-semibold mt-1"
              style={{ color: hasTheme ? 'var(--theme-text-secondary)' : '#6b7280' }}
            >
              — {dailyQuote.author} <span style={{ color: hasTheme ? 'var(--theme-text-muted)' : '#d1d5db' }} className="mx-0.5">·</span> <span style={{ color: hasTheme ? 'var(--theme-text-muted)' : '#9ca3af' }} className="font-normal">{dailyQuote.context}</span>
            </p>
            {dailyQuote.who && (
              <p 
                className="text-[11px] font-normal mt-0.5 leading-snug" 
                style={{ 
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  color: hasTheme ? 'var(--theme-text-muted)' : '#9ca3af',
                }} 
                title={dailyQuote.who}
              >
                {dailyQuote.who}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Dashboard({ user, company, chatwoot, stats, onboardingData, companySlug, prefetchedTeams, prefetchedAgents, isSuperAdmin, planInfo }: Props) {
  
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
      (window as Window & { __prefetchedTeams?: unknown[] }).__prefetchedTeams = prefetchedTeams;
    }
    if (prefetchedAgents && prefetchedAgents.length > 0) {
      // Inyectar datos prefetch al cache global de agents
      (window as Window & { __prefetchedAgents?: unknown[] }).__prefetchedAgents = prefetchedAgents;
    }
  }, [prefetchedTeams, prefetchedAgents]);
  
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
  
  // ====== FORZAR NAVEGACIÓN POR QUERY PARAM ?section= ======
  // useEffect para capturar el query param después del mount (más robusto que useState initializer)
  // También limpia la URL para que no quede el ?section= después de navegar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sectionParam = urlParams.get('section');
      if (sectionParam && sectionParam !== activeSection) {
        localStorage.setItem('dashboardActiveSection', sectionParam);
        setActiveSection(sectionParam);
      }
      // Limpiar el query param section de la URL para que no quede stale
      if (sectionParam) {
        urlParams.delete('section');
        const newQuery = urlParams.toString();
        const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []); // Solo en mount

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
  const [chatwootChannelCount, setChatwootChannelCount] = useState(0);

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

  // Load Chatwoot channel count (Messenger, Instagram, WhatsApp Cloud, Email, Web Chat)
  const checkChatwootChannels = useCallback(async () => {
    try {
      const res = await secureFetch('/api/channels', { requireCsrf: false, timeout: 8000 });
      const data = await res.json();
      const channels = data.channels || [];
      // Exclude Evolution API WhatsApp (already counted via whatsAppStatus)
      const count = channels.filter((ch: { id: string }) => ch.id !== 'whatsapp').length;
      setChatwootChannelCount(count);
    } catch {}
  }, []);

  // Cargar integraciones al montar
  useEffect(() => {
    checkCalendarIntegrations();
    checkChatwootChannels();
    // Load product integrations count
    (async () => {
      try {
        const res = await secureFetch('/api/product-integrations/status', { requireCsrf: false, timeout: 8000 });
        const data = await res.json();
        const integrations = data.integrations || {};
        let count = 0;
        for (const [key, val] of Object.entries(integrations)) {
          if (key !== 'manual' && key !== 'total_products' && (val as Record<string, unknown>)?.connected) count++;
        }
        setProductIntegrationsCount(count);
      } catch {}
    })();
  }, [checkCalendarIntegrations, checkChatwootChannels]);

  // Función para contar Integraciones realmente conectadas
  const getConnectedIntegrationsCount = () => {
    let connected = 0;
    
    // WhatsApp
    if (whatsAppStatus === 'connected' || whatsAppStatus === 'open') {
      connected++;
    }
    
    // Chatwoot channels (Messenger, Instagram, WhatsApp Cloud, Email, Web Chat)
    connected += chatwootChannelCount;

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
    subscribe(channelName, 'WhatsAppStatusChanged', (data: unknown) => {
      // Actualizar estado directamente sin hacer request
      const wsData = data as { status?: { connected: boolean } };
      if (wsData.status) {
        setWhatsAppStatus(wsData.status.connected ? 'connected' : 'disconnected');
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
  // OPTIMIZADO: transición elegante al cambiar secciones
  const [sectionTransition, setSectionTransition] = useState(false);
  const handleNavigation = useCallback((itemId: string) => {
    // Prevenir clicks duplicados si ya estamos en esa seccio�n
    if (itemId === activeSection) return;
    
    // Actualizacio�n so�ncrona a localStorage ANTES de cualquier render
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboardActiveSection', itemId);
      // Limpiar query params (section, conversation) de la URL al navegar
      const url = new URL(window.location.href);
      if (url.searchParams.has('section') || url.searchParams.has('conversation')) {
        url.searchParams.delete('section');
        url.searchParams.delete('conversation');
        window.history.replaceState({}, '', url.pathname);
      }
    }
    
    // Fade out → change section → fade in
    setSectionTransition(true);
    setTimeout(() => {
      flushSync(() => {
        setActiveSection(itemId);
      });
      // small delay to allow React to render the new section before fading in
      requestAnimationFrame(() => {
        setSectionTransition(false);
      });
    }, 150);
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

  // ====== PLAN STATUS ======
  // SuperAdmin always has full access regardless of subscription status
  const isPro = isSuperAdminResolved || planInfo?.status === 'active' || planInfo?.status === 'trialing';

  // Sidebar items con permisos - usa isAdmin y hasPermission del hook usePermissions()
  const allSidebarItems = [
    // Dashboard - visible para todos
    { 
      id: 'dashboard', 
      label: 'Inicio', 
      icon: Sparkles, 
      count: null,
      permission: 'sidebar.dashboard',
      proOnly: false
    },
    // Conversaciones - todos
    { 
      id: 'chats', 
      label: 'Conversaciones', 
      icon: MessageCircle, 
      count: (conversations || []).filter(c => c.status === "open").length,
      permission: 'sidebar.chats',
      proOnly: false
    },
    // Entrenamiento - solo admin por defecto
    { 
      id: 'training', 
      label: 'Entrenamiento', 
      icon: GraduationCap, 
      count: null,
      permission: 'sidebar.training',
      proOnly: false
    },
    // Integraciones - solo admin por defecto
    { 
      id: 'insights', 
      label: 'Integración', 
      icon: Lightbulb, 
      count: integrationsCount,
      permission: 'sidebar.integrations',
      proOnly: false
    },
    // Conocimientos - PRO ONLY
    { 
      id: 'knowledge', 
      label: 'Conocimientos', 
      icon: BookOpen, 
      count: null,
      permission: 'sidebar.knowledge',
      proOnly: true
    },
    // Calendario - PRO ONLY
    { 
      id: 'calendar', 
      label: 'Calendario', 
      icon: Calendar, 
      count: null,
      permission: 'sidebar.calendar',
      proOnly: true
    },
    // Equipo - PRO ONLY
    { 
      id: 'people', 
      label: 'Equipo', 
      icon: Users, 
      count: teams && teams.length > 0 ? teams.length : null,
      permission: 'sidebar.teams',
      proOnly: true
    },
    // Productos - PRO ONLY
    { 
      id: 'reports', 
      label: 'Productos', 
      icon: Package, 
      count: null,
      permission: 'sidebar.products',
      proOnly: true
    },
    // Admin Panel - SOLO para super-admin (controlado desde el servidor)
    ...(isSuperAdminResolved ? [{
      id: 'admin',
      label: 'Admin',
      icon: Shield,
      count: null,
      permission: 'superadmin',
      proOnly: false
    }] : [])
  ];

  // Filtrar items según permisos (pero mantener los proOnly siempre visibles con lock)
  const sidebarItems = allSidebarItems.filter(item => {
    // Pro-only items always visible (shown with lock if free)
    if (item.proOnly) return true;
    return item.permission === 'superadmin' ? !!isSuperAdminResolved : 
      item.permission === 'admin' ? isAdmin : hasPermission(item.permission);
  });

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

  // Theme variables - useTheme is safe here because ThemeProvider wraps via DashboardWithTheme below
  const { currentTheme, hasTheme, isDark } = useTheme();

  return (
    <GlobalNotificationProvider inboxId={inboxId}>
      <div className="flex h-screen overflow-hidden" style={{ background: hasTheme ? 'var(--theme-content-bg, #f8fafc)' : '#f1f5f9' }} >
        {/* Sidebar Premium — Glassmorphism */}
        <div 
          className={`${sidebarCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 transition-all duration-150 ease-out relative`}
          style={{
            background: hasTheme ? 'var(--theme-sidebar-bg)' : 'white',
            borderRight: hasTheme ? '1px solid var(--theme-glass-border)' : '1px solid rgb(226 232 240 / 0.8)',
            boxShadow: hasTheme ? '2px 0 12px -4px var(--theme-glass-shadow)' : '1px 0 8px -2px rgba(0,0,0,0.05)',
            backdropFilter: hasTheme ? 'blur(12px)' : undefined,
            WebkitBackdropFilter: hasTheme ? 'blur(12px)' : undefined,
          }}
        >
          
          {/* Header del Sidebar — altura sincronizada con top header */}
          <div className="px-4 flex items-center" style={{ minHeight: '73px', borderBottom: hasTheme ? '1px solid var(--theme-glass-border)' : '1px solid rgb(226 232 240 / 0.7)' }}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-4'} w-full`}>
              <div className="relative cursor-pointer flex-shrink-0" onClick={() => setSidebarCollapsed(false)} title="Expandir sidebar">
                <img
                  src="/logo-withmia.webp"
                  alt="WITHMIA Logo"
                  className="w-12 h-12 rounded-lg object-contain shadow-md hover:scale-105 transition-transform"
                />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <h1 
                    className={`font-bold tracking-tight leading-tight truncate ${!hasTheme ? 'text-neutral-800' : ''}`}
                    style={{ fontSize: '14px', ...(hasTheme ? { color: 'var(--theme-sidebar-text)' } : {}) }}
                  >{safeUser.company}</h1>
                  <p 
                    className={`font-semibold ${!hasTheme ? 'text-neutral-600' : ''}`}
                    style={{ fontSize: '11px', ...(hasTheme ? { color: 'var(--theme-secondary)' } : {}) }}
                  >{user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'admin' ? 'Administrador' : 'Agente'}</p>
                  <p 
                    className={`font-medium ${!hasTheme ? 'text-neutral-500' : ''}`}
                    style={{ fontSize: '9px', ...(hasTheme ? { color: 'var(--theme-secondary)', opacity: 0.7 } : {}) }}
                  >WITH YOU, WITH<strong>MIA</strong> ®</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Premium */}
          <nav className={`p-4 space-y-1 ${sidebarCollapsed ? 'px-2' : ''}`}>
            {sidebarItems.map((item) => {
              const isActive = activeSection === item.id;
              const isLocked = item.proOnly && !isPro;
              return (
              <button
                key={item.id}
                onClick={() => isLocked ? handleNavigation('subscription') : handleNavigation(item.id)}
                title={sidebarCollapsed ? (isLocked ? `${item.label} (Pro)` : item.label) : (isLocked ? 'Disponible en WITHMIA Pro' : '')}
                className={`group w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-3 rounded-lg transition-colors duration-150 ${
                  !hasTheme ? (
                    isActive && !isLocked
                      ? 'bg-neutral-100 shadow-sm border border-neutral-200/60'
                      : 'hover:bg-neutral-50 border border-transparent'
                  ) : ''
                } ${isLocked ? 'opacity-50' : ''}`}
                style={hasTheme ? {
                  background: isActive && !isLocked ? 'var(--theme-sidebar-active-bg)' : undefined,
                  boxShadow: isActive && !isLocked ? '0 2px 8px -2px var(--theme-glass-shadow)' : undefined,
                  border: isActive && !isLocked ? '1px solid var(--theme-glass-border)' : '1px solid transparent',
                  opacity: isLocked ? 0.5 : undefined,
                } : undefined}
                onMouseEnter={(e) => { if (hasTheme && !isActive) e.currentTarget.style.background = 'var(--theme-sidebar-hover)'; }}
                onMouseLeave={(e) => { if (hasTheme && !isActive) e.currentTarget.style.background = ''; }}
              >
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-4'}`}>
                  <div 
                    className={`p-2 rounded-lg transition-colors duration-150 ${
                      !hasTheme ? (
                        isActive 
                          ? 'bg-neutral-800 shadow-md' 
                          : 'bg-neutral-100 group-hover:bg-neutral-200/80'
                      ) : ''
                    }`}
                    style={hasTheme ? {
                      background: isActive ? 'var(--theme-primary)' : 'var(--theme-icon-inactive-bg)',
                      boxShadow: isActive ? '0 4px 12px var(--theme-accent-light)' : undefined,
                    } : undefined}
                  >
                    <item.icon 
                      className={`w-5 h-5 ${!hasTheme ? (isActive ? 'text-white' : 'text-neutral-500') : ''}`}
                      style={hasTheme ? { color: isActive ? 'white' : 'var(--theme-icon-inactive)' } : undefined}
                    />
                  </div>
                  {!sidebarCollapsed && (
                    <div className="text-left">
                      <span 
                        className={`font-semibold text-xs ${!hasTheme ? (isActive && !isLocked ? 'text-neutral-800' : 'text-neutral-600') : ''}`}
                        style={hasTheme ? { color: isActive && !isLocked ? (isDark ? 'var(--theme-text-primary)' : 'var(--theme-primary-dark)') : 'var(--theme-sidebar-text)' } : undefined}
                      >
                        {item.label}
                      </span>
                      {isLocked && (
                        <div className="flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-500" />
                          <span className="text-[10px] font-medium text-amber-500">Pro</span>
                        </div>
                      )}
                      {isActive && !isLocked && (
                        <div 
                          className={`text-xs font-medium ${!hasTheme ? 'text-neutral-400' : ''}`}
                          style={hasTheme ? { color: 'var(--theme-secondary)' } : undefined}
                        >Sección activa</div>
                      )}
                    </div>
                  )}
                </div>
                
                {!sidebarCollapsed && isLocked && (
                  <Lock className="w-4 h-4 text-amber-500/70" />
                )}
                
                {!sidebarCollapsed && !isLocked && (item.count !== null && item.count !== undefined) && (
                  <div className={`!flex !items-center !space-x-2 !bg-transparent !shadow-none transition-none transform-none`}>
                    <span 
                      className={`!text-xs !px-2 !py-1 !rounded-full !font-medium !min-w-[24px] !h-6 !flex !items-center !justify-center !opacity-100 !transform-none ${
                        !hasTheme ? '!bg-gray-100 !text-gray-600 !border !border-gray-200' : ''
                      }`}
                      style={hasTheme ? {
                        background: 'var(--theme-badge-bg)',
                        color: 'var(--theme-badge-text)',
                        border: '1px solid var(--theme-badge-border)',
                      } : undefined}
                    >
                      {item.count}
                    </span>
                    {item.id !== 'insights' && item.id !== 'chats' && item.id !== 'people' && item.id !== 'calendar' && (
                      <ChevronRight 
                        className={`w-5 h-5 ${!hasTheme ? 'text-slate-400' : ''} ${
                          activeSection === item.id ? (!hasTheme ? 'text-neutral-500' : '') + ' rotate-90' : 'group-hover:translate-x-0.5'
                        }`}
                        style={hasTheme ? { color: 'var(--theme-secondary)' } : undefined}
                      />
                    )}
                  </div>
                )}
              </button>
            );
            })}
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
              onNavigateToSupport={() => handleNavigation('support')}
            />
          </div>

          {/* Version Info with Collapse Button */}
          {!sidebarCollapsed && (
            <div className="absolute bottom-22 inset-x-3">
              <div className="flex items-center justify-between px-2 py-1.5">
                <p 
                  className={`text-xs font-medium ${!hasTheme ? 'text-neutral-400' : ''}`}
                  style={hasTheme ? { color: 'var(--theme-secondary)', opacity: 0.6 } : undefined}
                >Versión 1.0.5</p>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={`p-1 rounded transition-all duration-200 ${!hasTheme ? 'hover:bg-slate-100 text-neutral-400 hover:text-neutral-600' : ''}`}
                  style={hasTheme ? { color: 'var(--theme-secondary)' } : undefined}
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
          <header 
            className="backdrop-blur-lg px-8 relative z-10 flex items-center"
            style={{ 
              minHeight: '73px',
              background: hasTheme ? 'var(--theme-header-bg)' : 'rgba(255,255,255,0.8)',
              borderBottom: hasTheme ? '1px solid var(--theme-header-border)' : '1px solid rgb(226 232 240)',
            }}
          >
            <div className="flex items-center justify-between w-full">
              
              {/* Hero Greeting */}
              <div className="flex items-center space-x-6 min-w-0 flex-1">
                <ClockDisplay firstName={safeUser.firstName} />
              </div>
              
              {/* Action Bar */}
              <div className="flex items-center space-x-3 flex-shrink-0">
                <ThemePicker />
                <NotificationBell />
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className={`flex-1 overflow-hidden transition-all duration-200 ease-out ${sectionTransition ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
            
            {/* Contenido Condicional */}
            {activeSection === 'chats' ? (
              <div className="h-full w-full">
                {/* Chat completamente integrado sin márgenes */}
                <div className="w-full h-full">
                  <ConversationsInterface currentAgentId={user.chatwoot_agent_id} />
                </div>
              </div>
            ) : activeSection === 'people' ? (
              !isPro ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-bold text-neutral-800 mb-2">Equipo</h2>
                    <p className="text-neutral-500 mb-6">Gestiona tu equipo, roles y permisos. Disponible en WITHMIA Pro.</p>
                    <button
                      onClick={() => setActiveSection('subscription')}
                      className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
                    >
                      Actualizar a Pro
                    </button>
                  </div>
                </div>
              ) : (
              <div className="h-full w-full">
                <TeamsManagement />
              </div>
              )
            ) : activeSection === 'insights' ? (
              <IntegrationSection
                whatsAppStatus={whatsAppStatus}
                whatsAppSettings={whatsAppSettings}
                onConnectWhatsApp={() => setShowWhatsAppModal(true)}
                onDisconnectWhatsApp={disconnectWhatsApp}
                onUpdateSettings={updateWhatsAppSettings}
                isUpdatingSettings={isUpdatingWhatsAppSettings}
                onIntegrationChange={() => { checkCalendarIntegrations(); checkChatwootChannels(); }}
                onNavigateToProducts={() => setActiveSection('reports')}
                onNavigateToSubscription={() => setActiveSection('subscription')}
                isPro={isPro}
              />
            ) : activeSection === 'knowledge' ? (
              !isPro ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-bold text-neutral-800 mb-2">Base de Conocimiento</h2>
                    <p className="text-neutral-500 mb-6">Entrena a tu asistente con documentos, sitios web y datos personalizados. Disponible en WITHMIA Pro.</p>
                    <button
                      onClick={() => setActiveSection('subscription')}
                      className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
                    >
                      Actualizar a Pro
                    </button>
                  </div>
                </div>
              ) : (
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
              )
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
              !isPro ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-bold text-neutral-800 mb-2">Calendario</h2>
                    <p className="text-neutral-500 mb-6">Gestiona tus citas y eventos directamente desde WITHMIA. Disponible en WITHMIA Pro.</p>
                    <button
                      onClick={() => setActiveSection('subscription')}
                      className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
                    >
                      Actualizar a Pro
                    </button>
                  </div>
                </div>
              ) : (
              <CalendarSection user={user} company={company} />
              )
            ) : activeSection === 'reports' ? (
              !isPro ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-bold text-neutral-800 mb-2">Productos</h2>
                    <p className="text-neutral-500 mb-6">Administra tu catálogo de productos y servicios. Disponible en WITHMIA Pro.</p>
                    <button
                      onClick={() => setActiveSection('subscription')}
                      className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
                    >
                      Actualizar a Pro
                    </button>
                  </div>
                </div>
              ) : (
              <ProductsSection user={user} company={company} />
              )
            ) : activeSection === 'support' ? (
              <SupportTickets />
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
                    firstName={safeUser.firstName}
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

// Wrapper que provee ThemeProvider
function DashboardWithTheme(props: Props) {
  return (
    <ThemeProvider>
      <Dashboard {...props} />
    </ThemeProvider>
  );
}

export default DashboardWithTheme;

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

