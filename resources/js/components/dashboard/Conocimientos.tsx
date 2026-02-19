import { useState, useCallback, useEffect } from "react";
import debugLog from '@/utils/debugLogger';
import {
  BookOpen,
  Upload,
  FileText,
  Loader,
  Trash2,
  Building2,
  Users,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Brain,
  Database,
  Edit3,
  Eye,
  X,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Document {
  id: string;
  filename: string;
  category: string;
  uploaded_at: string;
  chunks_created?: number;
}

interface QdrantPoint {
  id: string | number;
  payload: Record<string, any>;
  vector?: number[];
}

interface ConocimientosProps {
  user: any;
  company: any;
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
}: ConocimientosProps) {
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Qdrant points state
  const [qdrantPoints, setQdrantPoints] = useState<QdrantPoint[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [qdrantCollection, setQdrantCollection] = useState<string>('');
  const [selectedPoint, setSelectedPoint] = useState<QdrantPoint | null>(null);
  const [editingPoint, setEditingPoint] = useState<QdrantPoint | null>(null);
  const [editPayload, setEditPayload] = useState<string>('');
  const [savingPoint, setSavingPoint] = useState(false);
  const [deletingPointId, setDeletingPointId] = useState<string | number | null>(null);
  const [expandedPointId, setExpandedPointId] = useState<string | number | null>(null);

  // Fetch documents on mount and category change
  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory]);

  // Fetch Qdrant points on mount
  useEffect(() => {
    fetchQdrantPoints();
  }, []);

  const fetchQdrantPoints = async () => {
    setLoadingPoints(true);
    try {
      const response = await fetch('/api/qdrant/points?limit=100', {
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      });
      const data = await response.json();
      if (data.success) {
        setQdrantPoints(data.points || []);
        setQdrantCollection(data.collection || '');
      }
    } catch (error) {
      debugLog.error('Error fetching Qdrant points:', error);
    } finally {
      setLoadingPoints(false);
    }
  };

  const deleteQdrantPoint = async (pointId: string | number) => {
    setDeletingPointId(pointId);
    try {
      const response = await fetch(`/api/qdrant/points/${pointId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      });
      const data = await response.json();
      if (data.success) {
        setQdrantPoints(prev => prev.filter(p => p.id !== pointId));
        if (selectedPoint?.id === pointId) setSelectedPoint(null);
        if (editingPoint?.id === pointId) setEditingPoint(null);
      } else {
        alert('Error al eliminar punto: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      debugLog.error('Error deleting Qdrant point:', error);
      alert('Error al eliminar punto');
    } finally {
      setDeletingPointId(null);
    }
  };

  const startEditingPoint = (point: QdrantPoint) => {
    setEditingPoint(point);
    // Solo mostrar el texto, no el JSON completo
    const textContent = point.payload?.text || point.payload?.content || '';
    setEditPayload(textContent);
  };

  const savePointPayload = async () => {
    if (!editingPoint) return;
    
    setSavingPoint(true);
    try {
      // Mantener el payload original pero actualizar solo el texto
      const updatedPayload = {
        ...editingPoint.payload,
        text: editPayload,
        content: editPayload
      };
      const response = await fetch(`/api/qdrant/points/${editingPoint.id}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({ payload: updatedPayload })
      });
      const data = await response.json();
      if (data.success) {
        setQdrantPoints(prev => prev.map(p => 
          p.id === editingPoint.id ? { ...p, payload: updatedPayload } : p
        ));
        setEditingPoint(null);
        setEditPayload('');
      } else {
        alert('Error al guardar: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      debugLog.error('Error saving point:', error);
      alert('Error al guardar los cambios.');
    } finally {
      setSavingPoint(false);
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
      debugLog.error("Error fetching documents:", error);
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
            clearInterval(intervalId);
            setPollingIntervals(prev => {
              const newIntervals = { ...prev };
              delete newIntervals[filename];
              return newIntervals;
            });
            // Refresh documents list
            await fetchDocuments();
          } else if (attempts >= maxAttempts) {
            clearInterval(intervalId);
            setPollingIntervals(prev => {
              const newIntervals = { ...prev };
              delete newIntervals[filename];
              return newIntervals;
            });
          }
        }
      } catch (error) {
        debugLog.error('Error en polling:', error);
      }
    }, 5000); // Poll every 5 seconds
    
    setPollingIntervals(prev => ({ ...prev, [filename]: intervalId }));
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

      // Get auth token from URL
      const urlParams = new URLSearchParams(window.location.search);
      const authToken = urlParams.get('auth_token') || '';

      // Process with n8n through Laravel proxy (avoids CORS issues)
      const requestBody = {
        category: category,
        filename: file.name,
        file: base64Content,
      };
      
      // Send to Laravel proxy which forwards to n8n
      fetch(`/api/documents/process-rag${authToken ? `?auth_token=${authToken}` : ''}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Railway-Auth-Token": authToken,
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify(requestBody),
      })
      .then(res => res.json())
      .then(data => {
        // n8n responded, now it's processing in background
        // Start polling to check when vector_ids are ready
        startPollingForVectorIds(file.name, companySlug);
      })
      .catch(err => {
        debugLog.error('Error iniciando procesamiento RAG:', err);
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
      debugLog.error("Upload error:", error);
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

  const openDeleteModal = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDocumentToDelete(null);
  };

  const deleteDocument = async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/documents/${documentToDelete.id}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        await fetchDocuments();
        closeDeleteModal();
      } else {
        alert("Error al eliminar: " + (data.error || "Intente nuevamente"));
      }
    } catch (error) {
      debugLog.error("Error deleting document:", error);
      alert("Error al eliminar el documento. Por favor intente nuevamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
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

      {/* Brain Illustration with Orbits + Qdrant Points Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
        {/* Left: Brain with Orbits */}
        <div className="flex flex-col items-center justify-center">
          <div
            className="relative w-72 h-72"
            style={{ perspective: '800px' }}
          >
            {/* Back half of orbits (behind brain) */}
            <div className="absolute inset-4">
              {/* Orbit 1 back */}
              <div
                className="absolute inset-0 border-[3px] border-cyan-400 rounded-full opacity-50"
                style={{
                  transform: 'rotateX(70deg)',
                  clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)'
                }}
              />
              {/* Orbit 2 back */}
              <div
                className="absolute inset-0 border-[3px] border-cyan-400 rounded-full opacity-50"
                style={{
                  transform: 'rotateX(70deg) rotateY(60deg)',
                  clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)'
                }}
              />
              {/* Orbit 3 back */}
              <div
                className="absolute inset-0 border-[3px] border-cyan-400 rounded-full opacity-50"
                style={{
                  transform: 'rotateX(70deg) rotateY(-60deg)',
                  clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)'
                }}
              />
            </div>

            {/* Brain Image - centered */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <img
                src="/images/brain organ-pana.svg"
                alt="Cerebro - Conocimientos"
                className="w-48 h-48 object-contain"
              />
            </div>

            {/* Front half of orbits (in front of brain) */}
            <div className="absolute inset-4 z-20">
              {/* Orbit 1 front */}
              <div
                className="absolute inset-0 border-[3px] border-cyan-400 rounded-full opacity-50"
                style={{
                  transform: 'rotateX(70deg)',
                  clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)'
                }}
              />
              {/* Orbit 2 front */}
              <div
                className="absolute inset-0 border-[3px] border-cyan-400 rounded-full opacity-50"
                style={{
                  transform: 'rotateX(70deg) rotateY(60deg)',
                  clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)'
                }}
              />
              {/* Orbit 3 front */}
              <div
                className="absolute inset-0 border-[3px] border-cyan-400 rounded-full opacity-50"
                style={{
                  transform: 'rotateX(70deg) rotateY(-60deg)',
                  clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)'
                }}
              />
            </div>

            {/* Orbiting electrons (documents) */}
            {documents.slice(0, 3).map((doc, index) => (
              <div
                key={doc.id}
                className="absolute inset-4 z-30"
                style={{
                  animation: `orbit${index + 1} ${8 + index * 2}s linear infinite`,
                  transform: index === 0 ? 'rotateX(70deg)' :
                             index === 1 ? 'rotateX(70deg) rotateY(60deg)' :
                             'rotateX(70deg) rotateY(-60deg)'
                }}
              >
                <div
                  className="absolute w-4 h-4 bg-cyan-500 rounded-full shadow-lg"
                  style={{
                    top: '0%',
                    left: '50%',
                    marginLeft: '-8px',
                    marginTop: '-8px',
                    boxShadow: '0 0 10px rgba(6, 182, 212, 0.8), 0 0 20px rgba(6, 182, 212, 0.4)'
                  }}
                  title={doc.filename}
                />
              </div>
            ))}

            {/* Uploading indicator */}
            {uploadingFiles.length > 0 && (
              <div
                className="absolute inset-4 z-30"
                style={{
                  animation: 'orbit1 3s linear infinite',
                  transform: 'rotateX(70deg)'
                }}
              >
                <div
                  className="absolute w-4 h-4 bg-yellow-400 rounded-full animate-pulse"
                  style={{
                    top: '0%',
                    left: '50%',
                    marginLeft: '-8px',
                    marginTop: '-8px',
                    boxShadow: '0 0 10px rgba(250, 204, 21, 0.8)'
                  }}
                />
              </div>
            )}
          </div>

          {/* Keyframes for orbit animations */}
          <style>{`
            @keyframes orbit1 {
              from { transform: rotateX(70deg) rotateZ(0deg); }
              to { transform: rotateX(70deg) rotateZ(360deg); }
            }
            @keyframes orbit2 {
              from { transform: rotateX(70deg) rotateY(60deg) rotateZ(0deg); }
              to { transform: rotateX(70deg) rotateY(60deg) rotateZ(360deg); }
            }
            @keyframes orbit3 {
              from { transform: rotateX(70deg) rotateY(-60deg) rotateZ(0deg); }
              to { transform: rotateX(70deg) rotateY(-60deg) rotateZ(360deg); }
            }
          `}</style>
        </div>

        {/* Right: Memory Panel */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-lg flex flex-col max-h-[400px]">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5 text-cyan-600" />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-neutral-800">Memoria de WITHMIA</h3>
              <p className="text-xs text-neutral-400">
                Fragmentos de conocimiento almacenados
              </p>
            </div>
            <button
              onClick={fetchQdrantPoints}
              disabled={loadingPoints}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refrescar"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${loadingPoints ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Edit Fragment Modal */}
          {editingPoint && (
            <div className="mb-4 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-cyan-800">
                  Editando fragmento
                </span>
                <button
                  onClick={() => { setEditingPoint(null); setEditPayload(''); }}
                  className="p-1 hover:bg-cyan-100 rounded"
                >
                  <X className="w-4 h-4 text-cyan-600" />
                </button>
              </div>
              <textarea
                value={editPayload}
                onChange={(e) => setEditPayload(e.target.value)}
                className="w-full h-40 text-sm p-3 border border-cyan-200 rounded bg-white text-gray-800 resize-none leading-relaxed"
                placeholder="Escribe aquí el contenido del fragmento de conocimiento..."
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setEditingPoint(null); setEditPayload(''); }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={savePointPayload}
                  disabled={savingPoint}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  {savingPoint ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span className="ml-1">Guardar</span>
                </Button>
              </div>
            </div>
          )}

          {/* Fragments List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {loadingPoints ? (
              <div className="text-center py-6">
                <Loader className="w-8 h-8 mx-auto text-cyan-500 animate-spin mb-2" />
                <p className="text-gray-500 text-sm">Cargando memoria...</p>
              </div>
            ) : qdrantPoints.length === 0 ? (
              <div className="text-center py-6">
                <Brain className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">WITHMIA aún no tiene memoria</p>
                <p className="text-xs text-gray-400">Sube documentos para que aprenda</p>
              </div>
            ) : (
              qdrantPoints.map((point) => {
                const isExpanded = expandedPointId === point.id;
                const content = point.payload?.text || point.payload?.content || '';
                
                // Determinar la fuente de forma amigable
                let source = 'Sin fuente';
                const type = point.payload?.type || '';
                const filename = point.payload?.filename || point.payload?.source || '';
                const category = point.payload?.category || '';
                
                if (filename) {
                  source = filename;
                } else if (type === 'chat_training' || type === 'training' || category === 'training') {
                  source = 'Entrenamiento de chat';
                } else if (type === 'company_info' || type === 'onboarding' || category === 'company_onboarding') {
                  source = 'Información de empresa';
                } else if (type) {
                  // Capitalizar el type como fallback
                  source = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                } else if (category) {
                  source = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                }
                
                return (
                  <div
                    key={point.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-cyan-200 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => setExpandedPointId(isExpanded ? null : point.id)}
                        className="p-1 hover:bg-gray-200 rounded mt-0.5"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate font-medium" title={source}>
                            {source.length > 25 ? source.slice(0, 25) + '...' : source}
                          </span>
                        </div>
                        {isExpanded && (
                          <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border max-h-32 overflow-y-auto">
                            <pre className="whitespace-pre-wrap font-mono text-[11px]">
                              {content ? content.slice(0, 500) + (content.length > 500 ? '...' : '') : 'Sin contenido de texto'}
                            </pre>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditingPoint(point)}
                          className="p-1.5 hover:bg-cyan-100 text-cyan-600 rounded transition-colors"
                          title="Editar contenido"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteQdrantPoint(point.id)}
                          disabled={deletingPointId === point.id}
                          className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors"
                          title="Eliminar fragmento"
                        >
                          {deletingPointId === point.id ? (
                            <Loader className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {qdrantPoints.length > 0 && (
            <div className="mt-3 pt-3 border-t text-xs text-gray-400 text-center">
              {qdrantPoints.length} fragmento{qdrantPoints.length !== 1 ? 's' : ''} de conocimiento
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Document Upload Section */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <Upload className="w-6 h-6 text-cyan-600" />
            <h2 className="text-xl font-bold text-neutral-800">
              Subir Documentos
            </h2>
          </div>

          {/* Category Selector - 4 columns for better layout */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-cyan-500 bg-cyan-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mx-auto mb-1 ${
                      isSelected ? "text-cyan-600" : "text-gray-400"
                    }`}
                  />
                  <div
                    className={`text-xs font-medium text-center ${
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
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragging
                ? "border-cyan-500 bg-cyan-50"
                : "border-gray-300 hover:border-gray-400 bg-gray-50"
            }`}
          >
            <Upload
              className={`w-12 h-12 mx-auto mb-3 ${
                isDragging ? "text-cyan-500" : "text-gray-400"
              }`}
            />
            <p className="text-sm font-medium text-gray-700 mb-1">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Tipos soportados: PDF, TXT, DOCX, MD (máximo 10MB)
            </p>
            <label className="inline-block px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 cursor-pointer transition-colors">
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
            <div className="mt-4 space-y-2">
              {uploadingFiles.map((fileId) => (
                <div key={fileId} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">
                      {fileId.split("-")[0]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {uploadProgress[fileId] || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-cyan-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress[fileId] || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Documents List */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-cyan-600" />
            <h2 className="text-xl font-bold text-neutral-800">
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

          <div className="flex-1 min-h-[300px]">
            {loadingDocuments ? (
              <div className="text-center py-8">
                <Loader className="w-10 h-10 mx-auto text-cyan-500 animate-spin mb-3" />
                <p className="text-gray-500 text-sm">Cargando documentos...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No hay documentos en esta categoría</p>
                <p className="text-xs text-gray-400">
                  Sube tu primer documento para comenzar
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-6 h-6 text-cyan-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{doc.filename}</p>
                        <p className="text-xs text-gray-500">
                          Subido:{" "}
                          {new Date(doc.uploaded_at).toLocaleDateString("es-ES")}
                          {doc.chunks_created &&
                            ` • ${doc.chunks_created} fragmentos`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openDeleteModal(doc)}
                      className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex-shrink-0"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <DialogTitle>Eliminar documento</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              ¿Estás seguro de que deseas eliminar <strong>"{documentToDelete?.filename}"</strong>? 
              Esta acción no se puede deshacer y también eliminará los embeddings asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeDeleteModal}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={deleteDocument}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
