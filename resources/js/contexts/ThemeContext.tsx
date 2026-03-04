import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// ============================================================================
// THEME DEFINITIONS — Paletas de color estilo Google
// ============================================================================

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  id: string;
  name: string;
  /** Color primario (sidebar, headers) */
  primary: string;
  /** Color secundario (acentos, hovers) */
  secondary: string;
  /** Preview: mitad izquierda del círculo */
  previewLeft: string;
  /** Preview: mitad derecha del círculo */
  previewRight: string;
}

// 16 paletas (4×4 grid) — Cada paleta diseñada a mano con armonía visual real.
// primary = color dominante del sidebar/header/accents
// secondary = color complementario para textos secundarios, badges, iconos inactivos
export const THEME_PALETTES: ThemeColors[] = [
  // ═══════════ Fila 1 — Azules & Neutros ═══════════
  {
    id: 'indigo',
    name: 'Índigo',
    primary: '#4338ca',      // Índigo profundo — profesional, potente
    secondary: '#6366f1',    // Índigo medio para acentos
    previewLeft: '#4338ca',
    previewRight: '#818cf8',
  },
  {
    id: 'cobalt',
    name: 'Cobalto',
    primary: '#1d4ed8',      // Azul puro — confianza, tecnología
    secondary: '#3b82f6',    // Azul brillante como compañero
    previewLeft: '#1d4ed8',
    previewRight: '#60a5fa',
  },
  {
    id: 'ocean',
    name: 'Océano',
    primary: '#0369a1',      // Azul océano — sereno, profesional
    secondary: '#0ea5e9',    // Cyan claro
    previewLeft: '#0369a1',
    previewRight: '#38bdf8',
  },
  {
    id: 'slate',
    name: 'Pizarra',
    primary: '#334155',      // Gris azulado oscuro — ejecutivo, sobrio
    secondary: '#64748b',    // Gris medio
    previewLeft: '#334155',
    previewRight: '#94a3b8',
  },

  // ═══════════ Fila 2 — Verdes & Teals ═══════════
  {
    id: 'emerald',
    name: 'Esmeralda',
    primary: '#059669',      // Verde esmeralda — crecimiento, éxito
    secondary: '#34d399',    // Verde claro vibrante
    previewLeft: '#059669',
    previewRight: '#6ee7b7',
  },
  {
    id: 'teal',
    name: 'Turquesa',
    primary: '#0d9488',      // Teal — equilibrado, moderno
    secondary: '#2dd4bf',    // Teal claro
    previewLeft: '#0d9488',
    previewRight: '#5eead4',
  },
  {
    id: 'forest',
    name: 'Bosque',
    primary: '#166534',      // Verde bosque — naturaleza, estabilidad
    secondary: '#22c55e',    // Verde brillante
    previewLeft: '#166534',
    previewRight: '#4ade80',
  },
  {
    id: 'sage',
    name: 'Salvia',
    primary: '#4d7c6f',      // Verde grisáceo — elegante, calmado
    secondary: '#7fb5a5',    // Sage claro
    previewLeft: '#4d7c6f',
    previewRight: '#a7d5c8',
  },

  // ═══════════ Fila 3 — Cálidos ═══════════
  {
    id: 'amber',
    name: 'Ámbar',
    primary: '#b45309',      // Ámbar — energía, calidez
    secondary: '#f59e0b',    // Amarillo dorado
    previewLeft: '#b45309',
    previewRight: '#fbbf24',
  },
  {
    id: 'copper',
    name: 'Cobre',
    primary: '#9a3412',      // Cobre — premium, terroso
    secondary: '#ea580c',    // Naranja fuego
    previewLeft: '#9a3412',
    previewRight: '#fb923c',
  },
  {
    id: 'wine',
    name: 'Vino',
    primary: '#881337',      // Vino — sofisticado, lujoso
    secondary: '#e11d48',    // Rosa intenso
    previewLeft: '#881337',
    previewRight: '#fb7185',
  },
  {
    id: 'rose',
    name: 'Rosa',
    primary: '#be185d',      // Rosa fuerte — creativo, moderno
    secondary: '#f472b6',    // Rosa claro
    previewLeft: '#be185d',
    previewRight: '#f9a8d4',
  },

  // ═══════════ Fila 4 — Morados & Especial ═══════════
  {
    id: 'violet',
    name: 'Violeta',
    primary: '#7c3aed',      // Violeta — creativo, premium
    secondary: '#a78bfa',    // Violeta claro
    previewLeft: '#7c3aed',
    previewRight: '#c4b5fd',
  },
  {
    id: 'purple',
    name: 'Púrpura',
    primary: '#9333ea',      // Púrpura — lujo, innovación
    secondary: '#c084fc',    // Púrpura claro
    previewLeft: '#9333ea',
    previewRight: '#d8b4fe',
  },
  {
    id: 'fuchsia',
    name: 'Fucsia',
    primary: '#a21caf',      // Fucsia — audaz, llamativo
    secondary: '#e879f9',    // Fucsia claro
    previewLeft: '#a21caf',
    previewRight: '#f0abfc',
  },
  // Último: Custom — color personalizado del usuario
  {
    id: 'custom',
    name: 'Personalizado',
    primary: '#6b7280',
    secondary: '#9ca3af',
    previewLeft: '#6b7280',
    previewRight: '#9ca3af',
  },
];

// ============================================================================
// UTILITY — Sistema de color profesional con tints naturales
// ============================================================================

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Genera un tint: mezcla el color con blanco.
 * ratio=0 → blanco puro, ratio=1 → color original completo.
 * Mucho más natural que solo mover L en HSL.
 */
function mixWithWhite(hex: string, ratio: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(255 + (r - 255) * ratio);
  const ng = Math.round(255 + (g - 255) * ratio);
  const nb = Math.round(255 + (b - 255) * ratio);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

/**
 * Mezcla el color con negro para oscurecer.
 * ratio=0 → negro puro, ratio=1 → color original.
 */
function mixWithBlack(hex: string, ratio: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r * ratio);
  const ng = Math.round(g * ratio);
  const nb = Math.round(b * ratio);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

/**
 * Genera un color con opacidad sobre fondo blanco (para efectos glass).
 */
function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Mix color towards white (like mixWithWhite) but return as rgba with custom alpha.
 * Used for semi-transparent overlays that preserve the theme tint.
 */
function mixWithWhiteAlpha(hex: string, ratio: number, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(255 + (r - 255) * ratio);
  const ng = Math.round(255 + (g - 255) * ratio);
  const nb = Math.round(255 + (b - 255) * ratio);
  return `rgba(${nr}, ${ng}, ${nb}, ${alpha})`;
}

/**
 * Mix color towards black and return as rgba with custom alpha.
 * ratio = how much of original color to keep (0 = pure black, 1 = original).
 * Used for dark mode chat overlay: dark tint of theme color, not bright/saturated.
 */
function mixWithBlackAlpha(hex: string, ratio: number, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r * ratio);
  const ng = Math.round(g * ratio);
  const nb = Math.round(b * ratio);
  return `rgba(${nr}, ${ng}, ${nb}, ${alpha})`;
}

function applyThemeColors(theme: ThemeColors | null, isDark: boolean) {
  const root = document.documentElement;

  const allVars = [
    '--theme-primary', '--theme-primary-light', '--theme-primary-lighter', '--theme-primary-dark',
    '--theme-secondary', '--theme-secondary-light',
    // Sidebar
    '--theme-sidebar-bg', '--theme-sidebar-text', '--theme-sidebar-hover',
    '--theme-sidebar-active-bg', '--theme-sidebar-active-text', '--theme-sidebar-border',
    '--theme-sidebar-glass',
    // Header
    '--theme-header-bg', '--theme-header-border', '--theme-header-glass',
    // Accent
    '--theme-accent', '--theme-accent-light',
    // Badges
    '--theme-badge-bg', '--theme-badge-text', '--theme-badge-border',
    // Icons
    '--theme-icon-inactive', '--theme-icon-inactive-bg',
    // Content area
    '--theme-content-bg', '--theme-content-card-bg', '--theme-content-card-border',
    '--theme-content-card-shadow', '--theme-chat-overlay',
    // Text
    '--theme-text-primary', '--theme-text-secondary', '--theme-text-muted',
    // Active nav gradient
    '--theme-active-gradient-from', '--theme-active-gradient-to',
    // Glass effect common
    '--theme-glass-border', '--theme-glass-shadow',
  ];

  // Handle pure dark mode (no theme selected) or reset
  if (!theme || theme.id === 'default') {
    if (isDark) {
      // Pure dark mode without a color palette — elegant dark navy inspired by withmia.com
      root.setAttribute('data-theme', 'dark');
      root.style.setProperty('--theme-primary', '#818cf8');          // Indigo claro — legible en dark
      root.style.setProperty('--theme-primary-light', 'rgba(129,140,248,0.15)');
      root.style.setProperty('--theme-primary-lighter', 'rgba(129,140,248,0.06)');
      root.style.setProperty('--theme-primary-dark', '#a5b4fc');
      root.style.setProperty('--theme-secondary', '#94a3b8');
      root.style.setProperty('--theme-secondary-light', 'rgba(148,163,184,0.15)');
      // Sidebar dark
      root.style.setProperty('--theme-sidebar-bg', '#0f1219');
      root.style.setProperty('--theme-sidebar-glass', 'rgba(255,255,255,0.02)');
      root.style.setProperty('--theme-sidebar-text', '#cbd5e1');
      root.style.setProperty('--theme-sidebar-hover', 'rgba(255,255,255,0.06)');
      root.style.setProperty('--theme-sidebar-active-bg', 'rgba(255,255,255,0.08)');
      root.style.setProperty('--theme-sidebar-active-text', '#f1f5f9');
      root.style.setProperty('--theme-sidebar-border', 'rgba(255,255,255,0.06)');
      // Header dark
      root.style.setProperty('--theme-header-bg', '#0f1219');
      root.style.setProperty('--theme-header-border', 'rgba(255,255,255,0.06)');
      root.style.setProperty('--theme-header-glass', 'rgba(255,255,255,0.02)');
      // Accent
      root.style.setProperty('--theme-accent', '#818cf8');
      root.style.setProperty('--theme-accent-light', 'rgba(129,140,248,0.2)');
      // Badges
      root.style.setProperty('--theme-badge-bg', 'rgba(255,255,255,0.06)');
      root.style.setProperty('--theme-badge-text', '#cbd5e1');
      root.style.setProperty('--theme-badge-border', 'rgba(255,255,255,0.08)');
      // Icons
      root.style.setProperty('--theme-icon-inactive', '#94a3b8');
      root.style.setProperty('--theme-icon-inactive-bg', 'rgba(255,255,255,0.06)');
      // Content
      root.style.setProperty('--theme-content-bg', '#111827');
      root.style.setProperty('--theme-content-card-bg', 'rgba(255,255,255,0.04)');
      root.style.setProperty('--theme-content-card-border', 'rgba(255,255,255,0.06)');
      root.style.setProperty('--theme-content-card-shadow', 'rgba(0,0,0,0.2)');
      root.style.setProperty('--theme-chat-overlay', 'rgba(17,24,39,0.92)');
      // Text
      root.style.setProperty('--theme-text-primary', '#f1f5f9');
      root.style.setProperty('--theme-text-secondary', '#94a3b8');
      root.style.setProperty('--theme-text-muted', '#64748b');
      // Active nav
      root.style.setProperty('--theme-active-gradient-from', '#818cf8');
      root.style.setProperty('--theme-active-gradient-to', '#6366f1');
      // Glass
      root.style.setProperty('--theme-glass-border', 'rgba(255,255,255,0.06)');
      root.style.setProperty('--theme-glass-shadow', 'rgba(0,0,0,0.2)');
      return;
    }
    // Light + no theme = completely reset
    allVars.forEach(v => root.style.removeProperty(v));
    root.removeAttribute('data-theme');
    return;
  }

  root.setAttribute('data-theme', theme.id);

  const p = theme.primary;
  const sec = theme.secondary;

  if (isDark) {
    // ═══════════════════════════════════════════════════════════
    // DARK MODE with palette color — Deep backgrounds + tinted accents
    // Inspired by withmia.com: #0d1017 bg, glass cards rgba(255,255,255,0.04)
    // ═══════════════════════════════════════════════════════════

    // Brighten the primary for dark mode readability
    const pBright = mixWithWhite(p, 0.55);  // Lighter version for dark bg

    root.style.setProperty('--theme-primary', pBright);
    root.style.setProperty('--theme-primary-light', withAlpha(p, 0.15));
    root.style.setProperty('--theme-primary-lighter', withAlpha(p, 0.06));
    root.style.setProperty('--theme-primary-dark', mixWithWhite(p, 0.7));

    root.style.setProperty('--theme-secondary', mixWithWhite(sec, 0.5));
    root.style.setProperty('--theme-secondary-light', withAlpha(sec, 0.15));

    // Sidebar — deep dark with subtle primary tint
    root.style.setProperty('--theme-sidebar-bg', mixWithBlack(p, 0.08));    // Very dark tinted
    root.style.setProperty('--theme-sidebar-glass', withAlpha(p, 0.03));
    root.style.setProperty('--theme-sidebar-text', mixWithWhite(p, 0.6));
    root.style.setProperty('--theme-sidebar-hover', withAlpha(p, 0.08));
    root.style.setProperty('--theme-sidebar-active-bg', withAlpha(p, 0.12));
    root.style.setProperty('--theme-sidebar-active-text', mixWithWhite(p, 0.8));
    root.style.setProperty('--theme-sidebar-border', withAlpha(p, 0.08));

    // Header — dark
    root.style.setProperty('--theme-header-bg', mixWithBlack(p, 0.08));
    root.style.setProperty('--theme-header-border', withAlpha(p, 0.08));
    root.style.setProperty('--theme-header-glass', withAlpha(p, 0.03));

    // Accent
    root.style.setProperty('--theme-accent', pBright);
    root.style.setProperty('--theme-accent-light', withAlpha(p, 0.2));

    // Badges — subtle glass on dark
    root.style.setProperty('--theme-badge-bg', withAlpha(p, 0.12));
    root.style.setProperty('--theme-badge-text', mixWithWhite(p, 0.65));
    root.style.setProperty('--theme-badge-border', withAlpha(p, 0.15));

    // Icons
    root.style.setProperty('--theme-icon-inactive', mixWithWhite(p, 0.45));
    root.style.setProperty('--theme-icon-inactive-bg', withAlpha(p, 0.08));

    // Content — dark background
    root.style.setProperty('--theme-content-bg', mixWithBlack(p, 0.06));
    root.style.setProperty('--theme-content-card-bg', 'rgba(255,255,255,0.04)');
    root.style.setProperty('--theme-content-card-border', withAlpha(p, 0.08));
    root.style.setProperty('--theme-content-card-shadow', 'rgba(0,0,0,0.2)');
    root.style.setProperty('--theme-chat-overlay', mixWithBlackAlpha(p, 0.18, 0.93));

    // Text — light on dark
    root.style.setProperty('--theme-text-primary', '#f1f5f9');
    root.style.setProperty('--theme-text-secondary', mixWithWhite(p, 0.5));
    root.style.setProperty('--theme-text-muted', mixWithWhite(p, 0.35));

    // Active nav gradient
    root.style.setProperty('--theme-active-gradient-from', pBright);
    root.style.setProperty('--theme-active-gradient-to', mixWithWhite(sec, 0.5));

    // Glass
    root.style.setProperty('--theme-glass-border', withAlpha(p, 0.1));
    root.style.setProperty('--theme-glass-shadow', 'rgba(0,0,0,0.25)');

    return;
  }

  // ═══════════════════════════════════════════════════════════
  // LIGHT MODE with palette color (existing logic)
  // ═══════════════════════════════════════════════════════════
  root.style.setProperty('--theme-primary', p);
  root.style.setProperty('--theme-primary-light', mixWithWhite(p, 0.35));    // 35% del color
  root.style.setProperty('--theme-primary-lighter', mixWithWhite(p, 0.12));  // Muy suave
  root.style.setProperty('--theme-primary-dark', mixWithBlack(p, 0.7));      // 70% oscurecido

  // ═══════════════════════════════════════════════════════════
  // SECONDARY VARIANTS
  // ═══════════════════════════════════════════════════════════
  root.style.setProperty('--theme-secondary', sec);
  root.style.setProperty('--theme-secondary-light', mixWithWhite(sec, 0.4));

  // ═══════════════════════════════════════════════════════════
  // SIDEBAR — Glassmorphism elegante
  // ═══════════════════════════════════════════════════════════
  // BG: tinte muy sutil del color primario — parece casi blanco pero con identidad
  root.style.setProperty('--theme-sidebar-bg', mixWithWhite(p, 0.06));
  // Glass overlay para glassmorphism
  root.style.setProperty('--theme-sidebar-glass', withAlpha(p, 0.04));
  // Texto: oscuro con tinte del hue — se lee perfecto
  root.style.setProperty('--theme-sidebar-text', mixWithBlack(p, 0.45));
  // Hover: toque más visible del color
  root.style.setProperty('--theme-sidebar-hover', mixWithWhite(p, 0.12));
  // Active: blanco con glassmorphism
  root.style.setProperty('--theme-sidebar-active-bg', 'rgba(255, 255, 255, 0.85)');
  root.style.setProperty('--theme-sidebar-active-text', p);
  // Border: sutil
  root.style.setProperty('--theme-sidebar-border', mixWithWhite(p, 0.15));

  // ═══════════════════════════════════════════════════════════
  // HEADER — Glass transparente
  // ═══════════════════════════════════════════════════════════
  root.style.setProperty('--theme-header-bg', mixWithWhite(p, 0.04));
  root.style.setProperty('--theme-header-border', mixWithWhite(p, 0.1));
  root.style.setProperty('--theme-header-glass', withAlpha(p, 0.03));

  // ═══════════════════════════════════════════════════════════
  // ACCENT
  // ═══════════════════════════════════════════════════════════
  root.style.setProperty('--theme-accent', p);
  root.style.setProperty('--theme-accent-light', mixWithWhite(p, 0.2));

  // ═══════════════════════════════════════════════════════════
  // BADGES — Legibles, con identidad de color clara
  // ═══════════════════════════════════════════════════════════
  root.style.setProperty('--theme-badge-bg', mixWithWhite(p, 0.15));
  root.style.setProperty('--theme-badge-text', mixWithBlack(p, 0.55));
  root.style.setProperty('--theme-badge-border', mixWithWhite(p, 0.25));

  // ═══════════════════════════════════════════════════════════
  // ICONS
  // ═══════════════════════════════════════════════════════════
  root.style.setProperty('--theme-icon-inactive', mixWithBlack(p, 0.6));
  root.style.setProperty('--theme-icon-inactive-bg', mixWithWhite(p, 0.15));

  // ═══════════════════════════════════════════════════════════
  // CONTENT AREA
  // ═══════════════════════════════════════════════════════════
  root.style.setProperty('--theme-content-bg', mixWithWhite(p, 0.03));
  root.style.setProperty('--theme-content-card-bg', 'rgba(255, 255, 255, 0.7)');
  root.style.setProperty('--theme-content-card-border', mixWithWhite(p, 0.12));
  root.style.setProperty('--theme-content-card-shadow', withAlpha(p, 0.06));
  root.style.setProperty('--theme-chat-overlay', mixWithWhiteAlpha(p, 0.03, 0.82));

  // ═══════════════════════════════════════════════════════════
  // TEXT LEVELS
  // ═══════════════════════════════════════════════════════════
  root.style.setProperty('--theme-text-primary', mixWithBlack(p, 0.35));
  root.style.setProperty('--theme-text-secondary', mixWithBlack(p, 0.5));
  root.style.setProperty('--theme-text-muted', mixWithWhite(p, 0.45));

  // ═══════════════════════════════════════════════════════════
  // ACTIVE NAV GRADIENT — para el ícono activo del sidebar
  // ═══════════════════════════════════════════════════════════
  root.style.setProperty('--theme-active-gradient-from', p);
  root.style.setProperty('--theme-active-gradient-to', sec);

  // ═══════════════════════════════════════════════════════════
  // GLASS EFFECTS — compartidos
  // ═══════════════════════════════════════════════════════════
  root.style.setProperty('--theme-glass-border', withAlpha(p, 0.1));
  root.style.setProperty('--theme-glass-shadow', withAlpha(p, 0.08));
}

// ============================================================================
// CONTEXT
// ============================================================================

interface ThemeContextType {
  themeId: string;
  mode: ThemeMode;
  isDark: boolean;
  currentTheme: ThemeColors | null;
  customColor: string | null;
  hasTheme: boolean;
  setThemeId: (id: string) => void;
  setMode: (mode: ThemeMode) => void;
  setCustomColor: (color: string) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: 'default',
  mode: 'light',
  isDark: false,
  currentTheme: null,
  customColor: null,
  hasTheme: false,
  setThemeId: () => {},
  setMode: () => {},
  setCustomColor: () => {},
  resetTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// ============================================================================
// PROVIDER
// ============================================================================

const STORAGE_KEY_THEME = 'withmia_theme_id';
const STORAGE_KEY_MODE = 'withmia_theme_mode';
const STORAGE_KEY_CUSTOM = 'withmia_theme_custom_color';

// Debounce helper para no spammear la API en cada cambio rápido
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSaveTheme(themeId: string, themeMode: string, customColor: string | null) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      await fetch('/api/user/theme', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'X-CSRF-TOKEN': token } : {}),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ theme_id: themeId, theme_mode: themeMode, custom_color: customColor }),
      });
    } catch {
      // Silently fail — localStorage is the fallback
    }
  }, 800);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_THEME) || 'default';
    } catch {
      return 'default';
    }
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY_MODE) as ThemeMode) || 'light';
    } catch {
      return 'light';
    }
  });

  const [customColor, setCustomColorState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_CUSTOM) || null;
    } catch {
      return null;
    }
  });

  // On mount: fetch theme from backend and apply (overrides localStorage if backend has data)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/theme', {
          credentials: 'same-origin',
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!json.success || cancelled) return;
        const { theme_id, theme_mode, custom_color } = json.data;
        // Only override if backend has a non-default value
        if (theme_id && theme_id !== 'default') {
          setThemeIdState(theme_id);
          try { localStorage.setItem(STORAGE_KEY_THEME, theme_id); } catch {}
        }
        if (theme_mode && theme_mode !== 'light') {
          setModeState(theme_mode as ThemeMode);
          try { localStorage.setItem(STORAGE_KEY_MODE, theme_mode); } catch {}
        }
        if (custom_color) {
          setCustomColorState(custom_color);
          try { localStorage.setItem(STORAGE_KEY_CUSTOM, custom_color); } catch {}
        }
      } catch {
        // Not logged in or API unavailable — keep localStorage values
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Detect system dark mode preference
  const [systemDark, setSystemDark] = useState(() => {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Listen for system dark mode changes
  useEffect(() => {
    try {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    } catch {}
  }, []);

  // Compute actual dark state
  const isDark = mode === 'dark' || (mode === 'system' && systemDark);

  // Build current theme — for 'custom' id, generate palette from customColor
  const currentTheme: ThemeColors | null = (() => {
    if (themeId === 'custom' && customColor) {
      return {
        id: 'custom',
        name: 'Personalizado',
        primary: customColor,
        secondary: mixWithWhite(customColor, 0.5),
        previewLeft: customColor,
        previewRight: mixWithWhite(customColor, 0.5),
      };
    }
    if (themeId === 'default') return null;
    return THEME_PALETTES.find(t => t.id === themeId) || null;
  })();

  // hasTheme is true when a palette is selected OR when dark mode is active (even without palette)
  const hasTheme = isDark || (themeId !== 'default' && currentTheme !== null);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    try { localStorage.setItem(STORAGE_KEY_THEME, id); } catch {}
    // Persist to backend
    const currentMode = localStorage.getItem(STORAGE_KEY_MODE) || 'light';
    const currentCustom = localStorage.getItem(STORAGE_KEY_CUSTOM) || null;
    debouncedSaveTheme(id, currentMode, id === 'custom' ? currentCustom : null);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY_MODE, m); } catch {}
    // Persist to backend
    const currentId = localStorage.getItem(STORAGE_KEY_THEME) || 'default';
    const currentCustom = localStorage.getItem(STORAGE_KEY_CUSTOM) || null;
    debouncedSaveTheme(currentId, m, currentId === 'custom' ? currentCustom : null);
  }, []);

  const setCustomColor = useCallback((color: string) => {
    setCustomColorState(color);
    setThemeIdState('custom');
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM, color);
      localStorage.setItem(STORAGE_KEY_THEME, 'custom');
    } catch {}
    // Persist to backend
    const currentMode = localStorage.getItem(STORAGE_KEY_MODE) || 'light';
    debouncedSaveTheme('custom', currentMode, color);
  }, []);

  const resetTheme = useCallback(() => {
    setThemeIdState('default');
    setModeState('light');
    setCustomColorState(null);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, 'default');
      localStorage.setItem(STORAGE_KEY_MODE, 'light');
      localStorage.removeItem(STORAGE_KEY_CUSTOM);
    } catch {}
    // Persist to backend
    debouncedSaveTheme('default', 'light', null);
  }, []);

  // Apply theme whenever it changes (including dark mode)
  useEffect(() => {
    applyThemeColors(currentTheme, isDark);
  }, [currentTheme?.id, currentTheme?.primary, isDark]);

  return (
    <ThemeContext.Provider value={{ themeId, mode, isDark, currentTheme, customColor, hasTheme, setThemeId, setMode, setCustomColor, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
