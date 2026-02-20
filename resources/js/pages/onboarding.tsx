import { Head } from "@inertiajs/react";
import { useState, useEffect } from "react";
import {
  MessageCircle,
  Instagram,
  Facebook,
  Globe,
  Database,
  ShoppingCart,
  ShoppingBag,
  Calendar,
  CalendarDays,
  Cloud,
  Store,
  Search,
  Users,
  Play,
  Video,
  Linkedin,
  Mail,
  Target,
  HelpCircle,
} from "lucide-react";
import { showTransitionAndRedirect } from "@/components/TransitionScreen";

interface OnboardingProps {
  currentStep: number;
  user: any;
  company: any;
}

export default function Onboarding({
  currentStep = 1,
  user,
  company,
}: OnboardingProps) {
  const [step, setStep] = useState(() => {
    // Si el servidor indica paso 1 y no hay company, es usuario nuevo - limpiar localStorage
    if (currentStep === 1 && !company) {
      localStorage.removeItem("withmia_onboarding_step");
      return 1;
    }
    // Si hay un paso guardado en localStorage y el servidor indica un paso mayor a 1
    const savedStep = localStorage.getItem("withmia_onboarding_step");
    if (savedStep && currentStep > 1) {
      return parseInt(savedStep);
    }
    // Usar el paso del servidor
    return currentStep || 1;
  });

  // Save step to localStorage whenever step changes
  useEffect(() => {
    localStorage.setItem("withmia_onboarding_step", step.toString());
  }, [step]);

  // 🔑 Guardar auth_token del URL en localStorage para Railway Edge
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('auth_token');
    if (authToken) {
      localStorage.setItem('railway_auth_token', authToken);
    }
  }, []);

  // Función para background progresivo con estética Apple 2025 + OpenAI

  // Función para obtener el límite de dígitos por país
  const getPhoneLimit = (countryCode: string): number => {
    const phoneLimits = {
      "+56": 9, // Chile
      "+57": 10, // Colombia
      "+52": 10, // México
      "+51": 9, // Perú
      "+54": 10, // Argentina
      "+55": 11, // Brasil
      "+58": 10, // Venezuela
      "+593": 9, // Ecuador
      "+591": 8, // Bolivia
      "+598": 9, // Uruguay
      "+595": 9, // Paraguay
      "+506": 8, // Costa Rica
      "+502": 8, // Guatemala
      "+504": 8, // Honduras
      "+503": 8, // El Salvador
      "+505": 8, // Nicaragua
      "+507": 8, // Panamá
      "+1809": 10, // República Dominicana
      "+53": 8, // Cuba
      "+1787": 10, // Puerto Rico
      "+34": 9, // España
      "+351": 9, // Portugal
      "+33": 10, // Francia
      "+49": 11, // Alemania
      "+39": 10, // Italia
      "+44": 10, // Reino Unido
      "+31": 9, // Países Bajos
      "+1": 10, // Estados Unidos/Canadá
    };
    return (phoneLimits as any)[countryCode] || 10;
  };
  const getProgressiveBackground = (step: number): string => {
    const backgrounds = {
      1: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)",
      2: "linear-gradient(135deg, #f7fafc 0%, #edf2f7 50%, #e2e8f0 100%)",
      3: "linear-gradient(135deg, #fefcfb 0%, #faf8f5 50%, #f7f4f0 100%)",
      4: "linear-gradient(135deg, #fffbf5 0%, #fef8f0 50%, #fdf4e8 100%)",
      5: "linear-gradient(135deg, #fffcf2 0%, #fff8e1 50%, #fef3c7 100%)",
      6: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)",
      7: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fed7aa 100%)",
    };
    return (backgrounds as any)[step] || backgrounds[1];
  };

  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    phone_country: user?.phone_country || "+56",
    phone: user?.phone
      ? user.phone
          .toString()
          .replace(/[^0-9]/g, "")
          .slice(0, 9)
      : "",
    website: company?.website || "",
    has_website: true,
    found_via_search: true,
    company_name: company?.name || "",
    company_description: company?.description || "",
    client_type:
      company?.settings?.onboarding?.client_type || company?.industry || "",
    monthly_conversations:
      company?.settings?.onboarding?.monthly_conversations || "",
    discovered_via: company?.settings?.onboarding?.discovered_via || [],
    discovered_other: "",
    tools: company?.settings?.onboarding?.tools || [],
    other_tools: "",
  });

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem("withmia_onboarding_data");
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setFormData((prev) => ({ ...prev, ...parsedData }));
      } catch (error) {
        // Silently handled
      }
    }
  }, []);

  // Save data to localStorage whenever formData changes
  useEffect(() => {
    localStorage.setItem("withmia_onboarding_data", JSON.stringify(formData));
  }, [formData]);

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Notification state for elegant toast messages
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  // Show notification function
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  // Función para buscar sitios web con Google Custom Search API
  const searchWithGoogle = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `/api/google-search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'same-origin',
        }
      );

      const data = await response.json();

      if (data.success && data.items && data.items.length > 0) {
        setSuggestions(data.items);
        setShowDropdown(true);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } catch (error) {
      setSuggestions([]);
      setShowDropdown(false);
    }

    setIsSearching(false);
  };

  // Función para manejar cambios en el input
  const handleWebsiteInputChange = (e: any) => {
    const value = e.target.value;
    updateFormData("website", value);

    // Buscar con un pequeño delay para evitar muchas requests
    clearTimeout((window as any).searchTimeout);
    (window as any).searchTimeout = setTimeout(() => {
      searchWithGoogle(value);
    }, 500);
  };

  // Función para seleccionar una sugerencia
  const selectSuggestion = (suggestion: any) => {
    updateFormData("website", suggestion.domain);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      // Preparar datos según el step actual
      let payload = { step };

      switch (step) {
        case 1:
          payload = {
            ...payload,
            full_name: formData.full_name,
            phone: formData.phone,
            phone_country: formData.phone_country,
          };
          break;
        case 2:
          payload = {
            ...payload,
            company_name: formData.company_name,
            company_description: formData.company_description,
          };
          break;
        case 3:
          payload = {
            ...payload,
            has_website: formData.has_website,
            website: formData.website,
            found_via_search: formData.found_via_search,
          };
          break;
        case 4:
          payload = {
            ...payload,
            client_type: formData.client_type,
          };
          break;
        case 5:
          payload = {
            ...payload,
            monthly_conversations: formData.monthly_conversations,
          };
          break;
        case 6:
          payload = {
            ...payload,
            discovered_via: formData.discovered_via,
            discovered_other: formData.discovered_other,
            tools: formData.tools,
          };
          break;
        case 7:
          payload = {
            step: 7,
            full_name: formData.full_name,
            phone_country: formData.phone_country,
            phone: formData.phone,
            company_name: formData.company_name,
            company_description: formData.company_description,
            website: formData.website,
            has_website: formData.has_website,
            client_type: formData.client_type,
            monthly_conversations: formData.monthly_conversations,
            discovered_via: formData.discovered_via,
            discovered_other: formData.discovered_other,
            tools: formData.tools,
            complete_onboarding: true
          };
          break;
      }

      // Obtener auth_token de la URL
      const urlParams = new URLSearchParams(window.location.search);
      const authToken = urlParams.get('auth_token');
      const url = authToken ? `/onboarding?auth_token=${authToken}` : '/onboarding';

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN":
            document
              .querySelector('meta[name="csrf-token"]')
              ?.getAttribute("content") || "",
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        if (step < 7) {
          setStep(step + 1);
        } else {
          // Clear localStorage when onboarding is completed
          localStorage.removeItem("withmia_onboarding_data");
          localStorage.removeItem("withmia_onboarding_step");
          
          // Get dashboard URL from backend and ensure it has auth_token
          let dashboardUrl = data.dashboard_url || `/dashboard/${data.company_slug}`;
          
          // Si la URL no tiene auth_token, agregarlo
          const urlParams = new URLSearchParams(window.location.search);
          const authToken = urlParams.get('auth_token');
          if (authToken && !dashboardUrl.includes('auth_token')) {
            dashboardUrl += (dashboardUrl.includes('?') ? '&' : '?') + `auth_token=${authToken}`;
          }
          
          // Redirigir a la página de carga con video
          window.location.href = `/auth-loading?redirect=${encodeURIComponent(dashboardUrl)}`;
        }
      } else {
        showNotification(
          data.message || "Error al guardar. Intenta de nuevo.",
          "error"
        );
      }
    } catch (error) {
      showNotification("Error al guardar. Intenta de nuevo.", "error");
    }
    setLoading(false);
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const getStepTitle = () => {
    const titles = [
      "Registro",
      "Información de la Empresa",
      "Presencia Web",
      "Casos de Uso",
      "Volumen Esperado",
      "Cómo nos Conociste",
      "Herramientas Actuales",
    ];
    return titles[step === 0 ? 0 : step - 1];
  };

  const calculateProgress = () => {
    return (step / 7) * 100;
  };

  const renderStep = () => {
    if (step === 1 || step === 0) {
      return (
        <div>
          <div style={{ marginBottom: "6px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "350",
                color: "#4a5568",
                fontSize: "18px",
              }}
            >
              Nombre completo *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e: any) => {
                const lettersOnly = e.target.value.replace(/[^a-zA-Z ]/g, "");
                if (lettersOnly.length <= 50)
                  updateFormData("full_name", lettersOnly);
              }}
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                fontSize: "16px",
                color: "#1a202c",
                backgroundColor: "rgba(255,255,255,0.95)",
                boxSizing: "border-box",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease"
              }}
              placeholder="Tu nombre completo"
              required
            />
          </div>

          <div style={{ marginBottom: "6px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "350",
                color: "#4a5568",
                fontSize: "18px",
              }}
            >
              País *
            </label>
            <select
              value={formData.phone_country}
              onChange={(e: any) =>
                updateFormData("phone_country", e.target.value)
              }
              style={{
                width: "100%",
                padding: "14px 40px 14px 16px",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                fontSize: "16px",
                color: "#1a202c",
                backgroundColor: "rgba(255,255,255,0.95)",
                boxSizing: "border-box",
                cursor: "pointer",
                backgroundImage: "url('data:image/svg+xml;charset=UTF-8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23666%22 stroke-width=%222%22><polyline points=%226,9 12,15 18,9%22/></svg>')",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                backgroundSize: "16px",
                appearance: "none",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease"
              }}
            >
              <option value="+56"> Chile (+56)</option>
              <option value="+57"> Colombia (+57)</option>
              <option value="+52"> México (+52)</option>
              <option value="+51"> Perú (+51)</option>
              <option value="+54"> Argentina (+54)</option>
              <option value="+55"> Brasil (+55)</option>
              <option value="+58"> Venezuela (+58)</option>
              <option value="+593"> Ecuador (+593)</option>
              <option value="+591"> Bolivia (+591)</option>
              <option value="+598"> Uruguay (+598)</option>
              <option value="+595"> Paraguay (+595)</option>
              <option value="+506"> Costa Rica (+506)</option>
              <option value="+502"> Guatemala (+502)</option>
              <option value="+504"> Honduras (+504)</option>
              <option value="+503"> El Salvador (+503)</option>
              <option value="+505"> Nicaragua (+505)</option>
              <option value="+507"> Panamá (+507)</option>
              <option value="+1809"> República Dominicana (+1809)</option>
              <option value="+53"> Cuba (+53)</option>
              <option value="+1787"> Puerto Rico (+1787)</option>
              <option value="+34"> España (+34)</option>
              <option value="+351"> Portugal (+351)</option>
              <option value="+33"> Francia (+33)</option>
              <option value="+49"> Alemania (+49)</option>
              <option value="+39"> Italia (+39)</option>
              <option value="+44"> Reino Unido (+44)</option>
              <option value="+31"> Países Bajos (+31)</option>
              <option value="+1"> Estados Unidos (+1)</option>
              <option value="+1"> Canadá (+1)</option>
            </select>
          </div>

          <div style={{ marginBottom: "6px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "350",
                color: "#4a5568",
                fontSize: "18px",
              }}
            >
              Teléfono *
            </label>
            <input
              type="tel"
              value={formData.phone.slice(0, 9)}
              onChange={(e: any) => {
                const numericValue = e.target.value.replace(/[^0-9]/g, "");
                const maxLength =
                  formData.phone_country === "+56"
                    ? 9
                    : getPhoneLimit(formData.phone_country);
                if (numericValue.length <= maxLength)
                  updateFormData("phone", numericValue);
              }}
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                fontSize: "16px",
                color: "#1a202c",
                backgroundColor: "rgba(255,255,255,0.95)",
                boxSizing: "border-box",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease"
              }}
              maxLength={getPhoneLimit(formData.phone_country)}
              placeholder="Tu número de teléfono"
              required
            />
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div>
          <h2
            style={{
              fontSize: "24px",
              marginBottom: "6px",
              color: "#2d3748",
              fontWeight: "350",
              textAlign: "center",
            }}
          >
            {getStepTitle()}
          </h2>

          <div style={{ marginBottom: "6px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "350",
                color: "#4a5568",
                fontSize: "18px",
              }}
            >
              Nombre de la empresa *
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e: any) =>
                updateFormData("company_name", e.target.value)
              }
              style={{
                width: "100%",
                padding: "12px",
                border: "2px solid #f1f5f9",
                borderRadius: "24px",
                fontSize: "18px",
                color: "#1a202c",
                backgroundColor: "rgba(255,255,255,0.9)",
                boxSizing: "border-box",
              }}
              placeholder="Nombre de tu empresa"
              required
            />
          </div>

          <div style={{ marginBottom: "6px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "350",
                color: "#4a5568",
                fontSize: "18px",
              }}
            >
              Descripción de la empresa (opcional)
            </label>
            <div style={{ position: "relative" }}>
              <textarea
                value={formData.company_description}
                onChange={(e: any) =>
                  updateFormData("company_description", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "15px",
                  border: "2px solid #f1f5f9",
                  borderRadius: "12px",
                  fontSize: "14px",
                  color: "#1a202c",
                  backgroundColor: "rgba(255,255,255,0.9)",
                  boxSizing: "border-box",
                  minHeight: "120px",
                  resize: "vertical",
                }}
                placeholder="Describe brevemente a qué se dedica tu empresa..."
                maxLength={1000}
              />
              <button
                onClick={async (e) => {
                  const btn = e.currentTarget;
                  if (
                    !formData.company_description ||
                    !formData.company_description.trim()
                  ) {
                    showNotification("Escribe una descripción primero", "info");
                    return;
                  }
                  
                  // Disable button and show loading
                  btn.disabled = true;
                  btn.textContent = "✨ Mejorando...";
                  
                  try {
                    const response = await fetch("/api/improve-description", {
                      method: "POST",
                      headers: { 
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN":
                          document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute("content") || "",
                      },
                      body: JSON.stringify({
                        description: formData.company_description,
                      }),
                    });
                    const data = await response.json();
                    if (data.success && data.improved_description) {
                      updateFormData(
                        "company_description",
                        data.improved_description
                      );
                      showNotification("¡Descripción mejorada con IA!", "success");
                    } else {
                      showNotification(data.error || "No se pudo mejorar la descripción", "error");
                    }
                  } catch (error) {
                    showNotification("Error de conexión. Intenta de nuevo.", "error");
                  } finally {
                    btn.disabled = false;
                    btn.textContent = "✨ Mejorar con WITHMIA";
                  }
                }}
                style={{
                  position: "absolute",
                  bottom: "10px",
                  right: "10px",
                  background: "white",
                  color: "#333333",
                  border: "2px solid #DAA520",
                  borderRadius: "20px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: "350",
                  cursor: "pointer",
                  boxShadow:
                    "0 4px 15px #DAA52040, 0 2px 8px rgba(218, 165, 32, 0.2)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px) scale(1.05)";
                  e.target.style.boxShadow =
                    "0 8px 25px rgba(255, 215, 0, 0.4), 0 4px 12px rgba(255, 193, 7, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow =
                    "0 2px 8px rgba(102, 126, 234, 0.3)";
                }}
              >
                ✨ Mejorar con WITHMIA
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (step === 3) {
      return (
        <div>
          <h2
            style={{
              fontSize: "24px",
              marginBottom: "6px",
              color: "#2d3748",
              fontWeight: "350",
              textAlign: "center",
            }}
          >
            {getStepTitle()}
          </h2>

          <div style={{ marginBottom: "6px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "350",
                color: "#4a5568",
                fontSize: "18px",
              }}
            >
              ¿Tu empresa tiene sitio web?
            </label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: "#4a5568",
                  fontWeight: "500"
                }}
              >
                <input
                  type="radio"
                  name="has_website"
                  checked={formData.has_website === true}
                  onChange={() => updateFormData("has_website", true)}
                  style={{ marginRight: "8px" }}
                />
                Sí
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: "#4a5568",
                  fontWeight: "500"
                }}
              >
                <input
                  type="radio"
                  name="has_website"
                  checked={formData.has_website === false}
                  onChange={() => updateFormData("has_website", false)}
                  style={{ marginRight: "8px" }}
                />
                No
              </label>
            </div>
          </div>

          {formData.has_website && (
            <div style={{ marginBottom: "6px", position: "relative" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "350",
                  color: "#4a5568",
                  fontSize: "18px",
                }}
              >
                Tu sitio Web
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={handleWebsiteInputChange}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #f1f5f9",
                  borderRadius: "24px",
                  fontSize: "18px",
                  color: "#1a202c",
                  backgroundColor: "rgba(255,255,255,0.9)",
                  boxSizing: "border-box",
                }}
                placeholder="Busca tu web aqui o escribe una URL"
              />

              {/* Dropdown elegante lateral */}
              {showDropdown && suggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "-367.5px",
                    left: "calc(100% + 50px)",
                    width: "450px",
                    borderRadius: "24px",
                    background: "rgba(255, 255, 255, 0.92)",
                    backdropFilter: "blur(5px)",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
                    zIndex: 9999,
                    height: "565px",
                    overflow: "hidden",
                    padding: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      fontSize: "18px",
                      fontWeight: "350",
                      color: "#000000",
                      borderBottom: "1px solid #f1f5f9",
                      marginBottom: "8px",
                    }}
                  >
                    Sugerencias de sitios web
                  </div>
                  <div
                    style={{
                      height: "calc(100% - 80px)",
                      overflowY: "auto",
                      padding: "0 4px",
                      marginTop: "8px",
                    }}
                  >
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => selectSuggestion(suggestion)}
                        style={{
                          margin: "6px",
                          padding: "16px",
                          backgroundColor: "transparent",
                          border: "1px solid transparent",
                          borderRadius: "24px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.borderColor = "#FFC107";
                          e.target.style.transform = "none";
                          e.target.style.boxShadow = "none";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                          e.target.style.borderColor = "transparent";
                          e.target.style.transform = "none";
                          e.target.style.boxShadow = "none";
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "350",
                            color: "#1a1a1a",
                            marginBottom: "8px",
                            fontSize: "15px",
                            lineHeight: "1.4",
                          }}
                        >
                          {suggestion.title}
                        </div>
                        <div
                          style={{
                            fontSize: "15px",
                            color: "#000000",
                            marginBottom: "10px",
                            lineHeight: "1.5",
                          }}
                        >
                          {suggestion.description}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              backgroundColor: "#FFC107",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              color: "#333333",
                              fontWeight: "350",
                            }}
                          ></div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#FFC107",
                              fontWeight: "500",
                              fontFamily: "monospace",
                            }}
                          >
                            {suggestion.domain}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Indicador de búsqueda lateral */}
              {isSearching && (
                <div
                  style={{
                    position: "absolute",
                    top: "-50px",
                    left: "calc(100% + 30px)",
                    width: "450px",
                    padding: "20px",
                    backdropFilter: "blur(5px)",
                    background: "white",
                    textAlign: "center",
                    color: "#000000",
                    boxShadow:
                      "0 20px 40px rgba(0, 0, 0, 0.12), 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    zIndex: 1000,
                  }}
                >
                  <div style={{ fontSize: "18px", marginBottom: "8px" }}></div>
                  <div style={{ fontSize: "18px", fontWeight: "500" }}>
                    Buscando sitios web...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (step === 4) {
      return (
        <div>
          <h2
            style={{
              fontSize: "24px",
              marginBottom: "6px",
              color: "#2d3748",
              fontWeight: "350",
              textAlign: "center",
            }}
          >
            ¿Cómo trabajará WITHMIA contigo?
          </h2>
          <div style={{ textAlign: "center", marginBottom: "15px" }}>
            <p style={{ fontSize: "16px", color: "#666", fontWeight: "400" }}>
              Selecciona el tipo de cliente que atenderás con WITHMIA
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: "25px",
              justifyContent: "center",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            <div
              onClick={() => updateFormData("client_type", "interno")}
              style={{
                cursor: "pointer",
                padding: "25px 20px",
                textAlign: "center",
                border:
                  formData.client_type === "interno"
                    ? "3px solid #10b981"
                    : "2px solid #f1f5f9",
                borderRadius: "12px",
                backgroundColor:
                  formData.client_type === "interno"
                    ? "rgba(16, 185, 129, 0.1)"
                    : "white",
                boxShadow:
                  formData.client_type === "interno"
                    ? "0 8px 25px rgba(16, 185, 129, 0.3)"
                    : "0 4px 15px rgba(0, 0, 0, 0.08)",
                transform:
                  formData.client_type === "interno"
                    ? "translateY(-3px)"
                    : "translateY(0)",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                flex: "1",
                maxWidth: "250px",
                minHeight: "180px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
              onMouseEnter={(e) => {
                if (formData.client_type !== "interno") {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(0, 0, 0, 0.12)";
                }
              }}
              onMouseLeave={(e) => {
                if (formData.client_type !== "interno") {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 15px rgba(0, 0, 0, 0.08)";
                }
              }}
            >
              <div style={{ fontSize: "50px", marginBottom: "15px" }}></div>
              <h4
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#2d3748",
                }}
              >
                Cliente Interno
              </h4>
              <p
                style={{
                  fontSize: "13px",
                  color: "#666",
                  margin: "0 0 15px 0",
                  lineHeight: "1.4",
                }}
              >
                Para equipos dentro de tu empresa
              </p>
              {formData.client_type === "interno" && (
                <div
                  style={{
                    color: "#10b981",
                    fontSize: "13px",
                    fontWeight: "350",
                    background: "rgba(16, 185, 129, 0.1)",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                >
                  Seleccionado
                </div>
              )}
            </div>

            <div
              onClick={() => updateFormData("client_type", "externo")}
              style={{
                cursor: "pointer",
                padding: "25px 20px",
                textAlign: "center",
                border:
                  formData.client_type === "externo"
                    ? "3px solid #f59e0b"
                    : "2px solid #f1f5f9",
                borderRadius: "12px",
                backgroundColor:
                  formData.client_type === "externo"
                    ? "rgba(245, 158, 11, 0.1)"
                    : "white",
                boxShadow:
                  formData.client_type === "externo"
                    ? "0 8px 25px rgba(245, 158, 11, 0.3)"
                    : "0 4px 15px rgba(0, 0, 0, 0.08)",
                transform:
                  formData.client_type === "externo"
                    ? "translateY(-3px)"
                    : "translateY(0)",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                flex: "1",
                maxWidth: "250px",
                minHeight: "180px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
              onMouseEnter={(e) => {
                if (formData.client_type !== "externo") {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(0, 0, 0, 0.12)";
                }
              }}
              onMouseLeave={(e) => {
                if (formData.client_type !== "externo") {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 15px rgba(0, 0, 0, 0.08)";
                }
              }}
            >
              <div style={{ fontSize: "50px", marginBottom: "15px" }}></div>
              <h4
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#2d3748",
                }}
              >
                Cliente Externo
              </h4>
              <p
                style={{
                  fontSize: "13px",
                  color: "#666",
                  margin: "0 0 15px 0",
                  lineHeight: "1.4",
                }}
              >
                Para tus clientes finales
              </p>
              {formData.client_type === "externo" && (
                <div
                  style={{
                    color: "#f59e0b",
                    fontSize: "13px",
                    fontWeight: "350",
                    background: "rgba(245, 158, 11, 0.1)",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                  }}
                >
                  Seleccionado
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    if (step === 5) {
      return (
        <div>
          <h2
            style={{
              fontSize: "24px",
              marginBottom: "6px",
              color: "#2d3748",
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            ¿Cuántas conversaciones tienes al mes?
          </h2>
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <p style={{ fontSize: "16px", color: "#666", fontWeight: "400" }}>
              Ayúdanos a estimar la cantidad de conversaciones mensuales con
              WITHMIA
            </p>
          </div>
          <div style={{ marginBottom: "30px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #f7fafc 100%)",
                  borderRadius: "20px",
                  padding: "15px 25px",
                  color: "#d4af37",
                  fontSize: "24px",
                  fontWeight: "bold",
                  minWidth: "120px",
                  textAlign: "center",
                  boxShadow: "0 8px 20px rgba(212, 175, 55, 0.3)",
                  border: "2px solid #d4af37",
                }}
              >
                {formData.monthly_conversations || "1000"}
              </div>
            </div>
            <input
              type="range"
              min="100"
              max="10000"
              step="100"
              value={formData.monthly_conversations || 1000}
              onChange={(e: any) =>
                updateFormData("monthly_conversations", e.target.value)
              }
              style={{
                width: "100%",
                height: "8px",
                borderRadius: "20px",
                background:
                  "linear-gradient(90deg, #f7fafc 0%, #d4af37 50%, #b8860b 100%)",
                outline: "none",
                appearance: "none",
                cursor: "pointer",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "10px",
                fontSize: "12px",
                color: "#666",
              }}
            >
              <span>100</span>
              <span>5,000</span>
              <span>10,000+</span>
            </div>
          </div>
        </div>
      );
    }

    if (step === 6) {
      return (
        <div>
          <h2
            style={{
              fontSize: "24px",
              marginBottom: "6px",
              color: "#2d3748",
              fontWeight: "350",
              textAlign: "center",
            }}
          >
            ¿En qué herramientas usarás WITHMIA?
          </h2>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "8px",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            {[
              {
                value: "whatsapp",
                label: "WhatsApp",
                icon: MessageCircle,
                color: "#25D366",
              },
              {
                value: "instagram",
                label: "Instagram",
                icon: Instagram,
                color: "#E4405F",
              },
              {
                value: "website",
                label: "Página web",
                icon: Globe,
                color: "#4F46E5",
              },
              {
                value: "messenger",
                label: "Messenger",
                icon: Facebook,
                color: "#0084FF",
              },
              { value: "crm", label: "CRM", icon: Database, color: "#059669" },
              {
                value: "woocommerce",
                label: "WooCommerce",
                icon: ShoppingCart,
                color: "#96588A",
              },
              {
                value: "shopify",
                label: "Shopify",
                icon: ShoppingBag,
                color: "#96BF48",
              },
              {
                value: "reservo",
                label: "Reservo",
                icon: Calendar,
                color: "#14B8A6",
                customSvg: (
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center overflow-hidden">
                    <img src="/icons/reservo.webp" alt="Reservo" className="w-4 h-auto object-contain brightness-0 invert" />
                  </div>
                ),
              },
              {
                value: "agendapro",
                label: "AgendaPro",
                icon: Calendar,
                color: "#F97316",
                customSvg: (
                  <img src="/icons/agendapro-icon.svg" alt="AgendaPro" className="w-5 h-5 object-contain" />
                ),
              },
              {
                value: "calendar",
                label: "Google Calendar",
                icon: CalendarDays,
                color: "#1E88E5",
                customSvg: (
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path d="M34 42H14c-4.4 0-8-3.6-8-8V14c0-4.4 3.6-8 8-8h20c4.4 0 8 3.6 8 8v20c0 4.4-3.6 8-8 8z" fill="#FFF"/>
                    <path d="M34 6H14C9.6 6 6 9.6 6 14v20c0 4.4 3.6 8 8 8h20c4.4 0 8-3.6 8-8V14c0-4.4-3.6-8-8-8zm-4 32H18c-2.2 0-4-1.8-4-4V18h20v16c0 2.2-1.8 4-4 4z" fill="#1E88E5"/>
                    <path d="M34 6H14C9.6 6 6 9.6 6 14v4h36v-4c0-4.4-3.6-8-8-8z" fill="#1565C0"/>
                    <circle cx="33" cy="13" r="2" fill="#E53935"/>
                    <circle cx="15" cy="13" r="2" fill="#E53935"/>
                    <path d="M21 23h-3v3h3v-3zm0 5h-3v3h3v-3zm5-5h-3v3h3v-3zm0 5h-3v3h3v-3zm5-5h-3v3h3v-3zm0 5h-3v3h3v-3z" fill="#1565C0"/>
                  </svg>
                ),
              },
              {
                value: "outlook",
                label: "Outlook",
                icon: CalendarDays,
                color: "#0078D4",
                customSvg: (
                  <svg width="20" height="20" viewBox="0 0 32 32">
                    <rect width="32" height="32" rx="6" fill="#0078D4"/>
                    <path d="M19.484 9.937v5.477l1.916 1.205a.076.076 0 00.069 0L28 12.169v-1.794a1.398 1.398 0 00-1.375-1.375h-7.141z" fill="#28A8EA"/>
                    <path d="M19.484 17.457l1.747 1.2a.076.076 0 00.069 0l7.2-4.571v8.539A1.375 1.375 0 0127.125 24H19.484z" fill="#0364B8"/>
                    <path d="M4 7.717v16.946l11.3 2.872a.613.613 0 00.178.025.6.6 0 00.283-.067l.017-.009V4.586L15.48 4.5a.541.541 0 00-.176-.028.606.606 0 00-.293.07z" fill="#0078D4"/>
                    <path d="M10.44 14.932a4.215 4.215 0 011.864-1.213 4.325 4.325 0 013.131.161 4.236 4.236 0 011.713 1.39 4.14 4.14 0 01.67 2.238 4.258 4.258 0 01-.546 2.283 4.282 4.282 0 01-1.67 1.558c-.7.368-1.44.564-2.2.564a4.467 4.467 0 01-2.243-.557 4.232 4.232 0 01-1.614-1.573 4.199 4.199 0 01-.545-2.275 4.107 4.107 0 01.44-1.988 4.174 4.174 0 011-1.588z" fill="#0078D4"/>
                    <ellipse cx="11.5" cy="17.5" rx="2.8" ry="3" fill="white"/>
                  </svg>
                ),
              },
              {
                value: "dropbox",
                label: "Dropbox",
                icon: Cloud,
                color: "#0061FF",
              },
              {
                value: "calendly",
                label: "Calendly",
                icon: CalendarDays,
                color: "#006BFF",
                customSvg: (
                  <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                    <rect width="32" height="32" rx="6" fill="#006BFF"/>
                    <path d="M22.195 17.891c-1.027 1.777-2.88 2.779-4.965 2.779-1.174 0-2.32-.328-3.305-.948a6.453 6.453 0 01-2.395-2.586 6.66 6.66 0 01-.035-6.058 6.39 6.39 0 012.322-2.635A6.239 6.239 0 0117.123 7.5c2.123 0 3.98 1.005 5.003 2.77l3.36-1.93C23.72 5.29 20.695 3.5 17.123 3.5c-1.97 0-3.884.534-5.536 1.545a10.481 10.481 0 00-3.806 4.22 10.708 10.708 0 00.051 9.757 10.494 10.494 0 003.738 4.143A10.175 10.175 0 0017.124 24.7c3.538 0 6.564-1.801 8.36-4.87z" fill="white"/>
                  </svg>
                ),
              },
              {
                value: "mercadolibre",
                label: "Mercado Libre",
                icon: Store,
                color: "#FFE600",
              },
            ].map((tool) => (
              <div
                key={tool.value}
                onClick={() => {
                  const currentTools = formData.tools || [];
                  const isSelected = currentTools.includes(tool.value);
                  if (isSelected) {
                    updateFormData(
                      "tools",
                      currentTools.filter((t) => t !== tool.value)
                    );
                  } else {
                    updateFormData("tools", [...currentTools, tool.value]);
                  }
                }}
                style={{
                  cursor: "pointer",
                  padding: "12px 8px",
                  textAlign: "center",
                  border: (formData.tools || []).includes(tool.value)
                    ? `2px solid ${tool.color}`
                    : "2px solid #f1f5f9",
                  borderRadius: "12px",
                  backgroundColor: (formData.tools || []).includes(tool.value)
                    ? `${tool.color}08`
                    : "white",
                  boxShadow: (formData.tools || []).includes(tool.value)
                    ? `0 4px 20px ${tool.color}25, 0 2px 8px ${tool.color}15`
                    : "0 2px 8px rgba(0, 0, 0, 0.06)",
                  transform: (formData.tools || []).includes(tool.value)
                    ? "translateY(-2px)"
                    : "translateY(0)",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minHeight: "48px",
                  width: "calc(23% - 6px)",
                }}
                onMouseEnter={(e) => {
                  if (!(formData.tools || []).includes(tool.value)) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0, 0, 0, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(formData.tools || []).includes(tool.value)) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(0, 0, 0, 0.06)";
                  }
                }}
              >
                <div style={{ fontSize: "18px", marginBottom: "4px" }}>
                  {(tool as any).customSvg ? (tool as any).customSvg : <tool.icon size={18} color={tool.color} />}
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "350",
                    color: (formData.tools || []).includes(tool.value)
                      ? "#2d3748"
                      : "#4a5568",
                    lineHeight: "1.2",
                  }}
                >
                  {tool.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (step === 7) {
      return (
        <div>
          <h2
            style={{
              fontSize: "24px",
              marginBottom: "6px",
              color: "#2d3748",
              fontWeight: "350",
              textAlign: "center",
            }}
          >
            ¿Cómo conociste WITHMIA?
          </h2>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "8px",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            {[
              {
                value: "google",
                label: "Google",
                icon: Search,
                color: "#4285F4",
              },
              {
                value: "instagram",
                label: "Instagram",
                icon: Instagram,
                color: "#E4405F",
              },
              {
                value: "facebook",
                label: "Facebook",
                icon: Facebook,
                color: "#1877F2",
              },
              {
                value: "whatsapp",
                label: "WhatsApp",
                icon: MessageCircle,
                color: "#25D366",
              },
              {
                value: "amigos",
                label: "Amigos",
                icon: Users,
                color: "#10B981",
              },
              {
                value: "youtube",
                label: "YouTube",
                icon: Play,
                color: "#FF0000",
              },
              {
                value: "tiktok",
                label: "TikTok",
                icon: Video,
                color: "#000000",
              },
              {
                value: "linkedin",
                label: "LinkedIn",
                icon: Linkedin,
                color: "#0A66C2",
              },
              { value: "email", label: "Email", icon: Mail, color: "#6B7280" },
              {
                value: "publicidad",
                label: "Publicidad",
                icon: Target,
                color: "#F59E0B",
              },
              {
                value: "evento",
                label: "Evento",
                icon: Calendar,
                color: "#8B5CF6",
              },
              {
                value: "otro",
                label: "Otro",
                icon: HelpCircle,
                color: "#6B7280",
              },
            ].map((source) => (
              <div
                key={source.value}
                onClick={() => {
                  const currentSources = formData.discovered_via || [];
                  const isSelected = currentSources.includes(source.value);
                  if (isSelected) {
                    updateFormData(
                      "discovered_via",
                      currentSources.filter((s) => s !== source.value)
                    );
                  } else {
                    updateFormData("discovered_via", [
                      ...currentSources,
                      source.value,
                    ]);
                  }
                }}
                style={{
                  cursor: "pointer",
                  padding: "12px 8px",
                  textAlign: "center",
                  border: (formData.discovered_via || []).includes(source.value)
                    ? `2px solid ${source.color}`
                    : "2px solid #f1f5f9",
                  borderRadius: "12px",
                  backgroundColor: (formData.discovered_via || []).includes(
                    source.value
                  )
                    ? `${source.color}08`
                    : "white",
                  boxShadow: (formData.discovered_via || []).includes(
                    source.value
                  )
                    ? `0 4px 20px ${source.color}25, 0 2px 8px ${source.color}15`
                    : "0 2px 8px rgba(0, 0, 0, 0.06)",
                  transform: (formData.discovered_via || []).includes(
                    source.value
                  )
                    ? "translateY(-2px)"
                    : "translateY(0)",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minHeight: "48px",
                  width: "calc(23% - 6px)",
                }}
                onMouseEnter={(e) => {
                  if (!(formData.discovered_via || []).includes(source.value)) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0, 0, 0, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(formData.discovered_via || []).includes(source.value)) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(0, 0, 0, 0.06)";
                  }
                }}
              >
                <div style={{ fontSize: "18px", marginBottom: "4px" }}>
                  <source.icon size={18} color={source.color} />
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "350",
                    color: (formData.discovered_via || []).includes(
                      source.value
                    )
                      ? "#2d3748"
                      : "#4a5568",
                    lineHeight: "1.2",
                  }}
                >
                  {source.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return (
          formData.full_name.trim() &&
          formData.phone.trim() &&
          formData.phone_country
        );
      case 2:
        return formData.company_name.trim();
      case 3:
        return (
          formData.has_website !== undefined &&
          (formData.has_website === false || formData.website.trim())
        );
      case 4:
        return formData.client_type && formData.client_type.trim();
      case 5:
        return formData.monthly_conversations;
      case 6:
        return formData.tools && formData.tools.length > 0;
      case 7:
        return formData.discovered_via && formData.discovered_via.length > 0;
    }
  };

  return (
    <>
      <Head title="Registro" />
      
      {/* Elegant Toast Notification */}
      {notification.show && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            animation: 'slideDown 0.3s ease-out',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 24px',
              borderRadius: '16px',
              background: notification.type === 'success' 
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : notification.type === 'error'
                ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            {notification.type === 'success' && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            )}
            {notification.type === 'error' && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            )}
            {notification.type === 'info' && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            )}
            <span style={{ 
              color: 'white', 
              fontSize: '15px', 
              fontWeight: '500',
              letterSpacing: '-0.01em',
            }}>
              {notification.message}
            </span>
            <button
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '8px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* CSS Animation for toast */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>

      <button
        onClick={() => {
          fetch("/logout", { method: "GET", credentials: "same-origin" })
            .then(() => {
              window.location.href = "/login";
            })
            .catch((err) => {
              window.location.href = "/login";
            });
        }}
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          background: "linear-gradient(145deg, #ffffff, #f0f0f0)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(0, 0, 0, 0.1)",
          borderRadius: "50%",
          width: "28px",
          height: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow:
            "0 8px 16px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
          transition: "all 0.2s ease",
          zIndex: 9999,
          fontSize: "10px",
          color: "#000000",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 2px 12px rgba(0, 0, 0, 0.08)";
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 3V2H2V3H3ZM12.2929 13.7071C12.6834 14.0976 13.3166 14.0976 13.7071 13.7071C14.0976 13.3166 14.0976 12.6834 13.7071 12.2929L12.2929 13.7071ZM4 11V3H2V11H4ZM3 4H11V2H3V4ZM2.29289 3.70711L12.2929 13.7071L13.7071 12.2929L3.70711 2.29289L2.29289 3.70711Z"
            fill="#33363F"
          />
          <path
            d="M4 15V15C4 16.8692 4 17.8038 4.40192 18.5C4.66523 18.9561 5.04394 19.3348 5.5 19.5981C6.19615 20 7.13077 20 9 20H14C16.8284 20 18.2426 20 19.1213 19.1213C20 18.2426 20 16.8284 20 14V9C20 7.13077 20 6.19615 19.5981 5.5C19.3348 5.04394 18.9561 4.66523 18.5 4.40192C17.8038 4 16.8692 4 15 4V4"
            stroke="#33363F"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div
        style={{
          fontFamily:
            '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
          background: getProgressiveBackground(step),
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(5px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow:
              "0 20px 40px rgba(0, 0, 0, 0.12), 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
            padding: "20px",
            borderRadius: "28px",
            textAlign: "center",
            maxWidth: "560px",
            width: "90%",
          }}
        >
          {/* Logo WITHMIA */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "6px",
            }}
          >
            <img
              src="/logo-mia-original.webp?v=2025-withmia"
              alt="WITHMIA Logo"
              style={{ height: "90px", marginBottom: "-1rem" }}
            />
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: "15px" }}>
            <div style={{ textAlign: "center", marginBottom: "15px" }}>
              <h1
                style={{
                  fontSize: "32px",
                  margin: "0",
                  color: "#1b1b18",
                  fontWeight: "450",
                }}
              >
                Registro
              </h1>
              <span style={{ fontSize: "18px", color: "#666" }}>
                Paso {step === 0 ? 1 : step} de 7
              </span>
            </div>
            <div
              style={{
                width: "100%",
                backgroundColor: "#e2e8f0",
                borderRadius: "10px",
                height: "6px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(90deg, #FFD700, #FFA500)",
                  height: "6px",
                  borderRadius: "10px",
                  width: calculateProgress() + "%",
                  transition: "width 0.3s ease",
                }}
              ></div>
            </div>
          </div>

          {/* Content */}
          <div style={{ textAlign: "left" }}>{renderStep()}</div>

          {/* Navigation Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "24px",
            }}
          >
            <button
              onClick={handlePrevious}
              disabled={step === 1}
              style={{
                padding: "15px 24px",
                border: "2px solid #f1f5f9",
                borderRadius: "24px",
                backgroundColor:
                  step === 1
                    ? "rgba(255,255,255,0.5)"
                    : "rgba(255,255,255,0.8)",
                color: step === 1 ? "#a0aec0" : "#4a5568",
                fontSize: "18px",
                fontWeight: "350",
                cursor: step === 1 ? "not-allowed" : "pointer",
                opacity: step === 1 ? 0.5 : 1,
              }}
            >
              Anterior
            </button>
            <button
              onClick={handleNext}
              disabled={!isStepValid() || loading}
              style={{
                padding: "15px 24px",
                background:
                  isStepValid() && !loading
                    ? "linear-gradient(45deg, #FFD700, #FFA500)"
                    : "#e2e8f0",
                color: isStepValid() && !loading ? "white" : "#a0aec0",
                border: "1px solid rgba(0, 0, 0, 0.1)",
                borderRadius: "24px",
                fontSize: "18px",
                fontWeight: "350",
                cursor: isStepValid() && !loading ? "pointer" : "not-allowed",
                boxShadow:
                  isStepValid() && !loading
                    ? "0 4px 15px rgba(255, 165, 0, 0.3)"
                    : "none",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {loading
                ? "Guardando..."
                : step === 7
                ? "Finalizar "
                : "Continuar "}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
