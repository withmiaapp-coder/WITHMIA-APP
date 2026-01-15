import { useState, useCallback, useEffect } from "react";
import {
  BookOpen,
  Upload,
  FileText,
  Edit2,
  Save,
  X,
  Check,
  Loader,
  AlertCircle,
  Trash2,
  Eye,
  RefreshCw,
  Download,
  Building2,
  Globe,
  Users,
  Sparkles,
} from "lucide-react";

interface OnboardingData {
  company_name: string;
  company_description: string;
  has_website: boolean;
  website: string;
  client_type: "interno" | "externo" | null;
}

interface Document {
  id: string;
  filename: string;
  category: string;
  uploaded_at: string;
  chunks_created?: number;
}

interface ConocimientosProps {
  user: any;
  company: any;
  onboardingData?: OnboardingData;
}

const CATEGORIES = [
  {
    id: "historia",
    label: "Historia de la Empresa",
    icon: Building2,
    color: "blue",
  },
  {
    id: "producto",
    label: "Productos y Servicios",
    icon: Sparkles,
    color: "purple",
  },
  {
    id: "informacion",
    label: "Información General",
    icon: FileText,
    color: "cyan",
  },
  {
    id: "desarrollo",
    label: "Desarrollo y Procesos",
    icon: Users,
    color: "green",
  },
];

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
];
const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".docx", ".md"];

export default function Conocimientos({
  user,
  company,
  onboardingData: initialOnboarding,
}: ConocimientosProps) {
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
  const [selectedCategory, setSelectedCategory] = useState("historia");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [pollingIntervals, setPollingIntervals] = useState<{
    [key: string]: NodeJS.Timeout;
  }>({});

  // Fetch onboarding data on mount
  useEffect(() => {
    fetchOnboardingData();
  }, []);

  // Fetch documents on mount and category change
  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory]);

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

  const fetchDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const companyId = company?.id || user?.company_id;
      const response = await fetch(
        `/api/documents?company_id=${companyId}&category=${selectedCategory}`
      );
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const startPollingForVectorIds = (filename: string, companySlug: string) => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 5 minutes (60 * 5 seconds)
    
    const intervalId = setInterval(async () => {
      attempts++;
      
      try {
        // Fetch documents to check if vector_ids are populated (using company_slug)
        const response = await fetch(`/api/documents?company_slug=${companySlug}&category=${selectedCategory}`);
        const data = await response.json();
        
        if (data.success) {
          const doc = data.documents.find((d: Document) => d.filename === filename);
          
          if (doc && doc.qdrant_vector_ids && doc.qdrant_vector_ids !== 'null') {
            console.log('✅ Vector IDs disponibles para:', filename);
            clearInterval(intervalId);
            setPollingIntervals(prev => {
              const newIntervals = { ...prev };
              delete newIntervals[filename];
              return newIntervals;
            });
            // Refresh documents list
            await fetchDocuments();
          } else if (attempts >= maxAttempts) {
            console.warn('⏱️ Timeout esperando vector IDs para:', filename);
            clearInterval(intervalId);
            setPollingIntervals(prev => {
              const newIntervals = { ...prev };
              delete newIntervals[filename];
              return newIntervals;
            });
          }
        }
      } catch (error) {
        console.error('Error en polling:', error);
      }
    }, 5000); // Poll every 5 seconds
    
    setPollingIntervals(prev => ({ ...prev, [filename]: intervalId }));
  };

  const handleSaveOnboarding = async () => {
    setSavingOnboarding(true);
    try {
      // Obtener CSRF token
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      
      const response = await fetch("/api/onboarding-data", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": token
        },
        body: JSON.stringify(onboardingData),
      });
      const data = await response.json();
      if (data.success) {
        setEditingOnboarding(false);
      } else {
        alert("Error al guardar: " + (data.error || "Intente nuevamente"));
      }
    } catch (error) {
      alert("Error de conexión");
      console.error(error);
    } finally {
      setSavingOnboarding(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const uploadDocument = async (file: File, category: string) => {
    const fileId = `${file.name}-${Date.now()}`;
    setUploadingFiles((prev) => [...prev, fileId]);
    setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

    try {
      const base64Content = await fileToBase64(file);

      setUploadProgress((prev) => ({ ...prev, [fileId]: 50 }));

      // Usar company_slug para la colección de Qdrant
      const companySlug = company?.slug || user?.company_slug || 'default';
      const collectionName = `company_${companySlug.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}_knowledge`;
      console.log('Company Slug:', companySlug, 'Collection:', collectionName, 'Company:', company, 'User:', user);
      
      setUploadProgress((prev) => ({ ...prev, [fileId]: 60 }));

      // Save metadata to PostgreSQL FIRST (fast, 1-2 seconds) - temporary entry
      const metadataResponse = await fetch("/api/documents/metadata", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({
          filename: file.name,
          category: category,
          chunks_created: 0, // Will be updated later by n8n response
          qdrant_collection: collectionName,
          qdrant_vector_ids: null // Will be updated when n8n finishes
        }),
      });

      if (!metadataResponse.ok) {
        throw new Error("Failed to save metadata to database");
      }

      setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));

      // Obtener URL del webhook RAG desde la empresa o usar el default
      const ragWebhookUrl = company?.settings?.rag_webhook_url || 
        `https://n8n-production-dace.up.railway.app/webhook/rag-${companySlug}`;

      // Process with n8n in background (fire and forget)
      const requestBody = {
        company_slug: companySlug,
        category: category,
        filename: file.name,
        file: base64Content,
      };
      console.log('📤 Enviando a n8n RAG:', ragWebhookUrl, requestBody);
      
      // Fire n8n processing - it will respond immediately
      fetch(ragWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })
      .then(res => res.json())
      .then(data => {
        console.log('✅ n8n RAG webhook respondió:', data);
        // n8n responded immediately, now it's processing in background
        // Start polling to check when vector_ids are ready
        startPollingForVectorIds(file.name, companySlug);
      })
      .catch(err => {
        console.error('Error iniciando procesamiento RAG:', err);
      });

      // Refresh documents list
      await fetchDocuments();
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((id) => id !== fileId));
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }, 1000);
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(`Error al subir ${file.name}: ${error.message}`);
      setUploadingFiles((prev) => prev.filter((id) => id !== fileId));
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => {
        if (
          ALLOWED_FILE_TYPES.includes(file.type) ||
          ALLOWED_EXTENSIONS.some((ext) =>
            file.name.toLowerCase().endsWith(ext)
          )
        ) {
          uploadDocument(file, selectedCategory);
        } else {
          alert(
            `Archivo ${file.name} no es soportado. Solo se permiten: PDF, TXT, DOCX, MD`
          );
        }
      });
    },
    [selectedCategory]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (
        ALLOWED_FILE_TYPES.includes(file.type) ||
        ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
      ) {
        uploadDocument(file, selectedCategory);
      } else {
        alert(
          `Archivo ${file.name} no es soportado. Solo se permiten: PDF, TXT, DOCX, MD`
        );
      }
    });
    e.target.value = "";
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm("¿Estás seguro de eliminar este documento?")) return;

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      if (data.success) {
        await fetchDocuments();
      } else {
        alert("Error al eliminar: " + (data.error || "Intente nuevamente"));
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Error al eliminar el documento");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl shadow-lg">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Conocimientos</h1>
          <p className="text-sm text-neutral-500">
            Base de conocimiento y documentación de tu empresa
          </p>
        </div>
      </div>

      {/* Grid for side-by-side sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Onboarding Data Section */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-cyan-600" />
            <h2 className="text-2xl font-bold text-neutral-800">
              Información de tu Empresa
            </h2>
          </div>
          {!editingOnboarding ? (
            <button
              onClick={() => setEditingOnboarding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-700 rounded-lg hover:bg-cyan-100 transition-colors"
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
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
                <div className="flex items-center gap-2">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
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
                    className="text-cyan-600 hover:underline"
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
          <div className="md:col-span-2">
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
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            ) : (
              <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800 whitespace-pre-wrap">
                {onboardingData.company_description || "No especificada"}
              </p>
            )}
          </div>

          {/* Client Type */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Tipo de Cliente
            </label>
            {editingOnboarding ? (
              <div className="flex gap-4">
                <button
                  onClick={() =>
                    setOnboardingData((prev) => ({
                      ...prev,
                      client_type: "interno",
                    }))
                  }
                  className={`flex-1 px-6 py-4 border-2 rounded-lg transition-all ${
                    onboardingData.client_type === "interno"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">­</div>
                    <div className="font-semibold">Cliente Interno</div>
                    <div className="text-sm text-gray-500">
                      Para equipos de tu empresa
                    </div>
                  </div>
                </button>
                <button
                  onClick={() =>
                    setOnboardingData((prev) => ({
                      ...prev,
                      client_type: "externo",
                    }))
                  }
                  className={`flex-1 px-6 py-4 border-2 rounded-lg transition-all ${
                    onboardingData.client_type === "externo"
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">­</div>
                    <div className="font-semibold">Cliente Externo</div>
                    <div className="text-sm text-gray-500">
                      Para tus clientes finales
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              <div
                className={`px-4 py-3 rounded-lg ${
                  onboardingData.client_type === "interno"
                    ? "bg-green-50 text-green-700"
                    : onboardingData.client_type === "externo"
                    ? "bg-orange-50 text-orange-700"
                    : "bg-gray-50 text-gray-800"
                }`}
              >
                {onboardingData.client_type === "interno"
                  ? "­ Cliente Interno - Para equipos de tu empresa"
                  : onboardingData.client_type === "externo"
                  ? "­ Cliente Externo - Para tus clientes finales"
                  : "No especificado"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Upload Section */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="w-6 h-6 text-cyan-600" />
          <h2 className="text-2xl font-bold text-neutral-800">
            Subir Documentos
          </h2>
        </div>

        {/* Category Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Icon
                  className={`w-6 h-6 mx-auto mb-2 ${
                    isSelected ? "text-cyan-600" : "text-gray-400"
                  }`}
                />
                <div
                  className={`text-sm font-medium text-center ${
                    isSelected ? "text-cyan-700" : "text-gray-600"
                  }`}
                >
                  {cat.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
            isDragging
              ? "border-cyan-500 bg-cyan-50"
              : "border-gray-300 hover:border-gray-400 bg-gray-50"
          }`}
        >
          <Upload
            className={`w-16 h-16 mx-auto mb-4 ${
              isDragging ? "text-cyan-500" : "text-gray-400"
            }`}
          />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Arrastra archivos aquí o haz clic para seleccionar
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Tipos soportados: PDF, TXT, DOCX, MD (máximo 10MB)
          </p>
          <label className="inline-block px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 cursor-pointer transition-colors">
            Seleccionar Archivos
            <input
              type="file"
              multiple
              accept=".pdf,.txt,.docx,.md"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>

        {/* Upload Progress */}
        {uploadingFiles.length > 0 && (
          <div className="mt-6 space-y-3">
            {uploadingFiles.map((fileId) => (
              <div key={fileId} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {fileId.split("-")[0]}
                  </span>
                  <span className="text-sm text-gray-500">
                    {uploadProgress[fileId] || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress[fileId] || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </div>
      {/* Documents List */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-cyan-600" />
          <h2 className="text-2xl font-bold text-neutral-800">
            Documentos Subidos
          </h2>
          <button
            onClick={fetchDocuments}
            disabled={loadingDocuments}
            className="ml-auto p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-600 ${
                loadingDocuments ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>

        {loadingDocuments ? (
          <div className="text-center py-12">
            <Loader className="w-12 h-12 mx-auto text-cyan-500 animate-spin mb-4" />
            <p className="text-gray-500">Cargando documentos...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay documentos en esta categoría</p>
            <p className="text-sm text-gray-400">
              Sube tu primer documento para comenzar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <FileText className="w-8 h-8 text-cyan-600" />
                  <div>
                    <p className="font-medium text-gray-800">{doc.filename}</p>
                    <p className="text-sm text-gray-500">
                      Subido:{" "}
                      {new Date(doc.uploaded_at).toLocaleDateString("es-ES")}
                      {doc.chunks_created &&
                        ` ÔÇó ${doc.chunks_created} fragmentos`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
