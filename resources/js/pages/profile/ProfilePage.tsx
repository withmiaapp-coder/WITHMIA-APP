import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  User, Mail, Phone, Building2, Shield, Calendar, Clock,
  Camera, Save, Loader2, Check, AlertCircle, MapPin, Globe,
  Briefcase, Edit3, X, ImagePlus
} from 'lucide-react';
import axios from 'axios';
import { useTheme } from '@/contexts/ThemeContext';

interface ProfileData {
  id: number;
  name: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  phone_country: string;
  avatar: string | null;
  cover_photo: string | null;
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
  const { hasTheme, isDark } = useTheme();

  const t = useMemo(() => {
    if (!hasTheme) return null;
    return {
      accent: 'var(--theme-accent)',
      accentLight: 'var(--theme-accent-light)',
      textPrimary: 'var(--theme-text-primary)',
      textSec: 'var(--theme-text-secondary)',
      textMuted: 'var(--theme-text-muted)',
      cardBg: 'var(--theme-content-card-bg)',
      cardBorder: isDark ? 'var(--theme-content-card-border)' : 'rgba(0,0,0,0.08)',
      contentBg: 'var(--theme-content-bg)',
      inputBg: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
      inputBorder: isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db',
      hoverBg: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
      subtleBg: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
      badgeBg: isDark ? 'rgba(255,255,255,0.08)' : 'var(--theme-accent-light)',
      badgeBorder: isDark ? 'rgba(255,255,255,0.12)' : 'var(--theme-accent-light)',
    };
  }, [hasTheme, isDark]);

  const [profile, setProfile] = useState<ProfileData>({
    id: user.id,
    name: user.name || '',
    full_name: user.full_name || null,
    email: user.email || '',
    phone: user.phone || null,
    phone_country: 'CL',
    avatar: null,
    cover_photo: null,
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
  const [coverUploading, setCoverUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
          cover_photo: data.cover_photo || null,
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
        setAvatarError(false);
      }
    } catch (err: unknown) {
      setError('Error al subir la imagen');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('La portada no puede superar los 10MB');
      return;
    }

    try {
      setCoverUploading(true);
      const formData = new FormData();
      formData.append('cover', file);

      const response = await axios.post('/api/user/cover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setProfile(prev => ({ ...prev, cover_photo: response.data.data.cover_url }));
        setOriginalProfile(prev => ({ ...prev, cover_photo: response.data.data.cover_url }));
        setCoverError(false);
      }
    } catch (err: unknown) {
      setError('Error al subir la portada');
    } finally {
      setCoverUploading(false);
    }
  };

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(originalProfile);

  const getRoleBadge = (role: string) => {
    if (t) {
      const roles: Record<string, { label: string }> = {
        'superadmin': { label: 'Super Admin' },
        'admin': { label: 'Administrador' },
        'agent': { label: 'Agente' },
        'user': { label: 'Usuario' },
      };
      const r = roles[role] || roles['user'];
      return { label: r.label, color: '', bg: '', themed: true };
    }
    const roles: Record<string, { label: string; color: string; bg: string }> = {
      'superadmin': { label: 'Super Admin', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
      'admin': { label: 'Administrador', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
      'agent': { label: 'Agente', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
      'user': { label: 'Usuario', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
    };
    return { ...roles[role] || roles['user'], themed: false };
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
          <Loader2 className={`w-8 h-8 animate-spin ${!t ? 'text-orange-500' : ''}`} style={t ? { color: t.accent } : undefined} />
          <p className={`text-sm ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined}>Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl font-bold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Mi Perfil</h1>
          <p className={`text-sm mt-1 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined}>Gestiona tu información personal y preferencias de cuenta</p>
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
        <div
          className={`rounded-2xl overflow-hidden shadow-sm mb-6 ${!t ? 'bg-white border border-gray-200' : 'border'}`}
          style={t ? { background: t.cardBg, borderColor: t.cardBorder } : undefined}
        >
          {/* Banner + Avatar */}
          <div className="relative">
            {/* Cover Photo / Banner */}
            <div className="relative group/cover h-40 overflow-hidden">
              {profile.cover_photo && !coverError ? (
                <img
                  src={profile.cover_photo}
                  alt="Portada"
                  className="w-full h-full object-cover"
                  onError={() => setCoverError(true)}
                />
              ) : (
                <div
                  className={`w-full h-full ${!t ? 'bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400' : ''}`}
                  style={t ? { background: `linear-gradient(135deg, ${t.accent}, ${t.accentLight})` } : undefined}
                />
              )}
              {/* Cover upload overlay */}
              <button
                onClick={() => coverInputRef.current?.click()}
                className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/30 flex items-center justify-center transition-all opacity-0 group-hover/cover:opacity-100 cursor-pointer"
              >
                {coverUploading ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-black/50 rounded-lg backdrop-blur-sm">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                    <span className="text-sm text-white font-medium">Subiendo...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-black/50 rounded-lg backdrop-blur-sm">
                    <ImagePlus className="w-5 h-5 text-white" />
                    <span className="text-sm text-white font-medium">Cambiar portada</span>
                  </div>
                )}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
              />
            </div>
            {/* Avatar */}
            <div className="absolute -bottom-12 left-6">
              <div className="relative group">
                <div
                  className="w-24 h-24 rounded-2xl shadow-lg border-4 overflow-hidden flex items-center justify-center"
                  style={t ? { background: t.cardBg, borderColor: t.cardBg } : { background: '#fff', borderColor: '#fff' }}
                >
                  {profile.avatar && !avatarError ? (
                    <img 
                      src={profile.avatar} 
                      alt={profile.name}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center ${!t ? 'bg-gradient-to-br from-orange-400 to-amber-500' : ''}`}
                      style={t ? { background: t.accent } : undefined}
                    >
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
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${!roleBadge.themed ? `${roleBadge.bg} ${roleBadge.color}` : ''}`}
                style={roleBadge.themed ? { background: t!.badgeBg, borderColor: t!.badgeBorder, color: t!.accent } : undefined}
              >
                <Shield className="w-3.5 h-3.5" />
                {roleBadge.label}
              </span>
            </div>
          </div>
          
          <div className="pt-16 pb-6 px-6">
            <h2 className={`text-xl font-bold ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{profile.full_name || profile.name}</h2>
            <p className={`text-sm flex items-center gap-1.5 mt-1 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined}>
              <Mail className="w-3.5 h-3.5" />
              {profile.email}
            </p>
            {profile.company_name && (
              <p className={`text-sm flex items-center gap-1.5 mt-1 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined}>
                <Building2 className="w-3.5 h-3.5" />
                {profile.company_name}
              </p>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Personal Information */}
          <div
            className={`rounded-2xl p-6 shadow-sm ${!t ? 'bg-white border border-gray-200' : 'border'}`}
            style={t ? { background: t.cardBg, borderColor: t.cardBorder } : undefined}
          >
            <h3 className={`text-base font-semibold mb-5 flex items-center gap-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
              <User className={`w-5 h-5 ${!t ? 'text-orange-500' : ''}`} style={t ? { color: t.accent } : undefined} />
              Información Personal
            </h3>
            <div className="space-y-5">
              {/* Nombre */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                  Nombre
                </label>
                {editingField === 'name' ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg outline-none ${!t ? 'text-gray-900 bg-white border border-orange-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500' : 'border focus:ring-2'}`}
                      style={t ? { color: t.textPrimary, background: t.inputBg, borderColor: t.accent, boxShadow: `0 0 0 0px ${t.accent}` } : undefined}
                      autoFocus
                    />
                    <button onClick={() => setEditingField(null)} className={`p-2 ${!t ? 'text-gray-400 hover:text-gray-600' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between group">
                    <span className={`text-sm font-medium ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{profile.name || '—'}</span>
                    <button 
                      onClick={() => setEditingField('name')}
                      className={`p-1.5 opacity-0 group-hover:opacity-100 transition-all ${!t ? 'text-gray-300 hover:text-orange-500' : ''}`}
                      style={t ? { color: t.textMuted } : undefined}
                      onMouseEnter={t ? (e) => { (e.currentTarget as HTMLElement).style.color = t.accent } : undefined}
                      onMouseLeave={t ? (e) => { (e.currentTarget as HTMLElement).style.color = t.textMuted } : undefined}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Nombre completo */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                  Nombre Completo
                </label>
                {editingField === 'full_name' ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={profile.full_name || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg outline-none ${!t ? 'text-gray-900 placeholder:text-gray-400 bg-white border border-orange-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500' : 'border focus:ring-2'}`}
                      style={t ? { color: t.textPrimary, background: t.inputBg, borderColor: t.accent } : undefined}
                      placeholder="Tu nombre completo"
                      autoFocus
                    />
                    <button onClick={() => setEditingField(null)} className={`p-2 ${!t ? 'text-gray-400 hover:text-gray-600' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between group">
                    <span className={`text-sm font-medium ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{profile.full_name || '—'}</span>
                    <button 
                      onClick={() => setEditingField('full_name')}
                      className={`p-1.5 opacity-0 group-hover:opacity-100 transition-all ${!t ? 'text-gray-300 hover:text-orange-500' : ''}`}
                      style={t ? { color: t.textMuted } : undefined}
                      onMouseEnter={t ? (e) => { (e.currentTarget as HTMLElement).style.color = t.accent } : undefined}
                      onMouseLeave={t ? (e) => { (e.currentTarget as HTMLElement).style.color = t.textMuted } : undefined}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                  Teléfono
                </label>
                {editingField === 'phone' ? (
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={profile.phone || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg outline-none ${!t ? 'text-gray-900 placeholder:text-gray-400 bg-white border border-orange-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500' : 'border focus:ring-2'}`}
                      style={t ? { color: t.textPrimary, background: t.inputBg, borderColor: t.accent } : undefined}
                      placeholder="+56 9 1234 5678"
                      autoFocus
                    />
                    <button onClick={() => setEditingField(null)} className={`p-2 ${!t ? 'text-gray-400 hover:text-gray-600' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between group">
                    <span className={`text-sm font-medium flex items-center gap-1.5 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
                      <Phone className={`w-3.5 h-3.5 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                      {profile.phone || 'Sin teléfono'}
                    </span>
                    <button 
                      onClick={() => setEditingField('phone')}
                      className={`p-1.5 opacity-0 group-hover:opacity-100 transition-all ${!t ? 'text-gray-300 hover:text-orange-500' : ''}`}
                      style={t ? { color: t.textMuted } : undefined}
                      onMouseEnter={t ? (e) => { (e.currentTarget as HTMLElement).style.color = t.accent } : undefined}
                      onMouseLeave={t ? (e) => { (e.currentTarget as HTMLElement).style.color = t.textMuted } : undefined}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Email (read-only) */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                  Correo Electrónico
                </label>
                <div className="flex items-center gap-2">
                  <Mail className={`w-3.5 h-3.5 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                  <span className={`text-sm ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined}>{profile.email}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${!t ? 'bg-gray-100 text-gray-400' : ''}`}
                    style={t ? { background: t.subtleBg, color: t.textMuted } : undefined}
                  >Google</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div
            className={`rounded-2xl p-6 shadow-sm ${!t ? 'bg-white border border-gray-200' : 'border'}`}
            style={t ? { background: t.cardBg, borderColor: t.cardBorder } : undefined}
          >
            <h3 className={`text-base font-semibold mb-5 flex items-center gap-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
              <Briefcase className={`w-5 h-5 ${!t ? 'text-orange-500' : ''}`} style={t ? { color: t.accent } : undefined} />
              Información de Cuenta
            </h3>
            <div className="space-y-5">
              {/* Empresa */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                  Empresa
                </label>
                <div className="flex items-center gap-2">
                  <Building2 className={`w-3.5 h-3.5 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                  <span className={`text-sm font-medium ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{profile.company_name || '—'}</span>
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                  Rol en la Plataforma
                </label>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${!roleBadge.themed ? `${roleBadge.bg} ${roleBadge.color}` : ''}`}
                  style={roleBadge.themed ? { background: t!.badgeBg, borderColor: t!.badgeBorder, color: t!.accent } : undefined}
                >
                  <Shield className="w-3.5 h-3.5" />
                  {roleBadge.label}
                </span>
              </div>

              {/* Slug */}
              {profile.company_slug && (
                <div>
                  <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                    URL de la Empresa
                  </label>
                  <div className="flex items-center gap-2">
                    <Globe className={`w-3.5 h-3.5 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                    <span className={`text-sm font-mono ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined}>{window.location.host}/dashboard/{profile.company_slug}</span>
                  </div>
                </div>
              )}

              {/* Fecha de registro */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                  Miembro desde
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className={`w-3.5 h-3.5 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                  <span className={`text-sm font-medium ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{formatDate(profile.created_at)}</span>
                </div>
              </div>

              {/* Último login */}
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                  Último Acceso
                </label>
                <div className="flex items-center gap-2">
                  <Clock className={`w-3.5 h-3.5 ${!t ? 'text-gray-400' : ''}`} style={t ? { color: t.textMuted } : undefined} />
                  <span className={`text-sm font-medium ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>{formatDateTime(profile.last_login_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div
          className={`rounded-2xl p-6 shadow-sm mb-6 ${!t ? 'bg-white border border-gray-200' : 'border'}`}
          style={t ? { background: t.cardBg, borderColor: t.cardBorder } : undefined}
        >
          <h3 className={`text-base font-semibold mb-5 flex items-center gap-2 ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>
            <Shield className={`w-5 h-5 ${!t ? 'text-orange-500' : ''}`} style={t ? { color: t.accent } : undefined} />
            Seguridad
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className={`flex items-center gap-4 p-4 rounded-xl ${!t ? 'bg-gray-50' : ''}`}
              style={t ? { background: t.subtleBg } : undefined}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${!t ? 'bg-green-100' : ''}`}
                style={t ? { background: t.accentLight } : undefined}
              >
                <Check className={`w-5 h-5 ${!t ? 'text-green-600' : ''}`} style={t ? { color: t.accent } : undefined} />
              </div>
              <div>
                <h4 className={`text-sm font-medium ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Inicio de sesión con Google</h4>
                <p className={`text-xs ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined}>Autenticado de forma segura vía Google</p>
              </div>
            </div>
            <div
              className={`flex items-center gap-4 p-4 rounded-xl ${!t ? 'bg-gray-50' : ''}`}
              style={t ? { background: t.subtleBg } : undefined}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${!t ? 'bg-blue-100' : ''}`}
                style={t ? { background: t.accentLight } : undefined}
              >
                <Mail className={`w-5 h-5 ${!t ? 'text-blue-600' : ''}`} style={t ? { color: t.accent } : undefined} />
              </div>
              <div>
                <h4 className={`text-sm font-medium ${!t ? 'text-gray-900' : ''}`} style={t ? { color: t.textPrimary } : undefined}>Correo verificado</h4>
                <p className={`text-xs ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined}>{profile.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="sticky bottom-6 flex justify-end">
            <div
              className={`rounded-xl shadow-lg p-3 flex items-center gap-3 backdrop-blur-md ${!t ? 'bg-white/90 border border-gray-200' : 'border'}`}
              style={t ? { background: t.cardBg, borderColor: t.cardBorder } : undefined}
            >
              <span className={`text-sm ${!t ? 'text-gray-500' : ''}`} style={t ? { color: t.textSec } : undefined}>Tienes cambios sin guardar</span>
              <button
                onClick={() => {
                  setProfile(originalProfile);
                  setEditingField(null);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${!t ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100' : ''}`}
                style={t ? { color: t.textSec } : undefined}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-5 py-2 text-white rounded-lg font-medium transition-all shadow-lg disabled:opacity-50 ${!t ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : ''}`}
                style={t ? { background: t.accent, boxShadow: `0 4px 14px ${t.accentLight}` } : undefined}
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
