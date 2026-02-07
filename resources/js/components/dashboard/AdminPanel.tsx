import { useState, useEffect } from 'react';
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
    ArrowLeft
} from 'lucide-react';

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

type AdminView = 'dashboard' | 'users' | 'companies';

// Skeleton components para loading elegante
const SkeletonCard = () => (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm animate-pulse">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-200 rounded-xl w-12 h-12"></div>
            <div>
                <div className="h-8 bg-slate-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-slate-100 rounded w-24"></div>
            </div>
        </div>
    </div>
);

const SkeletonTable = () => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
        <div className="p-4 border-b border-slate-200">
            <div className="h-6 bg-slate-200 rounded w-32"></div>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 border-b border-slate-100 flex gap-4">
                <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                <div className="h-4 bg-slate-100 rounded w-1/6"></div>
                <div className="h-4 bg-slate-100 rounded w-1/6"></div>
            </div>
        ))}
    </div>
);

export default function AdminPanel() {
    const [view, setView] = useState<AdminView>('dashboard');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [selectedRole, setSelectedRole] = useState('');

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

    useEffect(() => {
        fetchStats();
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

    const services = [
        { name: 'PostgreSQL', icon: Database, status: 'healthy', color: 'from-blue-500 to-indigo-500' },
        { name: 'Redis', icon: Server, status: 'healthy', color: 'from-red-500 to-rose-500' },
        { name: 'n8n', icon: Zap, status: 'healthy', color: 'from-orange-500 to-amber-500' },
        { name: 'Qdrant', icon: Database, status: 'healthy', color: 'from-purple-500 to-violet-500' },
        { name: 'Chatwoot', icon: MessageSquare, status: 'healthy', color: 'from-cyan-500 to-blue-500' },
        { name: 'Evolution API', icon: MessageSquare, status: 'warning', color: 'from-green-500 to-emerald-500' },
    ];

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
                    className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl">
                            <Users className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-neutral-800">{stats?.total_users || 0}</p>
                            <p className="text-sm text-neutral-500">Usuarios totales</p>
                        </div>
                    </div>
                </div>

                <div 
                    onClick={() => setView('companies')}
                    className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-neutral-800">{stats?.total_companies || 0}</p>
                            <p className="text-sm text-neutral-500">Empresas</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl">
                            <Activity className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-neutral-800">{services.length}</p>
                            <p className="text-sm text-neutral-500">Servicios activos</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl">
                            <CheckCircle2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-neutral-800">
                                {stats?.users.filter(u => u.onboarding_completed).length || 0}
                            </p>
                            <p className="text-sm text-neutral-500">Onboarding completo</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Services */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-neutral-800 mb-4">Acciones Rápidas</h3>
                    <div className="space-y-2">
                        <button
                            onClick={() => setView('users')}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                        >
                            <Users className="h-5 w-5 text-blue-500" />
                            <span className="font-medium text-neutral-700">Gestionar Usuarios</span>
                        </button>
                        <button
                            onClick={() => setView('companies')}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                        >
                            <Building2 className="h-5 w-5 text-emerald-500" />
                            <span className="font-medium text-neutral-700">Gestionar Empresas</span>
                        </button>
                        <button
                            onClick={fetchStats}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                        >
                            <RefreshCw className="h-5 w-5 text-purple-500" />
                            <span className="font-medium text-neutral-700">Actualizar Datos</span>
                        </button>
                    </div>
                </div>

                {/* Services Status */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-neutral-800 mb-4">Estado de Servicios</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {services.map((service) => (
                            <div key={service.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <div className={`p-2 bg-gradient-to-r ${service.color} rounded-lg`}>
                                    <service.icon className="h-4 w-4 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-neutral-700">{service.name}</p>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${
                                    service.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
                                }`} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Users & Companies */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-neutral-800 mb-4">Usuarios Recientes</h3>
                    <div className="space-y-3">
                        {stats?.users.slice(0, 5).map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-medium text-sm">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-neutral-800 text-sm">{user.name}</p>
                                        <p className="text-xs text-neutral-500">{user.email}</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                    user.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                    {user.role}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-neutral-800 mb-4">Empresas Recientes</h3>
                    <div className="space-y-3">
                        {stats?.companies.slice(0, 5).map((company) => (
                            <div key={company.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center text-white font-medium text-sm">
                                        {company.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-neutral-800 text-sm">{company.name}</p>
                                        <p className="text-xs text-neutral-500">{company.slug}</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    company.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                }`}>
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
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-neutral-600" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-neutral-800">Gestión de Usuarios</h2>
                    <p className="text-neutral-500">Administra los usuarios del sistema</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <p className="text-2xl font-bold text-neutral-800">{stats?.total_users || 0}</p>
                    <p className="text-sm text-neutral-500">Total</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <p className="text-2xl font-bold text-purple-600">{stats?.users.filter(u => u.role === 'admin').length || 0}</p>
                    <p className="text-sm text-neutral-500">Admins</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <p className="text-2xl font-bold text-blue-600">{stats?.users.filter(u => u.role === 'manager').length || 0}</p>
                    <p className="text-sm text-neutral-500">Managers</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <p className="text-2xl font-bold text-gray-600">{stats?.users.filter(u => u.role === 'user').length || 0}</p>
                    <p className="text-sm text-neutral-500">Usuarios</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                    type="text"
                    placeholder="Buscar usuarios..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Users List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase">Usuario</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase">Rol</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase">Empresa</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase">Fecha</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-medium">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-neutral-800">{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-600">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                            user.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-600">{user.company_slug || '-'}</td>
                                    <td className="px-6 py-4 text-neutral-500 text-sm">{formatDate(user.created_at)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingUser(user);
                                                    setSelectedRole(user.role);
                                                }}
                                                className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                                title="Editar rol"
                                            >
                                                <UserCog className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteUser(user.id)}
                                                className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
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
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-lg font-semibold text-neutral-800 mb-4">Editar Rol</h3>
                        <p className="text-neutral-600 mb-4">Usuario: <strong>{editingUser.name}</strong></p>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="w-full p-3 rounded-lg border border-slate-200 mb-4"
                        >
                            <option value="user">Usuario</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                        </select>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => updateUserRole(editingUser.id, selectedRole)}
                                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-neutral-600" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-neutral-800">Gestión de Empresas</h2>
                    <p className="text-neutral-500">Administra las empresas registradas</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <p className="text-2xl font-bold text-neutral-800">{stats?.total_companies || 0}</p>
                    <p className="text-sm text-neutral-500">Total</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <p className="text-2xl font-bold text-green-600">{stats?.companies.filter(c => c.is_active).length || 0}</p>
                    <p className="text-sm text-neutral-500">Activas</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <p className="text-2xl font-bold text-blue-600">{stats?.companies.filter(c => c.chatwoot_inbox_id).length || 0}</p>
                    <p className="text-sm text-neutral-500">Con Chatwoot</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <p className="text-2xl font-bold text-gray-600">{stats?.companies.filter(c => !c.is_active).length || 0}</p>
                    <p className="text-sm text-neutral-500">Inactivas</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                    type="text"
                    placeholder="Buscar empresas..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Companies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCompanies.map((company) => (
                    <div key={company.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center text-white font-bold text-lg">
                                    {company.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-neutral-800">{company.name}</h3>
                                    <p className="text-sm text-neutral-500">{company.slug}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                company.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                                {company.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                        </div>
                        <div className="space-y-2 text-sm text-neutral-600">
                            <div className="flex items-center gap-2">
                                <span className="text-neutral-400">Creada:</span>
                                <span>{formatDate(company.created_at)}</span>
                            </div>
                            {company.chatwoot_inbox_id && (
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-blue-500" />
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
            <div className="h-full overflow-y-auto p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header Skeleton */}
                    <div className="mb-8 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-4 bg-slate-200 rounded-xl w-18 h-18 animate-pulse"></div>
                            <div>
                                <div className="h-10 bg-slate-200 rounded w-72 mb-2 animate-pulse"></div>
                                <div className="h-5 bg-slate-100 rounded w-56 animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>

                    {/* Content Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SkeletonTable />
                        <SkeletonTable />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                {view === 'dashboard' && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg">
                                    <Shield className="w-10 h-10 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-bold text-neutral-800">Panel de Administración</h1>
                                    <p className="text-lg text-neutral-500">Gestiona usuarios, empresas y servicios</p>
                                </div>
                            </div>
                            <button
                                onClick={fetchStats}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
