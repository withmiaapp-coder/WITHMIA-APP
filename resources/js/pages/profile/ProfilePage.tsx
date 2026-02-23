import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, Building2, Shield, Calendar, Clock,
  Camera, Save, Loader2, Check, AlertCircle, MapPin, Globe,
  Briefcase, Edit3, X
} from 'lucide-react';
import axios from 'axios';

interface ProfileData {
  id: number;
  name: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  phone_country: string;
  avatar: string | null;
  role: string;
  company_name: string;
  company_slug: string;
  created_at: string;
  last_login_at: string | null;
}

interface ProfilePageProps {
  user: {
    id: number;
    name: string;
    email: string;
    full_name?: string;
    phone?: string;
    company_name?: string;
    company_slug?: string;
    role?: string;
    logo_url?: string;
  };
}

export default function ProfilePage({ user }: ProfilePageProps) {
  const [profile, setProfile] = useState<ProfileData>({
    id: user.id,
    name: user.name || '',
    full_name: user.full_name || null,
    email: user.email || '',
    phone: user.phone || null,
    phone_country: 'CL',
    avatar: null,
    role: user.role || 'user',
    company_name: user.company_name || '',
    company_slug: user.company_slug || '',
    created_at: '',
    last_login_at: null,
  });
  const [originalProfile, setOriginalProfile] = useState<ProfileData>(profile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/profile');
      if (response.data.success) {
        const data = response.data.data;
        const loaded: ProfileData = {
          id: data.id,
          name: data.name || '',
          full_name: data.full_name || null,
          email: data.email || '',
          phone: data.phone || null,
          phone_country: data.phone_country || 'CL',
          avatar: data.avatar || null,
          role: data.role || 'user',
          company_name: data.company?.name || user.company_name || '',
          company_slug: data.company_slug || '',
          created_at: data.created_at || '',
          last_login_at: data.last_login_at || null,
        };
        setProfile(loaded);
        setOriginalProfile(loaded);
      }
    } catch (err: unknown) {
      // Fallback to user prop data
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await axios.put('/api/user/profile', {
        name: profile.name,
        full_name: profile.full_name,
        phone: profile.phone,
      });

      if (response.data.success) {
        setOriginalProfile({ ...profile });
        setSaved(true);
        setEditingField(null);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(response.data.message || 'Error al guardar');
      }
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setError(errObj.response?.data?.message || 'Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5MB');
      return;
    }

    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await axios.post('/api/user/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setProfile(prev => ({ ...prev, avatar: response.data.data.avatar_url }));
        setOriginalProfile(prev => ({ ...prev, avatar: response.data.data.avatar_url }));
      }
    } catch (err: unknown) {
      setError('Error al subir la imagen');
    } finally {
      setAvatarUploading(false);
    }
  };

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(originalProfile);

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; color: string; bg: string }> = {
      'superadmin': { label: 'Super Admin', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
      'admin': { label: 'Administrador', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
      'agent': { label: 'Agente', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
      'user': { label: 'Usuario', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
    };
    return roles[role] || roles['user'];
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    try {
      return new Date(dateStr).toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const roleBadge = getRoleBadge(profile.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-gray-500 text-sm">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona tu información personal y preferencias de cuenta</p>
        </div>

        {/* Status Messages */}
        {saved && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm font-medium text-green-800">Perfil actualizado exitosamente</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-sm font-medium text-red-800">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-6">
          {/* Banner + Avatar */}
          <div className="relative">
            <div className="h-32 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400" />
            <div className="absolute -bottom-12 left-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-white shadow-lg border-4 border-white overflow-hidden flex items-center justify-center">
                  {profile.avatar ? (
                    <img 
                      src={profile.avatar} 
                      alt={profile.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {(profile.full_name || profile.name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                >
                  {avatarUploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
            </div>
            <div className="absolute -bottom-8 right-6">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${roleBadge.bg} ${roleBadge.color}`}>
                <Shield className="w-3.5 h-3.5" />
                {roleBadge.label}
              </span>
            </div>
          </div>
          
          <div className="pt-16 pb-6 px-6">
            <h2 className="text-xl font-bold text-gray-900">{profile.full_name || profile.name}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5" />
              {profile.email}
            </p>
            {profile.company_name && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                <Building2 className="w-3.5 h-3.5" />
                {profile.company_name}
              </p>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-500" />
              Información Personal
            </h3>
            <div className="space-y-5">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Nombre
                </label>
                {editingField === 'name' ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      className="flex-1 px-3 py-2 text-sm text-gray-900 bg-white border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      autoFocus
                    />
                    <button onClick={() => setEditingField(null)} className="p-2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between group">
                    <span className="text-sm text-gray-900 font-medium">{profile.name || '—'}</span>
                    <button 
                      onClick={() => setEditingField('name')}
                      className="p-1.5 text-gray-300 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Nombre completo */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Nombre Completo
                </label>
                {editingField === 'full_name' ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={profile.full_name || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                      className="flex-1 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Tu nombre completo"
                      autoFocus
                    />
                    <button onClick={() => setEditingField(null)} className="p-2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between group">
                    <span className="text-sm text-gray-900 font-medium">{profile.full_name || '—'}</span>
                    <button 
                      onClick={() => setEditingField('full_name')}
                      className="p-1.5 text-gray-300 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Teléfono
                </label>
                {editingField === 'phone' ? (
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={profile.phone || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      className="flex-1 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 bg-white border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="+56 9 1234 5678"
                      autoFocus
                    />
                    <button onClick={() => setEditingField(null)} className="p-2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between group">
                    <span className="text-sm text-gray-900 font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {profile.phone || 'Sin teléfono'}
                    </span>
                    <button 
                      onClick={() => setEditingField('phone')}
                      className="p-1.5 text-gray-300 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Correo Electrónico
                </label>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm text-gray-500">{profile.email}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded font-medium">Google</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-orange-500" />
              Información de Cuenta
            </h3>
            <div className="space-y-5">
              {/* Empresa */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Empresa
                </label>
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm text-gray-900 font-medium">{profile.company_name || '—'}</span>
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Rol en la Plataforma
                </label>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${roleBadge.bg} ${roleBadge.color}`}>
                  <Shield className="w-3.5 h-3.5" />
                  {roleBadge.label}
                </span>
              </div>

              {/* Slug */}
              {profile.company_slug && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    URL de la Empresa
                  </label>
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm text-gray-500 font-mono">{window.location.host}/dashboard/{profile.company_slug}</span>
                  </div>
                </div>
              )}

              {/* Fecha de registro */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Miembro desde
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm text-gray-900 font-medium">{formatDate(profile.created_at)}</span>
                </div>
              </div>

              {/* Último login */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Último Acceso
                </label>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm text-gray-900 font-medium">{formatDateTime(profile.last_login_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            Seguridad
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Inicio de sesión con Google</h4>
                <p className="text-xs text-gray-500">Autenticado de forma segura vía Google</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Correo verificado</h4>
                <p className="text-xs text-gray-500">{profile.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="sticky bottom-6 flex justify-end">
            <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 p-3 flex items-center gap-3">
              <span className="text-sm text-gray-500">Tienes cambios sin guardar</span>
              <button
                onClick={() => {
                  setProfile(originalProfile);
                  setEditingField(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
