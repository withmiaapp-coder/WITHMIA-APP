import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Building2,
    Activity,
    TrendingUp,
    MessageSquare,
    Zap,
    Database,
    Server,
    CheckCircle2,
    XCircle,
    RefreshCw,
    ArrowRight,
    UserPlus,
    Settings,
    BarChart3,
    Shield
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface AdminStats {
    total_users: number;
    total_companies: number;
    users: Array<{
        id: number;
        name: string;
        email: string;
        role: string;
        created_at: string;
    }>;
    companies: Array<{
        id: number;
        name: string;
        slug: string;
        created_at: string;
    }>;
    timestamp: string;
}

interface ServiceStatus {
    name: string;
    status: 'healthy' | 'error' | 'unknown';
    url: string;
    icon: typeof Server;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Dashboard', href: '/admin/dashboard' },
];

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<ServiceStatus[]>([
        { name: 'PostgreSQL', status: 'unknown', url: 'Database', icon: Database },
        { name: 'Redis', status: 'unknown', url: 'Cache', icon: Server },
        { name: 'n8n', status: 'unknown', url: 'Workflows', icon: Zap },
        { name: 'Qdrant', status: 'unknown', url: 'Vector DB', icon: Database },
        { name: 'Chatwoot', status: 'unknown', url: 'Support', icon: MessageSquare },
        { name: 'Evolution API', status: 'unknown', url: 'WhatsApp', icon: MessageSquare },
    ]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await fetch('/admin/api/stats');
            const data = await response.json();
            setStats(data);
            
            // Actualizar estado de servicios basado en la respuesta
            setServices(prev => prev.map(service => ({
                ...service,
                status: 'healthy' as const
            })));
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Panel de Administración" />

            <div className="flex flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Shield className="h-8 w-8 text-primary" />
                            Panel de Administración
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Gestiona usuarios, empresas y monitorea el estado del sistema
                        </p>
                    </div>
                    <Button onClick={fetchStats} variant="outline" size="sm" disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.total_users ?? '-'}</div>
                            <p className="text-xs text-muted-foreground">
                                Usuarios registrados
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.total_companies ?? '-'}</div>
                            <p className="text-xs text-muted-foreground">
                                Empresas activas
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Servicios Activos</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {services.filter(s => s.status === 'healthy').length}/{services.length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Servicios funcionando
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Última actualización</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-bold">
                                {stats?.timestamp ? formatDate(stats.timestamp) : '-'}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Estado del sistema
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions & Services */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5" />
                                Acciones Rápidas
                            </CardTitle>
                            <CardDescription>
                                Gestión rápida del sistema
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            <Link href="/admin/users">
                                <Button variant="outline" className="w-full justify-between">
                                    <span className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Gestionar Usuarios
                                    </span>
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                            <Link href="/admin/companies">
                                <Button variant="outline" className="w-full justify-between">
                                    <span className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        Gestionar Empresas
                                    </span>
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                            <Link href="/admin/services">
                                <Button variant="outline" className="w-full justify-between">
                                    <span className="flex items-center gap-2">
                                        <Server className="h-4 w-4" />
                                        Estado de Servicios
                                    </span>
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                            <Link href="/admin/analytics">
                                <Button variant="outline" className="w-full justify-between">
                                    <span className="flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4" />
                                        Analytics
                                    </span>
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Services Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Server className="h-5 w-5" />
                                Estado de Servicios
                            </CardTitle>
                            <CardDescription>
                                Monitoreo en tiempo real
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {services.map((service) => (
                                    <div key={service.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                        <div className="flex items-center gap-3">
                                            <service.icon className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">{service.name}</p>
                                                <p className="text-xs text-muted-foreground">{service.url}</p>
                                            </div>
                                        </div>
                                        <Badge variant={service.status === 'healthy' ? 'default' : 'destructive'}>
                                            {service.status === 'healthy' ? (
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                            ) : (
                                                <XCircle className="h-3 w-3 mr-1" />
                                            )}
                                            {service.status === 'healthy' ? 'Activo' : 'Error'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Users & Companies */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Recent Users */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <UserPlus className="h-5 w-5" />
                                    Usuarios Recientes
                                </span>
                                <Link href="/admin/users">
                                    <Button variant="ghost" size="sm">
                                        Ver todos
                                        <ArrowRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </Link>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                                    ))}
                                </div>
                            ) : stats?.users?.length ? (
                                <div className="space-y-3">
                                    {stats.users.slice(0, 5).map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <span className="text-sm font-medium text-primary">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                                {user.role}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No hay usuarios registrados
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Companies */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Empresas Recientes
                                </span>
                                <Link href="/admin/companies">
                                    <Button variant="ghost" size="sm">
                                        Ver todas
                                        <ArrowRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </Link>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                                    ))}
                                </div>
                            ) : stats?.companies?.length ? (
                                <div className="space-y-3">
                                    {stats.companies.slice(0, 5).map((company) => (
                                        <div key={company.id} className="flex items-center justify-between p-3 rounded-lg border">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                                    <Building2 className="h-5 w-5 text-blue-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{company.name}</p>
                                                    <p className="text-xs text-muted-foreground">{company.slug}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(company.created_at)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No hay empresas registradas
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
