import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useTheme } from '@/contexts/ThemeContext';

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

    /* ── Theme ── */
    const { hasTheme, isDark } = useTheme();
    const th = useMemo(() => {
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
            subtleBg: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
            hoverBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            activeBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
            borderSubtle: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        };
    }, [hasTheme, isDark]);

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
            <div
                className={!th ? 'px-6 py-4 border-b border-neutral-200 dark:border-white/[0.06]' : 'px-6 py-4 border-b'}
                style={th ? { borderColor: th.border } : undefined}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Headphones
                            className={!th ? 'w-5 h-5 text-neutral-400' : 'w-5 h-5'}
                            style={th ? { color: th.accent } : undefined}
                        />
                        <div>
                            <h1
                                className={`text-lg font-semibold ${!th ? 'text-neutral-900 dark:text-white/90' : ''}`}
                                style={th ? { color: th.textPrimary } : undefined}
                            >Soporte</h1>
                            <p
                                className={`text-xs ${!th ? 'text-neutral-500 dark:text-white/40' : ''}`}
                                style={th ? { color: th.textMuted } : undefined}
                            >
                                {openCount} ticket{openCount !== 1 ? 's' : ''} activo{openCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setShowNewForm(true); setSelectedTicket(null); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!th ? 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white/10 dark:hover:bg-white/15' : 'text-white'}`}
                        style={th ? { background: th.accent } : undefined}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Nuevo ticket
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* ───────── LEFT: TICKET LIST ───────── */}
                <div
                    className={`${selectedTicket || showNewForm ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[340px] lg:min-w-[340px] ${!th ? 'border-r border-neutral-200 dark:border-white/[0.06]' : 'border-r'}`}
                    style={th ? { borderColor: th.border } : undefined}
                >
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2
                                    className={!th ? 'w-5 h-5 animate-spin text-neutral-400' : 'w-5 h-5 animate-spin'}
                                    style={th ? { color: th.textMuted } : undefined}
                                />
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-6">
                                <Ticket
                                    className={!th ? 'w-10 h-10 text-neutral-300 dark:text-white/15 mb-3' : 'w-10 h-10 mb-3'}
                                    style={th ? { color: th.textMuted } : undefined}
                                />
                                <p
                                    className={`text-sm text-center ${!th ? 'text-neutral-500 dark:text-white/30' : ''}`}
                                    style={th ? { color: th.textMuted } : undefined}
                                >
                                    Aún no tienes tickets de soporte
                                </p>
                                <button
                                    onClick={() => setShowNewForm(true)}
                                    className={`mt-3 text-sm hover:underline ${!th ? 'text-blue-600 dark:text-blue-400' : ''}`}
                                    style={th ? { color: th.accent } : undefined}
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
                                        className={`w-full text-left px-4 py-3 transition-colors ${
                                            !th
                                                ? `border-b border-neutral-100 dark:border-white/[0.04] hover:bg-neutral-50 dark:hover:bg-white/[0.03] ${selectedTicket?.id === ticket.id ? 'bg-neutral-100 dark:bg-white/[0.05]' : ''}`
                                                : 'border-b'
                                        }`}
                                        style={th ? {
                                            borderColor: th.borderSubtle,
                                            background: selectedTicket?.id === ticket.id ? th.activeBg : undefined,
                                        } : undefined}
                                        onMouseEnter={th ? (e) => { if (selectedTicket?.id !== ticket.id) (e.currentTarget as HTMLElement).style.background = th.hoverBg; } : undefined}
                                        onMouseLeave={th ? (e) => { if (selectedTicket?.id !== ticket.id) (e.currentTarget as HTMLElement).style.background = ''; } : undefined}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <p
                                                className={`text-sm font-medium truncate ${!th ? 'text-neutral-800 dark:text-white/85' : ''}`}
                                                style={th ? { color: th.textPrimary } : undefined}
                                            >
                                                {ticket.subject}
                                            </p>
                                            <span
                                                className={`text-[10px] whitespace-nowrap ${!th ? 'text-neutral-400 dark:text-white/25' : ''}`}
                                                style={th ? { color: th.textMuted } : undefined}
                                            >
                                                {timeAgo(ticket.created_at)}
                                            </span>
                                        </div>
                                        <p
                                            className={`text-xs truncate mb-1.5 ${!th ? 'text-neutral-500 dark:text-white/35' : ''}`}
                                            style={th ? { color: th.textSec } : undefined}
                                        >
                                            {ticket.description}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sc.class}`}>
                                                {sc.label}
                                            </span>
                                            {(ticket.replies_count ?? 0) > 0 && (
                                                <span
                                                    className={`text-[10px] flex items-center gap-0.5 ${!th ? 'text-neutral-400 dark:text-white/20' : ''}`}
                                                    style={th ? { color: th.textMuted } : undefined}
                                                >
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
                                        className={`p-1 rounded lg:hidden ${!th ? 'hover:bg-neutral-100 dark:hover:bg-white/10' : ''}`}
                                        style={th ? { color: th.textSec } : undefined}
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <h2
                                        className={`text-base font-semibold ${!th ? 'text-neutral-900 dark:text-white/90' : ''}`}
                                        style={th ? { color: th.textPrimary } : undefined}
                                    >
                                        Nuevo ticket de soporte
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label
                                            className={`block text-xs font-medium mb-1 ${!th ? 'text-neutral-600 dark:text-white/50' : ''}`}
                                            style={th ? { color: th.textSec } : undefined}
                                        >Categoría</label>
                                        <select
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            className={`w-full h-9 px-3 text-sm rounded-lg border focus:outline-none ${!th ? 'focus:ring-2 border-neutral-300 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-neutral-900 dark:text-white/80 focus:ring-blue-500/30' : 'focus:ring-0'}`}
                                            style={th ? { background: th.inputBg, borderColor: th.inputBorder, color: th.textPrimary } : undefined}
                                        >
                                            {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label
                                            className={`block text-xs font-medium mb-1 ${!th ? 'text-neutral-600 dark:text-white/50' : ''}`}
                                            style={th ? { color: th.textSec } : undefined}
                                        >Asunto</label>
                                        <input
                                            type="text"
                                            value={newSubject}
                                            onChange={(e) => setNewSubject(e.target.value)}
                                            placeholder="Describe brevemente el problema"
                                            className={`w-full h-9 px-3 text-sm rounded-lg border focus:outline-none ${!th ? 'focus:ring-2 border-neutral-300 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-neutral-900 dark:text-white/80 placeholder:text-neutral-400 dark:placeholder:text-white/25 focus:ring-blue-500/30' : 'focus:ring-0'}`}
                                            style={th ? { background: th.inputBg, borderColor: th.inputBorder, color: th.textPrimary } : undefined}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            className={`block text-xs font-medium mb-1 ${!th ? 'text-neutral-600 dark:text-white/50' : ''}`}
                                            style={th ? { color: th.textSec } : undefined}
                                        >Descripción</label>
                                        <textarea
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            placeholder="Explica el problema con todo el detalle posible..."
                                            rows={6}
                                            className={`w-full px-3 py-2 text-sm rounded-lg border resize-none focus:outline-none ${!th ? 'focus:ring-2 border-neutral-300 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-neutral-900 dark:text-white/80 placeholder:text-neutral-400 dark:placeholder:text-white/25 focus:ring-blue-500/30' : 'focus:ring-0'}`}
                                            style={th ? { background: th.inputBg, borderColor: th.inputBorder, color: th.textPrimary } : undefined}
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
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${!th ? 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-700' : 'text-white'}`}
                                        style={th ? { background: th.accent } : undefined}
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
                            <div
                                className={!th ? 'px-5 py-3 border-b border-neutral-200 dark:border-white/[0.06]' : 'px-5 py-3 border-b'}
                                style={th ? { borderColor: th.border } : undefined}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <button
                                        onClick={() => setSelectedTicket(null)}
                                        className={`p-1 rounded lg:hidden ${!th ? 'hover:bg-neutral-100 dark:hover:bg-white/10' : ''}`}
                                        style={th ? { color: th.textSec } : undefined}
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <h2
                                        className={`text-sm font-semibold truncate ${!th ? 'text-neutral-900 dark:text-white/85' : ''}`}
                                        style={th ? { color: th.textPrimary } : undefined}
                                    >
                                        {selectedTicket.subject}
                                    </h2>
                                </div>
                                <div
                                    className={`flex items-center gap-2 text-xs ${!th ? 'text-neutral-500 dark:text-white/35' : ''}`}
                                    style={th ? { color: th.textSec } : undefined}
                                >
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${(statusLabels[selectedTicket.status] || statusLabels.abierto).class}`}>
                                        {(statusLabels[selectedTicket.status] || statusLabels.abierto).label}
                                    </span>
                                    <span>{selectedTicket.category}</span>
                                    <span
                                        className={!th ? 'text-neutral-300 dark:text-white/10' : ''}
                                        style={th ? { color: th.textMuted } : undefined}
                                    >•</span>
                                    <span>{formatDate(selectedTicket.created_at)}</span>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {detailLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2
                                            className={!th ? 'w-5 h-5 animate-spin text-neutral-400' : 'w-5 h-5 animate-spin'}
                                            style={th ? { color: th.textMuted } : undefined}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {/* Original message */}
                                        <div
                                            className={`rounded-lg border p-4 ${!th ? 'border-neutral-200 dark:border-white/[0.06]' : ''}`}
                                            style={th ? { borderColor: th.cardBorder, background: th.subtleBg } : undefined}
                                        >
                                            <div className="flex items-center gap-2 mb-2 text-xs">
                                                <span
                                                    className={`font-medium ${!th ? 'text-neutral-700 dark:text-white/60' : ''}`}
                                                    style={th ? { color: th.textSec } : undefined}
                                                >Tú</span>
                                                <span
                                                    className={!th ? 'text-neutral-500 dark:text-white/40' : ''}
                                                    style={th ? { color: th.textMuted } : undefined}
                                                >{formatDate(selectedTicket.created_at)}</span>
                                            </div>
                                            <p
                                                className={`text-sm whitespace-pre-wrap ${!th ? 'text-neutral-700 dark:text-white/60' : ''}`}
                                                style={th ? { color: th.textSec } : undefined}
                                            >
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
                                                        !th
                                                            ? (isAdmin
                                                                ? 'border-blue-200 bg-blue-50 dark:border-blue-500/10 dark:bg-blue-500/[0.04]'
                                                                : 'border-neutral-200 dark:border-white/[0.06]')
                                                            : ''
                                                    }`}
                                                    style={th ? {
                                                        borderColor: isAdmin ? (th.accent + '33') : th.cardBorder,
                                                        background: isAdmin ? (th.accent + '0d') : th.subtleBg,
                                                    } : undefined}
                                                >
                                                    <div className="flex items-center gap-2 mb-2 text-xs">
                                                        <span
                                                            className={`font-medium ${
                                                                !th
                                                                    ? (isAdmin ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-white/60')
                                                                    : ''
                                                            }`}
                                                            style={th ? { color: isAdmin ? th.accent : th.textSec } : undefined}
                                                        >
                                                            {isAdmin ? `${reply.author_name} (Soporte)` : 'Tú'}
                                                        </span>
                                                        <span
                                                            className={!th ? 'text-neutral-400 dark:text-white/25' : ''}
                                                            style={th ? { color: th.textMuted } : undefined}
                                                        >{formatDate(reply.created_at)}</span>
                                                    </div>
                                                    <p
                                                        className={`text-sm whitespace-pre-wrap ${!th ? 'text-neutral-700 dark:text-white/60' : ''}`}
                                                        style={th ? { color: th.textSec } : undefined}
                                                    >
                                                        {reply.body}
                                                    </p>
                                                </div>
                                            );
                                        })}

                                        {selectedTicket.status === 'cerrado' && (
                                            <div
                                                className={`text-center text-xs py-2 ${!th ? 'text-neutral-400 dark:text-white/20' : ''}`}
                                                style={th ? { color: th.textMuted } : undefined}
                                            >
                                                <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
                                                Ticket cerrado
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Reply input (only for non-closed tickets) */}
                            {selectedTicket.status !== 'cerrado' && (
                                <div
                                    className={!th ? 'p-4 border-t border-neutral-200 dark:border-white/[0.06]' : 'p-4 border-t'}
                                    style={th ? { borderColor: th.border } : undefined}
                                >
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
                                            className={`flex-1 resize-none rounded-lg border p-3 text-sm focus:outline-none ${!th ? 'focus:ring-2 border-neutral-300 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-neutral-800 dark:text-white/80 placeholder:text-neutral-400 dark:placeholder:text-white/25 focus:ring-blue-500/30' : 'focus:ring-0'}`}
                                            style={th ? { background: th.inputBg, borderColor: th.inputBorder, color: th.textPrimary } : undefined}
                                        />
                                        <button
                                            onClick={handleReply}
                                            disabled={!replyText.trim() || replying}
                                            className={`self-end px-3 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${!th ? 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-700' : 'text-white'}`}
                                            style={th ? { background: th.accent } : undefined}
                                        >
                                            {replying ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                    <p
                                        className={`text-[10px] mt-1 ${!th ? 'text-neutral-400 dark:text-white/15' : ''}`}
                                        style={th ? { color: th.textMuted } : undefined}
                                    >Ctrl+Enter para enviar</p>
                                </div>
                            )}
                        </>
                    ) : (
                        /* ── EMPTY STATE ── */
                        <div
                            className={`flex-1 flex flex-col items-center justify-center ${!th ? 'text-neutral-400 dark:text-white/20' : ''}`}
                            style={th ? { color: th.textMuted } : undefined}
                        >
                            <MessageSquare className="w-10 h-10 mb-3" />
                            <p className="text-sm">Selecciona un ticket o crea uno nuevo</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
