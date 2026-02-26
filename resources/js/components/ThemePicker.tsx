import { useState, useRef, useEffect } from 'react';
import { Palette, Sun, Moon, Monitor, Check, Pipette, RotateCcw } from 'lucide-react';
import { useTheme, THEME_PALETTES, type ThemeMode } from '../contexts/ThemeContext';
import CustomColorPicker from './CustomColorPicker';

const MODE_TABS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Claro', icon: Sun },
  { mode: 'dark', label: 'Oscuro', icon: Moon },
  { mode: 'system', label: 'Auto', icon: Monitor },
];

export function ThemePicker() {
  const { themeId, mode, customColor, hasTheme, isDark, setThemeId, setMode, setCustomColor, resetTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setShowCustomPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Only preset palettes (exclude the 'custom' entry)
  const presetPalettes = THEME_PALETTES.filter(p => p.id !== 'custom');

  // Dark-aware popover colors — use theme CSS vars when custom theme active
  const popoverBg = hasTheme ? 'var(--theme-content-bg)' : (isDark ? '#1a1f2e' : 'white');
  const popoverBorder = hasTheme ? 'var(--theme-content-card-border)' : (isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb');
  const tabBg = hasTheme ? (isDark ? 'rgba(255,255,255,0.06)' : 'var(--theme-accent-light)') : (isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6');
  const tabActiveBg = hasTheme ? 'var(--theme-content-card-bg)' : (isDark ? 'rgba(255,255,255,0.12)' : 'white');
  const tabActiveText = hasTheme ? 'var(--theme-text-primary)' : (isDark ? '#f1f5f9' : '#1f2937');
  const tabInactiveText = hasTheme ? 'var(--theme-text-muted)' : (isDark ? '#94a3b8' : '#6b7280');
  const resetBg = hasTheme ? (isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb') : (isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb');
  const resetHoverBg = hasTheme ? (isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6') : (isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6');
  const resetText = hasTheme ? 'var(--theme-text-secondary)' : (isDark ? '#94a3b8' : '#4b5563');
  const footerBorder = hasTheme ? 'var(--theme-content-card-border)' : (isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6');
  const footerText = hasTheme ? 'var(--theme-text-muted)' : (isDark ? '#64748b' : '#6b7280');

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg transition-all duration-150"
        style={{
          color: hasTheme
            ? isDark ? 'var(--theme-text-secondary)' : 'var(--theme-icon-inactive)'
            : '#9ca3af',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = hasTheme
            ? isDark ? 'rgba(255,255,255,0.08)' : 'var(--theme-sidebar-hover)'
            : '#f3f4f6';
          e.currentTarget.style.color = hasTheme
            ? isDark ? '#f1f5f9' : 'var(--theme-primary)'
            : '#4b5563';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '';
          e.currentTarget.style.color = hasTheme
            ? isDark ? 'var(--theme-text-secondary)' : 'var(--theme-icon-inactive)'
            : '#9ca3af';
        }}
        title="Personalizar colores"
        aria-label="Personalizar colores"
      >
        <Palette className="w-5 h-5" />
      </button>

      {/* Popover panel */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setShowCustomPicker(false); }} />

          {/* Panel */}
          <div
            ref={panelRef}
            className="absolute right-0 top-full mt-2 w-[296px] rounded-2xl z-50"
            style={{
              animation: 'slideDown 0.15s ease-out',
              background: popoverBg,
              border: `1px solid ${popoverBorder}`,
              boxShadow: isDark
                ? '0 20px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
                : '0 20px 60px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.03)',
            }}
          >
            {/* Section: Apariencia label */}
            <div className="px-4 pt-3.5 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: tabInactiveText }}>
                Apariencia
              </span>
            </div>

            {/* Mode tabs */}
            <div className="px-3 pb-2.5">
              <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: tabBg }}>
                {MODE_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = mode === tab.mode;
                  return (
                    <button
                      key={tab.mode}
                      onClick={() => setMode(tab.mode)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-semibold transition-all duration-150 whitespace-nowrap overflow-hidden"
                      style={{
                        background: isActive ? tabActiveBg : 'transparent',
                        color: isActive ? tabActiveText : tabInactiveText,
                        boxShadow: isActive ? (isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)') : 'none',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-3 mb-2.5" style={{ height: 1, background: footerBorder }} />

            {/* Section: Colores label */}
            <div className="px-4 pb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: tabInactiveText }}>
                Color
              </span>
            </div>

            {/* Color grid */}
            <div className="px-3 pb-3">
              <div className="grid grid-cols-5 gap-2">
                {presetPalettes.map((palette) => {
                  const isSelected = themeId === palette.id;

                  return (
                    <button
                      key={palette.id}
                      onClick={() => setThemeId(palette.id)}
                      className={`relative w-full aspect-square rounded-full transition-all duration-150 hover:scale-110 ${
                        isSelected
                          ? hasTheme
                            ? 'ring-2 ring-offset-2'
                            : isDark
                              ? 'ring-2 ring-offset-2 ring-offset-[#1a1f2e] ring-white/40'
                              : 'ring-2 ring-offset-2 ring-gray-400'
                          : ''
                      }`}
                      style={isSelected && hasTheme ? {
                        '--tw-ring-color': isDark ? 'rgba(255,255,255,0.4)' : 'var(--theme-accent)',
                        '--tw-ring-offset-color': 'var(--theme-content-bg)',
                      } as React.CSSProperties : undefined}
                      title={palette.name}
                      aria-label={palette.name}
                    >
                      {/* Two-tone circle preview */}
                      <svg viewBox="0 0 40 40" className="w-full h-full">
                        <path d="M20 0 A20 20 0 0 0 20 40 L20 0 Z" fill={palette.previewLeft} />
                        <path d="M20 0 A20 20 0 0 1 20 40 L20 0 Z" fill={palette.previewRight} />
                      </svg>

                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                            <Check className="w-2.5 h-2.5 text-gray-700" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Custom color picker — toggle inline picker */}
                <button
                  onClick={() => setShowCustomPicker(!showCustomPicker)}
                  className={`relative w-full aspect-square rounded-full transition-all duration-150 hover:scale-110 ${
                    themeId === 'custom'
                      ? hasTheme
                        ? 'ring-2 ring-offset-2'
                        : isDark
                          ? 'ring-2 ring-offset-2 ring-offset-[#1a1f2e] ring-white/40'
                          : 'ring-2 ring-offset-2 ring-gray-400'
                      : ''
                  }`}
                  style={themeId === 'custom' && hasTheme ? {
                    '--tw-ring-color': isDark ? 'rgba(255,255,255,0.4)' : 'var(--theme-accent)',
                    '--tw-ring-offset-color': 'var(--theme-content-bg)',
                  } as React.CSSProperties : undefined}
                  title="Color personalizado"
                  aria-label="Color personalizado"
                >
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center"
                    style={{
                      background: themeId === 'custom' && customColor
                        ? `linear-gradient(135deg, ${customColor}, ${customColor}88)`
                        : 'conic-gradient(from 0deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff, #ff0000)',
                    }}
                  >
                    <Pipette className="w-3.5 h-3.5 text-white drop-shadow-md" />
                  </div>
                  {themeId === 'custom' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                        <Check className="w-2.5 h-2.5 text-gray-700" />
                      </div>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Custom color picker panel (Canva-style) */}
            {showCustomPicker && (
              <>
                <div className="mx-3 mb-2" style={{ height: 1, background: footerBorder }} />
                <CustomColorPicker
                  value={customColor || '#6366f1'}
                  onChange={(hex) => setCustomColor(hex)}
                  isDark={isDark}
                  hasTheme={hasTheme}
                />
              </>
            )}

            {/* Footer: Reset + System toggle */}
            <div
              className="px-3 py-2.5 flex items-center justify-between gap-3"
              style={{ borderTop: `1px solid ${footerBorder}` }}
            >
              {/* Reset button */}
              <button
                onClick={() => resetTheme()}
                className="flex items-center gap-1.5 text-[11px] font-medium transition-colors duration-150 whitespace-nowrap shrink-0"
                style={{
                  color: themeId === 'default' ? tabInactiveText : resetText,
                  cursor: themeId === 'default' ? 'default' : 'pointer',
                  opacity: themeId === 'default' ? 0.4 : 1,
                }}
                onMouseEnter={(e) => {
                  if (themeId !== 'default') e.currentTarget.style.opacity = '0.7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = themeId === 'default' ? '0.4' : '1';
                }}
                disabled={themeId === 'default'}
              >
                <RotateCcw className="w-3 h-3 shrink-0" />
                Restablecer
              </button>

              {/* System mode toggle */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] whitespace-nowrap" style={{ color: footerText }}>Auto</span>
                <button
                  onClick={() => setMode(mode === 'system' ? 'light' : 'system')}
                  className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 shrink-0 ${
                    mode === 'system' ? 'bg-blue-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full shadow transition-transform duration-200 ${
                      mode === 'system' ? 'translate-x-[14px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
