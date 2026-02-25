import { useState, useEffect, useCallback } from 'react';
import {
    Ticket,
    Send,
    Plus,
    ArrowLeft,
    Clock,
    CheckCircle2,
    MessageSquare,
    AlertCircle,
    Loader2,
    ChevronDown,
    Headphones,
} from 'lucide-react';

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
    replies?: TicketReply[];
    replies_count?: number;
    created_at: string;
    updated_at: string;
}

/* ── Helpers ── */
const statusLabels: Record<string, { label: string; class: string }> = {
    abierto:     { label: 'Abierto',     class: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
    respondido:  { label: 'Respondido',  class: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
    en_progreso: { label: 'En progreso', class: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400' },
    cerrado:     { label: 'Cerrado',     class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
};

const categoryOptions = [
    'General',
    'Canales (WhatsApp, IG, etc.)',
    'IA y automatización',
    'Facturación',
    'API e integraciones',
    'Cuenta y acceso',
    'Otro',
];

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

function getCsrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function SupportTickets() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    // New ticket form
    const [showNewForm, setShowNewForm] = useState(false);
    const [newSubject, setNewSubject] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newCategory, setNewCategory] = useState('General');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    /* ── Fetch tickets ── */
    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/my-tickets');
            const data = await res.json();
            setTickets(data.tickets || []);
        } catch (err) {
            console.error('Error fetching tickets:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    /* ── Open ticket detail ── */
    const openTicket = async (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        setDetailLoading(true);
        setReplyText('');
        setShowNewForm(false);
        try {
            const res = await fetch(`/api/my-tickets/${ticket.id}`);
            const data = await res.json();
            setSelectedTicket(data.ticket);
        } catch (err) {
            console.error('Error fetching ticket:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    /* ── Reply ── */
    const handleReply = async () => {
        if (!selectedTicket || !replyText.trim()) return;
        setReplying(true);
        try {
            const res = await fetch(`/api/my-tickets/${selectedTicket.id}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
                body: JSON.stringify({ body: replyText }),
            });
            const data = await res.json();
            if (data.success) {
                setSelectedTicket(data.ticket);
                setReplyText('');
                fetchTickets();
            }
        } catch (err) {
            console.error('Error replying:', err);
        } finally {
            setReplying(false);
        }
    };

    /* ── Create ticket ── */
    const handleCreate = async () => {
        if (!newSubject.trim() || !newDescription.trim()) return;
        setCreating(true);
        setCreateError('');
        try {
            const res = await fetch('/api/my-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
                body: JSON.stringify({
                    subject: newSubject,
                    description: newDescription,
                    category: newCategory,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setNewSubject('');
                setNewDescription('');
                setNewCategory('General');
                setShowNewForm(false);
                fetchTickets();
                // Open the newly created ticket
                if (data.ticket) openTicket(data.ticket);
            } else {
                setCreateError(data.message || 'Error al crear el ticket');
            }
        } catch (err) {
            setCreateError('Error de conexión. Intenta de nuevo.');
        } finally {
            setCreating(false);
        }
    };

    const openCount = tickets.filter(t => t.status !== 'cerrado').length;

    /* ── Render ── */
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Headphones className="w-5 h-5 text-neutral-400" />
                        <div>
                            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white/90">Soporte</h1>
                            <p className="text-xs text-neutral-500 dark:text-white/40">
                                {openCount} ticket{openCount !== 1 ? 's' : ''} activo{openCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setShowNewForm(true); setSelectedTicket(null); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white/10 dark:hover:bg-white/15 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Nuevo ticket
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* ───────── LEFT: TICKET LIST ───────── */}
                <div className={`${selectedTicket || showNewForm ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[340px] lg:min-w-[340px] border-r border-neutral-200 dark:border-white/[0.06]`}>
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-6">
                                <Ticket className="w-10 h-10 text-neutral-300 dark:text-white/15 mb-3" />
                                <p className="text-sm text-neutral-500 dark:text-white/30 text-center">
                                    Aún no tienes tickets de soporte
                                </p>
                                <button
                                    onClick={() => setShowNewForm(true)}
                                    className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    Crear el primero
                                </button>
                            </div>
                        ) : (
                            tickets.map((ticket) => {
                                const sc = statusLabels[ticket.status] || statusLabels.abierto;
                                return (
                                    <button
                                        key={ticket.id}
                                        onClick={() => { openTicket(ticket); setShowNewForm(false); }}
                                        className={`w-full text-left px-4 py-3 border-b border-neutral-100 dark:border-white/[0.04] hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors ${
                                            selectedTicket?.id === ticket.id ? 'bg-neutral-100 dark:bg-white/[0.05]' : ''
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <p className="text-sm font-medium text-neutral-800 dark:text-white/85 truncate">
                                                {ticket.subject}
                                            </p>
                                            <span className="text-[10px] text-neutral-400 dark:text-white/25 whitespace-nowrap">
                                                {timeAgo(ticket.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-neutral-500 dark:text-white/35 truncate mb-1.5">
                                            {ticket.description}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sc.class}`}>
                                                {sc.label}
                                            </span>
                                            {(ticket.replies_count ?? 0) > 0 && (
                                                <span className="text-[10px] text-neutral-400 dark:text-white/20 flex items-center gap-0.5">
                                                    <MessageSquare className="w-2.5 h-2.5" />
                                                    {ticket.replies_count}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ───────── RIGHT: DETAIL OR NEW FORM ───────── */}
                <div className={`${selectedTicket || showNewForm ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0`}>
                    {showNewForm ? (
                        /* ── NEW TICKET FORM ── */
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="max-w-lg mx-auto">
                                <div className="flex items-center gap-2 mb-6">
                                    <button
                                        onClick={() => setShowNewForm(false)}
                                        className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-white/10 lg:hidden"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white/90">
                                        Nuevo ticket de soporte
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-600 dark:text-white/50 mb-1">Categoría</label>
                                        <select
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-neutral-300 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-neutral-900 dark:text-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        >
                                            {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-600 dark:text-white/50 mb-1">Asunto</label>
                                        <input
                                            type="text"
                                            value={newSubject}
                                            onChange={(e) => setNewSubject(e.target.value)}
                                            placeholder="Describe brevemente el problema"
                                            className="w-full h-9 px-3 text-sm rounded-lg border border-neutral-300 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-neutral-900 dark:text-white/80 placeholder:text-neutral-400 dark:placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-600 dark:text-white/50 mb-1">Descripción</label>
                                        <textarea
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            placeholder="Explica el problema con todo el detalle posible..."
                                            rows={6}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-neutral-900 dark:text-white/80 placeholder:text-neutral-400 dark:placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                                        />
                                    </div>

                                    {createError && (
                                        <div className="text-xs text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {createError}
                                        </div>
                                    )}

                                    <button
                                        onClick={handleCreate}
                                        disabled={!newSubject.trim() || !newDescription.trim() || creating}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {creating ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Send className="w-3.5 h-3.5" />
                                                Enviar ticket
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : selectedTicket ? (
                        /* ── TICKET DETAIL ── */
                        <>
                            {/* Header */}
                            <div className="px-5 py-3 border-b border-neutral-200 dark:border-white/[0.06]">
                                <div className="flex items-center gap-2 mb-1">
                                    <button
                                        onClick={() => setSelectedTicket(null)}
                                        className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-white/10 lg:hidden"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-white/85 truncate">
                                        {selectedTicket.subject}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-white/35">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${(statusLabels[selectedTicket.status] || statusLabels.abierto).class}`}>
                                        {(statusLabels[selectedTicket.status] || statusLabels.abierto).label}
                                    </span>
                                    <span>{selectedTicket.category}</span>
                                    <span className="text-neutral-300 dark:text-white/10">•</span>
                                    <span>{formatDate(selectedTicket.created_at)}</span>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {detailLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Original message */}
                                        <div className="rounded-lg border border-neutral-200 dark:border-white/[0.06] p-4">
                                            <div className="flex items-center gap-2 mb-2 text-xs text-neutral-500 dark:text-white/40">
                                                <span className="font-medium text-neutral-700 dark:text-white/60">Tú</span>
                                                <span>{formatDate(selectedTicket.created_at)}</span>
                                            </div>
                                            <p className="text-sm text-neutral-700 dark:text-white/60 whitespace-pre-wrap">
                                                {selectedTicket.description}
                                            </p>
                                        </div>

                                        {/* Replies */}
                                        {selectedTicket.replies?.map((reply) => {
                                            const isAdmin = reply.author_type === 'admin';
                                            return (
                                                <div
                                                    key={reply.id}
                                                    className={`rounded-lg border p-4 ${
                                                        isAdmin
                                                            ? 'border-blue-200 bg-blue-50 dark:border-blue-500/10 dark:bg-blue-500/[0.04]'
                                                            : 'border-neutral-200 dark:border-white/[0.06]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 mb-2 text-xs">
                                                        <span className={`font-medium ${
                                                            isAdmin
                                                                ? 'text-blue-600 dark:text-blue-400'
                                                                : 'text-neutral-700 dark:text-white/60'
                                                        }`}>
                                                            {isAdmin ? `${reply.author_name} (Soporte)` : 'Tú'}
                                                        </span>
                                                        <span className="text-neutral-400 dark:text-white/25">{formatDate(reply.created_at)}</span>
                                                    </div>
                                                    <p className="text-sm text-neutral-700 dark:text-white/60 whitespace-pre-wrap">
                                                        {reply.body}
                                                    </p>
                                                </div>
                                            );
                                        })}

                                        {selectedTicket.status === 'cerrado' && (
                                            <div className="text-center text-xs text-neutral-400 dark:text-white/20 py-2">
                                                <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
                                                Ticket cerrado
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Reply input (only for non-closed tickets) */}
                            {selectedTicket.status !== 'cerrado' && (
                                <div className="p-4 border-t border-neutral-200 dark:border-white/[0.06]">
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
                                            className="flex-1 resize-none rounded-lg border border-neutral-300 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-3 text-sm text-neutral-800 dark:text-white/80 placeholder:text-neutral-400 dark:placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        />
                                        <button
                                            onClick={handleReply}
                                            disabled={!replyText.trim() || replying}
                                            className="self-end px-3 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {replying ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-neutral-400 dark:text-white/15 mt-1">Ctrl+Enter para enviar</p>
                                </div>
                            )}
                        </>
                    ) : (
                        /* ── EMPTY STATE ── */
                        <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 dark:text-white/20">
                            <MessageSquare className="w-10 h-10 mb-3" />
                            <p className="text-sm">Selecciona un ticket o crea uno nuevo</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
