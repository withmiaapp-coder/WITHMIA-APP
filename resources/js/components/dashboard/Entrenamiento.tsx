import { useState, useRef, useEffect, useMemo } from "react";
import debugLog from '@/utils/debugLogger';
import { useTheme } from '../../contexts/ThemeContext';
import { router } from "@inertiajs/react";
import {
  Building2,
  Globe,
  Users,
  Edit2,
  Save,
  X,
  Loader,
  Send,
  Bot,
  User,
  Sparkles,
  MessageCircle,
  Upload,
  Image,
  Settings,
  Clock,
  Key,
  Shield,
  Link2,
  AlertCircle,
} from "lucide-react";

interface OnboardingData {
  company_name: string;
  company_description: string;
  has_website: boolean;
  website: string;
  client_type: "interno" | "externo" | null;
  logo_url?: string;
  assistant_name?: string;
}

interface BotConfig {
  unlock_keyword: string;        // #1: Palabra para desbloquear (empresa escribe)
  human_keyword: string;         // #2: Palabra para pedir humano (cliente final)
  human_block_duration: number;  // #2: Tiempo bloqueo cuando cliente pide humano
  block_duration: number;        // #3: Tiempo bloqueo cuando empresa responde
  buffer_wait_time: number;
  humanize_wait_time: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface EntrenamientoProps {
  user: {
    id: number;
    name: string;
    email: string;
    company_id?: number;
    company_slug?: string;
    company_name?: string;
    company_description?: string;
    has_website?: boolean;
    website?: string;
    client_type?: "interno" | "externo" | null;
  };
  company?: {
    id: number;
    name: string;
    slug: string;
    description?: string;
    settings?: Record<string, unknown>;
  };
  onboardingData: OnboardingData;
}

export default function Entrenamiento({
  user,
  company,
  onboardingData: initialOnboarding,
}: EntrenamientoProps) {
  const { currentTheme, hasTheme, isDark } = useTheme();

  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      cardBg: 'var(--theme-content-card-bg)',
      cardBorder: 'var(--theme-content-card-border)',
      contentBg: 'var(--theme-content-bg)',
      text: 'var(--theme-text-primary)',
      textSec: 'var(--theme-text-secondary)',
      textMuted: 'var(--theme-text-muted)',
      accent: 'var(--theme-accent)',
      accentLight: 'var(--theme-accent-light)',
      inputBg: isDark ? 'rgba(255,255,255,0.06)' : undefined,
      itemBg: isDark ? 'rgba(255,255,255,0.03)' : undefined,
    };
  }, [hasTheme, isDark]);

  const [onboardingData, setOnboardingData] = useState<OnboardingData>(
    initialOnboarding || {
      company_name: company?.name || "",
      company_description: company?.description || "",
      has_website: false,
      website: "",
      client_type: null,
    }
  );

  const [editingOnboarding, setEditingOnboarding] = useState(false);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const nameJustChanged = useRef(false); // Prevenir que fetchOnboardingData sobrescriba un cambio de nombre reciente
  
  // Bot config state
  const [showBotConfig, setShowBotConfig] = useState(false);
  const [botConfig, setBotConfig] = useState<BotConfig>({
    unlock_keyword: 'BOT',
    human_keyword: 'HUMANO',
    human_block_duration: 600,
    block_duration: 600,
    buffer_wait_time: 7,
    humanize_wait_time: 2,
  });
  const [savingBotConfig, setSavingBotConfig] = useState(false);
  const [loadingBotConfig, setLoadingBotConfig] = useState(false);
  const [noWorkflowConfigured, setNoWorkflowConfigured] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false); // Solo scroll después de enviar mensaje
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate welcome message content based on current data - memoizado para evitar re-renders
  const welcomeContent = useMemo(() => {
    const assistantName = onboardingData.assistant_name || 'tu asistente';
    const companyName = onboardingData.company_name || 'tu empresa';
    return `¡Hola! 👋 Soy ${assistantName}, tu asistente de inteligencia artificial de ${companyName}.\n\nEstoy aquí para aprender. Puedes enviarme ejemplos de conversaciones, corregir mis respuestas o simplemente chatear conmigo para probar cómo respondo.\n\n¿Qué te gustaría enseñarme hoy?`;
  }, [onboardingData.assistant_name, onboardingData.company_name]);

  // Fetch onboarding data on mount
  useEffect(() => {
    fetchOnboardingData();
  }, []);

  // Fetch bot config when modal opens
  const fetchBotConfig = async () => {
    setLoadingBotConfig(true);
    setNoWorkflowConfigured(false);
    try {
      const response = await fetch("/api/bot-config");
      const data = await response.json();
      if (response.status === 404 || (data.success === false && data.error?.includes('workflow'))) {
        setNoWorkflowConfigured(true);
      } else if (data.success && data.data) {
        setBotConfig(data.data);
      }
    } catch (error) {
      debugLog.error("Error fetching bot config:", error);
    } finally {
      setLoadingBotConfig(false);
    }
  };

  const handleSaveBotConfig = async () => {
    setSavingBotConfig(true);
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      
      const response = await fetch("/api/bot-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": token,
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(botConfig),
      });

      const data = await response.json();
      
      if (data.success) {
        setShowBotConfig(false);
      } else {
        // Extraer mensaje de error más amigable
        let errorMsg = "Error desconocido";
        if (data.message) {
          errorMsg = data.message;
        } else if (data.errors) {
          // Validación de Laravel - obtener primer error
          const firstField = Object.keys(data.errors)[0];
          errorMsg = data.errors[firstField]?.[0] || "Error de validación";
        } else if (data.error) {
          errorMsg = data.error;
        }
        alert("⚠️ " + errorMsg);
      }
    } catch (error) {
      debugLog.error("Error saving bot config:", error);
      alert("❌ Error al guardar la configuración. Intenta nuevamente.");
    } finally {
      setSavingBotConfig(false);
    }
  };

  const handleOpenBotConfig = () => {
    setShowBotConfig(true);
    fetchBotConfig();
  };

  const fetchOnboardingData = async () => {
    try {
      const response = await fetch("/api/onboarding-data");
      const data = await response.json();
      if (data.success && data.data) {
        if (nameJustChanged.current) {
          // Si el nombre acaba de cambiar, preservarlo y mergear el resto
          setOnboardingData((prev) => ({
            ...data.data,
            assistant_name: prev.assistant_name,
          }));
          nameJustChanged.current = false;
        } else {
          setOnboardingData(data.data);
        }
      }
      setDataLoaded(true);
    } catch (error) {
      debugLog.error("Error fetching onboarding data:", error);
      setDataLoaded(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Solo hacer scroll cuando shouldAutoScroll es true (después de enviar mensaje)
  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      scrollToBottom();
      setShouldAutoScroll(false);
    }
  }, [messages, shouldAutoScroll]);

  const handleSaveOnboarding = async () => {
    setSavingOnboarding(true);
    try {
      // Obtener CSRF token
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      
      const response = await fetch("/api/onboarding-data", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": token,
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(onboardingData),
      });

      const data = await response.json();
      if (data.success) {
        setEditingOnboarding(false);
      } else {
        alert("Error al guardar: " + (data.error || "Intente nuevamente"));
      }
    } catch (error) {
      debugLog.error("Error saving onboarding:", error);
      alert("Error al guardar. Por favor intente nuevamente.");
    } finally {
      setSavingOnboarding(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      
      const response = await fetch('/api/company/logo', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': token,
        },
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.logo_url) {
        setOnboardingData(prev => ({ ...prev, logo_url: data.logo_url }));
        // Reload page to update sidebar logo
        window.location.reload();
      } else {
        alert('Error al subir el logo: ' + (data.error || 'Intente nuevamente'));
      }
    } catch (error) {
      debugLog.error('Error uploading logo:', error);
      alert('Error al subir el logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setShouldAutoScroll(true); // Activar scroll al enviar mensaje
    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputMessage.trim();
    
    setInputMessage("");
    setIsTyping(true);

    try {
      // Get CSRF token
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      
      // Build context from recent messages (last 5)
      const recentMessages = messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/training/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": token,
          "Accept": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: messageToSend,
          context: recentMessages,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };
        setShouldAutoScroll(true); // Scroll cuando llega respuesta
        setMessages((prev) => [...prev, assistantMessage]);
        
        // 📍 Si se cambió el nombre del asistente, actualizar el estado local y re-fetch
        if (data.name_changed && data.new_name) {
          nameJustChanged.current = true;
          setOnboardingData((prev) => ({
            ...prev,
            assistant_name: data.new_name,
          }));
          // Re-fetch para asegurar que el panel derecho tenga los datos sincronizados
          fetchOnboardingData();
        }
        
        // Mostrar indicador si se guardó en Qdrant
        if (data.saved_to_knowledge) {
          // Knowledge base updated
        }
      } else {
        // Fallback response on error
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Lo siento, tuve un problema procesando tu mensaje. ¿Podrías intentarlo de nuevo?",
          timestamp: new Date(),
        };
        setShouldAutoScroll(true);
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      debugLog.error("Error sending training message:", error);
      // Fallback response on network error
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "No pude conectarme al servidor. Por favor, verifica tu conexión e inténtalo de nuevo.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <div className={`p-3 rounded-xl shadow-lg ${!t ? 'bg-gradient-to-r from-violet-500 to-purple-500' : ''}`} style={t ? { background: t.accent } : undefined}>
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Entrenamiento de WITH<span className="font-black">MIA</span></h1>
          <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textSec } : undefined}>
            Entrena a WITHMIA con información de tu empresa y ejemplos de conversación
          </p>
        </div>
      </div>

      {/* Main Grid - Phone + Company Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phone Mockup */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Phone Frame */}
            <div className="w-[300px] h-[620px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.5rem] p-1.5 shadow-2xl">
              {/* Phone Inner */}
              <div className={`w-full h-full rounded-[2.2rem] overflow-hidden flex flex-col ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                {/* Status Bar - iPhone style */}
                <div className={`h-10 flex items-end justify-between px-4 pb-1 relative ${!t ? 'bg-gradient-to-r from-violet-500 to-purple-500' : ''}`} style={t ? { background: t.accent } : undefined}>
                  {/* Dynamic Island / Notch */}
                  <div className="absolute top-1.5 left-1/2 transform -translate-x-1/2 w-20 h-6 bg-black rounded-full flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-gray-800 rounded-full mr-1.5"></div>
                    <div className="w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
                  </div>
                  {/* Time */}
                  <span className="text-white font-semibold" style={{ fontSize: '10px', lineHeight: '1' }}>
                    {new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {/* Status Icons */}
                  <div className="flex items-center gap-1">
                    {/* Signal */}
                    <div className="flex items-end gap-px h-2.5">
                      <div className="w-0.5 h-0.5 bg-white rounded-sm"></div>
                      <div className="w-0.5 h-1 bg-white rounded-sm"></div>
                      <div className="w-0.5 h-1.5 bg-white rounded-sm"></div>
                      <div className="w-0.5 h-2.5 bg-white rounded-sm"></div>
                    </div>
                    {/* WiFi */}
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 18c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-4.9-2.1l1.4 1.4c1.9-1.9 5.1-1.9 7 0l1.4-1.4c-2.7-2.7-7.1-2.7-9.8 0zM2.8 11.6l1.4 1.4c4.3-4.3 11.3-4.3 15.6 0l1.4-1.4c-5.1-5.1-13.3-5.1-18.4 0z"/>
                    </svg>
                    {/* Battery */}
                    <div className="flex items-center gap-px">
                      <div className="w-5 h-2.5 border border-white rounded-sm flex items-center p-px">
                        <div className="w-full h-full bg-green-400 rounded-sm"></div>
                      </div>
                      <div className="w-px h-1 bg-white rounded-r-sm"></div>
                    </div>
                    <span className="text-white font-medium" style={{ fontSize: '9px', lineHeight: '1' }}>100%</span>
                  </div>
                </div>
                
                {/* Chat Header */}
                <div className={`px-3 py-2 flex items-center gap-2 ${!t ? 'bg-gradient-to-r from-violet-500 to-purple-500' : ''}`} style={t ? { background: t.accent } : undefined}>
                  <div className={`w-12 h-12 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden ${isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
                    {onboardingData.logo_url ? (
                      <img src={onboardingData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <img src="/logo-withmia.webp" alt="Logo" className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{onboardingData.assistant_name || "WITHMIA"}</h3>
                    <p className="text-white/70 text-xs">Entrenamiento activo</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-white/80 text-xs font-medium">En línea</span>
                  </div>
                </div>

                {/* Messages Area */}
                <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  {/* Welcome message - only show after data is loaded */}
                  {dataLoaded ? (
                    <div className="flex justify-start">
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm rounded-bl-md ${isDark ? 'bg-gray-800 text-gray-200 border border-gray-700' : 'bg-white text-gray-800 border border-gray-100'}`}>
                        <p className="text-sm whitespace-pre-wrap">{welcomeContent}</p>
                        <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm rounded-bl-md ${isDark ? 'bg-gray-800 text-gray-200 border border-gray-700' : 'bg-white text-gray-800 border border-gray-100'}`}>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* User messages */}
                  {messages.filter(msg => msg.id !== "welcome").map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                          msg.role === "user"
                            ? `${!t ? 'bg-gradient-to-r from-violet-500 to-purple-500' : ''} text-white rounded-br-md`
                            : isDark ? "bg-gray-800 text-gray-200 shadow-sm border border-gray-700 rounded-bl-md" : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md"
                        }`}
                        style={t && msg.role === "user" ? { background: t.accent } : undefined}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-white/60" : isDark ? "text-gray-500" : "text-gray-400"}`}>
                          {msg.timestamp.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className={`shadow-sm rounded-2xl rounded-bl-md px-4 py-3 ${isDark ? 'bg-gray-800 text-gray-200 border border-gray-700' : 'bg-white text-gray-800 border border-gray-100'}`}>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className={`p-3 border-t ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Escribe para entrenar..."
                      className={`flex-1 px-4 py-2.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500 focus:bg-gray-800' : 'bg-gray-100 border-gray-200 text-gray-800 placeholder-gray-500 focus:bg-white'}`}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isTyping}
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:shadow-lg transition-all ${!t ? 'bg-gradient-to-r from-violet-500 to-purple-500' : ''}`}
                      style={t ? { background: t.accent } : undefined}
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Home Indicator */}
                <div className={`h-8 flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                  <div className={`w-36 h-1.5 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-violet-500/10 rounded-full blur-xl"></div>
          </div>
        </div>

        {/* Company Information Section */}
        <div className={`rounded-xl p-5 border shadow-lg h-fit ${!t ? 'bg-white border-slate-200' : ''}`} style={t ? { background: t.cardBg, borderColor: t.cardBorder } : undefined}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" style={t ? { color: t.accent } : { color: '#7c3aed' }} />
              <h2 className={`text-lg font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>
                Información de tu Empresa
              </h2>
            </div>
            {!editingOnboarding ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenBotConfig}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm ${!t ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'hover:opacity-80'}`}
                  style={t ? { background: t.inputBg, color: t.textSec } : undefined}
                  title="Configuración del Bot"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingOnboarding(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm ${!t ? 'bg-violet-50 text-violet-700 hover:bg-violet-100' : 'hover:opacity-80'}`}
                  style={t ? { background: t.accentLight, color: t.accent } : undefined}
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingOnboarding(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm ${!t ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'hover:opacity-80'}`}
                  style={t ? { background: t.inputBg, color: t.textSec } : undefined}
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
                <button
                  onClick={handleSaveOnboarding}
                  disabled={savingOnboarding}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-sm ${!t ? 'bg-violet-600 text-white hover:bg-violet-700' : 'text-white'}`}
                  style={t ? { background: t.accent } : undefined}
                >
                  {savingOnboarding ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Guardar
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {/* Company Logo */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>
                <Image className="w-4 h-4 inline mr-1" />
                Logo de la Empresa
              </label>
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden ${!t ? 'border-gray-300 bg-gray-50' : ''}`} style={t ? { borderColor: t.cardBorder, background: t.inputBg } : undefined}>
                  {onboardingData.logo_url ? (
                    <img 
                      src={onboardingData.logo_url} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Building2 className="w-8 h-8" style={t ? { color: t.textMuted } : { color: '#9ca3af' }} />
                  )}
                </div>
                <div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-sm disabled:opacity-50 ${!t ? 'bg-violet-50 text-violet-700 hover:bg-violet-100' : 'hover:opacity-80'}`}
                    style={t ? { background: t.accentLight, color: t.accent } : undefined}
                  >
                    {uploadingLogo ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {onboardingData.logo_url ? 'Cambiar logo' : 'Subir logo'}
                  </button>
                  <p className={`text-xs mt-1 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>PNG, JPG, WebP. Máx 2MB</p>
                </div>
              </div>
            </div>

            {/* Assistant Name */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>
                <Bot className="w-4 h-4 inline mr-1" />
                Nombre del Asistente
              </label>
              {editingOnboarding ? (
                <input
                  type="text"
                  value={onboardingData.assistant_name ?? ''}
                  onChange={(e) =>
                    setOnboardingData((prev) => ({
                      ...prev,
                      assistant_name: e.target.value,
                    }))
                  }
                  placeholder="Ej: Ana, Sofia, Max..."
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm ${!t ? 'border-gray-200 text-gray-900 bg-white placeholder-gray-400' : ''}`}
                  style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                />
              ) : (
                <p className={`px-3 py-2 rounded-lg text-sm ${!t ? 'bg-gray-50 text-gray-800' : ''}`} style={t ? { background: t.inputBg, color: t.text } : undefined}>
                  {onboardingData.assistant_name || "WITHMIA"}
                </p>
              )}
              <p className={`text-xs mt-1 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Este es el nombre con el que tu IA se presentará a tus clientes</p>
            </div>

            {/* Company Name */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>
                Nombre de la Empresa
              </label>
              {editingOnboarding ? (
                <input
                  type="text"
                  value={onboardingData.company_name}
                  onChange={(e) =>
                    setOnboardingData((prev) => ({
                      ...prev,
                      company_name: e.target.value,
                    }))
                  }
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm ${!t ? 'border-gray-200 text-gray-900 bg-white' : ''}`}
                  style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                />
              ) : (
                <p className={`px-3 py-2 rounded-lg text-sm ${!t ? 'bg-gray-50 text-gray-800' : ''}`} style={t ? { background: t.inputBg, color: t.text } : undefined}>
                  {onboardingData.company_name || "No especificado"}
                </p>
              )}
            </div>

            {/* Website */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>
                <Globe className="w-4 h-4 inline mr-1" />
                Sitio Web
              </label>
              {editingOnboarding ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <label className={`flex items-center cursor-pointer font-medium text-sm ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.text } : undefined}>
                      <input
                        type="radio"
                        checked={onboardingData.has_website === true}
                        onChange={() =>
                          setOnboardingData((prev) => ({
                            ...prev,
                            has_website: true,
                          }))
                        }
                        className="mr-2 w-4 h-4 text-violet-600 border-gray-300 focus:ring-violet-500"
                      />
                      Sí
                    </label>
                    <label className="flex items-center cursor-pointer text-gray-900 font-medium">
                      <input
                        type="radio"
                        checked={onboardingData.has_website === false}
                        onChange={() =>
                          setOnboardingData((prev) => ({
                            ...prev,
                            has_website: false,
                            website: "",
                          }))
                        }
                        className="mr-2 w-4 h-4 text-violet-600 border-gray-300 focus:ring-violet-500"
                      />
                      No
                    </label>
                  </div>
                  {onboardingData.has_website && (
                    <input
                      type="url"
                      value={onboardingData.website}
                      onChange={(e) =>
                        setOnboardingData((prev) => ({
                          ...prev,
                          website: e.target.value,
                        }))
                      }
                      placeholder="https://ejemplo.com"
                      className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm ${!t ? 'border-gray-200 text-gray-900 bg-white placeholder-gray-400' : ''}`}
                      style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                    />
                  )}
                </div>
              ) : (
                <p className={`px-3 py-2 rounded-lg text-sm ${!t ? 'bg-gray-50 text-gray-800' : ''}`} style={t ? { background: t.inputBg, color: t.text } : undefined}>
                  {onboardingData.has_website ? (
                    <a
                      href={onboardingData.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                      style={t ? { color: t.accent } : { color: '#7c3aed' }}
                    >
                      {onboardingData.website}
                    </a>
                  ) : (
                    "Sin sitio web"
                  )}
                </p>
              )}
            </div>

            {/* Company Description */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>
                Descripción de la Empresa
              </label>
              {editingOnboarding ? (
                <textarea
                  value={onboardingData.company_description}
                  onChange={(e) =>
                    setOnboardingData((prev) => ({
                      ...prev,
                      company_description: e.target.value,
                    }))
                  }
                  rows={3}
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none text-sm ${!t ? 'border-gray-200 text-gray-900 bg-white' : ''}`}
                  style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                />
              ) : (
                <p className={`px-3 py-2 rounded-lg whitespace-pre-wrap text-sm ${!t ? 'bg-gray-50 text-gray-800' : ''}`} style={t ? { background: t.inputBg, color: t.text } : undefined}>
                  {onboardingData.company_description || "No especificada"}
                </p>
              )}
            </div>

            {/* Client Type */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>
                <Users className="w-4 h-4 inline mr-1" />
                Tipo de Cliente
              </label>
              {editingOnboarding ? (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setOnboardingData((prev) => ({
                        ...prev,
                        client_type: "interno",
                      }))
                    }
                    className={`flex-1 px-3 py-2 border-2 rounded-lg transition-all ${!t ? (
                      onboardingData.client_type === "interno"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    ) : ''}`}
                    style={t ? {
                      borderColor: onboardingData.client_type === "interno" ? t.accent : t.cardBorder,
                      background: onboardingData.client_type === "interno" ? t.accentLight : t.inputBg,
                      color: onboardingData.client_type === "interno" ? t.accent : t.textSec
                    } : undefined}
                  >
                    <div className="text-center">
                      <div className="font-semibold text-sm">Interno</div>
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      setOnboardingData((prev) => ({
                        ...prev,
                        client_type: "externo",
                      }))
                    }
                    className={`flex-1 px-3 py-2 border-2 rounded-lg transition-all ${!t ? (
                      onboardingData.client_type === "externo"
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    ) : ''}`}
                    style={t ? {
                      borderColor: onboardingData.client_type === "externo" ? t.accent : t.cardBorder,
                      background: onboardingData.client_type === "externo" ? t.accentLight : t.inputBg,
                      color: onboardingData.client_type === "externo" ? t.accent : t.textSec
                    } : undefined}
                  >
                    <div className="text-center">
                      <div className="font-semibold text-sm">Externo</div>
                    </div>
                  </button>
                </div>
              ) : (
                <div
                  className={`px-3 py-2 rounded-lg text-sm ${!t ? (
                    onboardingData.client_type === "interno"
                      ? "bg-green-50 text-green-700"
                      : onboardingData.client_type === "externo"
                      ? "bg-orange-50 text-orange-700"
                      : "bg-gray-50 text-gray-800"
                  ) : ''}`}
                  style={t ? { background: t.inputBg, color: t.text } : undefined}
                >
                  {onboardingData.client_type === "interno"
                    ? " Cliente Interno - Para equipos de tu empresa"
                    : onboardingData.client_type === "externo"
                    ? " Cliente Externo - Para tus clientes finales"
                    : "No especificado"}
                </div>
              )}
            </div>
          </div>

          {/* Tips Section */}
          <div className={`mt-4 p-3 rounded-lg border ${!t ? 'bg-violet-50 border-violet-100' : ''}`} style={t ? { background: t.accentLight, borderColor: t.cardBorder } : undefined}>
            <div className="flex items-start gap-2">
              <MessageCircle className="w-4 h-4 mt-0.5" style={t ? { color: t.accent } : { color: '#7c3aed' }} />
              <div>
                <h4 className={`font-semibold text-sm ${!t ? 'text-violet-800' : ''}`} style={t ? { color: t.accent } : undefined}>Consejos de entrenamiento</h4>
                <ul className={`mt-1.5 text-xs space-y-0.5 ${!t ? 'text-violet-700' : ''}`} style={t ? { color: t.textSec } : undefined}>
                  <li>• Proporciona ejemplos de conversaciones típicas</li>
                  <li>• Corrige las respuestas que no sean correctas</li>
                  <li>• Describe cómo debe responder WITHMIA a tus clientes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bot Configuration Modal */}
      {showBotConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden ${!t ? 'bg-white' : ''}`} style={t ? { background: 'var(--theme-content-bg)' } : undefined}>
            {/* Header */}
            <div className={`${!t ? 'bg-gradient-to-r from-violet-600 to-purple-600' : ''} px-5 py-4 flex-shrink-0`} style={t ? { background: t.accent } : undefined}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-bold text-white">Configuración del Bot</h3>
                </div>
                <button
                  onClick={() => setShowBotConfig(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="p-5 overflow-y-auto flex-1">
              {loadingBotConfig ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className={`w-8 h-8 animate-spin ${!t ? 'text-violet-600' : ''}`} style={t ? { color: t.accent } : undefined} />
                </div>
              ) : noWorkflowConfigured ? (
                /* No workflow configured - show integration message */
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  </div>
                  <h4 className={`text-lg font-semibold mb-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.text } : undefined}>
                    Conecta tu WhatsApp primero
                  </h4>
                  <p className={`mb-6 ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSec } : undefined}>
                    Para configurar el bot, primero necesitas conectar tu WhatsApp en la sección de Integración.
                  </p>
                  <button
                    onClick={() => {
                      setShowBotConfig(false);
                      // Cerrar modal y usar navegación directa del navegador
                      const slug = company?.slug || user?.company_slug;
                      const currentPath = window.location.pathname;
                      // Extraer el slug actual de la URL si no lo tenemos
                      const urlSlug = currentPath.match(/\/dashboard\/([^/?]+)/)?.[1] || slug;
                      window.location.href = `/dashboard/${urlSlug}?section=integracion`;
                    }}
                    className={`inline-flex items-center gap-2 px-6 py-3 text-white font-medium rounded-lg transition-all shadow-lg ${!t ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700' : 'hover:opacity-90'}`}
                    style={t ? { background: t.accent } : undefined}
                  >
                    <Link2 className="w-5 h-5" />
                    Ir a Integración
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 1. Palabra clave del cliente */}
                  <div className={`rounded-xl p-3 border ${!t ? 'bg-orange-50 border-orange-100' : ''}`} style={t ? { background: t.itemBg, borderColor: t.cardBorder } : undefined}>
                    <div className="flex items-start gap-2">
                      <span className="text-xl">🙋</span>
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${!t ? 'text-orange-800' : ''}`} style={t ? { color: t.text } : undefined}>Palabra clave del cliente</h4>
                        <p className={`text-xs mt-0.5 mb-2 ${!t ? 'text-orange-600' : ''}`} style={t ? { color: t.textSec } : undefined}>
                          Si el cliente escribe esta palabra, te llegará una notificación para que lo atiendas personalmente.
                        </p>
                        <input
                          type="text"
                          value={botConfig.human_keyword}
                          onChange={(e) => setBotConfig({ ...botConfig, human_keyword: e.target.value.toUpperCase().slice(0, 50) })}
                          maxLength={50}
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:border-transparent font-medium ${!t ? 'focus:ring-orange-500 border-orange-200 text-gray-900 bg-white' : ''}`}
                          style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                          placeholder="Ej: HUMANO, AYUDA, AGENTE"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Tiempo de espera por respuesta humana */}
                  <div className={`rounded-xl p-3 border ${!t ? 'bg-orange-50 border-orange-100' : ''}`} style={t ? { background: t.itemBg, borderColor: t.cardBorder } : undefined}>
                    <div className="flex items-start gap-2">
                      <span className="text-xl">⏳</span>
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${!t ? 'text-orange-800' : ''}`} style={t ? { color: t.text } : undefined}>Tiempo para responder al cliente</h4>
                        <p className={`text-xs mt-0.5 mb-2 ${!t ? 'text-orange-600' : ''}`} style={t ? { color: t.textSec } : undefined}>
                          Cuando el cliente pide ayuda humana, el bot se pausa este tiempo esperando tu respuesta. Si no respondes, el bot vuelve a atender.
                        </p>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={botConfig.human_block_duration}
                            onChange={(e) => {
                              const val = Math.min(86400, Math.max(60, parseInt(e.target.value) || 60));
                              setBotConfig({ ...botConfig, human_block_duration: val });
                            }}
                            min={60}
                            max={86400}
                            className={`w-32 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:border-transparent font-medium ${!t ? 'focus:ring-orange-500 border-orange-200 text-gray-900 bg-white' : ''}`}
                            style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                          />
                          <span className={`text-sm font-medium ${!t ? 'text-orange-700' : ''}`} style={t ? { color: t.textSec } : undefined}>
                            segundos = {botConfig.human_block_duration >= 3600 
                              ? `${Math.floor(botConfig.human_block_duration / 3600)}h ${Math.floor((botConfig.human_block_duration % 3600) / 60)}m`
                              : `${Math.floor(botConfig.human_block_duration / 60)} minutos`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Pausa cuando tú respondes */}
                  <div className={`rounded-xl p-3 border ${!t ? 'bg-violet-50 border-violet-100' : ''}`} style={t ? { background: t.itemBg, borderColor: t.cardBorder } : undefined}>
                    <div className="flex items-start gap-2">
                      <span className="text-xl">💬</span>
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${!t ? 'text-violet-800' : ''}`} style={t ? { color: t.text } : undefined}>Pausa cuando tú respondes</h4>
                        <p className={`text-xs mt-0.5 mb-2 ${!t ? 'text-violet-600' : ''}`} style={t ? { color: t.textSec } : undefined}>
                          Cuando escribes al cliente desde Chatwoot, el bot se pausa este tiempo para que puedas conversar sin interrupciones.
                        </p>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={botConfig.block_duration}
                            onChange={(e) => {
                              const val = Math.min(86400, Math.max(60, parseInt(e.target.value) || 60));
                              setBotConfig({ ...botConfig, block_duration: val });
                            }}
                            min={60}
                            max={86400}
                            className={`w-32 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:border-transparent font-medium ${!t ? 'focus:ring-violet-500 border-violet-200 text-gray-900 bg-white' : ''}`}
                            style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                          />
                          <span className={`text-sm font-medium ${!t ? 'text-violet-700' : ''}`} style={t ? { color: t.textSec } : undefined}>
                            segundos = {botConfig.block_duration >= 3600 
                              ? `${Math.floor(botConfig.block_duration / 3600)}h ${Math.floor((botConfig.block_duration % 3600) / 60)}m`
                              : `${Math.floor(botConfig.block_duration / 60)} minutos`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Espera mensajes del cliente */}
                  <div className={`rounded-xl p-3 border ${!t ? 'bg-gray-50 border-gray-200' : ''}`} style={t ? { background: t.itemBg, borderColor: t.cardBorder } : undefined}>
                    <div className="flex items-start gap-2">
                      <span className="text-xl">✍️</span>
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>Espera mensajes del cliente</h4>
                        <p className={`text-xs mt-0.5 mb-2 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined}>
                          El bot espera estos segundos después de cada mensaje por si el cliente sigue escribiendo, así puede responder todo junto.
                        </p>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={botConfig.buffer_wait_time}
                            onChange={(e) => {
                              const val = Math.min(60, Math.max(1, parseInt(e.target.value) || 1));
                              setBotConfig({ ...botConfig, buffer_wait_time: val });
                            }}
                            min={1}
                            max={60}
                            className={`w-32 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:border-transparent font-medium ${!t ? 'focus:ring-violet-500 border-gray-300 text-gray-900 bg-white' : ''}`}
                            style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                          />
                          <span className={`text-sm font-medium ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSec } : undefined}>
                            segundos
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Simula que escribe */}
                  <div className={`rounded-xl p-3 border ${!t ? 'bg-gray-50 border-gray-200' : ''}`} style={t ? { background: t.itemBg, borderColor: t.cardBorder } : undefined}>
                    <div className="flex items-start gap-2">
                      <span className="text-xl">💭</span>
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${!t ? 'text-gray-700' : ''}`} style={t ? { color: t.text } : undefined}>Simula que escribe</h4>
                        <p className={`text-xs mt-0.5 mb-2 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined}>
                          Antes de enviar la respuesta, el bot muestra "escribiendo..." este tiempo para parecer más humano y natural.
                        </p>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={botConfig.humanize_wait_time}
                            onChange={(e) => {
                              const val = Math.min(30, Math.max(1, parseInt(e.target.value) || 1));
                              setBotConfig({ ...botConfig, humanize_wait_time: val });
                            }}
                            min={1}
                            max={30}
                            className={`w-32 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:border-transparent font-medium ${!t ? 'focus:ring-violet-500 border-gray-300 text-gray-900 bg-white' : ''}`}
                            style={t ? { background: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                          />
                          <span className={`text-sm font-medium ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textSec } : undefined}>
                            segundos
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer - only show when workflow is configured */}
            {!noWorkflowConfigured && !loadingBotConfig && (
              <div className={`px-5 py-3 border-t flex justify-end gap-3 flex-shrink-0 ${!t ? 'bg-gray-50 border-gray-200' : ''}`} style={t ? { background: t.contentBg, borderColor: t.cardBorder } : undefined}>
                <button
                  onClick={() => setShowBotConfig(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${!t ? 'text-gray-700 hover:bg-gray-200' : 'hover:opacity-80'}`}
                  style={t ? { color: t.textSec } : undefined}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveBotConfig}
                  disabled={savingBotConfig || loadingBotConfig}
                  className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${!t ? 'bg-violet-600 hover:bg-violet-700' : 'hover:opacity-90'}`}
                  style={t ? { background: t.accent } : undefined}
                >
                  {savingBotConfig ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Guardar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
