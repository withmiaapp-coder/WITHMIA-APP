import { useState, useRef, useEffect } from "react";
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
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch onboarding data on mount
  useEffect(() => {
    fetchOnboardingData();
  }, []);

  // Initialize welcome message when onboarding data is loaded
  useEffect(() => {
    const assistantName = onboardingData.assistant_name || 'WITHMIA';
    if (messages.length === 0 && onboardingData.company_name) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: `¡Hola! 👋 Soy ${assistantName}, tu asistente de inteligencia artificial. Estoy aquí para aprender sobre ${onboardingData.company_name} y ayudarte a entrenarme.\n\n¿En qué puedo ayudarte hoy?`,
        timestamp: new Date(),
      }]);
    } else if (messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: `¡Hola! 👋 Soy ${assistantName}, tu asistente de inteligencia artificial. Estoy aquí para aprender sobre tu empresa y ayudarte a entrenarme.\n\n¿En qué puedo ayudarte hoy?`,
        timestamp: new Date(),
      }]);
    }
  }, [onboardingData.company_name, onboardingData.assistant_name]);

  const fetchOnboardingData = async () => {
    try {
      const response = await fetch("/api/onboarding-data");
      const data = await response.json();
      if (data.success && data.data) {
        setOnboardingData(data.data);
      }
    } catch (error) {
      console.error("Error fetching onboarding data:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiResponses = [
        "Entiendo. Voy a recordar eso para mejorar mis respuestas. ¿Hay algo más que deba saber?",
        "¡Gracias por la información! Esto me ayudará a responder mejor a tus clientes.",
        "Perfecto, he registrado esa información. ¿Quieres que practiquemos una conversación de ejemplo?",
        "Muy útil. ¿Podrías darme un ejemplo de cómo debería responder en esa situación?",
      ];
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponses[Math.floor(Math.random() * aiResponses.length)],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
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
            <div className="w-[320px] h-[640px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-[3rem] p-2 shadow-2xl">
              {/* Phone Inner */}
              <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
                {/* Phone Notch */}
                <div className="h-8 bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center relative">
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-20 h-4 bg-black rounded-full"></div>
                </div>
                
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                    {onboardingData.logo_url ? (
                      <img src={onboardingData.logo_url} alt={onboardingData.company_name || "Logo"} className="w-8 h-8 object-contain" />
                    ) : (
                      <img src="/logo-withmia.webp" alt="WITHMIA" className="w-8 h-8 object-contain" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{onboardingData.assistant_name || "WITHMIA"}</h3>
                    <p className="text-white/70 text-xs">Entrenamiento activo</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-white/70 text-xs">En línea</span>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                  {messages.map((msg) => (
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
                      className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-full text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isTyping}
                      className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:shadow-lg transition-all"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="h-6 bg-white flex items-center justify-center">
                  <div className="w-32 h-1 bg-gray-300 rounded-full"></div>
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
              <button
                onClick={() => setEditingOnboarding(true)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={onboardingData.has_website === true}
                        onChange={() =>
                          setOnboardingData((prev) => ({
                            ...prev,
                            has_website: true,
                          }))
                        }
                        className="mr-2"
                      />
                      Sí
                    </label>
                    <label className="flex items-center">
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
                        className="mr-2"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-xl mb-1">🏢</div>
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
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-xl mb-1">👥</div>
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
                    ? "🏢 Cliente Interno - Para equipos de tu empresa"
                    : onboardingData.client_type === "externo"
                    ? "👥 Cliente Externo - Para tus clientes finales"
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
    </div>
  );
}
