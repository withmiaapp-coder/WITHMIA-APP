import { useState, useRef, useEffect } from 'react';
import { Palette, Sun, Moon, Monitor, Check, Pipette, RotateCcw } from 'lucide-react';
import { useTheme, THEME_PALETTES, type ThemeMode } from '../contexts/ThemeContext';

const MODE_TABS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Claro', icon: Sun },
  { mode: 'dark', label: 'Oscuro', icon: Moon },
  { mode: 'system', label: 'Dispositivo', icon: Monitor },
];

export function ThemePicker() {
  const { themeId, mode, customColor, hasTheme, isDark, setThemeId, setMode, setCustomColor, resetTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Only preset palettes (exclude the 'custom' entry)
  const presetPalettes = THEME_PALETTES.filter(p => p.id !== 'custom');

  // Dark-aware popover colors
  const popoverBg = isDark ? '#1a1f2e' : 'white';
  const popoverBorder = isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const tabBg = isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6';
  const tabActiveBg = isDark ? 'rgba(255,255,255,0.12)' : 'white';
  const tabActiveText = isDark ? '#f1f5f9' : '#1f2937';
  const tabInactiveText = isDark ? '#94a3b8' : '#6b7280';
  const resetBg = isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb';
  const resetHoverBg = isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
  const resetText = isDark ? '#94a3b8' : '#4b5563';
  const footerBorder = isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6';
  const footerText = isDark ? '#64748b' : '#6b7280';

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
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Panel — anchored to button with absolute positioning */}
          <div
            ref={panelRef}
            className="absolute right-0 top-full mt-2 w-[280px] rounded-2xl shadow-2xl z-50 overflow-hidden"
            style={{
              animation: 'slideDown 0.15s ease-out',
              background: popoverBg,
              border: `1px solid ${popoverBorder}`,
              boxShadow: isDark
                ? '0 20px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
                : '0 20px 60px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.03)',
            }}
          >
            {/* Mode tabs */}
            <div className="p-3 pb-2">
              <div className="flex rounded-full p-1" style={{ background: tabBg }}>
                {MODE_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = mode === tab.mode;
                  return (
                    <button
                      key={tab.mode}
                      onClick={() => setMode(tab.mode)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-full text-xs font-medium transition-all duration-150"
                      style={{
                        background: isActive ? tabActiveBg : 'transparent',
                        color: isActive ? tabActiveText : tabInactiveText,
                        boxShadow: isActive ? (isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)') : 'none',
                      }}
                    >
                      {isActive && <Check className="w-3 h-3" />}
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color grid */}
            <div className="px-3 pb-2">
              <div className="grid grid-cols-4 gap-2.5">
                {presetPalettes.map((palette) => {
                  const isSelected = themeId === palette.id;

                  return (
                    <button
                      key={palette.id}
                      onClick={() => setThemeId(palette.id)}
                      className={`relative w-full aspect-square rounded-full transition-all duration-150 hover:scale-110 ${
                        isSelected
                          ? isDark
                            ? 'ring-2 ring-offset-2 ring-offset-[#1a1f2e] ring-white/40'
                            : 'ring-2 ring-offset-2 ring-gray-400'
                          : ''
                      }`}
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
                          <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 text-gray-700" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Custom color picker — opens native color dialog */}
                <button
                  onClick={() => colorInputRef.current?.click()}
                  className={`relative w-full aspect-square rounded-full transition-all duration-150 hover:scale-110 ${
                    themeId === 'custom'
                      ? isDark
                        ? 'ring-2 ring-offset-2 ring-offset-[#1a1f2e] ring-white/40'
                        : 'ring-2 ring-offset-2 ring-gray-400'
                      : ''
                  }`}
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
                    <Pipette className="w-4 h-4 text-white drop-shadow-md" />
                  </div>
                  {themeId === 'custom' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3 text-gray-700" />
                      </div>
                    </div>
                  )}
                </button>
              </div>

              {/* Hidden native color input */}
              <input
                ref={colorInputRef}
                type="color"
                value={customColor || '#6366f1'}
                onChange={(e) => setCustomColor(e.target.value)}
                className="sr-only"
                aria-hidden="true"
                tabIndex={-1}
              />
            </div>

            {/* Reset to default */}
            <div className="px-3 pb-3">
              <button
                onClick={() => resetTheme()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all duration-150"
                style={{
                  background: themeId === 'default' ? tabBg : resetBg,
                  color: themeId === 'default' ? tabInactiveText : resetText,
                  cursor: themeId === 'default' ? 'default' : 'pointer',
                  opacity: themeId === 'default' ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (themeId !== 'default') e.currentTarget.style.background = resetHoverBg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = themeId === 'default' ? tabBg : resetBg;
                }}
                disabled={themeId === 'default'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer predeterminado
              </button>
            </div>

            {/* Footer toggle */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderTop: `1px solid ${footerBorder}` }}
            >
              <span className="text-xs" style={{ color: footerText }}>Seguir colores del dispositivo</span>
              <button
                onClick={() => setMode(mode === 'system' ? 'light' : 'system')}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                  mode === 'system' ? 'bg-blue-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                    mode === 'system' ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
