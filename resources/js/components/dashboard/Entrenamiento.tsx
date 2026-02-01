import { useState, useRef, useEffect, useMemo } from "react";
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
    settings?: any;
  };
  onboardingData: OnboardingData;
}

export default function Entrenamiento({
  user,
  company,
  onboardingData: initialOnboarding,
}: EntrenamientoProps) {
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
      console.error("Error fetching bot config:", error);
    } finally {
      setLoadingBotConfig(false);
    }
  };

  const handleSaveBotConfig = async () => {
    setSavingBotConfig(true);
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      
      console.log("Saving bot config:", botConfig);
      
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

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);
      
      if (data.success) {
        setShowBotConfig(false);
      } else {
        alert("Error al guardar: " + (data.error || JSON.stringify(data)));
      }
    } catch (error) {
      console.error("Error saving bot config:", error);
      alert("Error al guardar la configuración: " + (error as Error).message);
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
        setOnboardingData(data.data);
      }
      setDataLoaded(true);
    } catch (error) {
      console.error("Error fetching onboarding data:", error);
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
      console.error("Error saving onboarding:", error);
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
      console.error('Error uploading logo:', error);
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
    
    // 🔧 DEBUG: Log encoding info
    console.log('📍 Training message debug:', {
      originalMessage: messageToSend,
      messageLength: messageToSend.length,
      // Check for problematic characters
      hasAccents: /[áéíóúñÁÉÍÓÚÑ]/.test(messageToSend),
      charCodes: messageToSend.slice(0, 50).split('').map(c => c.charCodeAt(0)),
    });
    
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
        
        // 📍„ Si se cambió el nombre del asistente, actualizar el estado local
        if (data.name_changed && data.new_name) {
          setOnboardingData((prev) => ({
            ...prev,
            assistant_name: data.new_name,
          }));
          console.log('✅ Nombre del asistente actualizado a:', data.new_name);
        }
        
        // Mostrar indicador si se guardó en Qdrant
        if (data.saved_to_knowledge) {
          console.log('✅ Información guardada en la base de conocimiento');
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
      console.error("Error sending training message:", error);
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
        <div className="p-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl shadow-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Entrenamiento de IA</h1>
          <p className="text-sm text-neutral-500">
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
            <div className="w-[380px] h-[780px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-[3rem] p-2 shadow-2xl">
              {/* Phone Inner */}
              <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
                {/* Status Bar - iPhone style */}
                <div className="h-12 bg-gradient-to-r from-violet-500 to-purple-500 flex items-end justify-between px-6 pb-1 relative">
                  {/* Dynamic Island / Notch */}
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-24 h-7 bg-black rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-gray-800 rounded-full mr-2"></div>
                    <div className="w-2 h-2 bg-gray-700 rounded-full"></div>
                  </div>
                  {/* Time */}
                  <span className="text-white text-sm font-semibold">
                    {new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {/* Status Icons */}
                  <div className="flex items-center gap-1.5">
                    {/* Signal */}
                    <div className="flex items-end gap-0.5 h-3">
                      <div className="w-1 h-1 bg-white rounded-sm"></div>
                      <div className="w-1 h-1.5 bg-white rounded-sm"></div>
                      <div className="w-1 h-2 bg-white rounded-sm"></div>
                      <div className="w-1 h-3 bg-white rounded-sm"></div>
                    </div>
                    {/* WiFi */}
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 18c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-4.9-2.1l1.4 1.4c1.9-1.9 5.1-1.9 7 0l1.4-1.4c-2.7-2.7-7.1-2.7-9.8 0zM2.8 11.6l1.4 1.4c4.3-4.3 11.3-4.3 15.6 0l1.4-1.4c-5.1-5.1-13.3-5.1-18.4 0z"/>
                    </svg>
                    {/* Battery */}
                    <div className="flex items-center gap-0.5">
                      <div className="w-6 h-3 border border-white rounded-sm flex items-center p-0.5">
                        <div className="w-full h-full bg-green-400 rounded-sm"></div>
                      </div>
                      <div className="w-0.5 h-1.5 bg-white rounded-r-sm"></div>
                    </div>
                    <span className="text-white text-xs font-medium">100%</span>
                  </div>
                </div>
                
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-3 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                    {onboardingData.logo_url ? (
                      <img src={onboardingData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <img src="/logo-withmia.webp" alt="Logo" className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-base">{onboardingData.assistant_name || "WITHMIA"}</h3>
                    <p className="text-white/70 text-xs">Entrenamiento activo</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-white/80 text-xs font-medium">En línea</span>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                  {/* Welcome message - only show after data is loaded */}
                  {dataLoaded ? (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md">
                        <p className="text-sm whitespace-pre-wrap">{welcomeContent}</p>
                        <p className="text-[10px] mt-1 text-gray-400">
                          {new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md">
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
                            ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-br-md"
                            : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-white/60" : "text-gray-400"}`}>
                          {msg.timestamp.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-800 shadow-sm border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
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
                <div className="p-3 bg-white border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Escribe para entrenar..."
                      className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isTyping}
                      className="w-11 h-11 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:shadow-lg transition-all"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="h-8 bg-white flex items-center justify-center">
                  <div className="w-36 h-1.5 bg-gray-300 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-violet-500/10 rounded-full blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl"></div>
          </div>
        </div>

        {/* Company Information Section */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg h-fit">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-violet-600" />
              <h2 className="text-2xl font-bold text-neutral-800">
                Información de tu Empresa
              </h2>
            </div>
            {!editingOnboarding ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenBotConfig}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Configuración del Bot"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingOnboarding(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingOnboarding(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
                <button
                  onClick={handleSaveOnboarding}
                  disabled={savingOnboarding}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
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

          <div className="space-y-4">
            {/* Company Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Image className="w-4 h-4 inline mr-1" />
                Logo de la Empresa
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                  {onboardingData.logo_url ? (
                    <img 
                      src={onboardingData.logo_url} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-gray-400" />
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
                    className="flex items-center gap-2 px-3 py-2 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors text-sm disabled:opacity-50"
                  >
                    {uploadingLogo ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {onboardingData.logo_url ? 'Cambiar logo' : 'Subir logo'}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP. Máx 2MB</p>
                </div>
              </div>
            </div>

            {/* Assistant Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Bot className="w-4 h-4 inline mr-1" />
                Nombre del Asistente
              </label>
              {editingOnboarding ? (
                <input
                  type="text"
                  value={onboardingData.assistant_name || 'WITHMIA'}
                  onChange={(e) =>
                    setOnboardingData((prev) => ({
                      ...prev,
                      assistant_name: e.target.value,
                    }))
                  }
                  placeholder="Ej: Ana, Sofia, Max..."
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 bg-white placeholder-gray-400"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-800">
                  {onboardingData.assistant_name || "WITHMIA"}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">Este es el nombre con el que tu IA se presentará a tus clientes</p>
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 bg-white"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-800">
                  {onboardingData.company_name || "No especificado"}
                </p>
              )}
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 inline mr-1" />
                Sitio Web
              </label>
              {editingOnboarding ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center cursor-pointer text-gray-900 font-medium">
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
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 bg-white placeholder-gray-400"
                    />
                  )}
                </div>
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-800">
                  {onboardingData.has_website ? (
                    <a
                      href={onboardingData.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-600 hover:underline"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 bg-white resize-none"
                />
              ) : (
                <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800 whitespace-pre-wrap text-sm">
                  {onboardingData.company_description || "No especificada"}
                </p>
              )}
            </div>

            {/* Client Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Tipo de Cliente
              </label>
              {editingOnboarding ? (
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      setOnboardingData((prev) => ({
                        ...prev,
                        client_type: "interno",
                      }))
                    }
                    className={`flex-1 px-4 py-3 border-2 rounded-lg transition-all ${
                      onboardingData.client_type === "interno"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-xl mb-1"></div>
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
                    className={`flex-1 px-4 py-3 border-2 rounded-lg transition-all ${
                      onboardingData.client_type === "externo"
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-xl mb-1"></div>
                      <div className="font-semibold text-sm">Externo</div>
                    </div>
                  </button>
                </div>
              ) : (
                <div
                  className={`px-4 py-3 rounded-lg text-sm ${
                    onboardingData.client_type === "interno"
                      ? "bg-green-50 text-green-700"
                      : onboardingData.client_type === "externo"
                      ? "bg-orange-50 text-orange-700"
                      : "bg-gray-50 text-gray-800"
                  }`}
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
          <div className="mt-6 p-4 bg-violet-50 rounded-lg border border-violet-100">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-violet-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-violet-800 text-sm">Consejos de entrenamiento</h4>
                <ul className="mt-2 text-sm text-violet-700 space-y-1">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">Configuración del Bot</h3>
                </div>
                <button
                  onClick={() => setShowBotConfig(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {loadingBotConfig ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-8 h-8 animate-spin text-violet-600" />
                </div>
              ) : noWorkflowConfigured ? (
                /* No workflow configured - show integration message */
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Conecta tu WhatsApp primero
                  </h4>
                  <p className="text-gray-600 mb-6">
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
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg"
                  >
                    <Link2 className="w-5 h-5" />
                    Ir a Integración
                  </button>
                </div>
              ) : (
                <>
                  {/* Grid 2 columnas */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Col 1: Desbloquear Bot */}
                    <div className="bg-violet-50 rounded-lg p-3 border border-violet-100">
                      <h4 className="text-xs font-semibold text-violet-800 mb-2 flex items-center gap-1">
                        🔓 Desbloquear Bot
                      </h4>
                      <input
                        type="text"
                        value={botConfig.unlock_keyword}
                        onChange={(e) => setBotConfig({ ...botConfig, unlock_keyword: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 bg-white"
                        placeholder="BOT"
                      />
                      <p className="mt-1 text-[10px] text-gray-500">Tú escribes → bot se reactiva</p>
                    </div>

                    {/* Col 2: Cliente Pide Humano - Palabra */}
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                      <h4 className="text-xs font-semibold text-orange-800 mb-2 flex items-center gap-1">
                        🙋 Pedir Humano
                      </h4>
                      <input
                        type="text"
                        value={botConfig.human_keyword}
                        onChange={(e) => setBotConfig({ ...botConfig, human_keyword: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 bg-white"
                        placeholder="HUMANO"
                      />
                      <p className="mt-1 text-[10px] text-gray-500">Cliente escribe → bot se pausa</p>
                    </div>

                    {/* Col 1: Tiempo bloqueo humano */}
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                      <h4 className="text-xs font-semibold text-orange-800 mb-2 flex items-center gap-1">
                        ⏱️ Pausa por Humano
                      </h4>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={botConfig.human_block_duration}
                          onChange={(e) => setBotConfig({ ...botConfig, human_block_duration: parseInt(e.target.value) || 600 })}
                          min={60}
                          max={86400}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 bg-white"
                        />
                        <span className="text-xs text-orange-700 whitespace-nowrap">
                          {botConfig.human_block_duration >= 60 ? `${Math.floor(botConfig.human_block_duration / 60)}m` : `${botConfig.human_block_duration}s`}
                        </span>
                      </div>
                    </div>

                    {/* Col 2: Tiempo bloqueo empresa */}
                    <div className="bg-violet-50 rounded-lg p-3 border border-violet-100">
                      <h4 className="text-xs font-semibold text-violet-800 mb-2 flex items-center gap-1">
                        💬 Tú Respondes
                      </h4>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={botConfig.block_duration}
                          onChange={(e) => setBotConfig({ ...botConfig, block_duration: parseInt(e.target.value) || 600 })}
                          min={60}
                          max={86400}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 bg-white"
                        />
                        <span className="text-xs text-violet-700 whitespace-nowrap">
                          {botConfig.block_duration >= 60 ? `${Math.floor(botConfig.block_duration / 60)}m` : `${botConfig.block_duration}s`}
                        </span>
                      </div>
                    </div>

                    {/* Col 1: Buffer */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        ⏳ Buffer Espera
                      </h4>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={botConfig.buffer_wait_time}
                          onChange={(e) => setBotConfig({ ...botConfig, buffer_wait_time: parseInt(e.target.value) || 7 })}
                          min={1}
                          max={60}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 bg-white"
                        />
                        <span className="text-xs text-gray-600 whitespace-nowrap">{botConfig.buffer_wait_time}s</span>
                      </div>
                      <p className="mt-1 text-[10px] text-gray-500">Espera antes de responder</p>
                    </div>

                    {/* Col 2: Humanización */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        🤖 Humanización
                      </h4>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={botConfig.humanize_wait_time}
                          onChange={(e) => setBotConfig({ ...botConfig, humanize_wait_time: parseInt(e.target.value) || 2 })}
                          min={1}
                          max={30}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 bg-white"
                        />
                        <span className="text-xs text-gray-600 whitespace-nowrap">{botConfig.humanize_wait_time}s</span>
                      </div>
                      <p className="mt-1 text-[10px] text-gray-500">Pausa entre mensajes</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer - only show when workflow is configured */}
            {!noWorkflowConfigured && !loadingBotConfig && (
              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowBotConfig(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveBotConfig}
                  disabled={savingBotConfig || loadingBotConfig}
                  className="flex items-center gap-2 px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
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
