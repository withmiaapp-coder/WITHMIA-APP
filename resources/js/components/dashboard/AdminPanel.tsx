import { useState, useEffect, useMemo } from 'react';
import debugLog from '@/utils/debugLogger';
import {
    Shield,
    Users,
    Building2,
    RefreshCw,
    Search,
    UserCog,
    Trash2,
    CheckCircle2,
    XCircle,
    Activity,
    Database,
    Server,
    MessageSquare,
    Zap,
    ArrowLeft,
    AlertTriangle,
    HelpCircle,
    Clock
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    company_slug: string | null;
    onboarding_completed: boolean;
    created_at: string;
}

interface Company {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    chatwoot_inbox_id: number | null;
    created_at: string;
}

interface AdminStats {
    total_users: number;
    total_companies: number;
    users: User[];
    companies: Company[];
}

interface ServiceHealth {
    name: string;
    status: 'healthy' | 'warning' | 'down' | 'unknown';
    latency_ms: number;
    details: string;
}

interface HealthData {
    services: ServiceHealth[];
    summary: {
        healthy: number;
        total: number;
        total_latency_ms: number;
        checked_at: string;
    };
}

type AdminView = 'dashboard' | 'users' | 'companies';

// Skeleton components para loading elegante
const SkeletonCard = ({ themed }: { themed?: any }) => (
    <div className={`rounded-xl p-6 border shadow-sm animate-pulse ${!themed ? 'bg-white border-slate-200' : ''}`}
        style={themed ? { backgroundColor: themed.cardBg, borderColor: themed.cardBorder } : undefined}>
        <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl w-12 h-12" style={themed ? { backgroundColor: themed.itemBg } : undefined}></div>
            <div>
                <div className="h-8 rounded w-16 mb-2" style={themed ? { backgroundColor: themed.itemBg } : undefined}></div>
                <div className="h-4 rounded w-24" style={themed ? { backgroundColor: themed.itemBg } : undefined}></div>
            </div>
        </div>
    </div>
);

const SkeletonTable = ({ themed }: { themed?: any }) => (
    <div className={`rounded-xl border overflow-hidden animate-pulse ${!themed ? 'bg-white border-slate-200' : ''}`}
        style={themed ? { backgroundColor: themed.cardBg, borderColor: themed.cardBorder } : undefined}>
        <div className="p-4 border-b" style={themed ? { borderColor: themed.cardBorder } : undefined}>
            <div className="h-6 rounded w-32" style={themed ? { backgroundColor: themed.itemBg } : undefined}></div>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 border-b flex gap-4" style={themed ? { borderColor: themed.cardBorder } : undefined}>
                <div className="h-4 rounded w-1/4" style={themed ? { backgroundColor: themed.itemBg } : undefined}></div>
                <div className="h-4 rounded w-1/3" style={themed ? { backgroundColor: themed.itemBg } : undefined}></div>
                <div className="h-4 rounded w-1/6" style={themed ? { backgroundColor: themed.itemBg } : undefined}></div>
                <div className="h-4 rounded w-1/6" style={themed ? { backgroundColor: themed.itemBg } : undefined}></div>
            </div>
        ))}
    </div>
);

export default function AdminPanel() {
    const [view, setView] = useState<AdminView>('dashboard');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [health, setHealth] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [healthLoading, setHealthLoading] = useState(false);
    const [repairing, setRepairing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [selectedRole, setSelectedRole] = useState('');
    const { hasTheme, isDark } = useTheme();
    const t = useMemo(() => {
        if (!hasTheme) return null;
        return {
            contentBg: 'var(--theme-content-bg)', cardBg: 'var(--theme-content-card-bg)',
            cardBorder: 'var(--theme-content-card-border)', text: 'var(--theme-text-primary)',
            textSec: 'var(--theme-text-secondary)', textMuted: 'var(--theme-text-muted)',
            accent: 'var(--theme-accent)', accentLight: 'var(--theme-accent-light)',
            inputBg: 'var(--theme-input-bg)', itemBg: 'var(--theme-item-bg)',
        };
    }, [hasTheme, isDark]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await fetch('/admin/api/stats');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            debugLog.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHealth = async () => {
        setHealthLoading(true);
        try {
            const response = await fetch('/admin/api/health');
            const data = await response.json();
            setHealth(data);
        } catch (error) {
            debugLog.error('Error fetching health:', error);
        } finally {
            setHealthLoading(false);
        }
    };

    const repairQdrant = async () => {
        setRepairing(true);
        try {
            const response = await fetch('/admin/api/repair-qdrant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            const data = await response.json();
            if (data.success) {
                debugLog.info(`Qdrant repair: ${data.repaired} collections repaired`);
                // Re-check health after repair
                setTimeout(() => fetchHealth(), 3000);
            }
        } catch (error) {
            debugLog.error('Error repairing Qdrant:', error);
        } finally {
            setRepairing(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchHealth();
    }, []);

    const updateUserRole = async (userId: number, newRole: string) => {
        try {
            const response = await fetch(`/admin/api/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            if (response.ok) {
                fetchStats();
                setEditingUser(null);
            }
        } catch (error) {
            debugLog.error('Error updating role:', error);
        }
    };

    const deleteUser = async (userId: number) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            const response = await fetch(`/admin/api/users/${userId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                fetchStats();
            }
        } catch (error) {
            debugLog.error('Error deleting user:', error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const serviceIcons: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
        'PostgreSQL': { icon: Database, color: 'from-blue-500 to-indigo-500' },
        'Redis': { icon: Server, color: 'from-red-500 to-rose-500' },
        'n8n': { icon: Zap, color: 'from-orange-500 to-amber-500' },
        'Qdrant': { icon: Database, color: 'from-purple-500 to-violet-500' },
        'Chatwoot': { icon: MessageSquare, color: 'from-cyan-500 to-blue-500' },
        'Evolution API': { icon: MessageSquare, color: 'from-green-500 to-emerald-500' },
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'bg-green-500';
            case 'warning': return 'bg-yellow-500';
            case 'down': return 'bg-red-500 animate-pulse';
            default: return 'bg-gray-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
            case 'down': return <XCircle className="h-4 w-4 text-red-600" />;
            default: return <HelpCircle className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'healthy': return 'bg-green-50 border-green-200';
            case 'warning': return 'bg-yellow-50 border-yellow-200';
            case 'down': return 'bg-red-50 border-red-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const filteredUsers = stats?.users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const filteredCompanies = stats?.companies.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.slug.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    // Vista de Dashboard
    const renderDashboard = () => (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div 
                    onClick={() => setView('users')}
                    className={`rounded-xl p-6 border shadow-sm hover:shadow-md transition-all cursor-pointer ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${!t ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : ''}`} style={t ? { background: t.accent } : undefined}>
                            <Users className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className={`text-3xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>{stats?.total_users || 0}</p>
                            <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Usuarios totales</p>
                        </div>
                    </div>
                </div>

                <div 
                    onClick={() => setView('companies')}
                    className={`rounded-xl p-6 border shadow-sm hover:shadow-md transition-all cursor-pointer ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${!t ? 'bg-gradient-to-r from-emerald-500 to-green-500' : ''}`} style={t ? { background: t.accent } : undefined}>
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className={`text-3xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>{stats?.total_companies || 0}</p>
                            <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Empresas</p>
                        </div>
                    </div>
                </div>

                <div className={`rounded-xl p-6 border shadow-sm ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${!t ? 'bg-gradient-to-r from-purple-500 to-violet-500' : ''}`} style={t ? { background: t.accent } : undefined}>
                            <Activity className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className={`text-3xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>
                                {health ? `${health.summary.healthy}/${health.summary.total}` : '...'}
                            </p>
                            <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Servicios sanos</p>
                        </div>
                    </div>
                </div>

                <div className={`rounded-xl p-6 border shadow-sm ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${!t ? 'bg-gradient-to-r from-amber-500 to-orange-500' : ''}`} style={t ? { background: t.accent } : undefined}>
                            <CheckCircle2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className={`text-3xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>
                                {stats?.users.filter(u => u.onboarding_completed).length || 0}
                            </p>
                            <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Onboarding completo</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Services */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className={`rounded-xl p-6 border shadow-sm ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                    <h3 className={`text-lg font-semibold mb-4 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Acciones Rápidas</h3>
                    <div className="space-y-2">
                        <button
                            onClick={() => setView('users')}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${!t ? 'hover:bg-slate-50' : ''}`}
                        >
                            <Users className={`h-5 w-5 ${!t ? 'text-blue-500' : ''}`} style={t ? { color: t.accent } : undefined} />
                            <span className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.textSec } : undefined}>Gestionar Usuarios</span>
                        </button>
                        <button
                            onClick={() => setView('companies')}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${!t ? 'hover:bg-slate-50' : ''}`}
                        >
                            <Building2 className={`h-5 w-5 ${!t ? 'text-emerald-500' : ''}`} style={t ? { color: t.accent } : undefined} />
                            <span className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.textSec } : undefined}>Gestionar Empresas</span>
                        </button>
                        <button
                            onClick={() => { fetchStats(); fetchHealth(); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${!t ? 'hover:bg-slate-50' : ''}`}
                        >
                            <RefreshCw className={`h-5 w-5 ${!t ? 'text-purple-500' : ''}`} style={t ? { color: t.accent } : undefined} />
                            <span className={`font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.textSec } : undefined}>Actualizar Datos</span>
                        </button>
                    </div>
                </div>

                {/* Services Status — Real Health Checks */}
                <div className={`rounded-xl p-6 border shadow-sm ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Estado de Servicios</h3>
                        <button
                            onClick={fetchHealth}
                            disabled={healthLoading}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${!t ? 'text-neutral-600 bg-slate-100 hover:bg-slate-200' : ''}`}
                            style={t ? { backgroundColor: t.itemBg, color: t.textSec } : undefined}
                        >
                            <RefreshCw className={`h-3 w-3 ${healthLoading ? 'animate-spin' : ''}`} />
                            {healthLoading ? 'Verificando...' : 'Verificar'}
                        </button>
                    </div>

                    {health?.summary && (
                        <div className={`flex items-center gap-2 mb-4 text-xs ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>
                            <Clock className="h-3 w-3" />
                            <span>Verificado: {new Date(health.summary.checked_at).toLocaleTimeString('es-CL')}</span>
                            <span className="text-neutral-300">|</span>
                            <span>{health.summary.total_latency_ms}ms total</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-2">
                        {health?.services ? health.services.map((service) => {
                            const meta = serviceIcons[service.name] || { icon: Server, color: 'from-gray-500 to-gray-600' };
                            const IconComp = meta.icon;
                            return (
                                <div key={service.name} className={`flex items-center gap-3 p-3 rounded-lg border ${!t ? getStatusBg(service.status) : ''}`}
                                    style={t ? { backgroundColor: t.itemBg, borderColor: t.cardBorder } : undefined}>
                                    <div className={`p-2 rounded-lg ${!t ? `bg-gradient-to-r ${meta.color}` : ''}`} style={t ? { background: t.accent } : undefined}>
                                        <IconComp className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-medium ${!t ? 'text-neutral-700' : ''}`} style={t ? { color: t.text } : undefined}>{service.name}</p>
                                            {getStatusIcon(service.status)}
                                        </div>
                                        <p className={`text-xs truncate ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{service.details}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                                        {service.name === 'Qdrant' && service.status === 'warning' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); repairQdrant(); }}
                                                disabled={repairing}
                                                className={`text-xs px-2 py-1 text-white rounded-md transition-colors disabled:opacity-50 ${!t ? 'bg-purple-600 hover:bg-purple-700' : 'hover:opacity-90'}`}
                                                style={t ? { backgroundColor: t.accent } : undefined}
                                            >
                                                {repairing ? 'Reparando...' : 'Reparar'}
                                            </button>
                                        )}
                                        <div>
                                            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(service.status)} mb-1 ml-auto`} />
                                            <p className="text-xs text-neutral-400">{service.latency_ms}ms</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="flex items-center justify-center p-6 text-neutral-400 text-sm">
                                {healthLoading ? (
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        Verificando servicios...
                                    </div>
                                ) : (
                                    'Haz click en "Verificar" para comprobar'
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Users & Companies */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`rounded-xl p-6 border shadow-sm ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                    <h3 className={`text-lg font-semibold mb-4 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Usuarios Recientes</h3>
                    <div className="space-y-3">
                        {stats?.users.slice(0, 5).map((user) => (
                            <div key={user.id} className={`flex items-center justify-between p-3 rounded-lg ${!t ? 'bg-slate-50' : ''}`}
                                style={t ? { backgroundColor: t.itemBg } : undefined}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm ${!t ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : ''}`} style={t ? { background: t.accent } : undefined}>
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className={`font-medium text-sm ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>{user.name}</p>
                                        <p className={`text-xs ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{user.email}</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${!t ? (
                                    user.role === 'superadmin' ? 'bg-amber-100 text-amber-700' :
                                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                    user.role === 'agent' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                ) : ''}`} style={t ? { background: `color-mix(in srgb, ${t.accent} 15%, transparent)`, color: t.accent } : undefined}>
                                    {user.role === 'superadmin' ? 'Super Admin' : user.role}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`rounded-xl p-6 border shadow-sm ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                    <h3 className={`text-lg font-semibold mb-4 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Empresas Recientes</h3>
                    <div className="space-y-3">
                        {stats?.companies.slice(0, 5).map((company) => (
                            <div key={company.id} className={`flex items-center justify-between p-3 rounded-lg ${!t ? 'bg-slate-50' : ''}`}
                                style={t ? { backgroundColor: t.itemBg } : undefined}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm ${!t ? 'bg-gradient-to-r from-emerald-500 to-green-500' : ''}`} style={t ? { background: t.accent } : undefined}>
                                        {company.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className={`font-medium text-sm ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>{company.name}</p>
                                        <p className={`text-xs ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{company.slug}</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    !t ? (company.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700') : ''
                                }`}
                                style={t ? {
                                    backgroundColor: company.is_active ? `color-mix(in srgb, ${t.accent} 15%, transparent)` : `color-mix(in srgb, ${t.textMuted} 15%, transparent)`,
                                    color: company.is_active ? t.accent : t.textMuted
                                } : undefined}>
                                    {company.is_active ? 'Activa' : 'Inactiva'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    // Vista de Usuarios
    const renderUsers = () => (
        <div className="space-y-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setView('dashboard')}
                    className={`p-2 rounded-lg transition-colors ${!t ? 'hover:bg-slate-100' : ''}`}
                >
                    <ArrowLeft className="h-5 w-5" style={t ? { color: t.textSec } : undefined} />
                </button>
                <div>
                    <h2 className={`text-2xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Gestión de Usuarios</h2>
                    <p style={t ? { color: t.textMuted } : undefined} className={!t ? 'text-neutral-500' : ''}>Administra los usuarios del sistema</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`rounded-xl p-4 border shadow-sm ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                    <p className={`text-2xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>{stats?.total_users || 0}</p>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Total</p>
                </div>
                <div className={`rounded-xl p-4 border shadow-sm ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                    <p className={`text-2xl font-bold ${!t ? 'text-amber-600' : ''}`} style={t ? { color: t.accent } : undefined}>{stats?.users.filter(u => u.role === 'superadmin').length || 0}</p>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Super Admins</p>
                </div>
                <div className={`rounded-xl p-4 border shadow-sm ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                    <p className={`text-2xl font-bold ${!t ? 'text-purple-600' : ''}`} style={t ? { color: t.accent } : undefined}>{stats?.users.filter(u => u.role === 'admin').length || 0}</p>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Admins</p>
                </div>
                <div className={`rounded-xl p-4 border shadow-sm ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                    <p className={`text-2xl font-bold ${!t ? 'text-blue-600' : ''}`} style={t ? { color: t.accent } : undefined}>{stats?.users.filter(u => u.role === 'agent').length || 0}</p>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Agentes</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={t ? { color: t.textMuted } : undefined} />
                <input
                    type="text"
                    placeholder="Buscar usuarios..."
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border ${!t ? 'border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent' : 'placeholder:opacity-50'}`}
                    style={t ? { backgroundColor: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Users List */}
            <div className={`rounded-xl border shadow-sm overflow-hidden ${!t ? 'bg-white border-slate-200' : ''}`}
                style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className={`border-b ${!t ? 'bg-slate-50 border-slate-200' : ''}`}
                            style={t ? { backgroundColor: t.itemBg, borderColor: t.cardBorder } : undefined}>
                            <tr>
                                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Usuario</th>
                                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Email</th>
                                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Rol</th>
                                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Empresa</th>
                                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Fecha</th>
                                <th className={`px-6 py-4 text-right text-xs font-semibold uppercase ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${!t ? 'divide-slate-100' : ''}`} style={t ? { borderColor: t.cardBorder } : undefined}>
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className={!t ? 'hover:bg-slate-50' : ''}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${!t ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : ''}`} style={t ? { background: t.accent } : undefined}>
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className={`font-medium ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4" style={t ? { color: t.textSec } : undefined}>{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${!t ? (
                                            user.role === 'superadmin' ? 'bg-amber-100 text-amber-700' :
                                            user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                            user.role === 'agent' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                        ) : ''}`} style={t ? { background: `color-mix(in srgb, ${t.accent} 15%, transparent)`, color: t.accent } : undefined}>
                                            {user.role === 'superadmin' ? 'Super Admin' : user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4" style={t ? { color: t.textSec } : undefined}>{user.company_slug || '-'}</td>
                                    <td className={`px-6 py-4 text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{formatDate(user.created_at)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingUser(user);
                                                    setSelectedRole(user.role);
                                                }}
                                                className={`p-2 rounded-lg transition-colors ${!t ? 'hover:bg-blue-50 text-blue-600' : ''}`}
                                                style={t ? { color: t.accent } : undefined}
                                                title="Editar rol"
                                            >
                                                <UserCog className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteUser(user.id)}
                                                className={`p-2 rounded-lg transition-colors ${!t ? 'hover:bg-red-50 text-red-600' : 'opacity-70 hover:opacity-100'}`}
                                                style={t ? { color: '#ef4444' } : undefined}
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Role Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className={`rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl ${!t ? 'bg-white' : ''}`}
                        style={t ? { backgroundColor: 'var(--theme-content-bg)' } : undefined}>
                        <h3 className={`text-lg font-semibold mb-4 ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Editar Rol</h3>
                        <p className={`mb-4 ${!t ? 'text-neutral-600' : ''}`} style={t ? { color: t.textSec } : undefined}>Usuario: <strong>{editingUser.name}</strong></p>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className={`w-full p-3 rounded-lg border mb-4 ${!t ? 'border-slate-200' : ''}`}
                            style={t ? { backgroundColor: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                        >
                            <option value="agent">Agente</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Super Admin</option>
                        </select>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setEditingUser(null)}
                                className={`flex-1 px-4 py-2 border rounded-lg ${!t ? 'border-slate-200 hover:bg-slate-50' : ''}`}
                                style={t ? { borderColor: t.cardBorder, color: t.textSec } : undefined}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => updateUserRole(editingUser.id, selectedRole)}
                                className={`flex-1 px-4 py-2 text-white rounded-lg ${!t ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                                style={t ? { backgroundColor: t.accent } : undefined}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Vista de Empresas
    const renderCompanies = () => (
        <div className="space-y-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setView('dashboard')}
                    className={`p-2 rounded-lg transition-colors ${!t ? 'hover:bg-slate-100' : ''}`}
                >
                    <ArrowLeft className="h-5 w-5" style={t ? { color: t.textSec } : undefined} />
                </button>
                <div>
                    <h2 className={`text-2xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Gestión de Empresas</h2>
                    <p style={t ? { color: t.textMuted } : undefined} className={!t ? 'text-neutral-500' : ''}>Administra las empresas registradas</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`rounded-xl p-4 border shadow-sm ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                    <p className={`text-2xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>{stats?.total_companies || 0}</p>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Total</p>
                </div>
                <div className={`rounded-xl p-4 border shadow-sm ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                    <p className={`text-2xl font-bold ${!t ? 'text-green-600' : ''}`} style={t ? { color: t.accent } : undefined}>{stats?.companies.filter(c => c.is_active).length || 0}</p>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Activas</p>
                </div>
                <div className={`rounded-xl p-4 border shadow-sm ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                    <p className={`text-2xl font-bold ${!t ? 'text-blue-600' : ''}`} style={t ? { color: t.accent } : undefined}>{stats?.companies.filter(c => c.chatwoot_inbox_id).length || 0}</p>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Con Chatwoot</p>
                </div>
                <div className={`rounded-xl p-4 border shadow-sm ${!t ? 'bg-white border-slate-200' : ''}`}
                    style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                    <p className={`text-2xl font-bold ${!t ? 'text-gray-600' : ''}`} style={t ? { color: t.textMuted } : undefined}>{stats?.companies.filter(c => !c.is_active).length || 0}</p>
                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Inactivas</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={t ? { color: t.textMuted } : undefined} />
                <input
                    type="text"
                    placeholder="Buscar empresas..."
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border ${!t ? 'border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent' : 'placeholder:opacity-50'}`}
                    style={t ? { backgroundColor: t.inputBg, borderColor: t.cardBorder, color: t.text } : undefined}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Companies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCompanies.map((company) => (
                    <div key={company.id} className={`rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow ${!t ? 'bg-white border-slate-200' : ''}`}
                        style={t ? { backgroundColor: t.cardBg, borderColor: t.cardBorder } : undefined}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${!t ? 'bg-gradient-to-r from-emerald-500 to-green-500' : ''}`} style={t ? { background: t.accent } : undefined}>
                                    {company.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className={`font-semibold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>{company.name}</h3>
                                    <p className={`text-sm ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>{company.slug}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                !t ? (company.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700') : ''
                            }`}
                            style={t ? {
                                backgroundColor: company.is_active ? `color-mix(in srgb, ${t.accent} 15%, transparent)` : `color-mix(in srgb, ${t.textMuted} 15%, transparent)`,
                                color: company.is_active ? t.accent : t.textMuted
                            } : undefined}>
                                {company.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                        </div>
                        <div className={`space-y-2 text-sm ${!t ? 'text-neutral-600' : ''}`} style={t ? { color: t.textSec } : undefined}>
                            <div className="flex items-center gap-2">
                                <span style={t ? { color: t.textMuted } : undefined} className={!t ? 'text-neutral-400' : ''}>Creada:</span>
                                <span>{formatDate(company.created_at)}</span>
                            </div>
                            {company.chatwoot_inbox_id && (
                                <div className="flex items-center gap-2">
                                    <MessageSquare className={`h-4 w-4 ${!t ? 'text-blue-500' : ''}`} style={t ? { color: t.accent } : undefined} />
                                    <span>Inbox ID: {company.chatwoot_inbox_id}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="h-full overflow-y-auto p-8" style={t ? { backgroundColor: t.contentBg } : undefined}>
                <div className="max-w-7xl mx-auto">
                    {/* Header Skeleton */}
                    <div className="mb-8 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-4 rounded-xl w-18 h-18 animate-pulse" style={t ? { backgroundColor: t.itemBg } : undefined}></div>
                            <div>
                                <div className="h-10 rounded w-72 mb-2 animate-pulse" style={t ? { backgroundColor: t.itemBg } : undefined}></div>
                                <div className="h-5 rounded w-56 animate-pulse" style={t ? { backgroundColor: t.itemBg } : undefined}></div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <SkeletonCard themed={t} />
                        <SkeletonCard themed={t} />
                        <SkeletonCard themed={t} />
                        <SkeletonCard themed={t} />
                    </div>

                    {/* Content Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SkeletonTable themed={t} />
                        <SkeletonTable themed={t} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
            style={t ? { backgroundColor: t.contentBg } : undefined}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                {view === 'dashboard' && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className={`p-4 rounded-xl shadow-lg ${!t ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : ''}`} style={t ? { background: t.accent } : undefined}>
                                    <Shield className="w-10 h-10 text-white" />
                                </div>
                                <div>
                                    <h1 className={`text-4xl font-bold ${!t ? 'text-neutral-800' : ''}`} style={t ? { color: t.text } : undefined}>Panel de Administración</h1>
                                    <p className={`text-lg ${!t ? 'text-neutral-500' : ''}`} style={t ? { color: t.textMuted } : undefined}>Gestiona usuarios, empresas y servicios</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { fetchStats(); fetchHealth(); }}
                                disabled={loading || healthLoading}
                                className={`flex items-center gap-2 px-4 py-2 text-white border rounded-lg transition-colors ${!t ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : ''}`}
                                style={t ? { backgroundColor: t.accent, borderColor: t.accent } : undefined}
                            >
                                <RefreshCw className={`h-4 w-4 ${(loading || healthLoading) ? 'animate-spin' : ''}`} />
                                Actualizar
                            </button>
                        </div>
                    </div>
                )}

                {/* Content */}
                {view === 'dashboard' && renderDashboard()}
                {view === 'users' && renderUsers()}
                {view === 'companies' && renderCompanies()}
            </div>
        </div>
    );
}
