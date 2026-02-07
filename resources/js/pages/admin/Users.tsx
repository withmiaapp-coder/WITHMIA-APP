import { Head, Link, router } from '@inertiajs/react';
import debugLog from '@/utils/debugLogger';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    Users,
    Search,
    RefreshCw,
    UserPlus,
    Shield,
    Mail,
    Calendar,
    MoreHorizontal,
    Pencil,
    Trash2,
    ArrowLeft,
    Check,
    X,
    Building2
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
    company_id?: number;
    company_name?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Usuarios', href: '/admin/users' },
];

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editRole, setEditRole] = useState('');
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/admin/api/users');
            const data = await response.json();
            setUsers(data.users || []);
        } catch (error) {
            debugLog.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setEditRole(user.role);
        setIsEditDialogOpen(true);
    };

    const handleSaveRole = async () => {
        if (!editingUser) return;
        
        setIsSaving(true);
        try {
            const response = await fetch(`/admin/api/users/${editingUser.id}/role`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ role: editRole }),
            });
            
            if (response.ok) {
                setUsers(prev => prev.map(u => 
                    u.id === editingUser.id ? { ...u, role: editRole } : u
                ));
                setIsEditDialogOpen(false);
            }
        } catch (error) {
            debugLog.error('Error updating role:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
            return;
        }
        
        try {
            const response = await fetch(`/admin/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            
            if (response.ok) {
                setUsers(prev => prev.filter(u => u.id !== userId));
            }
        } catch (error) {
            debugLog.error('Error deleting user:', error);
        }
    };

    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'admin':
                return 'default';
            case 'manager':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Usuarios" />

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
                                <Users className="h-8 w-8 text-primary" />
                                Gestión de Usuarios
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Administra todos los usuarios de la plataforma
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={fetchUsers} variant="outline" size="sm" disabled={loading}>
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
                                    <Users className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{users.length}</p>
                                    <p className="text-sm text-muted-foreground">Total usuarios</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Shield className="h-6 w-6 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
                                    <p className="text-sm text-muted-foreground">Administradores</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <Building2 className="h-6 w-6 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{users.filter(u => u.role === 'manager').length}</p>
                                    <p className="text-sm text-muted-foreground">Managers</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-gray-500/10 rounded-lg">
                                    <UserPlus className="h-6 w-6 text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{users.filter(u => u.role === 'user').length}</p>
                                    <p className="text-sm text-muted-foreground">Usuarios</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search & Filters */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Lista de Usuarios</CardTitle>
                                <CardDescription>
                                    {filteredUsers.length} usuarios encontrados
                                </CardDescription>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar usuarios..."
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
                                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                                ))}
                            </div>
                        ) : filteredUsers.length > 0 ? (
                            <div className="space-y-2">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground">
                                    <div className="col-span-4">Usuario</div>
                                    <div className="col-span-3">Email</div>
                                    <div className="col-span-2">Rol</div>
                                    <div className="col-span-2">Fecha</div>
                                    <div className="col-span-1 text-right">Acciones</div>
                                </div>
                                
                                {/* Users List */}
                                {filteredUsers.map((user) => (
                                    <div key={user.id} className="grid grid-cols-12 gap-4 p-3 rounded-lg border items-center hover:bg-muted/30 transition-colors">
                                        <div className="col-span-4 flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <span className="text-sm font-medium text-primary">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-3">
                                            <p className="text-sm truncate">{user.email}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <Badge variant={getRoleBadgeVariant(user.role)}>
                                                {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                                                {user.role}
                                            </Badge>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(user.created_at)}
                                            </p>
                                        </div>
                                        <div className="col-span-1 flex justify-end gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8"
                                                onClick={() => handleEditUser(user)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteUser(user.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-lg font-medium">No se encontraron usuarios</p>
                                <p className="text-sm text-muted-foreground">
                                    Intenta con otro término de búsqueda
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Role Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Usuario</DialogTitle>
                        <DialogDescription>
                            Cambiar el rol de {editingUser?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={editingUser?.email || ''} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Rol</Label>
                            <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">Usuario</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveRole} disabled={isSaving}>
                            {isSaving ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4 mr-2" />
                            )}
                            Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
