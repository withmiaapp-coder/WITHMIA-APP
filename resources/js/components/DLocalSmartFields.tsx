/**
 * DLocalSmartFields — Secure card input for international recurring payments.
 *
 * Uses dLocal.js SDK to tokenize card data directly with dLocal's servers.
 * Card data never touches our backend — only the token is sent.
 *
 * Flow:
 * 1. Load dLocal.js SDK dynamically
 * 2. Initialize Smart Fields with API key + country
 * 3. Render card number, expiry, CVV fields
 * 4. On submit → tokenize card → return token to parent
 *
 * @see https://docs.dlocal.com/docs/smart-fields-1
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { CreditCard, Lock, Loader, AlertCircle, ShieldCheck } from 'lucide-react';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

interface SmartFieldsConfig {
  available: boolean;
  api_key: string;
  country: string;
  locale: string;
  sdk_url: string;
  sandbox: boolean;
  document: {
    type: string;
    label: string;
    pattern: string;
    placeholder: string;
    mask: string | null;
  } | null;
}

interface DLocalSmartFieldsProps {
  /** Plan to subscribe to */
  plan: string;
  /** monthly or annual */
  billingCycle: 'monthly' | 'annual';
  /** Amount to display (in local currency) */
  displayAmount: string;
  /** Currency code */
  currency: string;
  /** Country code for document requirements */
  countryCode: string;
  /** Called when payment succeeds */
  onSuccess: (result: SmartFieldsPaymentResult) => void;
  /** Called on error */
  onError: (message: string) => void;
  /** Called when checkout starts/ends (for loading states) */
  onLoadingChange?: (loading: boolean) => void;
  /** Theme info */
  isDark: boolean;
  /** Theme colors */
  themeColors: {
    accent: string;
    cardBg: string;
    cardBorder: string;
    textPrimary: string;
    textSec: string;
    inputBg: string;
    inputBorder: string;
  };
}

interface SmartFieldsPaymentResult {
  success: boolean;
  status: 'active' | 'pending' | 'pending_3ds';
  message: string;
  payment_id?: string;
  redirect_url?: string;
  recurring?: boolean;
  next_renewal?: string;
}

/* ═══════════════════════════════════════════
   SMART FIELDS SDK TYPES (dLocal.js)
   ═══════════════════════════════════════════ */

interface DLocalInstance {
  fields: (options: { locale: string; country: string }) => DLocalFields;
  createToken: (
    cardField: DLocalField,
    extraData: { name: string; email?: string }
  ) => Promise<{ token: string } | { error: { message: string } }>;
}

interface DLocalFields {
  create: (type: string, options?: Record<string, unknown>) => DLocalField;
}

interface DLocalField {
  mount: (element: HTMLElement | string) => void;
  on: (event: string, handler: (data: unknown) => void) => void;
  unmount: () => void;
}

declare global {
  interface Window {
    dlocal?: (apiKey: string) => DLocalInstance;
  }
}

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */

export default function DLocalSmartFields({
  plan,
  billingCycle,
  displayAmount,
  currency,
  countryCode,
  onSuccess,
  onError,
  onLoadingChange,
  isDark,
  themeColors,
}: DLocalSmartFieldsProps) {
  const [config, setConfig] = useState<SmartFieldsConfig | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payerName, setPayerName] = useState('');
  const [payerDocument, setPayerDocument] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const dlocalRef = useRef<DLocalInstance | null>(null);
  const cardFieldRef = useRef<DLocalField | null>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  const csrf = () =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  // ── 1. Fetch Smart Fields config from backend ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/subscription/smart-fields-config', {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        const data = await res.json();
        if (!cancelled) {
          if (data.available) {
            setConfig(data as SmartFieldsConfig);
          } else {
            setLoadError('Smart Fields no disponible en este momento.');
          }
        }
      } catch {
        if (!cancelled) setLoadError('Error al cargar configuración de pago.');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── 2. Load dLocal.js SDK ──
  useEffect(() => {
    if (!config) return;

    // Check if already loaded
    if (window.dlocal) {
      setSdkLoaded(true);
      return;
    }

    const script = window.document.createElement('script');
    script.src = config.sdk_url;
    script.async = true;
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => setLoadError('Error al cargar dLocal SDK.');
    window.document.head.appendChild(script);

    return () => {
      // Don't remove the script — may be used elsewhere
    };
  }, [config]);

  // ── 3. Initialize Smart Fields + mount card element ──
  useEffect(() => {
    if (!config || !sdkLoaded || !window.dlocal || !cardContainerRef.current || mountedRef.current) return;

    try {
      const dlocal = window.dlocal(config.api_key);
      dlocalRef.current = dlocal;

      const fields = dlocal.fields({
        locale: config.locale || 'es',
        country: config.country,
      });

      // Card field styling
      const style = {
        base: {
          fontSize: '16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          lineHeight: '1.5',
          color: isDark ? '#e5e7eb' : '#1f2937',
          '::placeholder': {
            color: isDark ? '#6b7280' : '#9ca3af',
          },
        },
        focus: {
          color: isDark ? '#f3f4f6' : '#111827',
        },
        invalid: {
          color: '#ef4444',
        },
      };

      const card = fields.create('card', { style });
      cardFieldRef.current = card;

      card.mount(cardContainerRef.current);
      mountedRef.current = true;

      card.on('ready', () => setCardReady(true));
      card.on('change', (event: unknown) => {
        const ev = event as { error?: { message: string } };
        setCardError(ev.error?.message || null);
      });

    } catch (err) {
      setLoadError('Error al inicializar formulario de tarjeta.');
      console.error('Smart Fields init error:', err);
    }

    return () => {
      if (cardFieldRef.current && mountedRef.current) {
        try { cardFieldRef.current.unmount(); } catch { /* ignore */ }
        mountedRef.current = false;
        cardFieldRef.current = null;
      }
    };
  }, [config, sdkLoaded, isDark]);

  // ── 4. Handle form submission ──
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dlocalRef.current || !cardFieldRef.current) {
      onError('El formulario de tarjeta no está listo.');
      return;
    }

    if (!payerName.trim()) {
      onError('Ingresa el nombre del titular de la tarjeta.');
      return;
    }

    // Check document requirement
    if (config?.document && !payerDocument.trim()) {
      onError(`Ingresa tu ${config.document.label}.`);
      return;
    }

    // Validate document format
    if (config?.document && payerDocument.trim()) {
      const pattern = new RegExp(config.document.pattern);
      if (!pattern.test(payerDocument.replace(/[\.\-\/]/g, ''))) {
        onError(`Formato de ${config.document.label} no válido.`);
        return;
      }
    }

    setProcessing(true);
    onLoadingChange?.(true);

    try {
      // Step 1: Tokenize card via dLocal.js SDK
      const tokenResult = await dlocalRef.current.createToken(cardFieldRef.current, {
        name: payerName.trim(),
      });

      if ('error' in tokenResult && tokenResult.error) {
        const errMsg = (tokenResult.error as { message?: string }).message || 'Error al procesar la tarjeta.';
        onError(errMsg);
        setProcessing(false);
        onLoadingChange?.(false);
        return;
      }

      const tokenData = tokenResult as { token: string };

      // Step 2: Send token to our backend for payment
      const res = await fetch('/api/subscription/checkout-smart-fields', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrf(),
        },
        body: JSON.stringify({
          card_token: tokenData.token,
          billing_cycle: billingCycle,
          plan,
          payer_name: payerName.trim(),
          payer_document: payerDocument.replace(/[\.\-\/]/g, '') || undefined,
        }),
      });

      const data: SmartFieldsPaymentResult = await res.json();

      if (!res.ok) {
        onError((data as unknown as { message: string }).message || 'Error al procesar el pago.');
        return;
      }

      // Handle 3DS redirect
      if (data.status === 'pending_3ds' && data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }

      onSuccess(data);

    } catch (err) {
      console.error('Smart Fields payment error:', err);
      onError('Error de conexión. Intenta nuevamente.');
    } finally {
      setProcessing(false);
      onLoadingChange?.(false);
    }
  }, [payerName, document, plan, billingCycle, config, onSuccess, onError, onLoadingChange]);

  // ── Loading / Error states ──
  if (loadError) {
    return (
      <div style={{
        padding: '20px',
        borderRadius: '12px',
        background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
        border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#fecaca'}`,
        color: isDark ? '#fca5a5' : '#dc2626',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <AlertCircle size={20} />
        <span>{loadError}</span>
      </div>
    );
  }

  if (!config || !sdkLoaded) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: themeColors.textSec,
      }}>
        <Loader size={24} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
        <p style={{ marginTop: '12px', fontSize: '14px' }}>Cargando formulario de pago seguro...</p>
      </div>
    );
  }

  // ── Render Card Form ──
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Security badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        borderRadius: '8px',
        background: isDark ? 'rgba(34,197,94,0.1)' : '#f0fdf4',
        border: `1px solid ${isDark ? 'rgba(34,197,94,0.2)' : '#bbf7d0'}`,
        fontSize: '13px',
        color: isDark ? '#86efac' : '#166534',
      }}>
        <ShieldCheck size={16} />
        <span>Pago seguro procesado por dLocal. Tus datos de tarjeta nunca pasan por nuestros servidores.</span>
      </div>

      {/* Cardholder name */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 600,
          color: themeColors.textSec,
          marginBottom: '6px',
        }}>
          Nombre del titular
        </label>
        <input
          type="text"
          value={payerName}
          onChange={(e) => setPayerName(e.target.value)}
          placeholder="Como aparece en la tarjeta"
          required
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${themeColors.inputBorder}`,
            background: themeColors.inputBg,
            color: themeColors.textPrimary,
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Document field (if required by country) */}
      {config.document && (
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: themeColors.textSec,
            marginBottom: '6px',
          }}>
            {config.document.label}
          </label>
          <input
            type="text"
            value={payerDocument}
            onChange={(e) => setPayerDocument(e.target.value)}
            placeholder={config.document.placeholder}
            required
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: `1px solid ${themeColors.inputBorder}`,
              background: themeColors.inputBg,
              color: themeColors.textPrimary,
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <p style={{
            marginTop: '4px',
            fontSize: '11px',
            color: themeColors.textSec,
            opacity: 0.7,
          }}>
            Requerido para pagos en {countryCode}. Solo números, sin puntos ni guiones.
          </p>
        </div>
      )}

      {/* dLocal Smart Fields card element */}
      <div>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: 600,
          color: themeColors.textSec,
          marginBottom: '6px',
        }}>
          <CreditCard size={14} />
          Datos de tarjeta
        </label>
        <div
          ref={cardContainerRef}
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            border: `1px solid ${cardError ? '#ef4444' : themeColors.inputBorder}`,
            background: themeColors.inputBg,
            minHeight: '44px',
            transition: 'border-color 0.2s',
          }}
        />
        {cardError && (
          <p style={{ marginTop: '4px', fontSize: '12px', color: '#ef4444' }}>{cardError}</p>
        )}
        {!cardReady && !loadError && (
          <p style={{
            marginTop: '4px',
            fontSize: '12px',
            color: themeColors.textSec,
            opacity: 0.6,
          }}>
            Cargando campos de tarjeta...
          </p>
        )}
      </div>

      {/* Amount display */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderRadius: '8px',
        background: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
        border: `1px solid ${themeColors.cardBorder}`,
      }}>
        <span style={{ fontSize: '14px', color: themeColors.textSec }}>
          Total a cobrar ({billingCycle === 'annual' ? 'anual' : 'mensual'}):
        </span>
        <span style={{ fontSize: '18px', fontWeight: 700, color: themeColors.textPrimary }}>
          {displayAmount} {currency}
        </span>
      </div>

      {/* Recurring notice */}
      <p style={{
        fontSize: '12px',
        color: themeColors.textSec,
        opacity: 0.7,
        textAlign: 'center',
        lineHeight: '1.5',
      }}>
        <Lock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
        Tu tarjeta se guardará de forma segura para renovación automática.
        Puedes cancelar en cualquier momento.
      </p>

      {/* Submit button */}
      <button
        type="submit"
        disabled={processing || !cardReady || !!cardError}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '10px',
          border: 'none',
          background: processing || !cardReady || !!cardError
            ? (isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb')
            : themeColors.accent,
          color: processing || !cardReady || !!cardError
            ? (isDark ? 'rgba(255,255,255,0.3)' : '#9ca3af')
            : '#ffffff',
          fontSize: '16px',
          fontWeight: 700,
          cursor: processing || !cardReady || !!cardError ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s',
        }}
      >
        {processing ? (
          <>
            <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Procesando pago...
          </>
        ) : (
          <>
            <Lock size={16} />
            Suscribirse con tarjeta — {displayAmount} {currency}
          </>
        )}
      </button>
    </form>
  );
}
