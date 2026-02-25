import { Head, Link } from '@inertiajs/react';
import debugLog from '@/utils/debugLogger';
import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Ticket,
    Search,
    RefreshCw,
    ArrowLeft,
    Send,
    Clock,
    CheckCircle2,
    XCircle,
    MessageSquare,
    Filter,
    User,
    Mail,
    ChevronRight,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

/* ── Types ── */
interface TicketReply {
    id: string;
    ticket_id: string;
    author_type: 'admin' | 'client';
    author_name: string;
    author_email: string;
    body: string;
    created_at: string;
}

interface SupportTicket {
    id: string;
    email: string;
    name: string | null;
    subject: string;
    description: string;
    category: string;
    status: string;
    closed_at: string | null;
    assigned_to: number | null;
    assignee?: { id: number; name: string; email: string } | null;
    replies?: TicketReply[];
    replies_count?: number;
    created_at: string;
    updated_at: string;
}

/* ── Helpers ── */
const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    abierto:     { label: 'Abierto',     color: 'bg-amber-500/15 text-amber-400 border-amber-500/20',     icon: AlertCircle },
    respondido:  { label: 'Respondido',  color: 'bg-blue-500/15 text-blue-400 border-blue-500/20',        icon: MessageSquare },
    en_progreso: { label: 'En progreso', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20',  icon: Clock },
    cerrado:     { label: 'Cerrado',     color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
};

const categoryColors: Record<string, string> = {
    'General': 'bg-gray-500/15 text-gray-400',
    'Canales (WhatsApp, IG, etc.)': 'bg-green-500/15 text-green-400',
    'IA y automatización': 'bg-violet-500/15 text-violet-400',
    'Facturación': 'bg-orange-500/15 text-orange-400',
    'API e integraciones': 'bg-cyan-500/15 text-cyan-400',
    'Cuenta y acceso': 'bg-rose-500/15 text-rose-400',
    'Otro': 'bg-gray-500/15 text-gray-400',
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days}d`;
    return new Date(dateStr).toLocaleDateString('es-CL', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CL', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Tickets', href: '/admin/tickets' },
];

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function AdminTickets() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    /* ── Fetch list ── */
    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            if (searchTerm) params.set('search', searchTerm);
            const res = await fetch(`/admin/api/tickets?${params}`);
            const data = await res.json();
            setTickets(data.tickets || []);
        } catch (err) {
            debugLog.error('Error fetching tickets:', err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, searchTerm]);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    /* ── Fetch single ticket detail ── */
    const openTicket = async (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        setDetailLoading(true);
        setReplyText('');
        try {
            const res = await fetch(`/admin/api/tickets/${ticket.id}`);
            const data = await res.json();
            setSelectedTicket(data.ticket);
        } catch (err) {
            debugLog.error('Error fetching ticket detail:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    /* ── Reply ── */
    const handleReply = async () => {
        if (!selectedTicket || !replyText.trim()) return;
        setReplying(true);
        try {
            const res = await fetch(`/admin/api/tickets/${selectedTicket.id}/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ body: replyText }),
            });
            const data = await res.json();
            if (data.success) {
                setSelectedTicket(data.ticket);
                setReplyText('');
                fetchTickets(); // refresh list counts
            }
        } catch (err) {
            debugLog.error('Error replying:', err);
        } finally {
            setReplying(false);
        }
    };

    /* ── Change status ── */
    const changeStatus = async (ticketId: string, newStatus: string) => {
        try {
            const res = await fetch(`/admin/api/tickets/${ticketId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                if (selectedTicket?.id === ticketId) {
                    setSelectedTicket(prev => prev ? { ...prev, status: newStatus, closed_at: data.ticket.closed_at } : null);
                }
                fetchTickets();
            }
        } catch (err) {
            debugLog.error('Error updating status:', err);
        }
    };

    /* ── Stats ── */
    const openCount = tickets.filter(t => t.status === 'abierto').length;
    const respondedCount = tickets.filter(t => t.status === 'respondido').length;
    const closedCount = tickets.filter(t => t.status === 'cerrado').length;

    /* ── Render ── */
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tickets de Soporte — Admin" />

            <div className="flex h-[calc(100vh-4rem)]">
                {/* ───────── LEFT PANEL: TICKET LIST ───────── */}
                <div className={`${selectedTicket ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[420px] lg:min-w-[420px] border-r border-white/[0.06]`}>
                    {/* Header */}
                    <div className="p-4 border-b border-white/[0.06] space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Link href="/admin/dashboard">
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <ArrowLeft className="w-4 h-4" />
                                    </Button>
                                </Link>
                                <h1 className="text-lg font-semibold">Tickets de Soporte</h1>
                                <Badge variant="outline" className="ml-1 text-xs">{tickets.length}</Badge>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchTickets} disabled={loading}>
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>

                        {/* Stats mini */}
                        <div className="flex gap-2 text-[11px]">
                            <span className="text-amber-400">{openCount} abiertos</span>
                            <span className="text-white/20">|</span>
                            <span className="text-blue-400">{respondedCount} respondidos</span>
                            <span className="text-white/20">|</span>
                            <span className="text-emerald-400">{closedCount} cerrados</span>
                        </div>

                        {/* Search + filters */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                                <Input
                                    placeholder="Buscar por email, nombre o asunto..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 h-8 text-sm bg-white/[0.03] border-white/[0.08]"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-8 px-2 text-xs rounded-md border border-white/[0.08] bg-white/[0.03] text-white/60 focus:outline-none"
                            >
                                <option value="">Todos</option>
                                <option value="abierto">Abierto</option>
                                <option value="respondido">Respondido</option>
                                <option value="en_progreso">En progreso</option>
                                <option value="cerrado">Cerrado</option>
                            </select>
                        </div>
                    </div>

                    {/* Ticket list */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-white/30">
                                <Ticket className="w-8 h-8 mb-2" />
                                <p className="text-sm">No hay tickets</p>
                            </div>
                        ) : (
                            tickets.map((ticket) => {
                                const sc = statusConfig[ticket.status] || statusConfig.abierto;
                                return (
                                    <button
                                        key={ticket.id}
                                        onClick={() => openTicket(ticket)}
                                        className={`w-full text-left p-4 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                                            selectedTicket?.id === ticket.id ? 'bg-white/[0.05]' : ''
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <p className="text-sm font-medium text-white/90 line-clamp-1">{ticket.subject}</p>
                                            <span className="text-[10px] text-white/25 whitespace-nowrap">{timeAgo(ticket.created_at)}</span>
                                        </div>
                                        <p className="text-xs text-white/40 mb-2 line-clamp-1">{ticket.description}</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.color}`}>
                                                {sc.label}
                                            </Badge>
                                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryColors[ticket.category] || 'bg-gray-500/15 text-gray-400'}`}>
                                                {ticket.category}
                                            </Badge>
                                            {(ticket.replies_count ?? 0) > 0 && (
                                                <span className="text-[10px] text-white/20 flex items-center gap-0.5">
                                                    <MessageSquare className="w-2.5 h-2.5" />
                                                    {ticket.replies_count}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-white/20 ml-auto flex items-center gap-1">
                                                <Mail className="w-2.5 h-2.5" />
                                                {ticket.email}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ───────── RIGHT PANEL: TICKET DETAIL ───────── */}
                <div className={`${selectedTicket ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0`}>
                    {!selectedTicket ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                            <MessageSquare className="w-10 h-10 mb-3" />
                            <p className="text-sm">Selecciona un ticket para ver los detalles</p>
                        </div>
                    ) : (
                        <>
                            {/* Detail header */}
                            <div className="p-4 border-b border-white/[0.06] space-y-2">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost" size="icon" className="h-7 w-7 lg:hidden"
                                        onClick={() => setSelectedTicket(null)}
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </Button>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-base font-semibold text-white/90 truncate">{selectedTicket.subject}</h2>
                                        <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                                            <span>{selectedTicket.name || selectedTicket.email}</span>
                                            <span className="text-white/10">•</span>
                                            <span>{formatDate(selectedTicket.created_at)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status + actions */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {(['abierto', 'respondido', 'en_progreso', 'cerrado'] as const).map((s) => {
                                        const sc = statusConfig[s];
                                        const active = selectedTicket.status === s;
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => changeStatus(selectedTicket.id, s)}
                                                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-all ${
                                                    active
                                                        ? sc.color + ' border-current'
                                                        : 'border-white/[0.06] text-white/25 hover:text-white/50'
                                                }`}
                                            >
                                                {sc.label}
                                            </button>
                                        );
                                    })}
                                    <Badge variant="outline" className={`ml-auto text-[10px] ${categoryColors[selectedTicket.category] || ''}`}>
                                        {selectedTicket.category}
                                    </Badge>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {detailLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Original ticket message */}
                                        <div className="flex gap-3">
                                            <Avatar className="h-8 w-8 shrink-0 bg-amber-500/20">
                                                <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xs">
                                                    {(selectedTicket.name || selectedTicket.email).charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium text-white/80">
                                                        {selectedTicket.name || selectedTicket.email}
                                                    </span>
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-400/60 border-amber-500/20">
                                                        Cliente
                                                    </Badge>
                                                    <span className="text-[10px] text-white/20">{formatDate(selectedTicket.created_at)}</span>
                                                </div>
                                                <div className="text-sm text-white/60 whitespace-pre-wrap bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                                                    {selectedTicket.description}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Replies */}
                                        {selectedTicket.replies?.map((reply) => {
                                            const isAdmin = reply.author_type === 'admin';
                                            return (
                                                <div key={reply.id} className="flex gap-3">
                                                    <Avatar className={`h-8 w-8 shrink-0 ${isAdmin ? 'bg-blue-500/20' : 'bg-amber-500/20'}`}>
                                                        <AvatarFallback className={`text-xs ${isAdmin ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                            {reply.author_name.charAt(0).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm font-medium text-white/80">{reply.author_name}</span>
                                                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                                                                isAdmin
                                                                    ? 'bg-blue-500/10 text-blue-400/60 border-blue-500/20'
                                                                    : 'bg-amber-500/10 text-amber-400/60 border-amber-500/20'
                                                            }`}>
                                                                {isAdmin ? 'Admin' : 'Cliente'}
                                                            </Badge>
                                                            <span className="text-[10px] text-white/20">{formatDate(reply.created_at)}</span>
                                                        </div>
                                                        <div className={`text-sm text-white/60 whitespace-pre-wrap rounded-lg p-3 border ${
                                                            isAdmin
                                                                ? 'bg-blue-500/[0.03] border-blue-500/[0.08]'
                                                                : 'bg-white/[0.02] border-white/[0.04]'
                                                        }`}>
                                                            {reply.body}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>

                            {/* Reply input */}
                            <div className="p-4 border-t border-white/[0.06]">
                                <div className="flex gap-2">
                                    <textarea
                                        placeholder="Escribe una respuesta..."
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                e.preventDefault();
                                                handleReply();
                                            }
                                        }}
                                        rows={2}
                                        className="flex-1 resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-blue-500/30"
                                    />
                                    <Button
                                        onClick={handleReply}
                                        disabled={!replyText.trim() || replying}
                                        className="self-end bg-blue-600 hover:bg-blue-700 text-white px-4"
                                    >
                                        {replying ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-white/15 mt-1">Ctrl+Enter para enviar</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
