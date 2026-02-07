import { Head, Link } from '@inertiajs/react';
import debugLog from '@/utils/debugLogger';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Building2,
    Search,
    RefreshCw,
    ArrowLeft,
    Users,
    MessageSquare,
    Calendar,
    Globe,
    CheckCircle2,
    XCircle,
    ExternalLink
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface Company {
    id: number;
    name: string;
    slug: string;
    email?: string;
    phone?: string;
    is_active: boolean;
    chatwoot_inbox_id?: number;
    created_at: string;
    users_count?: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Empresas', href: '/admin/companies' },
];

export default function AdminCompanies() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const response = await fetch('/admin/api/companies');
            const data = await response.json();
            setCompanies(data.companies || []);
        } catch (error) {
            debugLog.error('Error fetching companies:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const filteredCompanies = companies.filter(company => 
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Empresas" />

            <div className="flex flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                                <Building2 className="h-8 w-8 text-primary" />
                                Gestión de Empresas
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Administra todas las empresas registradas
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={fetchCompanies} variant="outline" size="sm" disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Building2 className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{companies.length}</p>
                                    <p className="text-sm text-muted-foreground">Total empresas</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{companies.filter(c => c.is_active).length}</p>
                                    <p className="text-sm text-muted-foreground">Activas</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <MessageSquare className="h-6 w-6 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{companies.filter(c => c.chatwoot_inbox_id).length}</p>
                                    <p className="text-sm text-muted-foreground">Con Chatwoot</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-gray-500/10 rounded-lg">
                                    <XCircle className="h-6 w-6 text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{companies.filter(c => !c.is_active).length}</p>
                                    <p className="text-sm text-muted-foreground">Inactivas</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search & List */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Lista de Empresas</CardTitle>
                                <CardDescription>
                                    {filteredCompanies.length} empresas encontradas
                                </CardDescription>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar empresas..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                                ))}
                            </div>
                        ) : filteredCompanies.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {filteredCompanies.map((company) => (
                                    <Card key={company.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="pt-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <Building2 className="h-6 w-6 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold">{company.name}</h3>
                                                        <p className="text-sm text-muted-foreground">{company.slug}</p>
                                                    </div>
                                                </div>
                                                <Badge variant={company.is_active ? 'default' : 'secondary'}>
                                                    {company.is_active ? 'Activa' : 'Inactiva'}
                                                </Badge>
                                            </div>
                                            
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>Creada: {formatDate(company.created_at)}</span>
                                                </div>
                                                {company.chatwoot_inbox_id && (
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <MessageSquare className="h-4 w-4" />
                                                        <span>Inbox ID: {company.chatwoot_inbox_id}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 mt-4 pt-4 border-t">
                                                <Button variant="outline" size="sm" className="flex-1">
                                                    <Users className="h-4 w-4 mr-1" />
                                                    Usuarios
                                                </Button>
                                                <Button variant="outline" size="sm" className="flex-1">
                                                    <ExternalLink className="h-4 w-4 mr-1" />
                                                    Ver
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-lg font-medium">No se encontraron empresas</p>
                                <p className="text-sm text-muted-foreground">
                                    Intenta con otro término de búsqueda
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
