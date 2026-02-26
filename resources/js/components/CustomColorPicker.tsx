import { useState, useRef, useCallback, useEffect } from 'react';
import { Pipette } from 'lucide-react';

/* ── HSV ↔ HEX helpers ── */
function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    const val = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(val * 255).toString(16).padStart(2, '0');
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hueToHex(h: number): string {
  return hsvToHex(h, 1, 1);
}

/* ── Component ── */
interface CustomColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  isDark: boolean;
  hasTheme: boolean;
}

export default function CustomColorPicker({ value, onChange, isDark, hasTheme }: CustomColorPickerProps) {
  const initial = hexToHsv(value || '#6366f1');
  const [hue, setHue] = useState(initial.h);
  const [sat, setSat] = useState(initial.s);
  const [val, setVal] = useState(initial.v);
  const [hexInput, setHexInput] = useState((value || '#6366f1').toUpperCase());

  const gradientRef = useRef<HTMLDivElement>(null);
  const draggingGradient = useRef(false);

  // Sync hex input when value changes externally
  useEffect(() => {
    if (value) {
      const hsv = hexToHsv(value);
      setHue(hsv.h);
      setSat(hsv.s);
      setVal(hsv.v);
      setHexInput(value.toUpperCase());
    }
  }, [value]);

  const emitColor = useCallback((h: number, s: number, v: number) => {
    const hex = hsvToHex(h, s, v);
    setHexInput(hex.toUpperCase());
    onChange(hex);
  }, [onChange]);

  /* ── Gradient (saturation/brightness) drag ── */
  const handleGradientInteraction = useCallback((clientX: number, clientY: number) => {
    const el = gradientRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setSat(x);
    setVal(1 - y);
    emitColor(hue, x, 1 - y);
  }, [hue, emitColor]);

  const onGradientPointerDown = useCallback((e: React.PointerEvent) => {
    draggingGradient.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleGradientInteraction(e.clientX, e.clientY);
  }, [handleGradientInteraction]);

  const onGradientPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingGradient.current) return;
    handleGradientInteraction(e.clientX, e.clientY);
  }, [handleGradientInteraction]);

  const onGradientPointerUp = useCallback(() => {
    draggingGradient.current = false;
  }, []);

  /* ── Hue slider ── */
  const handleHueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const h = parseFloat(e.target.value);
    setHue(h);
    emitColor(h, sat, val);
  }, [sat, val, emitColor]);

  /* ── Hex input ── */
  const handleHexSubmit = useCallback(() => {
    const cleaned = hexInput.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
      const hsv = hexToHsv(cleaned);
      setHue(hsv.h);
      setSat(hsv.s);
      setVal(hsv.v);
      onChange(cleaned);
    } else {
      // Revert to current
      setHexInput(hsvToHex(hue, sat, val).toUpperCase());
    }
  }, [hexInput, hue, sat, val, onChange]);

  const currentHex = hsvToHex(hue, sat, val);
  const pureHueHex = hueToHex(hue);

  const cardBg = hasTheme ? 'var(--theme-content-card-bg)' : (isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb');
  const borderColor = hasTheme ? 'var(--theme-content-card-border)' : (isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb');
  const textPrimary = hasTheme ? 'var(--theme-text-primary)' : (isDark ? '#f1f5f9' : '#111827');
  const textMuted = hasTheme ? 'var(--theme-text-muted)' : (isDark ? '#64748b' : '#9ca3af');
  const inputBg = hasTheme ? (isDark ? 'rgba(255,255,255,0.06)' : '#ffffff') : (isDark ? 'rgba(255,255,255,0.06)' : '#ffffff');

  return (
    <div className="px-3 pb-3 space-y-3">
      {/* Saturation / Brightness gradient */}
      <div
        ref={gradientRef}
        className="relative w-full rounded-xl overflow-hidden cursor-crosshair select-none"
        style={{ height: 160, background: pureHueHex }}
        onPointerDown={onGradientPointerDown}
        onPointerMove={onGradientPointerMove}
        onPointerUp={onGradientPointerUp}
      >
        {/* White → transparent (left to right) */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #fff, transparent)' }} />
        {/* Transparent → black (top to bottom) */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, #000)' }} />
        {/* Cursor */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white pointer-events-none"
          style={{
            left: `${sat * 100}%`,
            top: `${(1 - val) * 100}%`,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
          }}
        />
      </div>

      {/* Hue slider */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={hue}
          onChange={handleHueChange}
          className="w-full h-3 rounded-full appearance-none cursor-pointer"
          style={{
            background: 'linear-gradient(to right, #ff0000, #ff8800, #ffff00, #00ff00, #00ffff, #0088ff, #8800ff, #ff0000)',
            WebkitAppearance: 'none',
          }}
        />
      </div>

      {/* Preview + Hex input row */}
      <div className="flex items-center gap-2.5">
        {/* Color preview circle */}
        <div
          className="w-8 h-8 rounded-full shrink-0 border"
          style={{ background: currentHex, borderColor }}
        />
        {/* Hex input */}
        <div
          className="flex-1 flex items-center rounded-lg border px-2.5 h-8"
          style={{ background: inputBg, borderColor }}
        >
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value.toUpperCase())}
            onBlur={handleHexSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleHexSubmit()}
            maxLength={7}
            className="flex-1 bg-transparent text-xs font-mono outline-none"
            style={{ color: textPrimary }}
            spellCheck={false}
          />
        </div>
        {/* Eyedropper hint icon */}
        <div className="shrink-0 p-1.5 rounded-lg" style={{ background: cardBg }}>
          <Pipette className="w-3.5 h-3.5" style={{ color: textMuted }} />
        </div>
      </div>

      {/* Hue slider thumb styling */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid rgba(0,0,0,0.15);
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid rgba(0,0,0,0.15);
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
