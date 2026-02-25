import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export interface ThemedSelectOption {
  value: string;
  label: string;
}

interface ThemedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ThemedSelectOption[];
  triggerClassName?: string;
  triggerStyle?: React.CSSProperties;
}

export function ThemedSelect({
  value,
  onChange,
  options,
  triggerClassName = '',
  triggerStyle,
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false);
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { currentTheme } = useTheme();
  const hasTheme = !!currentTheme;

  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      contentBg: 'var(--theme-content-bg)',
      cardBorder: 'var(--theme-content-card-border)',
      text: 'var(--theme-text-primary)',
      textSec: 'var(--theme-text-secondary)',
      accent: 'var(--theme-accent)',
      accentLight: 'var(--theme-accent-light)',
      itemBg: 'var(--theme-item-bg)',
    };
  }, [hasTheme]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Compute portal position
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const updatePos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 150),
      });
    }
  }, []);

  useEffect(() => {
    if (open) {
      updatePos();
      window.addEventListener('scroll', updatePos, true);
      window.addEventListener('resize', updatePos);
      return () => {
        window.removeEventListener('scroll', updatePos, true);
        window.removeEventListener('resize', updatePos);
      };
    }
  }, [open, updatePos]);

  const selectedOption = options.find(o => o.value === value);

  const getItemBg = (optValue: string) => {
    const isSelected = optValue === value;
    const isHovered = optValue === hoveredValue;
    if (isSelected) return t ? t.accentLight : '#fff7ed';
    if (isHovered) return t ? t.itemBg : '#f8fafc';
    return 'transparent';
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`flex items-center justify-between gap-1 cursor-pointer ${triggerClassName}`}
        style={triggerStyle}
      >
        <span className="truncate">{selectedOption?.label ?? ''}</span>
        <ChevronDown
          className={`w-3 h-3 shrink-0 opacity-60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed rounded-lg border shadow-xl overflow-hidden py-1"
            style={{
              top: pos.top,
              left: pos.left,
              minWidth: pos.width,
              zIndex: 99999,
              backgroundColor: t ? t.contentBg : '#ffffff',
              borderColor: t ? t.cardBorder : '#e2e8f0',
            }}
          >
            {options.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center justify-between gap-2"
                  style={{
                    color: isSelected ? (t ? t.accent : '#f97316') : (t ? t.text : '#374151'),
                    backgroundColor: getItemBg(opt.value),
                  }}
                  onMouseEnter={() => setHoveredValue(opt.value)}
                  onMouseLeave={() => setHoveredValue(null)}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
