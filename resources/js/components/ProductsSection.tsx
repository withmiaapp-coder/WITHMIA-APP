import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  List,
  RefreshCw,
  Trash2,
  Edit3,
  ExternalLink,
  X,
  Check,
  Loader2,
  AlertCircle,
  Database,
  Image as ImageIcon,
  Tag,
  Box,
  LayoutGrid,
  Upload,
  DollarSign,
  GripVertical,
} from 'lucide-react';

// ====== TYPES ======
interface Product {
  id: number;
  provider: string;
  external_id: string | null;
  name: string;
  description: string | null;
  price: number | null;
  compare_at_price: number | null;
  currency: string;
  sku: string | null;
  stock_quantity: number | null;
  stock_status: string;
  category: string | null;
  images: string[] | null;
  attributes: Record<string, string> | null;
  variants: { id?: number; name?: string; price?: number | null; sku?: string | null; [key: string]: unknown }[] | null;
  url: string | null;
  brand: string | null;
  weight: number | null;
  is_active: boolean;
  synced_at: string | null;
  created_at: string;
}

interface Props {
  user: { id?: number; name?: string };
  company?: { id?: number; name?: string };
}

// ====== HELPERS ======
function getAuthHeaders(): Record<string, string> {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('auth_token') || '';
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Railway-Auth': token,
  };
}

async function apiFetch(url: string, options: RequestInit = {}) {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('auth_token') || '';
  const separator = url.includes('?') ? '&' : '?';
  const fullUrl = `${url}${separator}auth_token=${token}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
    credentials: 'include',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`API Error ${res.status}: ${errorBody}`);
  }
  return res.json();
}

const PROVIDER_CONFIG: Record<string, { name: string; color: string; icon: string }> = {
  manual: { name: 'Manual', color: '#6366f1', icon: 'edit' },
  woocommerce: { name: 'WooCommerce', color: '#96588A', icon: 'woo' },
  shopify: { name: 'Shopify', color: '#96BF48', icon: 'shopify' },
  mercadolibre: { name: 'MercadoLibre', color: '#FFE600', icon: 'ml' },
  custom_api: { name: 'API Personalizada', color: '#0ea5e9', icon: 'api' },
};

function formatPrice(price: number | null, currency: string): string {
  if (price === null || price === undefined) return 'Sin precio';
  const symbol = { USD: 'US$', EUR: '€', CLP: '$', ARS: 'AR$', MXN: 'MX$', BRL: 'R$' }[currency] || '$';
  if (currency === 'CLP') return `${symbol}${Math.round(price).toLocaleString('es-CL')}`;
  return `${symbol}${price.toLocaleString('es-CL', { minimumFractionDigits: 2 })}`;
}

function getStockLabel(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'in_stock': return { label: 'En stock', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    case 'out_of_stock': return { label: 'Agotado', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
    case 'on_backorder': return { label: 'Por encargo', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    default: return { label: status, color: 'text-neutral-500', bg: 'bg-slate-50 border-slate-200' };
  }
}

// ====== MAIN COMPONENT ======
export default function ProductsSection({ user, company }: Props) {
  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Filters & View
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categories, setCategories] = useState<string[]>([]);

  // Stats
  const [totalProducts, setTotalProducts] = useState(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Errors
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ====== LOAD DATA ======
  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedProvider) params.set('provider', selectedProvider);
      params.set('per_page', '100');

      const data = await apiFetch(`/api/products?${params.toString()}`);
      setProducts(data.products || []);
      setCategories(data.stats?.categories || []);
      setTotalProducts(data.stats?.total || 0);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Error al cargar productos');
    } finally {
      setLoadingProducts(false);
    }
  }, [searchQuery, selectedCategory, selectedProvider]);

  useEffect(() => {
    loadProducts().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) loadProducts();
  }, [searchQuery, selectedCategory, selectedProvider]);

  // Auto-clear success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // ====== PRODUCT CRUD ======
  const handleCreateProduct = useCallback(async (data: Partial<Product>) => {
    try {
      const result = await apiFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (result.success) {
        setShowCreateModal(false);
        setSuccessMsg('Producto creado');
        await loadProducts();
      }
    } catch (err) {
      setError('Error al crear producto');
    }
  }, [loadProducts]);

  const handleUpdateProduct = useCallback(async (id: number, data: Partial<Product>) => {
    try {
      const result = await apiFetch(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (result.success) {
        setEditingProduct(null);
        setSuccessMsg('Producto actualizado');
        await loadProducts();
      }
    } catch (err) {
      setError('Error al actualizar producto');
    }
  }, [loadProducts]);

  const handleDeleteProduct = useCallback(async (id: number) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
      setSelectedProduct(null);
      setSuccessMsg('Producto eliminado');
      await loadProducts();
    } catch (err) {
      setError('Error al eliminar producto');
    }
  }, [loadProducts]);

  // ====== LOADING ======
  if (loading) {
    return (
      <div className="min-h-[700px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Cargando productos...</span>
        </div>
      </div>
    );
  }

  // ====== RENDER ======
  return (
    <div className="min-h-[700px] flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="px-6 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-neutral-800">Productos</h1>
                <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[11px] font-semibold text-neutral-500">
                  {totalProducts}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">Catálogo de productos y servicios para WITHMIA</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => loadProducts()}
              disabled={loadingProducts}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingProducts ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuevo producto</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2 mt-2.5">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-neutral-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm text-neutral-700 placeholder:text-neutral-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none"
            />
          </div>

          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-neutral-600 bg-white focus:border-orange-400 outline-none min-w-[130px]"
            >
              <option value="">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          <select
            value={selectedProvider}
            onChange={e => setSelectedProvider(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-neutral-600 bg-white focus:border-orange-400 outline-none min-w-[130px]"
          >
            <option value="">Todos los orígenes</option>
            <option value="manual">Manual</option>
            <option value="woocommerce">WooCommerce</option>
            <option value="shopify">Shopify</option>
            <option value="mercadolibre">MercadoLibre</option>
            <option value="custom_api">API Personalizada</option>
          </select>

          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successMsg && (
        <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span className="text-xs text-emerald-700 flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {error && (
        <div className="mx-4 mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-700 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Products Content */}
      <div className="flex-1 overflow-auto p-4">
        {products.length === 0 && !loadingProducts ? (
          <EmptyState
            hasFilters={!!searchQuery || !!selectedCategory || !!selectedProvider}
            onCreateProduct={() => setShowCreateModal(true)}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => setSelectedProduct(product)}
                onEdit={() => setEditingProduct(product)}
                onDelete={() => handleDeleteProduct(product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {products.map(product => (
              <ProductListItem
                key={product.id}
                product={product}
                onClick={() => setSelectedProduct(product)}
                onEdit={() => setEditingProduct(product)}
                onDelete={() => handleDeleteProduct(product.id)}
              />
            ))}
          </div>
        )}

        {loadingProducts && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <ProductFormModal
          onSubmit={handleCreateProduct}
          onClose={() => setShowCreateModal(false)}
          categories={categories}
        />
      )}

      {editingProduct && (
        <ProductFormModal
          product={editingProduct}
          onSubmit={(data) => handleUpdateProduct(editingProduct.id, data)}
          onClose={() => setEditingProduct(null)}
          categories={categories}
        />
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onEdit={() => { setSelectedProduct(null); setEditingProduct(selectedProduct); }}
          onDelete={() => handleDeleteProduct(selectedProduct.id)}
        />
      )}

    </div>
  );
}

// ====== PRODUCT CARD (Grid) ======
function ProductCard({ product, onClick, onEdit, onDelete }: {
  product: Product;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const firstImage = product.images?.[0];
  const stock = getStockLabel(product.stock_status);
  const providerConfig = PROVIDER_CONFIG[product.provider] || PROVIDER_CONFIG.manual;
  const hasDiscount = product.compare_at_price && product.compare_at_price > (product.price || 0);
  const discountPct = hasDiscount ? Math.round((1 - (product.price || 0) / product.compare_at_price!) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-orange-200 transition-all cursor-pointer group"
    >
      {/* Image */}
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        {firstImage ? (
          <img src={firstImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-slate-200" />
          </div>
        )}

        {/* Provider badge */}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide text-white shadow-sm"
          style={{ backgroundColor: providerConfig.color }}>
          {providerConfig.name}
        </div>

        {/* Discount badge */}
        {hasDiscount && discountPct > 0 && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-red-500 text-white rounded-md text-[10px] font-bold shadow-sm">
            -{discountPct}%
          </div>
        )}

        {/* Quick actions */}
        <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm hover:bg-white transition-colors">
            <Edit3 className="w-3 h-3 text-neutral-600" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm hover:bg-red-50 transition-colors">
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <h4 className="text-[12px] font-semibold text-neutral-800 leading-tight line-clamp-2 mb-1">{product.name}</h4>

        {product.category && (
          <p className="text-[10px] text-neutral-400 mb-1.5 truncate">{product.category}</p>
        )}

        <div className="flex items-end justify-between gap-1">
          <div>
            <p className="text-[14px] font-bold text-neutral-900">{formatPrice(product.price, product.currency)}</p>
            {hasDiscount && (
              <p className="text-[10px] text-neutral-400 line-through">{formatPrice(product.compare_at_price, product.currency)}</p>
            )}
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${stock.bg} ${stock.color}`}>
            {stock.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ====== PRODUCT LIST ITEM ======
function ProductListItem({ product, onClick, onEdit, onDelete }: {
  product: Product;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const firstImage = product.images?.[0];
  const stock = getStockLabel(product.stock_status);
  const providerConfig = PROVIDER_CONFIG[product.provider] || PROVIDER_CONFIG.manual;

  return (
    <div onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 hover:border-orange-200 transition-all cursor-pointer group">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-50 flex-shrink-0">
        {firstImage ? (
          <img src={firstImage} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-5 h-5 text-slate-200" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-neutral-800 truncate">{product.name}</h4>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: providerConfig.color }} title={providerConfig.name} />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          {product.category && <span>{product.category}</span>}
          {product.sku && <span>SKU: {product.sku}</span>}
        </div>
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-neutral-800">{formatPrice(product.price, product.currency)}</p>
      </div>

      {/* Stock */}
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0 ${stock.bg} ${stock.color}`}>
        {stock.label}
      </span>

      {/* Actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={e => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
          <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>
    </div>
  );
}

// ====== EMPTY STATE ======
function EmptyState({ hasFilters, onCreateProduct }: {
  hasFilters: boolean;
  onCreateProduct: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center mb-5">
        <Package className="w-10 h-10 text-orange-400" />
      </div>
      {hasFilters ? (
        <>
          <h3 className="text-lg font-semibold text-neutral-700 mb-1">No se encontraron productos</h3>
          <p className="text-sm text-neutral-400 text-center max-w-sm">Intenta con otros filtros o términos de búsqueda</p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-neutral-700 mb-1">Tu catálogo está vacío</h3>
          <p className="text-sm text-neutral-400 text-center max-w-sm mb-5">
            Agrega productos para que WITHMIA pueda responder preguntas sobre precios, disponibilidad y características.
            También puedes conectar tiendas desde la sección de Integraciones.
          </p>
          <button onClick={onCreateProduct}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-200">
            <Plus className="w-4 h-4" />
            Crear producto
          </button>
        </>
      )}
    </div>
  );
}

// ====== PRODUCT FORM MODAL (Create / Edit) ======
function ProductFormModal({ product, onSubmit, onClose, categories }: {
  product?: Product;
  onSubmit: (data: Partial<Product>) => void;
  onClose: () => void;
  categories: string[];
}) {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [comparePrice, setComparePrice] = useState(product?.compare_at_price?.toString() || '');
  const [currency, setCurrency] = useState(product?.currency || 'CLP');
  const [sku, setSku] = useState(product?.sku || '');
  const [stockQty, setStockQty] = useState(product?.stock_quantity?.toString() || '');
  const [stockStatus, setStockStatus] = useState(product?.stock_status || 'in_stock');
  const [category, setCategory] = useState(product?.category || '');
  const [brand, setBrand] = useState(product?.brand || '');
  const [url, setUrl] = useState(product?.url || '');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'pricing' | 'media'>('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImage = () => {
    if (imageUrl.trim() && !images.includes(imageUrl.trim())) {
      setImages([...images, imageUrl.trim()]);
      setImageUrl('');
    }
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar 5MB');
      return;
    }
    setUploadingImage(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('auth_token') || '';
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`/api/products/upload-image?auth_token=${token}`, {
        method: 'POST',
        headers: { 'X-Railway-Auth': token, 'Accept': 'application/json' },
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (data.success && data.url) {
        setImages(prev => [...prev, data.url]);
      }
    } catch (err) {
      console.error('Error uploading image:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => uploadFile(file));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => uploadFile(file));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        price: price ? parseFloat(price) : null,
        compare_at_price: comparePrice ? parseFloat(comparePrice) : null,
        currency,
        sku: sku.trim() || null,
        stock_quantity: stockQty ? parseInt(stockQty) : null,
        stock_status: stockStatus,
        category: category.trim() || null,
        brand: brand.trim() || null,
        url: url.trim() || null,
        images: images.length > 0 ? images : null,
      } as Partial<Product>);
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Package },
    { id: 'pricing' as const, label: 'Precio & Stock', icon: DollarSign },
    { id: 'media' as const, label: 'Imágenes', icon: ImageIcon },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">

          {/* Header */}
          <div className="relative px-6 pt-5 pb-0 flex-shrink-0">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-t-2xl" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200/50">
                  {product ? <Edit3 className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-800">{product ? 'Editar producto' : 'Nuevo producto'}</h3>
                  <p className="text-xs text-neutral-400">Completa la información de tu producto</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex-1 justify-center ${
                    activeTab === tab.id
                      ? 'bg-white text-neutral-800 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.id === 'media' && images.length > 0 && (
                    <span className="ml-0.5 w-4 h-4 rounded-full bg-orange-100 text-orange-600 text-[10px] flex items-center justify-center font-bold">{images.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* TAB: General */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Nombre del producto *</label>
                  <input type="text" placeholder="Ej: Camiseta Premium 100% algodón" value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-neutral-800 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-neutral-300 transition-all outline-none"
                    autoFocus required />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Descripción</label>
                  <textarea placeholder="Describe tu producto en detalle. WITHMIA usará esta info para responder preguntas de tus clientes." value={description} onChange={e => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-neutral-700 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-neutral-300 resize-none transition-all outline-none" />
                </div>

                {/* Category + Brand */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Categoría</label>
                    <input type="text" placeholder="Ej: Electrónica" value={category} onChange={e => setCategory(e.target.value)}
                      list="category-list"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-neutral-700 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-neutral-300 transition-all outline-none" />
                    <datalist id="category-list">
                      {categories.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Marca</label>
                    <input type="text" placeholder="Opcional" value={brand} onChange={e => setBrand(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-neutral-700 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-neutral-300 transition-all outline-none" />
                  </div>
                </div>

                {/* URL */}
                <div>
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">URL del producto <span className="text-neutral-300 normal-case font-normal">(opcional)</span></label>
                  <input type="url" placeholder="https://... (opcional)" value={url} onChange={e => setUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-neutral-700 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-neutral-300 transition-all outline-none" />
                </div>
              </div>
            )}

            {/* TAB: Pricing & Stock */}
            {activeTab === 'pricing' && (
              <div className="space-y-4">
                {/* Price section */}
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Precio</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-emerald-600 uppercase mb-1 block">Precio</label>
                      <input type="number" step="0.01" min="0" placeholder="0" value={price} onChange={e => setPrice(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-emerald-200 rounded-lg text-sm font-semibold text-neutral-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-emerald-600 uppercase mb-1 block">Precio anterior</label>
                      <input type="number" step="0.01" min="0" placeholder="Opcional" value={comparePrice} onChange={e => setComparePrice(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-emerald-200 rounded-lg text-sm text-neutral-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-emerald-600 uppercase mb-1 block">Moneda</label>
                      <select value={currency} onChange={e => setCurrency(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-emerald-200 rounded-lg text-sm font-semibold text-neutral-700 focus:border-emerald-400 outline-none transition-all">
                        <option value="CLP">CLP</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="ARS">ARS</option>
                        <option value="MXN">MXN</option>
                        <option value="BRL">BRL</option>
                        <option value="COP">COP</option>
                        <option value="PEN">PEN</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Stock section */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Box className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Inventario</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-blue-600 uppercase mb-1 block">Cantidad</label>
                      <input type="number" min="0" placeholder="0" value={stockQty} onChange={e => setStockQty(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-lg text-sm font-semibold text-neutral-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-blue-600 uppercase mb-1 block">Estado</label>
                      <select value={stockStatus} onChange={e => setStockStatus(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-lg text-sm text-neutral-700 focus:border-blue-400 outline-none transition-all">
                        <option value="in_stock">En stock</option>
                        <option value="out_of_stock">Agotado</option>
                        <option value="on_backorder">Por encargo</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-blue-600 uppercase mb-1 block">SKU</label>
                      <input type="text" placeholder="Opcional" value={sku} onChange={e => setSku(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-lg text-sm text-neutral-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Media */}
            {activeTab === 'media' && (
              <div className="space-y-4">
                {/* Drag & Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                    dragOver
                      ? 'border-orange-400 bg-orange-50 scale-[1.02]'
                      : 'border-slate-200 bg-slate-50/50 hover:border-orange-300 hover:bg-orange-50/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {uploadingImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
                      <p className="text-sm font-medium text-neutral-600">Subiendo imagen...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                        <Upload className="w-7 h-7 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-700">Arrastra imágenes aquí</p>
                        <p className="text-xs text-neutral-400 mt-0.5">o haz clic para seleccionar archivos</p>
                      </div>
                      <p className="text-[10px] text-neutral-300 uppercase font-medium tracking-wider">PNG, JPG, WEBP — máx 5MB</p>
                    </div>
                  )}
                </div>

                {/* URL input */}
                <div>
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">O agrega por URL</label>
                  <div className="flex gap-2">
                    <input type="url" placeholder="https://ejemplo.com/imagen.jpg" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImage())}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-neutral-700 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-neutral-300 transition-all outline-none" />
                    <button type="button" onClick={addImage} disabled={!imageUrl.trim()}
                      className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 disabled:cursor-not-allowed">
                      <Plus className="w-4 h-4" />
                      Agregar
                    </button>
                  </div>
                </div>

                {/* Image Gallery */}
                {images.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{images.length} imagen{images.length !== 1 ? 'es' : ''}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 group hover:border-orange-300 transition-all">
                          <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
                          {idx === 0 && (
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-orange-500 text-white rounded-md text-[9px] font-bold uppercase">
                              Principal
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => removeImage(idx)}
                              className="absolute bottom-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/80 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              {['general', 'pricing', 'media'].map((tab, i) => (
                <div key={tab} className={`w-2 h-2 rounded-full transition-all ${activeTab === tab ? 'bg-orange-500 w-6' : 'bg-slate-300'}`} />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-neutral-500 hover:bg-slate-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={!name.trim() || submitting}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-orange-200/50">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {product ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ====== PRODUCT DETAIL MODAL ======
function ProductDetailModal({ product, onClose, onEdit, onDelete }: {
  product: Product;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const providerConfig = PROVIDER_CONFIG[product.provider] || PROVIDER_CONFIG.manual;
  const stock = getStockLabel(product.stock_status);
  const hasDiscount = product.compare_at_price && product.compare_at_price > (product.price || 0);
  const discountPct = hasDiscount ? Math.round((1 - (product.price || 0) / product.compare_at_price!) * 100) : 0;
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const images = product.images || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Color header */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${providerConfig.color}, ${providerConfig.color}88)` }} />

        {/* Image carousel */}
        {images.length > 0 && (
          <div className="relative aspect-video bg-slate-50 overflow-hidden">
            <img src={images[currentImageIdx]} alt={product.name} className="w-full h-full object-contain" />
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, idx) => (
                  <button key={idx} onClick={() => setCurrentImageIdx(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIdx ? 'bg-white shadow-lg scale-125' : 'bg-white/50'}`} />
                ))}
              </div>
            )}
            {/* Provider badge */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase text-white shadow-sm"
              style={{ backgroundColor: providerConfig.color }}>
              {providerConfig.name}
            </div>
            {hasDiscount && discountPct > 0 && (
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white rounded-lg text-[11px] font-bold shadow-sm">
                -{discountPct}% OFF
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Provider badge (if no images) */}
          {images.length === 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase mb-3 w-fit"
              style={{ backgroundColor: `${providerConfig.color}15`, color: providerConfig.color }}>
              {providerConfig.name}
            </div>
          )}

          <h3 className="text-[17px] font-bold text-neutral-900 leading-snug mb-3">{product.name}</h3>

          {/* Price */}
          <div className="flex items-end gap-2 mb-4">
            <span className="text-2xl font-black text-neutral-900">{formatPrice(product.price, product.currency)}</span>
            {hasDiscount && (
              <span className="text-sm text-neutral-400 line-through mb-0.5">{formatPrice(product.compare_at_price, product.currency)}</span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border mb-0.5 ${stock.bg} ${stock.color}`}>
              {stock.label}
              {product.stock_quantity !== null && product.stock_quantity !== undefined && ` (${product.stock_quantity})`}
            </span>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-neutral-500 leading-relaxed mb-4 whitespace-pre-line">{product.description}</p>
          )}

          {/* Details grid */}
          <div className="space-y-2">
            {product.category && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-3.5 h-3.5 text-neutral-400" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold">Categoría</p>
                  <p className="text-[12px] text-neutral-700">{product.category}</p>
                </div>
              </div>
            )}

            {product.brand && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <Box className="w-3.5 h-3.5 text-neutral-400" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold">Marca</p>
                  <p className="text-[12px] text-neutral-700">{product.brand}</p>
                </div>
              </div>
            )}

            {product.sku && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <Database className="w-3.5 h-3.5 text-neutral-400" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold">SKU</p>
                  <p className="text-[12px] text-neutral-700 font-mono">{product.sku}</p>
                </div>
              </div>
            )}

            {product.attributes && Object.keys(product.attributes).length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] text-neutral-400 uppercase font-semibold mb-1.5">Atributos</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(product.attributes).map(([key, val]) => (
                    <span key={key} className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full text-[10px] text-neutral-600">
                      <span className="font-semibold">{key}:</span> {val}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/60 flex-shrink-0">
          <div className="flex gap-1">
            <button onClick={onDelete}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-600 text-[12px] font-medium px-3 py-1.5 hover:bg-red-50 rounded-lg transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </button>
            <button onClick={onEdit}
              className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-700 text-[12px] font-medium px-3 py-1.5 hover:bg-slate-100 rounded-lg transition-all">
              <Edit3 className="w-3.5 h-3.5" /> Editar
            </button>
          </div>
          {product.url && (
            <a href={product.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all hover:shadow-sm"
              style={{ color: providerConfig.color, backgroundColor: `${providerConfig.color}08` }}>
              <ExternalLink className="w-3.5 h-3.5" /> Ver producto
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ====== PROVIDER ICONS ======
function WooIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
      <path d="M4 7.5C4 5.567 5.567 4 7.5 4h17c1.933 0 3.5 1.567 3.5 3.5v12c0 1.933-1.567 3.5-3.5 3.5l-5.5.017L14 28v-5H7.5C5.567 23 4 21.433 4 19.5v-12z" fill="white"/>
      <path d="M8.5 10c.3-.8.8-1.2 1.4-1.2.5 0 .9.3 1 .8.4 2.2.8 4 1.2 5.5l2.6-5c.3-.5.6-.8 1-.8.6 0 .9.5 1 1.3.3 2.3.7 4.2 1.2 5.7.3-1.7.8-3.6 1.5-5.8.2-.7.6-1 1.1-1 .4 0 .7.1.9.4.3.3.4.6.3.9-.7 2.5-1.5 5-2.3 7.4-.3.8-.7 1.2-1.2 1.2-.5 0-.9-.4-1.1-1.1-.4-1.8-.7-3.4-1-4.8l-2.4 4.9c-.3.7-.7 1-1.2 1-.5 0-.9-.4-1.2-1.3-.8-2.5-1.6-5.2-2.5-8.1-.1-.3 0-.6.2-.9.2-.2.4-.3.6-.3z" fill="#96588A"/>
    </svg>
  );
}

function ShopifyIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
      <path d="M22.832 6.62s-.058-.448-.502-.448c-.445 0-3 .175-3 .175s-2.3-2.227-2.564-2.49c-.26-.264-.77-.186-.97-.124l-1.336.414C14.12 3.2 13.67 2.5 12.84 2.5c-1.23 0-2.46 1.545-3.064 3.72l-2.35.73c-.73.228-.752.25-.847.94-.073.516-1.98 15.21-1.98 15.21l14.96 2.8 8.1-1.75S22.832 6.845 22.832 6.62z" fill="white"/>
      <path d="M19.33 6.347s-2.3-2.227-2.564-2.49c-.1-.1-.23-.15-.37-.17v23.22l8.1-1.75S19.67 6.846 19.67 6.62c0-.07-.02-.14-.05-.2-.1-.02-.19-.05-.29-.07z" fill="#95BF47"/>
      <path d="M12.84 9.96l-.78 2.92s-.86-.458-1.9-.382c-1.52.11-1.54 1.05-1.52 1.29.08 1.32 3.56 1.61 3.76 4.7.16 2.43-1.29 4.1-3.36 4.23-2.49.16-3.86-1.31-3.86-1.31l.53-2.24s1.38 1.04 2.48.97c.72-.04 .98-.63.95-1.05-.11-1.73-2.94-1.63-3.12-4.44-.16-2.37 1.4-4.77 4.83-4.99 1.32-.08 2-.18 2-.18z" fill="white"/>
    </svg>
  );
}

function MLIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="12" fill="#2D3277"/>
      <path d="M11 17.5c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="#FFE600" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="13.5" cy="14" r="1" fill="white"/>
      <circle cx="18.5" cy="14" r="1" fill="white"/>
    </svg>
  );
}
