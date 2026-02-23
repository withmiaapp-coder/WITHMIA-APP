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

// 16 paletas (4x4 grid) — diseñadas para armonía sobre fondo blanco
export const THEME_PALETTES: ThemeColors[] = [
  // Fila 1 — Azules
  {
    id: 'royal-blue',
    name: 'Azul Real',
    primary: '#1a56db',
    secondary: '#6b7280',
    previewLeft: '#1a56db',
    previewRight: '#6b7280',
  },
  {
    id: 'steel',
    name: 'Acero',
    primary: '#64748b',
    secondary: '#94a3b8',
    previewLeft: '#64748b',
    previewRight: '#94a3b8',
  },
  {
    id: 'ocean',
    name: 'Océano',
    primary: '#2563eb',
    secondary: '#475569',
    previewLeft: '#2563eb',
    previewRight: '#475569',
  },
  {
    id: 'slate',
    name: 'Pizarra',
    primary: '#475569',
    secondary: '#64748b',
    previewLeft: '#475569',
    previewRight: '#64748b',
  },

  // Fila 2 — Verdes y Teals
  {
    id: 'sage',
    name: 'Salvia',
    primary: '#6b7f7b',
    secondary: '#94a3b8',
    previewLeft: '#6b7f7b',
    previewRight: '#94a3b8',
  },
  {
    id: 'teal',
    name: 'Turquesa',
    primary: '#0d9488',
    secondary: '#5eead4',
    previewLeft: '#0d9488',
    previewRight: '#5eead4',
  },
  {
    id: 'forest',
    name: 'Bosque',
    primary: '#15803d',
    secondary: '#6b8f71',
    previewLeft: '#15803d',
    previewRight: '#6b8f71',
  },
  {
    id: 'mint',
    name: 'Menta',
    primary: '#6ba39b',
    secondary: '#a7c5c2',
    previewLeft: '#6ba39b',
    previewRight: '#a7c5c2',
  },

  // Fila 3 — Cálidos
  {
    id: 'olive',
    name: 'Oliva',
    primary: '#827717',
    secondary: '#9e9d24',
    previewLeft: '#827717',
    previewRight: '#9e9d24',
  },
  {
    id: 'amber',
    name: 'Ámbar',
    primary: '#b45309',
    secondary: '#d97706',
    previewLeft: '#b45309',
    previewRight: '#d97706',
  },
  {
    id: 'earth',
    name: 'Tierra',
    primary: '#78716c',
    secondary: '#a8a29e',
    previewLeft: '#78716c',
    previewRight: '#a8a29e',
  },
  {
    id: 'rose',
    name: 'Rosa',
    primary: '#be185d',
    secondary: '#db2777',
    previewLeft: '#be185d',
    previewRight: '#db2777',
  },

  // Fila 4 — Morados y especiales
  {
    id: 'mauve',
    name: 'Malva',
    primary: '#7e5bef',
    secondary: '#a78bfa',
    previewLeft: '#7e5bef',
    previewRight: '#a78bfa',
  },
  {
    id: 'plum',
    name: 'Ciruela',
    primary: '#7c3aed',
    secondary: '#8b5cf6',
    previewLeft: '#7c3aed',
    previewRight: '#8b5cf6',
  },
  {
    id: 'lavender',
    name: 'Lavanda',
    primary: '#8b5cf6',
    secondary: '#c4b5fd',
    previewLeft: '#8b5cf6',
    previewRight: '#c4b5fd',
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
 * Genera un tint natural: controla luminosidad Y saturación independientemente.
 * satRatio: 1 = saturación original, 0.3 = 30% de la saturación original.
 * Esto evita los pasteles artificiales de solo subir L.
 */
function tint(hex: string, lightness: number, satRatio: number = 1): string {
  const { h, s } = hexToHSL(hex);
  const newS = Math.round(Math.min(100, s * satRatio));
  const newL = Math.min(100, Math.max(0, lightness));
  return `hsl(${h}, ${newS}%, ${newL}%)`;
}

/**
 * Genera un shade (oscurece) manteniendo la identidad de color.
 */
function shade(hex: string, lightness: number, satRatio: number = 1): string {
  const { h, s } = hexToHSL(hex);
  const newS = Math.round(Math.min(100, s * satRatio));
  const newL = Math.max(0, Math.min(100, lightness));
  return `hsl(${h}, ${newS}%, ${newL}%)`;
}

function applyThemeColors(theme: ThemeColors | null) {
  const root = document.documentElement;

  const allVars = [
    '--theme-primary', '--theme-primary-light', '--theme-primary-lighter', '--theme-primary-dark',
    '--theme-secondary', '--theme-secondary-light',
    '--theme-sidebar-bg', '--theme-sidebar-text', '--theme-sidebar-hover',
    '--theme-sidebar-active-bg', '--theme-sidebar-active-text', '--theme-sidebar-border',
    '--theme-header-bg', '--theme-header-border',
    '--theme-accent', '--theme-accent-light',
    '--theme-badge-bg', '--theme-badge-text', '--theme-badge-border',
    '--theme-icon-inactive', '--theme-icon-inactive-bg',
  ];

  if (!theme || theme.id === 'default') {
    allVars.forEach(v => root.style.removeProperty(v));
    root.removeAttribute('data-theme');
    return;
  }

  root.setAttribute('data-theme', theme.id);

  const p = theme.primary;   // e.g. #1a56db → hsl(222, 80%, 48%)
  const sec = theme.secondary;

  // ─── Primary variants ───────────────────────────────────────
  root.style.setProperty('--theme-primary', p);
  root.style.setProperty('--theme-primary-light', tint(p, 80, 0.5));
  root.style.setProperty('--theme-primary-lighter', tint(p, 93, 0.35));
  root.style.setProperty('--theme-primary-dark', shade(p, 30, 1));

  // ─── Secondary variants ────────────────────────────────────
  root.style.setProperty('--theme-secondary', sec);
  root.style.setProperty('--theme-secondary-light', tint(sec, 75, 0.5));

  // ─── Sidebar ───────────────────────────────────────────────
  // BG: visible tint — light enough for readability but clearly colored
  root.style.setProperty('--theme-sidebar-bg', tint(p, 94, 0.4));
  // Text: dark, retaining the hue so it feels intentional
  root.style.setProperty('--theme-sidebar-text', shade(p, 22, 0.85));
  // Hover: slightly deeper than bg
  root.style.setProperty('--theme-sidebar-hover', tint(p, 89, 0.45));
  // Active item
  root.style.setProperty('--theme-sidebar-active-bg', 'white');
  root.style.setProperty('--theme-sidebar-active-text', p);
  // Border: between bg and hover depth
  root.style.setProperty('--theme-sidebar-border', tint(p, 87, 0.35));

  // ─── Header ────────────────────────────────────────────────
  root.style.setProperty('--theme-header-bg', tint(p, 96, 0.3));
  root.style.setProperty('--theme-header-border', tint(p, 89, 0.3));

  // ─── Accent ────────────────────────────────────────────────
  root.style.setProperty('--theme-accent', p);
  root.style.setProperty('--theme-accent-light', tint(p, 85, 0.4));

  // ─── Badges ────────────────────────────────────────────────
  root.style.setProperty('--theme-badge-bg', tint(p, 90, 0.5));
  root.style.setProperty('--theme-badge-text', shade(p, 28, 0.9));
  root.style.setProperty('--theme-badge-border', tint(p, 82, 0.4));

  // ─── Icons ─────────────────────────────────────────────────
  // Inactive icon uses the primary itself (recognizable color identity)
  root.style.setProperty('--theme-icon-inactive', shade(p, 38, 0.8));
  // Inactive icon background: visible tint, not washed out
  root.style.setProperty('--theme-icon-inactive-bg', tint(p, 88, 0.5));
}

// ============================================================================
// CONTEXT
// ============================================================================

interface ThemeContextType {
  themeId: string;
  mode: ThemeMode;
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

  // Build current theme — for 'custom' id, generate palette from customColor
  const currentTheme: ThemeColors | null = (() => {
    if (themeId === 'custom' && customColor) {
      return {
        id: 'custom',
        name: 'Personalizado',
        primary: customColor,
        secondary: tint(customColor, 60, 0.6),
        previewLeft: customColor,
        previewRight: tint(customColor, 60, 0.6),
      };
    }
    if (themeId === 'default') return null;
    return THEME_PALETTES.find(t => t.id === themeId) || null;
  })();

  const hasTheme = themeId !== 'default' && currentTheme !== null;

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, id);
    } catch {}
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY_MODE, m);
    } catch {}
  }, []);

  const setCustomColor = useCallback((color: string) => {
    setCustomColorState(color);
    setThemeIdState('custom');
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM, color);
      localStorage.setItem(STORAGE_KEY_THEME, 'custom');
    } catch {}
  }, []);

  const resetTheme = useCallback(() => {
    setThemeIdState('default');
    setCustomColorState(null);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, 'default');
      localStorage.removeItem(STORAGE_KEY_CUSTOM);
    } catch {}
  }, []);

  // Apply theme whenever it changes
  useEffect(() => {
    applyThemeColors(currentTheme);
  }, [currentTheme?.id, currentTheme?.primary]);

  return (
    <ThemeContext.Provider value={{ themeId, mode, currentTheme, customColor, hasTheme, setThemeId, setMode, setCustomColor, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
