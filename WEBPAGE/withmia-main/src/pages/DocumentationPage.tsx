import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useEffect, useState, useRef, useMemo, useCallback, type ReactNode } from "react";
import {
  Search, BookOpen, Code, Layers, MessageSquare,
  ArrowRight, ArrowLeft, ChevronRight, Terminal, FileText,
  Globe, Shield, Users, Bot, Sparkles, Clock,
  CheckCircle2, ExternalLink, Copy, Check, Play, Rocket, Database,
  Menu, X, Hash, ArrowUpRight, Headphones, Key, Lock,
  Info, AlertTriangle, Lightbulb, ThumbsUp, ThumbsDown,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════ */

interface NavItem {
  id: string;
  label: string;
  icon?: any;
  children?: NavItem[];
}

type CalloutVariant = "info" | "warning" | "tip" | "danger";

type ContentBlock =
  | { type: "heading"; id: string; text: string }
  | { type: "p"; text: string }
  | { type: "code"; code: string; lang?: string }
  | { type: "codetabs"; tabs: { label: string; lang: string; code: string }[] }
  | { type: "callout"; variant: CalloutVariant; title: string; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "steps"; steps: { title: string; desc: string }[] }
  | { type: "nav-cards"; cards: { title: string; desc: string; link: string; color: string }[] };

interface TocEntry { id: string; label: string; }

interface PageMeta {
  title: string;
  description: string;
  breadcrumb: string[];
  toc: TocEntry[];
  readTime?: string;
  lastUpdated?: string;
}

/* ══════════════════════════════════════════════════════════════
   SIDEBAR NAVIGATION
   ══════════════════════════════════════════════════════════════ */

const sidebarNav: NavItem[] = [
  {
    id: "_s_start", label: "Primeros pasos", icon: Rocket,
    children: [
      { id: "welcome", label: "Bienvenida" },
      { id: "quickstart", label: "Inicio rápido" },
      { id: "create-account", label: "Crear tu cuenta" },
      { id: "first-channel", label: "Conectar tu primer canal" },
      { id: "choose-plan", label: "Elegir tu plan" },
    ],
  },
  {
    id: "_s_app", label: "Usando WITHMIA", icon: Layers,
    children: [
      { id: "dashboard", label: "Dashboard" },
      { id: "conversations", label: "Conversaciones" },
      { id: "contacts-crm", label: "Contactos y CRM" },
      { id: "workflows", label: "Workflows" },
      { id: "analytics", label: "Analítica" },
    ],
  },
  {
    id: "_s_channels", label: "Canales", icon: MessageSquare,
    children: [
      { id: "whatsapp", label: "WhatsApp Business" },
      { id: "instagram", label: "Instagram Direct" },
      { id: "messenger", label: "Facebook Messenger" },
      { id: "webchat", label: "Chat Web" },
      { id: "email-channel", label: "Email" },
    ],
  },
  {
    id: "_s_ai", label: "IA y Automatización", icon: Bot,
    children: [
      { id: "ai-assistant", label: "Asistente IA" },
      { id: "rag-training", label: "Entrenamiento RAG" },
      { id: "auto-flows", label: "Flujos automáticos" },
      { id: "suggested-replies", label: "Respuestas sugeridas" },
    ],
  },
  {
    id: "_s_api", label: "API Reference", icon: Code,
    children: [
      { id: "api-auth", label: "Autenticación" },
      { id: "api-messages", label: "Mensajes" },
      { id: "api-conversations", label: "Conversaciones" },
      { id: "api-contacts", label: "Contactos" },
      { id: "api-webhooks", label: "Webhooks" },
    ],
  },
  {
    id: "_s_sdks", label: "SDKs", icon: Terminal,
    children: [
      { id: "sdk-nodejs", label: "Node.js" },
      { id: "sdk-python", label: "Python" },
      { id: "sdk-php", label: "PHP" },
    ],
  },
  {
    id: "_s_int", label: "Integraciones", icon: Database,
    children: [
      { id: "int-n8n", label: "n8n" },
      { id: "int-zapier", label: "Zapier" },
      { id: "int-crm", label: "CRM" },
      { id: "int-tools", label: "Herramientas" },
    ],
  },
  {
    id: "_s_sec", label: "Seguridad", icon: Shield,
    children: [
      { id: "sec-oauth", label: "OAuth 2.0" },
      { id: "sec-encryption", label: "Encriptación" },
      { id: "sec-gdpr", label: "GDPR" },
      { id: "sec-audit", label: "Auditoría" },
    ],
  },
];

/* Flat ordered list for prev/next */
const pageOrder: string[] = sidebarNav.flatMap(s => s.children?.map(c => c.id) ?? []);

/* ══════════════════════════════════════════════════════════════
   PAGE METADATA
   ══════════════════════════════════════════════════════════════ */

const pages: Record<string, PageMeta> = {
  welcome: {
    title: "Bienvenido a WITHMIA Docs",
    description: "Documentación oficial de WITHMIA — la plataforma de comunicación omnicanal con IA. Guías paso a paso, referencias de API, ejemplos de código y mejores prácticas.",
    breadcrumb: ["Docs", "Primeros pasos", "Bienvenida"],
    toc: [
      { id: "where-to-start", label: "Dónde empezar" },
      { id: "about-withmia", label: "Sobre WITHMIA" },
      { id: "resources", label: "Recursos adicionales" },
    ],
    lastUpdated: "23 Feb 2026",
  },
  quickstart: {
    title: "Inicio rápido",
    description: "Configura tu cuenta, conecta tu primer canal y envía tu primer mensaje en menos de 5 minutos.",
    breadcrumb: ["Docs", "Primeros pasos", "Inicio rápido"],
    toc: [
      { id: "prerequisites", label: "Prerequisitos" },
      { id: "step-1", label: "1. Crear tu cuenta" },
      { id: "step-2", label: "2. Obtener API Key" },
      { id: "step-3", label: "3. Instalar SDK" },
      { id: "step-4", label: "4. Enviar primer mensaje" },
      { id: "next-steps", label: "Próximos pasos" },
    ],
    readTime: "5 min", lastUpdated: "23 Feb 2026",
  },
  "create-account": {
    title: "Crear tu cuenta",
    description: "Regístrate en WITHMIA y configura tu workspace.",
    breadcrumb: ["Docs", "Primeros pasos", "Crear tu cuenta"],
    toc: [{ id: "registro", label: "Registro" }, { id: "workspace", label: "Configurar workspace" }, { id: "verificar", label: "Verificar email" }],
    readTime: "3 min", lastUpdated: "18 Feb 2026",
  },
  "first-channel": {
    title: "Conectar tu primer canal",
    description: "Conecta WhatsApp, Instagram u otro canal de mensajería a tu cuenta de WITHMIA.",
    breadcrumb: ["Docs", "Primeros pasos", "Conectar tu primer canal"],
    toc: [{ id: "elegir-canal", label: "Elegir un canal" }, { id: "configurar", label: "Configurar conexión" }, { id: "probar", label: "Probar el canal" }],
    readTime: "4 min", lastUpdated: "18 Feb 2026",
  },
  "choose-plan": {
    title: "Elegir tu plan",
    description: "Conoce los planes de WITHMIA y elige el que mejor se adapte a tu equipo.",
    breadcrumb: ["Docs", "Primeros pasos", "Elegir tu plan"],
    toc: [{ id: "planes", label: "Planes disponibles" }, { id: "facturacion", label: "Facturación" }, { id: "cambiar-plan", label: "Cambiar de plan" }],
    readTime: "2 min", lastUpdated: "16 Feb 2026",
  },
  dashboard: {
    title: "Dashboard",
    description: "Vista general del dashboard: métricas en tiempo real, accesos rápidos y configuración.",
    breadcrumb: ["Docs", "Usando WITHMIA", "Dashboard"],
    toc: [{ id: "overview", label: "Vista general" }, { id: "widgets", label: "Widgets" }, { id: "shortcuts", label: "Accesos rápidos" }],
    readTime: "4 min", lastUpdated: "15 Feb 2026",
  },
  conversations: {
    title: "Conversaciones",
    description: "Gestiona todas tus conversaciones desde un inbox unificado.",
    breadcrumb: ["Docs", "Usando WITHMIA", "Conversaciones"],
    toc: [{ id: "inbox", label: "Inbox unificado" }, { id: "asignacion", label: "Asignación" }, { id: "etiquetas", label: "Etiquetas" }, { id: "filtros", label: "Filtros" }],
    readTime: "6 min", lastUpdated: "14 Feb 2026",
  },
  "contacts-crm": {
    title: "Contactos y CRM",
    description: "Administra tu base de contactos con pipeline visual, campos personalizados y segmentación.",
    breadcrumb: ["Docs", "Usando WITHMIA", "Contactos y CRM"],
    toc: [{ id: "contactos", label: "Gestión de contactos" }, { id: "pipeline", label: "Pipeline visual" }, { id: "campos", label: "Campos personalizados" }],
    readTime: "5 min", lastUpdated: "12 Feb 2026",
  },
  workflows: {
    title: "Workflows",
    description: "Crea flujos de automatización sin código para responder, etiquetar y asignar automáticamente.",
    breadcrumb: ["Docs", "Usando WITHMIA", "Workflows"],
    toc: [{ id: "crear-workflow", label: "Crear un workflow" }, { id: "triggers", label: "Triggers" }, { id: "acciones", label: "Acciones" }],
    readTime: "7 min", lastUpdated: "10 Feb 2026",
  },
  analytics: {
    title: "Analítica",
    description: "Reportes en tiempo real sobre rendimiento, tiempos de respuesta y satisfacción.",
    breadcrumb: ["Docs", "Usando WITHMIA", "Analítica"],
    toc: [{ id: "metricas", label: "Métricas clave" }, { id: "reportes", label: "Reportes" }, { id: "exportar", label: "Exportar datos" }],
    readTime: "4 min", lastUpdated: "8 Feb 2026",
  },
  whatsapp: {
    title: "WhatsApp Business",
    description: "Conecta la API de WhatsApp Business a WITHMIA para enviar y recibir mensajes.",
    breadcrumb: ["Docs", "Canales", "WhatsApp Business"],
    toc: [{ id: "requisitos", label: "Requisitos" }, { id: "conexion", label: "Conexión" }, { id: "enviar-mensaje", label: "Enviar mensajes" }, { id: "templates", label: "Message Templates" }, { id: "media", label: "Media" }],
    readTime: "8 min", lastUpdated: "22 Feb 2026",
  },
  instagram: {
    title: "Instagram Direct",
    description: "Recibe y responde mensajes de Instagram Direct desde el inbox de WITHMIA.",
    breadcrumb: ["Docs", "Canales", "Instagram Direct"],
    toc: [{ id: "conexion-ig", label: "Conexión" }, { id: "funciones-ig", label: "Funcionalidades" }, { id: "limitaciones", label: "Limitaciones" }],
    readTime: "4 min", lastUpdated: "20 Feb 2026",
  },
  messenger: {
    title: "Facebook Messenger",
    description: "Integra Facebook Messenger para gestionar conversaciones de tu página.",
    breadcrumb: ["Docs", "Canales", "Facebook Messenger"],
    toc: [{ id: "setup-fb", label: "Configuración" }, { id: "features-fb", label: "Funcionalidades" }],
    readTime: "4 min", lastUpdated: "18 Feb 2026",
  },
  webchat: {
    title: "Chat Web",
    description: "Instala el widget de chat en tu sitio web para atender visitantes en tiempo real.",
    breadcrumb: ["Docs", "Canales", "Chat Web"],
    toc: [{ id: "instalacion", label: "Instalación" }, { id: "personalizacion", label: "Personalización" }, { id: "eventos", label: "Eventos JS" }],
    readTime: "5 min", lastUpdated: "20 Feb 2026",
  },
  "email-channel": {
    title: "Email",
    description: "Conecta tu bandeja de entrada de email para gestionar correos como conversaciones.",
    breadcrumb: ["Docs", "Canales", "Email"],
    toc: [{ id: "config-email", label: "Configuración" }, { id: "imap-smtp", label: "IMAP / SMTP" }],
    readTime: "4 min", lastUpdated: "16 Feb 2026",
  },
  "ai-assistant": {
    title: "Asistente IA",
    description: "Configura y entrena tu asistente de IA para responder con contexto de tu negocio.",
    breadcrumb: ["Docs", "IA y Automatización", "Asistente IA"],
    toc: [{ id: "setup-ai", label: "Configurar asistente" }, { id: "personalidad", label: "Personalidad" }, { id: "knowledge", label: "Base de conocimiento" }, { id: "limites", label: "Límites y control" }],
    readTime: "8 min", lastUpdated: "22 Feb 2026",
  },
  "rag-training": {
    title: "Entrenamiento RAG",
    description: "Alimenta a tu IA con documentos, FAQs y datos para respuestas más precisas.",
    breadcrumb: ["Docs", "IA y Automatización", "Entrenamiento RAG"],
    toc: [{ id: "que-es-rag", label: "¿Qué es RAG?" }, { id: "subir-docs", label: "Subir documentos" }, { id: "formatos", label: "Formatos soportados" }, { id: "mejores-practicas", label: "Mejores prácticas" }],
    readTime: "6 min", lastUpdated: "20 Feb 2026",
  },
  "auto-flows": {
    title: "Flujos automáticos",
    description: "Define flujos de conversación con lógica condicional y acciones automáticas.",
    breadcrumb: ["Docs", "IA y Automatización", "Flujos automáticos"],
    toc: [{ id: "crear-flujo", label: "Crear un flujo" }, { id: "nodos", label: "Tipos de nodos" }, { id: "condiciones", label: "Condiciones" }],
    readTime: "7 min", lastUpdated: "18 Feb 2026",
  },
  "suggested-replies": {
    title: "Respuestas sugeridas",
    description: "La IA sugiere respuestas a tu equipo basándose en el contexto.",
    breadcrumb: ["Docs", "IA y Automatización", "Respuestas sugeridas"],
    toc: [{ id: "activar", label: "Activar sugerencias" }, { id: "configurar-sug", label: "Configurar" }],
    readTime: "3 min", lastUpdated: "16 Feb 2026",
  },
  "api-auth": {
    title: "Autenticación",
    description: "Autentícate con la API de WITHMIA usando API Keys o OAuth 2.0.",
    breadcrumb: ["Docs", "API Reference", "Autenticación"],
    toc: [{ id: "api-keys", label: "API Keys" }, { id: "usar-key", label: "Usar tu API Key" }, { id: "oauth", label: "OAuth 2.0" }, { id: "scopes", label: "Scopes" }],
    readTime: "5 min", lastUpdated: "23 Feb 2026",
  },
  "api-messages": {
    title: "Mensajes",
    description: "Endpoints para enviar, recibir y gestionar mensajes en todos los canales.",
    breadcrumb: ["Docs", "API Reference", "Mensajes"],
    toc: [{ id: "send-message", label: "Enviar mensaje" }, { id: "list-messages", label: "Listar mensajes" }, { id: "message-status", label: "Estado del mensaje" }],
    readTime: "8 min", lastUpdated: "22 Feb 2026",
  },
  "api-conversations": {
    title: "Conversaciones",
    description: "Endpoints para crear, listar, asignar y cerrar conversaciones.",
    breadcrumb: ["Docs", "API Reference", "Conversaciones"],
    toc: [{ id: "list-conv", label: "Listar" }, { id: "assign", label: "Asignar agente" }, { id: "close-conv", label: "Cerrar" }],
    readTime: "6 min", lastUpdated: "20 Feb 2026",
  },
  "api-contacts": {
    title: "Contactos",
    description: "CRUD completo para gestionar contactos y datos de perfil.",
    breadcrumb: ["Docs", "API Reference", "Contactos"],
    toc: [{ id: "create-contact", label: "Crear" }, { id: "update-contact", label: "Actualizar" }, { id: "search-contact", label: "Buscar" }],
    readTime: "5 min", lastUpdated: "18 Feb 2026",
  },
  "api-webhooks": {
    title: "Webhooks",
    description: "Recibe eventos en tiempo real cuando ocurren acciones en tu cuenta.",
    breadcrumb: ["Docs", "API Reference", "Webhooks"],
    toc: [{ id: "setup-wh", label: "Configurar" }, { id: "events", label: "Tipos de eventos" }, { id: "payload", label: "Payload" }, { id: "verify", label: "Verificar firma" }, { id: "retries", label: "Reintentos" }],
    readTime: "7 min", lastUpdated: "23 Feb 2026",
  },
  "sdk-nodejs": {
    title: "SDK Node.js",
    description: "Librería oficial de WITHMIA para Node.js.",
    breadcrumb: ["Docs", "SDKs", "Node.js"],
    toc: [{ id: "install-node", label: "Instalación" }, { id: "init-node", label: "Inicialización" }, { id: "send-node", label: "Enviar mensajes" }, { id: "webhooks-node", label: "Recibir webhooks" }, { id: "errors-node", label: "Manejo de errores" }],
    readTime: "6 min", lastUpdated: "22 Feb 2026",
  },
  "sdk-python": {
    title: "SDK Python",
    description: "Librería oficial de WITHMIA para Python.",
    breadcrumb: ["Docs", "SDKs", "Python"],
    toc: [{ id: "install-py", label: "Instalación" }, { id: "usage-py", label: "Uso básico" }, { id: "async-py", label: "Async" }],
    readTime: "5 min", lastUpdated: "20 Feb 2026",
  },
  "sdk-php": {
    title: "SDK PHP",
    description: "Librería oficial de WITHMIA para PHP.",
    breadcrumb: ["Docs", "SDKs", "PHP"],
    toc: [{ id: "install-php", label: "Instalación" }, { id: "usage-php", label: "Uso básico" }],
    readTime: "5 min", lastUpdated: "18 Feb 2026",
  },
  "int-n8n": {
    title: "n8n",
    description: "Conecta WITHMIA con n8n para automatizaciones avanzadas.",
    breadcrumb: ["Docs", "Integraciones", "n8n"],
    toc: [{ id: "n8n-setup", label: "Configuración" }, { id: "n8n-nodes", label: "Nodos disponibles" }, { id: "n8n-templates", label: "Templates" }],
    readTime: "5 min", lastUpdated: "20 Feb 2026",
  },
  "int-zapier": {
    title: "Zapier",
    description: "Conecta WITHMIA con +5000 apps a través de Zapier.",
    breadcrumb: ["Docs", "Integraciones", "Zapier"],
    toc: [{ id: "zap-setup", label: "Configuración" }, { id: "zap-triggers", label: "Triggers" }, { id: "zap-actions", label: "Acciones" }],
    readTime: "4 min", lastUpdated: "18 Feb 2026",
  },
  "int-crm": {
    title: "CRM",
    description: "Integra WITHMIA con tu CRM para sincronizar contactos.",
    breadcrumb: ["Docs", "Integraciones", "CRM"],
    toc: [{ id: "crm-sync", label: "Sincronización" }, { id: "crm-mapping", label: "Mapeo de campos" }],
    readTime: "5 min", lastUpdated: "16 Feb 2026",
  },
  "int-tools": {
    title: "Herramientas",
    description: "Conecta Google Sheets, Slack, calendarios y más.",
    breadcrumb: ["Docs", "Integraciones", "Herramientas"],
    toc: [{ id: "sheets", label: "Google Sheets" }, { id: "slack", label: "Slack" }, { id: "calendar", label: "Calendarios" }],
    readTime: "4 min", lastUpdated: "14 Feb 2026",
  },
  "sec-oauth": {
    title: "OAuth 2.0",
    description: "Autenticación segura con el flujo OAuth 2.0 de WITHMIA.",
    breadcrumb: ["Docs", "Seguridad", "OAuth 2.0"],
    toc: [{ id: "oauth-flow", label: "Flujo de autorización" }, { id: "tokens", label: "Tokens" }, { id: "refresh", label: "Refresh tokens" }],
    readTime: "6 min", lastUpdated: "22 Feb 2026",
  },
  "sec-encryption": {
    title: "Encriptación",
    description: "TLS 1.3, AES-256 at-rest y protección de datos en WITHMIA.",
    breadcrumb: ["Docs", "Seguridad", "Encriptación"],
    toc: [{ id: "transit", label: "En tránsito" }, { id: "at-rest", label: "En reposo" }],
    readTime: "4 min", lastUpdated: "20 Feb 2026",
  },
  "sec-gdpr": {
    title: "GDPR",
    description: "Cómo WITHMIA cumple con el Reglamento General de Protección de Datos.",
    breadcrumb: ["Docs", "Seguridad", "GDPR"],
    toc: [{ id: "compliance", label: "Cumplimiento" }, { id: "data-rights", label: "Derechos" }, { id: "dpa", label: "DPA" }],
    readTime: "5 min", lastUpdated: "18 Feb 2026",
  },
  "sec-audit": {
    title: "Auditoría",
    description: "Rastrea acciones de usuarios y cambios en tu cuenta.",
    breadcrumb: ["Docs", "Seguridad", "Auditoría"],
    toc: [{ id: "audit-log", label: "Log de auditoría" }, { id: "retention", label: "Retención" }],
    readTime: "3 min", lastUpdated: "16 Feb 2026",
  },
};

/* ══════════════════════════════════════════════════════════════
   RICH CONTENT — ContentBlock arrays for key pages
   ══════════════════════════════════════════════════════════════ */

const richContent: Record<string, ContentBlock[]> = {
  /* ── WhatsApp Business ── */
  whatsapp: [
    { type: "callout", variant: "info", title: "Requisitos previos", text: "Necesitas una cuenta de Meta Business verificada y un número de teléfono dedicado que no esté registrado en WhatsApp personal." },
    { type: "heading", id: "requisitos", text: "Requisitos" },
    { type: "list", items: [
      "Cuenta de Meta Business verificada",
      "Número de teléfono dedicado (no puede estar en WhatsApp personal)",
      "Cuenta de WITHMIA con plan activo",
      "Acceso a Configuración → Canales en el dashboard",
    ]},
    { type: "heading", id: "conexion", text: "Conexión" },
    { type: "p", text: "Para conectar WhatsApp Business, ve a Configuración → Canales → WhatsApp y sigue el asistente. El proceso toma menos de 5 minutos." },
    { type: "steps", steps: [
      { title: "Accede al panel de canales", desc: "Ve a Configuración → Canales en tu dashboard de WITHMIA." },
      { title: "Selecciona WhatsApp", desc: "Haz clic en 'Conectar WhatsApp Business' e inicia sesión con Meta Business." },
      { title: "Verifica tu número", desc: "Recibirás un código SMS. Ingresa el código para confirmar la propiedad." },
    ]},
    { type: "callout", variant: "tip", title: "Tip", text: "Si ya tienes la API de WhatsApp Business configurada con otro proveedor, puedes migrar tu número a WITHMIA sin perder el historial." },
    { type: "heading", id: "enviar-mensaje", text: "Enviar mensajes" },
    { type: "p", text: "Una vez conectado, puedes enviar mensajes desde el inbox o usando la API:" },
    { type: "codetabs", tabs: [
      { label: "Node.js", lang: "javascript", code: "const withmia = new Withmia(API_KEY);\n\nawait withmia.messages.send({\n  channel: \"whatsapp\",\n  to: \"+56912345678\",\n  type: \"text\",\n  text: \"¡Hola! ¿En qué puedo ayudarte?\"\n});" },
      { label: "Python", lang: "python", code: "from withmia import Withmia\n\nclient = Withmia(api_key=API_KEY)\n\nclient.messages.send(\n    channel=\"whatsapp\",\n    to=\"+56912345678\",\n    type=\"text\",\n    text=\"¡Hola! ¿En qué puedo ayudarte?\"\n)" },
      { label: "cURL", lang: "bash", code: "curl -X POST https://api.withmia.com/v1/messages \\\n  -H \"Authorization: Bearer sk_live_...\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"channel\": \"whatsapp\",\n    \"to\": \"+56912345678\",\n    \"type\": \"text\",\n    \"text\": \"¡Hola! ¿En qué puedo ayudarte?\"\n  }'" },
    ]},
    { type: "heading", id: "templates", text: "Message Templates" },
    { type: "p", text: "WhatsApp requiere Message Templates pre-aprobados para iniciar conversaciones outbound. Los templates se gestionan desde Meta Business Suite y se sincronizan automáticamente con WITHMIA." },
    { type: "callout", variant: "warning", title: "Aprobación requerida", text: "Los templates deben ser aprobados por Meta antes de usarlos. La revisión toma entre 1 y 24 horas." },
    { type: "code", code: "await withmia.messages.sendTemplate({\n  channel: \"whatsapp\",\n  to: \"+56912345678\",\n  template: \"order_confirmation\",\n  language: \"es\",\n  components: [\n    { type: \"body\", parameters: [{ type: \"text\", text: \"#12345\" }] }\n  ]\n});", lang: "javascript" },
    { type: "heading", id: "media", text: "Media" },
    { type: "p", text: "WITHMIA soporta todos los tipos de media de WhatsApp:" },
    { type: "list", items: [
      "Imágenes: JPEG, PNG (hasta 5 MB)",
      "Videos: MP4 (hasta 16 MB)",
      "Documentos: PDF, DOC, XLS (hasta 100 MB)",
      "Audio: OGG, MP3 (hasta 16 MB)",
      "Stickers: WebP estático y animado",
      "Ubicación: coordenadas con dirección opcional",
    ]},
  ],

  /* ── API Auth ── */
  "api-auth": [
    { type: "heading", id: "api-keys", text: "API Keys" },
    { type: "p", text: "Las API Keys son la forma más sencilla de autenticarte con la API de WITHMIA. Cada key está asociada a un workspace y tiene permisos configurables." },
    { type: "steps", steps: [
      { title: "Accede a la configuración", desc: "Ve a Configuración → API Keys en tu dashboard." },
      { title: "Crea una nueva key", desc: "Haz clic en 'Crear API Key' y asigna un nombre descriptivo." },
      { title: "Configura permisos", desc: "Selecciona los scopes necesarios (mensajes, contactos, conversaciones, etc.)." },
      { title: "Copia tu key", desc: "Guarda tu key de forma segura. Solo se muestra una vez." },
    ]},
    { type: "callout", variant: "danger", title: "Seguridad", text: "Nunca expongas tu API Key en código del lado del cliente. Usa variables de entorno o un servidor backend para las llamadas a la API." },
    { type: "heading", id: "usar-key", text: "Usar tu API Key" },
    { type: "p", text: "Incluye tu API Key en el header Authorization de cada request:" },
    { type: "codetabs", tabs: [
      { label: "cURL", lang: "bash", code: "curl https://api.withmia.com/v1/conversations \\\n  -H \"Authorization: Bearer sk_live_tu_api_key\"" },
      { label: "Node.js", lang: "javascript", code: "const withmia = new Withmia({\n  apiKey: process.env.WITHMIA_API_KEY,\n});\n\nconst conversations = await withmia.conversations.list();" },
      { label: "Python", lang: "python", code: "from withmia import Withmia\n\nclient = Withmia(api_key=os.environ[\"WITHMIA_API_KEY\"])\n\nconversations = client.conversations.list()" },
    ]},
    { type: "heading", id: "oauth", text: "OAuth 2.0" },
    { type: "p", text: "Para aplicaciones que actúan en nombre de otros usuarios, WITHMIA soporta el flujo OAuth 2.0 Authorization Code. Esto es ideal para integraciones de terceros y aplicaciones multi-tenant." },
    { type: "code", code: "# 1. Redirige al usuario a:\nhttps://app.withmia.com/oauth/authorize?\n  client_id=TU_CLIENT_ID&\n  redirect_uri=https://tu-app.com/callback&\n  response_type=code&\n  scope=messages:read messages:write\n\n# 2. Intercambia el code por un access_token:\ncurl -X POST https://api.withmia.com/oauth/token \\\n  -d \"grant_type=authorization_code\" \\\n  -d \"code=AUTHORIZATION_CODE\" \\\n  -d \"client_id=TU_CLIENT_ID\" \\\n  -d \"client_secret=TU_CLIENT_SECRET\" \\\n  -d \"redirect_uri=https://tu-app.com/callback\"", lang: "bash" },
    { type: "heading", id: "scopes", text: "Scopes" },
    { type: "p", text: "Los scopes controlan a qué recursos puede acceder un token. Usa el principio de mínimos privilegios:" },
    { type: "list", items: [
      "messages:read — Leer mensajes",
      "messages:write — Enviar mensajes",
      "conversations:read — Ver conversaciones",
      "conversations:write — Crear y asignar conversaciones",
      "contacts:read — Ver contactos",
      "contacts:write — Crear y editar contactos",
      "webhooks:manage — Gestionar webhooks",
      "analytics:read — Ver reportes y métricas",
    ]},
  ],

  /* ── API Webhooks ── */
  "api-webhooks": [
    { type: "heading", id: "setup-wh", text: "Configurar webhook" },
    { type: "p", text: "Los webhooks te permiten recibir notificaciones HTTP en tiempo real cuando ocurren eventos en tu cuenta de WITHMIA." },
    { type: "steps", steps: [
      { title: "Define tu endpoint", desc: "Crea un endpoint HTTPS en tu servidor que acepte requests POST." },
      { title: "Registra el webhook", desc: "Ve a Configuración → Webhooks o usa la API para registrar tu URL." },
      { title: "Selecciona eventos", desc: "Elige los tipos de eventos que quieres recibir." },
      { title: "Verifica la firma", desc: "Implementa la verificación HMAC-SHA256 para validar que el request viene de WITHMIA." },
    ]},
    { type: "code", code: "curl -X POST https://api.withmia.com/v1/webhooks \\\n  -H \"Authorization: Bearer sk_live_...\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"url\": \"https://tu-app.com/webhooks/withmia\",\n    \"events\": [\"message.received\", \"message.sent\", \"conversation.created\"],\n    \"secret\": \"whsec_tu_secreto\"\n  }'", lang: "bash" },
    { type: "heading", id: "events", text: "Tipos de eventos" },
    { type: "list", items: [
      "message.received — Nuevo mensaje entrante",
      "message.sent — Mensaje enviado exitosamente",
      "message.failed — Error al enviar mensaje",
      "message.read — Mensaje leído por el contacto",
      "conversation.created — Nueva conversación",
      "conversation.assigned — Conversación asignada a un agente",
      "conversation.closed — Conversación cerrada",
      "contact.created — Nuevo contacto",
      "contact.updated — Contacto actualizado",
    ]},
    { type: "heading", id: "payload", text: "Payload" },
    { type: "p", text: "Cada webhook incluye un payload JSON con la información del evento:" },
    { type: "code", code: "{\n  \"id\": \"evt_abc123\",\n  \"type\": \"message.received\",\n  \"timestamp\": \"2026-02-23T10:30:00Z\",\n  \"data\": {\n    \"message_id\": \"msg_xyz789\",\n    \"conversation_id\": \"conv_456\",\n    \"channel\": \"whatsapp\",\n    \"from\": \"+56912345678\",\n    \"type\": \"text\",\n    \"text\": \"Hola, necesito ayuda\",\n    \"contact\": {\n      \"id\": \"ct_321\",\n      \"name\": \"María García\"\n    }\n  }\n}", lang: "json" },
    { type: "heading", id: "verify", text: "Verificar firma" },
    { type: "p", text: "WITHMIA firma cada webhook con HMAC-SHA256. Siempre verifica la firma antes de procesar el evento:" },
    { type: "codetabs", tabs: [
      { label: "Node.js", lang: "javascript", code: "import crypto from 'crypto';\n\nfunction verifyWebhook(payload, signature, secret) {\n  const expected = crypto\n    .createHmac('sha256', secret)\n    .update(payload)\n    .digest('hex');\n  return crypto.timingSafeEqual(\n    Buffer.from(signature),\n    Buffer.from(`sha256=${expected}`)\n  );\n}" },
      { label: "Python", lang: "python", code: "import hmac\nimport hashlib\n\ndef verify_webhook(payload: bytes, signature: str, secret: str) -> bool:\n    expected = hmac.new(\n        secret.encode(),\n        payload,\n        hashlib.sha256\n    ).hexdigest()\n    return hmac.compare_digest(\n        signature,\n        f\"sha256={expected}\"\n    )" },
    ]},
    { type: "callout", variant: "warning", title: "Importante", text: "Si la firma no coincide, responde con HTTP 401 y no proceses el evento. Esto protege contra requests falsificados." },
    { type: "heading", id: "retries", text: "Reintentos" },
    { type: "p", text: "Si tu endpoint no responde con HTTP 2xx dentro de 10 segundos, WITHMIA reintenta automáticamente con backoff exponencial:" },
    { type: "list", items: [
      "1er reintento: 30 segundos",
      "2do reintento: 2 minutos",
      "3er reintento: 10 minutos",
      "4to reintento: 1 hora",
      "5to reintento: 6 horas",
    ], ordered: true },
    { type: "callout", variant: "tip", title: "Tip", text: "Responde con HTTP 200 inmediatamente y procesa el evento de forma asíncrona. Esto evita timeouts y reintentos innecesarios." },
  ],

  /* ── SDK Node.js ── */
  "sdk-nodejs": [
    { type: "heading", id: "install-node", text: "Instalación" },
    { type: "p", text: "Instala el SDK oficial de WITHMIA para Node.js usando tu gestor de paquetes favorito:" },
    { type: "codetabs", tabs: [
      { label: "npm", lang: "bash", code: "npm install @withmia/sdk" },
      { label: "yarn", lang: "bash", code: "yarn add @withmia/sdk" },
      { label: "pnpm", lang: "bash", code: "pnpm add @withmia/sdk" },
    ]},
    { type: "callout", variant: "info", title: "Requisitos", text: "Node.js 18 o superior. El SDK usa ESM y soporta TypeScript de forma nativa." },
    { type: "heading", id: "init-node", text: "Inicialización" },
    { type: "code", code: "import { Withmia } from '@withmia/sdk';\n\nconst withmia = new Withmia({\n  apiKey: process.env.WITHMIA_API_KEY,\n  // Opciones adicionales:\n  // baseUrl: 'https://api.withmia.com/v1',\n  // timeout: 30000,\n  // retries: 3,\n});", lang: "typescript" },
    { type: "heading", id: "send-node", text: "Enviar mensajes" },
    { type: "code", code: "// Mensaje de texto\nconst message = await withmia.messages.send({\n  channel: 'whatsapp',\n  to: '+56912345678',\n  type: 'text',\n  text: '¡Hola desde WITHMIA! 🚀',\n});\n\nconsole.log('Mensaje enviado:', message.id);\n\n// Mensaje con imagen\nawait withmia.messages.send({\n  channel: 'whatsapp',\n  to: '+56912345678',\n  type: 'image',\n  media: {\n    url: 'https://ejemplo.com/imagen.jpg',\n    caption: 'Mira esta imagen',\n  },\n});", lang: "typescript" },
    { type: "heading", id: "webhooks-node", text: "Recibir webhooks" },
    { type: "p", text: "El SDK incluye un helper para Express/Fastify que verifica la firma automáticamente:" },
    { type: "code", code: "import express from 'express';\nimport { Withmia } from '@withmia/sdk';\n\nconst app = express();\nconst withmia = new Withmia({ apiKey: API_KEY });\n\napp.post('/webhooks', express.raw({ type: '*/*' }), (req, res) => {\n  const event = withmia.webhooks.verify(\n    req.body,\n    req.headers['x-withmia-signature'] as string,\n    process.env.WEBHOOK_SECRET!\n  );\n\n  switch (event.type) {\n    case 'message.received':\n      console.log('Nuevo mensaje:', event.data.text);\n      break;\n    case 'conversation.created':\n      console.log('Nueva conversación:', event.data.id);\n      break;\n  }\n\n  res.sendStatus(200);\n});", lang: "typescript" },
    { type: "heading", id: "errors-node", text: "Manejo de errores" },
    { type: "code", code: "import { WithmiaError, RateLimitError } from '@withmia/sdk';\n\ntry {\n  await withmia.messages.send({ ... });\n} catch (error) {\n  if (error instanceof RateLimitError) {\n    console.log(`Rate limited. Retry en ${error.retryAfter}s`);\n  } else if (error instanceof WithmiaError) {\n    console.error(`Error ${error.status}: ${error.message}`);\n  }\n}", lang: "typescript" },
  ],

  /* ── AI Assistant ── */
  "ai-assistant": [
    { type: "heading", id: "setup-ai", text: "Configurar asistente" },
    { type: "p", text: "El asistente IA de WITHMIA se configura desde Configuración → IA → Asistente. Puedes crear múltiples asistentes con diferentes personalidades y bases de conocimiento para distintos canales o equipos." },
    { type: "steps", steps: [
      { title: "Crea un asistente", desc: "Ve a Configuración → IA y haz clic en 'Nuevo asistente'." },
      { title: "Define su propósito", desc: "Describe el rol del asistente: soporte, ventas, FAQ, etc." },
      { title: "Asigna canales", desc: "Selecciona en qué canales el asistente estará activo." },
      { title: "Configura el handoff", desc: "Define cuándo el asistente transfiere a un agente humano." },
    ]},
    { type: "heading", id: "personalidad", text: "Personalidad" },
    { type: "p", text: "Configura el comportamiento y tono del asistente con instrucciones de sistema:" },
    { type: "code", code: "# Ejemplo de prompt de sistema\n\nEres el asistente de soporte de [Empresa].\n\nReglas:\n- Mantén un tono profesional pero amigable\n- Responde siempre en el idioma del cliente\n- Si no sabes la respuesta, ofrece transferir a un humano\n- Nunca inventes información sobre el producto\n- Usa emojis con moderación\n- Máximo 3 párrafos por respuesta", lang: "markdown" },
    { type: "callout", variant: "tip", title: "Mejores prácticas", text: "Sé específico en las instrucciones. En vez de 'sé amable', di 'saluda al usuario por su nombre, usa tono informal y agrega un emoji al final'." },
    { type: "heading", id: "knowledge", text: "Base de conocimiento" },
    { type: "p", text: "El asistente puede acceder a documentos de tu empresa usando RAG (Retrieval-Augmented Generation). Sube PDFs, páginas web, FAQs o conecta tu base de conocimiento existente." },
    { type: "list", items: [
      "PDFs y documentos de Word",
      "URLs de sitio web (crawler automático)",
      "FAQs en formato pregunta/respuesta",
      "Archivos CSV y Excel",
      "Texto plano y Markdown",
    ]},
    { type: "callout", variant: "info", title: "Límites", text: "Cada asistente soporta hasta 100 MB de documentos en el plan Growth y 500 MB en el plan Enterprise." },
    { type: "heading", id: "limites", text: "Límites y control" },
    { type: "p", text: "Configura guardrails para controlar el comportamiento del asistente:" },
    { type: "list", items: [
      "Temas bloqueados — define temas que el asistente debe rechazar",
      "Handoff automático — transfiere a humano tras N mensajes o por keywords",
      "Horarios — activa el asistente solo fuera del horario laboral",
      "Rate limiting — máximo de respuestas por conversación",
      "Supervisión — revisa y aprueba respuestas antes de enviarlas",
    ]},
  ],

  /* ── Webchat ── */
  webchat: [
    { type: "heading", id: "instalacion", text: "Instalación" },
    { type: "p", text: "Agrega el widget de chat a tu sitio web con una sola línea de código. Pega este snippet antes del cierre de </body>:" },
    { type: "code", code: "<script\n  src=\"https://cdn.withmia.com/widget.js\"\n  data-workspace=\"ws_tu_workspace_id\"\n  data-channel=\"webchat\"\n  data-color=\"#f59e0b\"\n  async\n></script>", lang: "html" },
    { type: "callout", variant: "tip", title: "Frameworks", text: "Para React, Vue o Angular, usa nuestros componentes oficiales: @withmia/react-widget, @withmia/vue-widget." },
    { type: "heading", id: "personalizacion", text: "Personalización" },
    { type: "p", text: "Personaliza la apariencia del widget usando atributos data- o la API JavaScript:" },
    { type: "code", code: "<script\n  src=\"https://cdn.withmia.com/widget.js\"\n  data-workspace=\"ws_123\"\n  data-color=\"#f59e0b\"\n  data-position=\"bottom-right\"\n  data-greeting=\"¡Hola! ¿En qué puedo ayudarte?\"\n  data-avatar=\"https://tu-sitio.com/avatar.png\"\n  data-name=\"Soporte WITHMIA\"\n  data-lang=\"es\"\n  async\n></script>", lang: "html" },
    { type: "heading", id: "eventos", text: "Eventos JS" },
    { type: "p", text: "El widget emite eventos JavaScript que puedes escuchar para analytics o integraciones:" },
    { type: "code", code: "// Escuchar eventos del widget\nwindow.addEventListener('withmia:ready', () => {\n  console.log('Widget cargado');\n});\n\nwindow.addEventListener('withmia:open', () => {\n  // El usuario abrió el chat\n  analytics.track('Chat Opened');\n});\n\nwindow.addEventListener('withmia:message', (e) => {\n  console.log('Nuevo mensaje:', e.detail);\n});\n\n// Controlar el widget programáticamente\nwindow.Withmia.open();\nwindow.Withmia.close();\nwindow.Withmia.identify({\n  name: 'Juan',\n  email: 'juan@ejemplo.com',\n  plan: 'pro',\n});", lang: "javascript" },
  ],

  /* ── RAG Training ── */
  "rag-training": [
    { type: "heading", id: "que-es-rag", text: "¿Qué es RAG?" },
    { type: "p", text: "RAG (Retrieval-Augmented Generation) permite que la IA de WITHMIA busque información relevante en tus documentos antes de generar una respuesta. Esto elimina las alucinaciones y asegura que las respuestas sean precisas y basadas en datos reales de tu negocio." },
    { type: "callout", variant: "info", title: "¿Cómo funciona?", text: "Cuando un cliente hace una pregunta, WITHMIA: 1) busca los fragmentos más relevantes en tu base de conocimiento, 2) los incluye como contexto para la IA, 3) genera una respuesta precisa basada en esos fragmentos." },
    { type: "heading", id: "subir-docs", text: "Subir documentos" },
    { type: "p", text: "Ve a Configuración → IA → Base de Conocimiento para subir documentos. Puedes arrastrar archivos o ingresar URLs." },
    { type: "steps", steps: [
      { title: "Sube tus documentos", desc: "Arrastra PDFs, Word, CSVs o pega URLs de tu sitio web." },
      { title: "Espera el procesamiento", desc: "WITHMIA divide el documento en fragmentos y genera embeddings. Esto toma segundos." },
      { title: "Prueba con preguntas", desc: "Usa el playground para hacer preguntas y verificar las respuestas." },
    ]},
    { type: "heading", id: "formatos", text: "Formatos soportados" },
    { type: "list", items: [
      "PDF — documentos, manuales, reportes",
      "DOCX / DOC — documentos de Word",
      "TXT / MD — texto plano y Markdown",
      "CSV / XLSX — tablas y datos estructurados",
      "HTML / URLs — páginas web (crawler automático)",
      "JSON — datos estructurados tipo FAQ",
    ]},
    { type: "heading", id: "mejores-practicas", text: "Mejores prácticas" },
    { type: "list", items: [
      "Usa documentos bien estructurados con headings claros",
      "Evita imágenes escaneadas — usa PDFs con texto seleccionable",
      "Actualiza los documentos regularmente para mantener la precisión",
      "Divide documentos largos (+50 páginas) en secciones temáticas",
      "Incluye FAQs en formato pregunta/respuesta para mejor retrieval",
      "Prueba con preguntas reales de tus clientes antes de activar",
    ]},
    { type: "callout", variant: "warning", title: "Importante", text: "Eliminar un documento NO elimina las respuestas que ya fueron generadas con esa información. Se aplica solo a futuras consultas." },
  ],

  /* ── Crear cuenta ── */
  "create-account": [
    { type: "heading", id: "registro", text: "Registro" },
    { type: "p", text: "Crear tu cuenta de WITHMIA toma menos de 2 minutos. No necesitas tarjeta de crédito para empezar — el plan gratuito incluye hasta 100 conversaciones al mes." },
    { type: "steps", steps: [
      { title: "Ve a la página de registro", desc: "Accede a app.withmia.com/register desde tu navegador." },
      { title: "Ingresa tus datos", desc: "Completa tu nombre, email corporativo y una contraseña segura." },
      { title: "Verifica tu email", desc: "Recibirás un código de 6 dígitos en tu bandeja de entrada." },
      { title: "Configura tu workspace", desc: "Asigna un nombre a tu workspace y selecciona tu zona horaria." },
    ]},
    { type: "callout", variant: "tip", title: "SSO disponible", text: "En planes Growth y Enterprise puedes registrarte directamente con Google Workspace o Microsoft 365. Esto también habilita SSO para todo tu equipo." },
    { type: "heading", id: "dashboard", text: "Dashboard" },
    { type: "p", text: "Una vez dentro, el dashboard te muestra una visión general de tu operación: conversaciones activas, métricas clave, rendimiento del equipo y estado de los canales conectados." },
    { type: "list", items: [
      "Inbox — todas las conversaciones en un solo lugar",
      "Métricas — tiempo de respuesta, satisfacción, volumen",
      "Equipo — agentes online, carga de trabajo, asignaciones",
      "Canales — estado de conexión de cada canal",
      "IA — rendimiento del asistente y preguntas frecuentes",
    ]},
    { type: "heading", id: "equipo-setup", text: "Configurar equipo" },
    { type: "p", text: "Invita a tu equipo desde Configuración → Equipo. Cada miembro puede tener un rol diferente:" },
    { type: "list", items: [
      "Admin — acceso completo, configuración y facturación",
      "Supervisor — ver métricas, reasignar conversaciones, gestionar equipo",
      "Agente — responder conversaciones y usar el inbox",
      "Viewer — solo lectura, ideal para stakeholders",
    ]},
    { type: "callout", variant: "info", title: "Límites", text: "El plan Starter incluye hasta 5 agentes. Planes Growth y Enterprise no tienen límite de agentes." },
  ],

  /* ── Primer canal ── */
  "first-channel": [
    { type: "heading", id: "elegir-canal", text: "Elegir tu primer canal" },
    { type: "p", text: "WITHMIA soporta múltiples canales de comunicación. Te recomendamos empezar con el que más usen tus clientes — típicamente WhatsApp o Webchat." },
    { type: "list", items: [
      "WhatsApp Business — el canal más popular en Latinoamérica",
      "Webchat — widget embebido en tu sitio web, sin fricción",
      "Instagram — DMs y respuestas a stories",
      "Messenger — integración con Facebook Pages",
      "Email — conecta tu correo corporativo",
    ]},
    { type: "heading", id: "conectar-canal", text: "Conectar un canal" },
    { type: "steps", steps: [
      { title: "Ve a Configuración → Canales", desc: "Accede al panel de canales desde el menú lateral." },
      { title: "Selecciona el canal", desc: "Haz clic en el ícono del canal que quieres conectar." },
      { title: "Sigue el asistente", desc: "Cada canal tiene un flujo de configuración guiado. Sigue los pasos en pantalla." },
      { title: "Envía un mensaje de prueba", desc: "Verifica que todo funciona enviando un mensaje de prueba desde el canal." },
    ]},
    { type: "callout", variant: "tip", title: "Recomendación", text: "Empieza con Webchat — es el más rápido de configurar (1 minuto) y no requiere cuentas externas. Perfecto para probar WITHMIA antes de conectar WhatsApp." },
    { type: "heading", id: "verificar", text: "Verificar la conexión" },
    { type: "p", text: "Después de conectar, envía un mensaje de prueba y verifica que aparece en tu inbox. Si algo falla, revisa:" },
    { type: "list", items: [
      "Estado del canal en Configuración → Canales (debe mostrar 'Conectado')",
      "Permisos de la cuenta conectada (especialmente para Meta/Instagram)",
      "Que el número de WhatsApp no esté registrado en WhatsApp personal",
      "Que tu navegador permita notificaciones para alertas en tiempo real",
    ]},
  ],

  /* ── Conversaciones ── */
  conversations: [
    { type: "heading", id: "inbox", text: "El Inbox" },
    { type: "p", text: "El inbox de WITHMIA es donde tu equipo gestiona todas las conversaciones entrantes. Combina mensajes de WhatsApp, Instagram, Email, Webchat y más en una interfaz unificada." },
    { type: "callout", variant: "info", title: "Omnicanal", text: "Si un cliente te escribe por WhatsApp y luego por Email, WITHMIA unifica ambas conversaciones bajo el mismo perfil de contacto." },
    { type: "heading", id: "asignacion", text: "Asignación" },
    { type: "p", text: "Las conversaciones pueden asignarse manual o automáticamente a agentes:" },
    { type: "list", items: [
      "Round Robin — distribución equitativa entre agentes disponibles",
      "Carga mínima — asigna al agente con menos conversaciones activas",
      "Manual — un supervisor asigna según expertise o prioridad",
      "Por canal — asigna equipos específicos a cada canal",
      "IA primero — el asistente IA atiende y transfiere si es necesario",
    ]},
    { type: "heading", id: "etiquetas", text: "Etiquetas y prioridad" },
    { type: "p", text: "Organiza conversaciones con etiquetas de color y niveles de prioridad:" },
    { type: "code", code: "// Asignar etiqueta via API\nawait withmia.conversations.addLabel({\n  conversationId: \"conv_456\",\n  label: \"urgente\",\n  color: \"red\"\n});\n\n// Cambiar prioridad\nawait withmia.conversations.update({\n  conversationId: \"conv_456\",\n  priority: \"high\" // low | normal | high | urgent\n});", lang: "javascript" },
    { type: "heading", id: "respuestas-rapidas", text: "Respuestas rápidas" },
    { type: "p", text: "Crea atajos para respuestas frecuentes. Escribe / en el inbox para ver tus respuestas rápidas disponibles:" },
    { type: "list", items: [
      "/saludo — saludo personalizado con el nombre del cliente",
      "/horarios — información de horarios de atención",
      "/precios — enlace a la página de precios",
      "/soporte — escalar a soporte técnico",
    ]},
    { type: "callout", variant: "tip", title: "Variables", text: "Las respuestas rápidas soportan variables: {{nombre}}, {{email}}, {{canal}}, {{agente}}. Se reemplazan automáticamente al enviar." },
    { type: "heading", id: "cerrar", text: "Cerrar conversaciones" },
    { type: "p", text: "Cierra conversaciones cuando el tema esté resuelto. Las conversaciones cerradas se archivan automáticamente y se pueden reabrir en cualquier momento. Configura cierre automático tras N horas de inactividad desde Configuración → Conversaciones." },
  ],

  /* ── Instagram ── */
  instagram: [
    { type: "heading", id: "requisitos-ig", text: "Requisitos" },
    { type: "p", text: "Para conectar Instagram a WITHMIA necesitas una cuenta de Instagram Business o Creator vinculada a una Facebook Page." },
    { type: "list", items: [
      "Cuenta de Instagram Business o Creator (no personal)",
      "Facebook Page vinculada a la cuenta de Instagram",
      "Rol de administrador en la Facebook Page",
      "Cuenta de WITHMIA con plan activo",
    ]},
    { type: "callout", variant: "warning", title: "Cuenta personal", text: "Las cuentas personales de Instagram no soportan la API de mensajes. Cambia a Business o Creator desde Configuración de Instagram → Cuenta → Cambiar tipo de cuenta." },
    { type: "heading", id: "conexion-ig", text: "Conectar Instagram" },
    { type: "steps", steps: [
      { title: "Ve a Canales → Instagram", desc: "En tu dashboard de WITHMIA, accede a Configuración → Canales → Instagram." },
      { title: "Inicia sesión con Facebook", desc: "Autoriza WITHMIA para acceder a tus páginas y cuentas de Instagram." },
      { title: "Selecciona la cuenta", desc: "Elige la Page y cuenta de Instagram que quieres conectar." },
      { title: "Confirma los permisos", desc: "Acepta los permisos requeridos: mensajes, comentarios y datos de perfil." },
    ]},
    { type: "heading", id: "funciones-ig", text: "Funcionalidades" },
    { type: "p", text: "WITHMIA captura automáticamente estos tipos de interacciones:" },
    { type: "list", items: [
      "Direct Messages (DMs) — mensajes privados de usuarios",
      "Story Replies — respuestas a tus Instagram Stories",
      "Story Mentions — cuando te mencionan en una Story",
      "Comentarios — respuestas a comentarios en tus posts (opcional)",
    ]},
    { type: "heading", id: "automatizacion-ig", text: "Automatización" },
    { type: "p", text: "Configura respuestas automáticas para Instagram:" },
    { type: "code", code: "// Respuesta automática a DMs\nawait withmia.automations.create({\n  channel: \"instagram\",\n  trigger: \"message.received\",\n  conditions: [\n    { field: \"source\", operator: \"eq\", value: \"dm\" }\n  ],\n  actions: [\n    { type: \"reply\", text: \"¡Hola! Gracias por tu mensaje. Un agente te responderá en breve 💬\" },\n    { type: \"assign\", strategy: \"round_robin\" }\n  ]\n});", lang: "javascript" },
    { type: "callout", variant: "tip", title: "Ice breakers", text: "Configura 'Ice Breakers' en la sección de Instagram para mostrar opciones predefinidas cuando un usuario abre el chat por primera vez." },
  ],

  /* ── SDK Python ── */
  "sdk-python": [
    { type: "heading", id: "install-py", text: "Instalación" },
    { type: "p", text: "Instala el SDK oficial de WITHMIA para Python:" },
    { type: "codetabs", tabs: [
      { label: "pip", lang: "bash", code: "pip install withmia" },
      { label: "pip3", lang: "bash", code: "pip3 install withmia" },
      { label: "poetry", lang: "bash", code: "poetry add withmia" },
    ]},
    { type: "callout", variant: "info", title: "Requisitos", text: "Python 3.9 o superior. Compatible con asyncio para operaciones no bloqueantes." },
    { type: "heading", id: "init-py", text: "Inicialización" },
    { type: "code", code: "import os\nfrom withmia import Withmia\n\n# Inicializar cliente\nclient = Withmia(\n    api_key=os.environ[\"WITHMIA_API_KEY\"],\n    # Opciones adicionales:\n    # base_url=\"https://api.withmia.com/v1\",\n    # timeout=30,\n    # max_retries=3,\n)", lang: "python" },
    { type: "heading", id: "mensajes-py", text: "Enviar mensajes" },
    { type: "code", code: "# Mensaje de texto\nmessage = client.messages.send(\n    channel=\"whatsapp\",\n    to=\"+56912345678\",\n    type=\"text\",\n    text=\"¡Hola desde Python! 🐍\"\n)\nprint(f\"Enviado: {message.id}\")\n\n# Mensaje con imagen\nclient.messages.send(\n    channel=\"whatsapp\",\n    to=\"+56912345678\",\n    type=\"image\",\n    media={\n        \"url\": \"https://ejemplo.com/imagen.jpg\",\n        \"caption\": \"Mira esta imagen\"\n    }\n)", lang: "python" },
    { type: "heading", id: "async-py", text: "Modo asíncrono" },
    { type: "p", text: "Para aplicaciones con asyncio (FastAPI, aiohttp, etc.), usa el cliente async:" },
    { type: "code", code: "from withmia import AsyncWithmia\nimport asyncio\n\nasync def main():\n    client = AsyncWithmia(api_key=os.environ[\"WITHMIA_API_KEY\"])\n\n    # Enviar múltiples mensajes en paralelo\n    tasks = [\n        client.messages.send(channel=\"whatsapp\", to=num, text=\"¡Hola!\")\n        for num in [\"+56912345678\", \"+56987654321\"]\n    ]\n    results = await asyncio.gather(*tasks)\n    print(f\"Enviados: {len(results)} mensajes\")\n\nasyncio.run(main())", lang: "python" },
    { type: "heading", id: "webhooks-py", text: "Recibir webhooks" },
    { type: "p", text: "Ejemplo con FastAPI:" },
    { type: "code", code: "from fastapi import FastAPI, Request, HTTPException\nfrom withmia import Withmia\nimport os\n\napp = FastAPI()\nclient = Withmia(api_key=os.environ[\"WITHMIA_API_KEY\"])\n\n@app.post(\"/webhooks\")\nasync def handle_webhook(request: Request):\n    body = await request.body()\n    signature = request.headers.get(\"x-withmia-signature\", \"\")\n\n    event = client.webhooks.verify(\n        payload=body,\n        signature=signature,\n        secret=os.environ[\"WEBHOOK_SECRET\"]\n    )\n\n    if event.type == \"message.received\":\n        print(f\"Nuevo mensaje: {event.data.text}\")\n\n    return {\"ok\": True}", lang: "python" },
    { type: "heading", id: "errores-py", text: "Manejo de errores" },
    { type: "code", code: "from withmia.exceptions import WithmiaError, RateLimitError\n\ntry:\n    client.messages.send(...)\nexcept RateLimitError as e:\n    print(f\"Rate limited. Reintentar en {e.retry_after}s\")\nexcept WithmiaError as e:\n    print(f\"Error {e.status_code}: {e.message}\")", lang: "python" },
  ],

  /* ── Workflows ── */
  workflows: [
    { type: "heading", id: "que-son", text: "¿Qué son los Workflows?" },
    { type: "p", text: "Los Workflows de WITHMIA te permiten automatizar procesos repetitivos sin escribir código. Usa un editor visual de arrastrar y soltar para crear flujos que se ejecutan automáticamente cuando ocurren eventos específicos." },
    { type: "callout", variant: "info", title: "Visual y código", text: "Los workflows se pueden crear desde el editor visual o programáticamente via API. Ambos métodos producen el mismo resultado." },
    { type: "heading", id: "crear-workflow", text: "Crear un workflow" },
    { type: "steps", steps: [
      { title: "Abre el editor", desc: "Ve a Automatización → Workflows y haz clic en 'Nuevo Workflow'." },
      { title: "Elige un trigger", desc: "Selecciona el evento que inicia el workflow (mensaje recibido, conversación creada, etc.)." },
      { title: "Agrega acciones", desc: "Arrastra nodos de acción: responder, asignar, etiquetar, enviar a webhook, etc." },
      { title: "Configura condiciones", desc: "Agrega nodos condicionales para crear ramas lógicas según el contenido del mensaje." },
      { title: "Activa el workflow", desc: "Prueba con un mensaje de prueba y activa el workflow cuando esté listo." },
    ]},
    { type: "heading", id: "triggers", text: "Triggers disponibles" },
    { type: "list", items: [
      "message.received — cuando llega un nuevo mensaje",
      "conversation.created — cuando se crea una nueva conversación",
      "conversation.assigned — cuando se asigna a un agente",
      "contact.created — cuando se registra un nuevo contacto",
      "schedule — ejecución programada (cron)",
      "webhook — trigger via HTTP externo",
    ]},
    { type: "heading", id: "acciones", text: "Acciones" },
    { type: "list", items: [
      "Responder — envía un mensaje al contacto",
      "Asignar — asigna la conversación a un agente o equipo",
      "Etiquetar — agrega etiquetas a la conversación",
      "Cerrar — cierra la conversación automáticamente",
      "Webhook — envía datos a una URL externa",
      "HTTP Request — llama una API externa y usa la respuesta",
      "Delay — espera N minutos/horas antes de continuar",
      "Condición — bifurca según contenido, canal, etiquetas, etc.",
      "IA — genera respuesta usando el asistente IA",
    ]},
    { type: "heading", id: "ejemplo-wf", text: "Ejemplo: auto-respuesta fuera de horario" },
    { type: "code", code: "// Crear workflow via API\nawait withmia.workflows.create({\n  name: \"Fuera de horario\",\n  trigger: {\n    type: \"message.received\",\n    conditions: [\n      { field: \"business_hours\", operator: \"eq\", value: false }\n    ]\n  },\n  actions: [\n    {\n      type: \"reply\",\n      message: \"¡Hola! Estamos fuera de horario. Te responderemos mañana a primera hora. ⏰\"\n    },\n    {\n      type: \"label\",\n      labels: [\"fuera-de-horario\"]\n    }\n  ]\n});", lang: "javascript" },
    { type: "callout", variant: "tip", title: "Templates", text: "WITHMIA incluye templates de workflows prediseñados para casos comunes: bienvenida, fuera de horario, encuesta de satisfacción, escalamiento, y más." },
  ],

  /* ── Elegir tu plan ── */
  "choose-plan": [
    { type: "heading", id: "planes", text: "Planes disponibles" },
    { type: "p", text: "WITHMIA ofrece planes adaptados a cada etapa de crecimiento de tu negocio. Todos los planes incluyen inbox omnicanal, asistente IA básico y soporte por chat." },
    { type: "list", items: [
      "Starter (gratis) — hasta 100 conversaciones/mes, 2 agentes, 1 canal, IA básica",
      "Growth ($49/mes) — conversaciones ilimitadas, agentes ilimitados, todos los canales, IA avanzada con RAG, analytics",
      "Enterprise (personalizado) — todo en Growth + SSO/SAML, SLA dedicado, IP whitelisting, soporte prioritario 24/7, custom integrations",
    ]},
    { type: "callout", variant: "info", title: "Sin tarjeta de crédito", text: "El plan Starter es gratuito y no requiere tarjeta de crédito. Puedes probar WITHMIA sin compromiso y actualizar cuando lo necesites." },
    { type: "heading", id: "facturacion", text: "Facturación" },
    { type: "p", text: "Los planes de pago se facturan mensual o anualmente. El pago anual incluye un 20% de descuento." },
    { type: "list", items: [
      "Métodos de pago: tarjeta de crédito/débito, transferencia bancaria (Enterprise)",
      "Moneda: USD. Precios no incluyen impuestos locales",
      "Factura electrónica disponible para todos los planes",
      "Cancelación: puedes cancelar en cualquier momento sin penalidad",
    ]},
    { type: "heading", id: "cambiar-plan", text: "Cambiar de plan" },
    { type: "p", text: "Para cambiar de plan, ve a Configuración → Facturación → Cambiar plan. Los cambios se aplican inmediatamente:" },
    { type: "steps", steps: [
      { title: "Upgrade", desc: "Al subir de plan, las nuevas funcionalidades se activan al instante. Se cobra el proporcional restante del período." },
      { title: "Downgrade", desc: "Al bajar de plan, las funcionalidades premium se mantienen hasta el final del período actual." },
      { title: "Cancelar", desc: "Al cancelar, tu cuenta pasa a plan Starter al final del período de facturación." },
    ]},
    { type: "callout", variant: "tip", title: "Enterprise", text: "Para el plan Enterprise, contacta a nuestro equipo de ventas en ventas@withmia.com o agenda una demo desde la página de precios." },
  ],

  /* ── Dashboard ── */
  dashboard: [
    { type: "heading", id: "overview", text: "Vista general" },
    { type: "p", text: "El dashboard de WITHMIA es tu centro de comando. Muestra métricas en tiempo real, estado de canales, rendimiento del equipo y accesos rápidos a las funciones más usadas." },
    { type: "list", items: [
      "Conversaciones activas — total de conversaciones abiertas en este momento",
      "Tiempo promedio de respuesta — tiempo medio desde que llega un mensaje hasta la primera respuesta",
      "Mensajes hoy — volumen de mensajes entrantes y salientes del día",
      "Satisfacción (CSAT) — puntuación promedio de las encuestas de satisfacción",
      "Estado de canales — indicador verde/rojo para cada canal conectado",
    ]},
    { type: "callout", variant: "info", title: "Tiempo real", text: "Las métricas del dashboard se actualizan automáticamente cada 30 segundos. No necesitas recargar la página." },
    { type: "heading", id: "widgets", text: "Widgets" },
    { type: "p", text: "El dashboard incluye widgets configurables que puedes reorganizar según tus preferencias:" },
    { type: "list", items: [
      "Gráfico de volumen — mensajes por hora/día/semana con tendencia",
      "Cola de espera — conversaciones sin asignar ordenadas por antigüedad",
      "Rendimiento de agentes — ranking de agentes por velocidad y volumen",
      "Top etiquetas — etiquetas más frecuentes en las últimas 24h",
      "Estado de IA — porcentaje de conversaciones resueltas automáticamente",
      "Calendario — citas y eventos programados del día",
    ]},
    { type: "heading", id: "shortcuts", text: "Accesos rápidos" },
    { type: "p", text: "Usa atajos de teclado para navegar más rápido:" },
    { type: "list", items: [
      "G + I — ir al Inbox",
      "G + D — ir al Dashboard",
      "G + C — ir a Contactos",
      "G + S — ir a Configuración",
      "/ — enfocar la barra de búsqueda",
      "N — nueva conversación",
      "? — ver todos los atajos",
    ]},
  ],

  /* ── Contactos y CRM ── */
  "contacts-crm": [
    { type: "heading", id: "contactos", text: "Gestión de contactos" },
    { type: "p", text: "WITHMIA crea automáticamente un perfil de contacto cada vez que un nuevo cliente inicia una conversación. Los contactos se unifican entre canales — si una persona te escribe por WhatsApp e Instagram, ambas conversaciones aparecen bajo el mismo contacto." },
    { type: "list", items: [
      "Creación automática desde conversaciones entrantes",
      "Unificación cross-canal por email, teléfono o identificadores",
      "Campos estándar: nombre, email, teléfono, empresa, cargo",
      "Historial completo de conversaciones por contacto",
      "Notas internas y etiquetas por contacto",
    ]},
    { type: "code", code: "// Crear contacto via API\nconst contact = await withmia.contacts.create({\n  name: \"María García\",\n  email: \"maria@empresa.com\",\n  phone: \"+56912345678\",\n  company: \"ACME Corp\",\n  custom_fields: {\n    plan: \"enterprise\",\n    referido_por: \"Google Ads\"\n  }\n});\n\nconsole.log('Contacto creado:', contact.id);", lang: "javascript" },
    { type: "heading", id: "pipeline", text: "Pipeline visual" },
    { type: "p", text: "Organiza tus contactos en un pipeline estilo Kanban para visualizar tu embudo de ventas o soporte:" },
    { type: "steps", steps: [
      { title: "Crea columnas", desc: "Define las etapas de tu pipeline: Nuevo, Contactado, En negociación, Cerrado ganado, Cerrado perdido." },
      { title: "Arrastra contactos", desc: "Mueve contactos entre columnas arrastrándolos. El cambio se guarda automáticamente." },
      { title: "Agrega valor", desc: "Asigna un valor monetario a cada deal para ver el forecast de ingresos." },
    ]},
    { type: "callout", variant: "tip", title: "Automatización", text: "Configura workflows para mover contactos automáticamente entre etapas: por ejemplo, mover a 'Contactado' cuando un agente responde por primera vez." },
    { type: "heading", id: "campos", text: "Campos personalizados" },
    { type: "p", text: "Extiende el perfil de contacto con campos personalizados para almacenar datos específicos de tu negocio:" },
    { type: "list", items: [
      "Texto — nombre de empresa, cargo, dirección",
      "Número — presupuesto, cantidad de empleados",
      "Fecha — fecha de compra, renovación",
      "Selector — industria, origen del lead",
      "Checkbox — aceptó términos, cliente VIP",
      "URL — sitio web, LinkedIn",
    ]},
    { type: "code", code: "// Actualizar campos personalizados\nawait withmia.contacts.update({\n  contactId: \"ct_321\",\n  custom_fields: {\n    industria: \"Tecnología\",\n    presupuesto: 50000,\n    fecha_renovacion: \"2026-06-15\",\n    cliente_vip: true\n  }\n});", lang: "javascript" },
  ],

  /* ── Analítica ── */
  analytics: [
    { type: "heading", id: "metricas", text: "Métricas clave" },
    { type: "p", text: "WITHMIA genera métricas en tiempo real sobre la operación de tu equipo de atención. Accede desde el menú lateral → Analítica." },
    { type: "list", items: [
      "Volumen de conversaciones — total por hora, día, semana, mes",
      "Tiempo de primera respuesta (FRT) — promedio y percentil 90",
      "Tiempo de resolución — desde apertura hasta cierre de conversación",
      "CSAT — puntuación de satisfacción con distribución de puntajes",
      "Tasa de resolución IA — porcentaje de conversaciones resueltas sin intervención humana",
      "Carga por agente — distribución de conversaciones activas por agente",
      "Mensajes por conversación — promedio de intercambios antes de resolver",
    ]},
    { type: "callout", variant: "info", title: "Datos en tiempo real", text: "Las métricas se actualizan cada 30 segundos. Los reportes históricos están disponibles con datos de hasta 12 meses." },
    { type: "heading", id: "reportes", text: "Reportes" },
    { type: "p", text: "WITHMIA incluye reportes prediseñados y la posibilidad de crear reportes personalizados:" },
    { type: "list", items: [
      "Reporte diario — resumen automático enviado por email cada mañana",
      "Rendimiento de equipo — ranking de agentes con KPIs individuales",
      "Análisis por canal — comparativa de volumen y satisfacción entre canales",
      "Tendencias — gráficos de evolución semanal y mensual",
      "Horas pico — mapa de calor con las horas de mayor tráfico",
      "Reportes personalizados — filtra por fecha, canal, agente, etiqueta o prioridad",
    ]},
    { type: "heading", id: "exportar", text: "Exportar datos" },
    { type: "p", text: "Exporta tus datos en múltiples formatos para análisis externo:" },
    { type: "list", items: [
      "CSV — datos tabulares para Excel o Google Sheets",
      "PDF — reportes formateados para presentaciones",
      "API — acceso programático a todas las métricas vía REST API",
    ]},
    { type: "code", code: "// Obtener métricas via API\nconst metrics = await withmia.analytics.get({\n  period: \"last_30_days\",\n  metrics: [\"conversations\", \"frt\", \"csat\", \"resolution_time\"],\n  group_by: \"day\"\n});\n\nconsole.log('FRT promedio:', metrics.frt.average, 'segundos');", lang: "javascript" },
    { type: "callout", variant: "tip", title: "Integraciones BI", text: "Conecta WITHMIA con Google Data Studio, Power BI o Metabase usando la API de métricas para dashboards ejecutivos personalizados." },
  ],

  /* ── Facebook Messenger ── */
  messenger: [
    { type: "heading", id: "setup-fb", text: "Configuración" },
    { type: "p", text: "Conecta tu Facebook Page a WITHMIA para gestionar mensajes de Messenger directamente desde el inbox." },
    { type: "list", items: [
      "Requiere una Facebook Page con rol de administrador",
      "Cuenta de WITHMIA con plan activo",
      "Permisos de mensajes habilitados en la Page",
    ]},
    { type: "steps", steps: [
      { title: "Ve a Canales → Messenger", desc: "En tu dashboard de WITHMIA, accede a Configuración → Canales → Facebook Messenger." },
      { title: "Inicia sesión con Facebook", desc: "Autoriza WITHMIA para acceder a tu cuenta y selecciona la Page que quieres conectar." },
      { title: "Confirma permisos", desc: "Acepta los permisos de lectura y envío de mensajes." },
      { title: "Prueba la conexión", desc: "Envía un mensaje a tu Page desde otra cuenta de Facebook. Debe aparecer en tu inbox de WITHMIA." },
    ]},
    { type: "callout", variant: "warning", title: "Ventana de 24 horas", text: "Facebook aplica una ventana de 24 horas para responder mensajes. Después de 24h sin respuesta, solo puedes enviar Message Templates o Human Agent tags." },
    { type: "heading", id: "features-fb", text: "Funcionalidades" },
    { type: "p", text: "WITHMIA captura todas las interacciones de Messenger:" },
    { type: "list", items: [
      "Mensajes directos — texto, imágenes, videos, archivos, stickers",
      "Get Started — mensaje automático cuando un usuario abre el chat por primera vez",
      "Persistent Menu — menú fijo en la parte inferior del chat con opciones predefinidas",
      "Ice Breakers — botones de inicio de conversación para guiar al usuario",
      "Postbacks — respuestas automáticas a botones y carruseles",
      "Respuestas rápidas — botones sugeridos dentro del chat",
    ]},
    { type: "code", code: "// Enviar mensaje con botones\nawait withmia.messages.send({\n  channel: \"messenger\",\n  to: \"user_fb_id\",\n  type: \"template\",\n  template: {\n    type: \"button\",\n    text: \"¿En qué puedo ayudarte?\",\n    buttons: [\n      { type: \"postback\", title: \"📦 Estado de pedido\", payload: \"ORDER_STATUS\" },\n      { type: \"postback\", title: \"💬 Hablar con agente\", payload: \"HUMAN_AGENT\" },\n      { type: \"web_url\", title: \"🌐 Visitar sitio\", url: \"https://tu-sitio.com\" }\n    ]\n  }\n});", lang: "javascript" },
  ],

  /* ── Email ── */
  "email-channel": [
    { type: "heading", id: "config-email", text: "Configuración" },
    { type: "p", text: "Conecta tu correo corporativo a WITHMIA para gestionar emails como conversaciones en el inbox unificado. Los agentes pueden responder emails directamente desde WITHMIA sin cambiar de herramienta." },
    { type: "steps", steps: [
      { title: "Ve a Canales → Email", desc: "Accede a Configuración → Canales → Email en tu dashboard." },
      { title: "Elige el método de conexión", desc: "Puedes conectar via IMAP/SMTP (cualquier proveedor) o con conexión directa para Google Workspace y Microsoft 365." },
      { title: "Ingresa las credenciales", desc: "Proporciona los datos del servidor IMAP/SMTP o autoriza con OAuth." },
      { title: "Configura la firma", desc: "Define una firma de email que se incluirá automáticamente en las respuestas." },
    ]},
    { type: "callout", variant: "tip", title: "Google / Microsoft", text: "Para Google Workspace y Microsoft 365, usa la conexión OAuth directa. Es más segura y no requiere contraseñas de aplicación." },
    { type: "heading", id: "imap-smtp", text: "IMAP / SMTP" },
    { type: "p", text: "Para conectar con IMAP/SMTP necesitas los datos del servidor de tu proveedor de email:" },
    { type: "list", items: [
      "Servidor IMAP — dirección, puerto (993 para SSL), credenciales",
      "Servidor SMTP — dirección, puerto (587 para TLS), credenciales",
      "Carpeta a monitorear — Inbox, o una carpeta específica",
      "Frecuencia de sincronización — cada 1, 5 o 15 minutos",
    ]},
    { type: "code", code: "# Configuración típica para Gmail via IMAP\nIMAP: imap.gmail.com:993 (SSL)\nSMTP: smtp.gmail.com:587 (TLS)\nUsuario: tu-email@empresa.com\nContraseña: App Password (no la contraseña regular)\n\n# Configuración para Microsoft 365\nIMAP: outlook.office365.com:993 (SSL)\nSMTP: smtp.office365.com:587 (TLS)", lang: "bash" },
    { type: "callout", variant: "warning", title: "App Passwords", text: "Si usas Gmail con 2FA activado, necesitas generar una 'App Password' desde la configuración de tu cuenta de Google. Las contraseñas regulares no funcionarán." },
  ],

  /* ── Flujos automáticos ── */
  "auto-flows": [
    { type: "heading", id: "crear-flujo", text: "Crear un flujo" },
    { type: "p", text: "Los flujos automáticos son secuencias de mensajes y acciones que se ejecutan cuando un cliente inicia una conversación o se cumple una condición. A diferencia de los Workflows (que son event-driven), los flujos son conversacionales e interactivos." },
    { type: "steps", steps: [
      { title: "Crea un nuevo flujo", desc: "Ve a Automatización → Flujos y haz clic en 'Nuevo flujo'. Asigna un nombre descriptivo." },
      { title: "Define el trigger", desc: "Selecciona cuándo se activa: palabra clave, primer mensaje, menú, o manualmente." },
      { title: "Diseña la secuencia", desc: "Arrastra nodos para crear la secuencia: mensajes, preguntas, condiciones, acciones." },
      { title: "Prueba el flujo", desc: "Usa el simulador integrado para probar cada rama antes de activar." },
    ]},
    { type: "callout", variant: "info", title: "Visual Builder", text: "El editor visual de flujos tiene funcionalidad drag-and-drop. No necesitas código para crear flujos complejos con múltiples ramas." },
    { type: "heading", id: "nodos", text: "Tipos de nodos" },
    { type: "list", items: [
      "Mensaje — envía texto, imagen, video o documento al contacto",
      "Pregunta — solicita información y guarda la respuesta en una variable",
      "Condición — bifurca el flujo según respuesta, canal, etiqueta u horario",
      "Acción — ejecuta una acción: asignar agente, agregar etiqueta, llamar API",
      "Espera — pausa el flujo por un tiempo definido",
      "Subflow — enlaza con otro flujo para reutilizar secuencias",
      "Transferir — transfiere a un agente humano finalizando el flujo",
    ]},
    { type: "heading", id: "condiciones", text: "Condiciones" },
    { type: "p", text: "Las condiciones permiten crear experiencias personalizadas según el contexto:" },
    { type: "list", items: [
      "Respuesta del usuario — contiene, es igual a, empieza con",
      "Canal — WhatsApp, Instagram, Messenger, Email, Webchat",
      "Horario — dentro/fuera del horario laboral",
      "Etiquetas — el contacto tiene o no una etiqueta específica",
      "Campo personalizado — cualquier campo del contacto",
      "Idioma — idioma detectado del mensaje",
    ]},
    { type: "code", code: "// Crear flujo via API\nawait withmia.flows.create({\n  name: \"Bienvenida WhatsApp\",\n  trigger: { type: \"keyword\", keywords: [\"hola\", \"inicio\", \"empezar\"] },\n  channel: \"whatsapp\",\n  nodes: [\n    {\n      type: \"message\",\n      text: \"¡Hola {{nombre}}! 👋 Bienvenido a ACME. ¿En qué puedo ayudarte?\"\n    },\n    {\n      type: \"question\",\n      text: \"Elige una opción:\",\n      options: [\"📦 Estado de pedido\", \"💳 Facturación\", \"💬 Hablar con un agente\"],\n      variable: \"opcion_elegida\"\n    },\n    {\n      type: \"condition\",\n      field: \"opcion_elegida\",\n      branches: [\n        { value: \"Estado de pedido\", goto: \"check_order\" },\n        { value: \"Facturación\", goto: \"billing\" },\n        { value: \"Hablar con un agente\", goto: \"transfer\" }\n      ]\n    }\n  ]\n});", lang: "javascript" },
  ],

  /* ── Respuestas sugeridas ── */
  "suggested-replies": [
    { type: "heading", id: "activar", text: "Activar sugerencias" },
    { type: "p", text: "Las respuestas sugeridas usan IA para analizar el mensaje del cliente y proponer respuestas al agente en tiempo real. El agente puede aceptar, editar o ignorar la sugerencia." },
    { type: "steps", steps: [
      { title: "Activa la función", desc: "Ve a Configuración → IA → Respuestas sugeridas y activa el toggle." },
      { title: "Selecciona el modelo", desc: "Elige el nivel de sugerencias: conservador (solo FAQs), balanceado o creativo." },
      { title: "Configura la base de conocimiento", desc: "Conecta documentos y FAQs para que las sugerencias sean más precisas." },
      { title: "Prueba en el inbox", desc: "Abre una conversación y verás las sugerencias aparecer debajo del campo de mensaje." },
    ]},
    { type: "callout", variant: "tip", title: "Aprendizaje", text: "Cada vez que un agente acepta o rechaza una sugerencia, el sistema aprende y mejora sus futuras recomendaciones." },
    { type: "heading", id: "configurar-sug", text: "Configurar" },
    { type: "p", text: "Personaliza el comportamiento de las sugerencias:" },
    { type: "list", items: [
      "Idioma — las sugerencias se generan en el idioma del cliente automáticamente",
      "Tono — formal, casual o personalizado según tu marca",
      "Cantidad — muestra 1, 2 o 3 sugerencias por mensaje",
      "Fuentes — elige si usar solo la base de conocimiento, historial, o ambos",
      "Canales — activa/desactiva sugerencias por canal",
      "Agentes — activa solo para agentes nuevos o para todo el equipo",
    ]},
    { type: "code", code: "// Configurar sugerencias via API\nawait withmia.ai.suggestedReplies.configure({\n  enabled: true,\n  mode: \"balanced\", // conservative | balanced | creative\n  tone: \"professional\",\n  max_suggestions: 3,\n  channels: [\"whatsapp\", \"instagram\", \"webchat\"],\n  use_knowledge_base: true,\n  use_conversation_history: true\n});", lang: "javascript" },
  ],

  /* ── API Mensajes ── */
  "api-messages": [
    { type: "heading", id: "send-message", text: "Enviar mensaje" },
    { type: "p", text: "Envía mensajes a cualquier canal usando un endpoint unificado. El formato del payload es el mismo independientemente del canal destino." },
    { type: "code", code: "POST /v1/messages\nAuthorization: Bearer sk_live_...\nContent-Type: application/json\n\n{\n  \"channel\": \"whatsapp\",\n  \"to\": \"+56912345678\",\n  \"type\": \"text\",\n  \"text\": \"¡Hola! Tu pedido #12345 ha sido enviado.\",\n  \"conversation_id\": \"conv_456\"  // Opcional: enviar dentro de una conversación existente\n}", lang: "bash" },
    { type: "p", text: "Tipos de mensaje soportados:" },
    { type: "list", items: [
      "text — mensaje de texto simple",
      "image — imagen con caption opcional",
      "video — video con caption opcional",
      "audio — nota de voz o archivo de audio",
      "document — PDF, Word, Excel, etc.",
      "template — Message Template pre-aprobado (WhatsApp)",
      "interactive — botones, listas y carruseles",
      "location — coordenadas con dirección",
    ]},
    { type: "codetabs", tabs: [
      { label: "Texto", lang: "json", code: "{\n  \"channel\": \"whatsapp\",\n  \"to\": \"+56912345678\",\n  \"type\": \"text\",\n  \"text\": \"Hola, ¿en qué puedo ayudarte?\"\n}" },
      { label: "Imagen", lang: "json", code: "{\n  \"channel\": \"whatsapp\",\n  \"to\": \"+56912345678\",\n  \"type\": \"image\",\n  \"media\": {\n    \"url\": \"https://cdn.ejemplo.com/foto.jpg\",\n    \"caption\": \"Tu recibo de compra\"\n  }\n}" },
      { label: "Botones", lang: "json", code: "{\n  \"channel\": \"whatsapp\",\n  \"to\": \"+56912345678\",\n  \"type\": \"interactive\",\n  \"interactive\": {\n    \"type\": \"button\",\n    \"body\": \"¿Cómo quieres continuar?\",\n    \"buttons\": [\n      { \"id\": \"btn_1\", \"title\": \"Ver pedido\" },\n      { \"id\": \"btn_2\", \"title\": \"Hablar con agente\" }\n    ]\n  }\n}" },
    ]},
    { type: "heading", id: "list-messages", text: "Listar mensajes" },
    { type: "p", text: "Obtén los mensajes de una conversación con paginación:" },
    { type: "code", code: "GET /v1/conversations/{conversation_id}/messages?page=1&per_page=50\nAuthorization: Bearer sk_live_...\n\n// Respuesta\n{\n  \"data\": [\n    {\n      \"id\": \"msg_001\",\n      \"type\": \"text\",\n      \"text\": \"Hola, necesito ayuda\",\n      \"sender\": \"contact\",\n      \"timestamp\": \"2026-02-23T10:30:00Z\",\n      \"status\": \"read\"\n    },\n    {\n      \"id\": \"msg_002\",\n      \"type\": \"text\",\n      \"text\": \"¡Claro! ¿En qué puedo ayudarte?\",\n      \"sender\": \"agent\",\n      \"timestamp\": \"2026-02-23T10:30:45Z\",\n      \"status\": \"delivered\"\n    }\n  ],\n  \"meta\": { \"total\": 24, \"page\": 1, \"per_page\": 50 }\n}", lang: "bash" },
    { type: "heading", id: "message-status", text: "Estado del mensaje" },
    { type: "p", text: "Cada mensaje pasa por estos estados:" },
    { type: "list", items: [
      "queued — mensaje encolado para envío",
      "sent — enviado al proveedor del canal",
      "delivered — entregado al dispositivo del destinatario",
      "read — leído por el destinatario (cuando el canal lo soporta)",
      "failed — error en el envío (ver campo error para detalles)",
    ], ordered: true },
    { type: "callout", variant: "info", title: "Webhooks de estado", text: "Suscríbete al evento message.status para recibir actualizaciones de estado en tiempo real vía webhook." },
  ],

  /* ── API Conversaciones ── */
  "api-conversations": [
    { type: "heading", id: "list-conv", text: "Listar conversaciones" },
    { type: "p", text: "Obtén las conversaciones de tu workspace con filtros opcionales:" },
    { type: "code", code: "GET /v1/conversations?status=open&page=1&per_page=20\nAuthorization: Bearer sk_live_...\n\n// Filtros disponibles\n// status: open | resolved | pending | snoozed\n// assignee_id: filtrar por agente asignado\n// label: filtrar por etiqueta\n// channel: whatsapp | instagram | messenger | webchat | email\n// created_after: ISO date\n// created_before: ISO date\n\n// Respuesta\n{\n  \"data\": [\n    {\n      \"id\": \"conv_456\",\n      \"status\": \"open\",\n      \"channel\": \"whatsapp\",\n      \"contact\": { \"id\": \"ct_321\", \"name\": \"María García\" },\n      \"assignee\": { \"id\": \"agent_1\", \"name\": \"Carlos\" },\n      \"last_message\": {\n        \"text\": \"Gracias por tu ayuda\",\n        \"timestamp\": \"2026-02-23T10:30:00Z\"\n      },\n      \"unread_count\": 2,\n      \"labels\": [\"ventas\", \"prioritario\"],\n      \"created_at\": \"2026-02-23T08:15:00Z\"\n    }\n  ],\n  \"meta\": { \"total\": 156, \"page\": 1, \"per_page\": 20 }\n}", lang: "bash" },
    { type: "heading", id: "assign", text: "Asignar agente" },
    { type: "p", text: "Asigna o reasigna una conversación a un agente específico:" },
    { type: "codetabs", tabs: [
      { label: "cURL", lang: "bash", code: "curl -X POST https://api.withmia.com/v1/conversations/conv_456/assign \\\n  -H \"Authorization: Bearer sk_live_...\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{ \"assignee_id\": \"agent_1\" }'" },
      { label: "Node.js", lang: "javascript", code: "await withmia.conversations.assign({\n  conversationId: \"conv_456\",\n  assigneeId: \"agent_1\"\n});" },
      { label: "Python", lang: "python", code: "client.conversations.assign(\n    conversation_id=\"conv_456\",\n    assignee_id=\"agent_1\"\n)" },
    ]},
    { type: "heading", id: "close-conv", text: "Cerrar conversación" },
    { type: "p", text: "Cambia el estado de una conversación:" },
    { type: "code", code: "// Cerrar conversación\nPATCH /v1/conversations/conv_456\n{\n  \"status\": \"resolved\"\n}\n\n// Estados válidos: open, resolved, pending, snoozed\n// Para snoozed, incluye snoozed_until:\n{\n  \"status\": \"snoozed\",\n  \"snoozed_until\": \"2026-02-24T09:00:00Z\"\n}", lang: "bash" },
    { type: "callout", variant: "tip", title: "Bulk operations", text: "Usa POST /v1/conversations/bulk para cambiar el estado de múltiples conversaciones en una sola llamada. Incluye un array de conversation_ids." },
  ],

  /* ── API Contactos ── */
  "api-contacts": [
    { type: "heading", id: "create-contact", text: "Crear contacto" },
    { type: "p", text: "Crea un nuevo contacto en tu workspace:" },
    { type: "code", code: "POST /v1/contacts\nAuthorization: Bearer sk_live_...\nContent-Type: application/json\n\n{\n  \"name\": \"Juan Pérez\",\n  \"email\": \"juan@empresa.com\",\n  \"phone\": \"+56912345678\",\n  \"company\": \"ACME Corp\",\n  \"custom_fields\": {\n    \"plan\": \"growth\",\n    \"industry\": \"tech\"\n  }\n}\n\n// Respuesta: 201 Created\n{\n  \"id\": \"ct_789\",\n  \"name\": \"Juan Pérez\",\n  \"email\": \"juan@empresa.com\",\n  \"phone\": \"+56912345678\",\n  \"company\": \"ACME Corp\",\n  \"created_at\": \"2026-02-23T10:00:00Z\"\n}", lang: "bash" },
    { type: "heading", id: "update-contact", text: "Actualizar contacto" },
    { type: "code", code: "PATCH /v1/contacts/ct_789\nAuthorization: Bearer sk_live_...\nContent-Type: application/json\n\n{\n  \"name\": \"Juan A. Pérez\",\n  \"custom_fields\": {\n    \"plan\": \"enterprise\",\n    \"notas\": \"Cliente VIP desde febrero 2026\"\n  }\n}\n\n// Respuesta: 200 OK", lang: "bash" },
    { type: "heading", id: "search-contact", text: "Buscar contactos" },
    { type: "p", text: "Busca contactos por nombre, email, teléfono o campos personalizados:" },
    { type: "code", code: "GET /v1/contacts?q=juan&per_page=10\nGET /v1/contacts?email=juan@empresa.com\nGET /v1/contacts?phone=%2B56912345678\nGET /v1/contacts?custom_fields[plan]=enterprise\n\n// Respuesta\n{\n  \"data\": [\n    {\n      \"id\": \"ct_789\",\n      \"name\": \"Juan Pérez\",\n      \"email\": \"juan@empresa.com\",\n      \"phone\": \"+56912345678\",\n      \"conversations_count\": 5,\n      \"last_seen_at\": \"2026-02-23T10:30:00Z\"\n    }\n  ],\n  \"meta\": { \"total\": 1, \"page\": 1 }\n}", lang: "bash" },
    { type: "callout", variant: "info", title: "Deduplicación", text: "WITHMIA detecta contactos duplicados por email o teléfono. Al crear un contacto con un email/teléfono existente, se actualizan los datos del contacto existente en vez de crear uno nuevo." },
  ],

  /* ── SDK PHP ── */
  "sdk-php": [
    { type: "heading", id: "install-php", text: "Instalación" },
    { type: "p", text: "Instala el SDK oficial de WITHMIA para PHP usando Composer:" },
    { type: "code", code: "composer require withmia/sdk", lang: "bash" },
    { type: "callout", variant: "info", title: "Requisitos", text: "PHP 8.1 o superior. Requiere las extensiones curl y json (incluidas por defecto en la mayoría de instalaciones)." },
    { type: "heading", id: "usage-php", text: "Uso básico" },
    { type: "p", text: "Inicializa el cliente y envía tu primer mensaje:" },
    { type: "code", code: "<?php\n\nuse Withmia\\Withmia;\n\n$client = new Withmia([\n    'api_key' => env('WITHMIA_API_KEY'),\n    // 'base_url' => 'https://api.withmia.com/v1',\n    // 'timeout' => 30,\n]);\n\n// Enviar mensaje de texto\n$message = $client->messages->send([\n    'channel' => 'whatsapp',\n    'to' => '+56912345678',\n    'type' => 'text',\n    'text' => '¡Hola desde PHP! 🐘',\n]);\n\necho \"Mensaje enviado: \" . $message->id;", lang: "php" },
    { type: "p", text: "Gestión de conversaciones y contactos:" },
    { type: "code", code: "<?php\n\n// Listar conversaciones abiertas\n$conversations = $client->conversations->list([\n    'status' => 'open',\n    'per_page' => 20,\n]);\n\nforeach ($conversations->data as $conv) {\n    echo \"{$conv->id}: {$conv->contact->name}\\n\";\n}\n\n// Crear contacto\n$contact = $client->contacts->create([\n    'name' => 'María García',\n    'email' => 'maria@empresa.com',\n    'phone' => '+56987654321',\n]);\n\n// Cerrar conversación\n$client->conversations->update($conv->id, [\n    'status' => 'resolved',\n]);", lang: "php" },
    { type: "p", text: "Verificar webhooks en Laravel:" },
    { type: "code", code: "<?php\n\n// routes/api.php\nRoute::post('/webhooks/withmia', function (Request $request) {\n    $client = new Withmia(['api_key' => config('services.withmia.key')]);\n\n    $event = $client->webhooks->verify(\n        payload: $request->getContent(),\n        signature: $request->header('X-Withmia-Signature'),\n        secret: config('services.withmia.webhook_secret')\n    );\n\n    match ($event->type) {\n        'message.received' => HandleIncoming::dispatch($event->data),\n        'conversation.created' => NotifyTeam::dispatch($event->data),\n        default => null,\n    };\n\n    return response()->json(['ok' => true]);\n});", lang: "php" },
    { type: "callout", variant: "tip", title: "Laravel", text: "Para Laravel, puedes instalar el paquete adicional withmia/laravel que registra automáticamente el service provider y agrega comandos artisan." },
  ],

  /* ── n8n ── */
  "int-n8n": [
    { type: "heading", id: "n8n-setup", text: "Configuración" },
    { type: "p", text: "WITHMIA se integra nativamente con n8n, la plataforma de automatización open-source. Puedes enviar y recibir mensajes, gestionar conversaciones y sincronizar contactos directamente desde tus workflows de n8n." },
    { type: "steps", steps: [
      { title: "Instala el nodo WITHMIA", desc: "En tu instancia de n8n, busca 'WITHMIA' en el panel de nodos. Si usas n8n Cloud, el nodo viene pre-instalado." },
      { title: "Configura las credenciales", desc: "Agrega una nueva credencial de tipo WITHMIA con tu API Key." },
      { title: "Crea tu primer workflow", desc: "Usa el nodo WITHMIA Trigger para iniciar workflows cuando lleguen mensajes, o el nodo WITHMIA para enviar mensajes como acción." },
    ]},
    { type: "callout", variant: "info", title: "Trigger vs Action", text: "WITHMIA Trigger recibe eventos vía webhook (mensaje recibido, conversación creada). WITHMIA Action ejecuta operaciones (enviar mensaje, crear contacto, asignar agente)." },
    { type: "heading", id: "n8n-nodes", text: "Nodos disponibles" },
    { type: "list", items: [
      "WITHMIA Trigger — dispara el workflow cuando llega un mensaje, se crea una conversación, o cambia un estado",
      "Send Message — envía un mensaje de texto, imagen, video o documento",
      "Get Conversation — obtiene los detalles de una conversación",
      "Update Conversation — cambia el estado, asigna o etiqueta",
      "Create Contact — crea un nuevo contacto con campos personalizados",
      "Search Contacts — busca contactos por email, teléfono o nombre",
      "AI Reply — genera y envía una respuesta usando el asistente IA de WITHMIA",
    ]},
    { type: "heading", id: "n8n-templates", text: "Templates" },
    { type: "p", text: "Templates de n8n listos para usar:" },
    { type: "list", items: [
      "Auto-respuesta con ChatGPT — recibe mensaje → genera respuesta con IA → envía",
      "Sincronizar con Google Sheets — cada nuevo contacto se agrega a una hoja de cálculo",
      "Notificar en Slack — alerta al equipo en Slack cuando llega una conversación urgente",
      "Registro en CRM — crea un lead en HubSpot/Salesforce cuando un nuevo contacto escribe",
      "Encuesta de satisfacción — envía encuesta CSAT automática al cerrar una conversación",
    ]},
    { type: "callout", variant: "tip", title: "Repositorio", text: "Encuentra más templates en el repositorio de la comunidad: n8n.io/workflows. Busca 'WITHMIA' para ver todos los workflows compartidos." },
  ],

  /* ── Zapier ── */
  "int-zapier": [
    { type: "heading", id: "zap-setup", text: "Configuración" },
    { type: "p", text: "Conecta WITHMIA con más de 5,000 aplicaciones usando Zapier. Crea Zaps para automatizar tareas entre WITHMIA y tus herramientas favoritas sin escribir código." },
    { type: "steps", steps: [
      { title: "Busca WITHMIA en Zapier", desc: "Inicia sesión en zapier.com y busca 'WITHMIA' al crear un nuevo Zap." },
      { title: "Conecta tu cuenta", desc: "Autoriza Zapier con tu API Key de WITHMIA." },
      { title: "Configura el Trigger o Action", desc: "Selecciona el evento que te interesa y configura los campos." },
      { title: "Prueba y activa", desc: "Ejecuta una prueba y activa el Zap cuando funcione correctamente." },
    ]},
    { type: "heading", id: "zap-triggers", text: "Triggers disponibles" },
    { type: "p", text: "Eventos de WITHMIA que pueden iniciar un Zap:" },
    { type: "list", items: [
      "New Message — cuando llega un nuevo mensaje en cualquier canal",
      "New Conversation — cuando se crea una nueva conversación",
      "Conversation Assigned — cuando se asigna un agente",
      "Conversation Closed — cuando se cierra una conversación",
      "New Contact — cuando se registra un nuevo contacto",
      "Contact Updated — cuando se actualizan datos de un contacto",
    ]},
    { type: "heading", id: "zap-actions", text: "Acciones disponibles" },
    { type: "p", text: "Operaciones que puedes ejecutar en WITHMIA desde un Zap:" },
    { type: "list", items: [
      "Send Message — envía un mensaje a un contacto",
      "Create Contact — crea un nuevo contacto",
      "Update Contact — actualiza datos de un contacto existente",
      "Create Conversation — abre una nueva conversación",
      "Assign Conversation — asigna agente a una conversación",
      "Add Label — agrega una etiqueta a una conversación",
      "Close Conversation — cierra una conversación",
    ]},
    { type: "callout", variant: "tip", title: "Multi-step Zaps", text: "Combina múltiples acciones en un solo Zap: por ejemplo, 'Nuevo mensaje en WITHMIA → Buscar contacto en HubSpot → Si no existe, crear lead → Notificar en Slack'." },
  ],

  /* ── CRM ── */
  "int-crm": [
    { type: "heading", id: "crm-sync", text: "Sincronización con CRM" },
    { type: "p", text: "WITHMIA se integra con los principales CRMs del mercado para mantener tus contactos sincronizados bidirecccionalmente. Cuando un nuevo contacto escribe por WhatsApp, se crea automáticamente en tu CRM — y viceversa." },
    { type: "list", items: [
      "HubSpot — sincronización completa de contactos, deals y actividades",
      "Salesforce — contactos, leads, oportunidades y casos",
      "Pipedrive — contactos, deals y notas",
      "Zoho CRM — contactos, leads y deals",
      "Custom CRM — conecta cualquier CRM usando la API REST o n8n/Zapier",
    ]},
    { type: "steps", steps: [
      { title: "Selecciona tu CRM", desc: "Ve a Configuración → Integraciones → CRM y selecciona tu proveedor." },
      { title: "Autoriza la conexión", desc: "Inicia sesión con tu cuenta del CRM y autoriza los permisos." },
      { title: "Configura el mapeo", desc: "Define qué campos de WITHMIA se sincronizan con qué campos del CRM." },
      { title: "Elige la dirección", desc: "Selecciona sincronización unidireccional o bidireccional." },
    ]},
    { type: "heading", id: "crm-mapping", text: "Mapeo de campos" },
    { type: "p", text: "Configura cómo se mapean los campos entre WITHMIA y tu CRM:" },
    { type: "list", items: [
      "name → Nombre completo del contacto",
      "email → Email principal",
      "phone → Teléfono (formato E.164)",
      "company → Empresa / Organización",
      "custom_fields → Campos personalizados (mapeo individual)",
      "labels → Tags / Etiquetas",
      "conversation_count → Actividad / Engagement score",
    ]},
    { type: "callout", variant: "warning", title: "Duplicados", text: "WITHMIA detecta duplicados automáticamente por email o teléfono antes de sincronizar. Si existe un contacto con el mismo email en el CRM, actualiza los datos en vez de crear uno nuevo." },
  ],

  /* ── Herramientas ── */
  "int-tools": [
    { type: "heading", id: "sheets", text: "Google Sheets" },
    { type: "p", text: "Sincroniza conversaciones, contactos y métricas con Google Sheets automáticamente. Ideal para reportes personalizados y seguimiento de leads." },
    { type: "list", items: [
      "Nuevos contactos → fila en Google Sheets (nombre, email, teléfono, canal, fecha)",
      "Conversaciones cerradas → registro con métricas (duración, CSAT, agente)",
      "Exportación programada → envío diario/semanal de métricas a una hoja",
    ]},
    { type: "code", code: "// Ejemplo con n8n: WITHMIA → Google Sheets\n// Trigger: WITHMIA - New Contact\n// Action: Google Sheets - Append Row\n{\n  \"spreadsheet_id\": \"1BxiM...\",\n  \"sheet\": \"Contactos\",\n  \"values\": {\n    \"Nombre\": \"{{$json.name}}\",\n    \"Email\": \"{{$json.email}}\",\n    \"Teléfono\": \"{{$json.phone}}\",\n    \"Canal\": \"{{$json.channel}}\",\n    \"Fecha\": \"{{$json.created_at}}\"\n  }\n}", lang: "json" },
    { type: "heading", id: "slack", text: "Slack" },
    { type: "p", text: "Recibe notificaciones en Slack cuando ocurren eventos importantes en WITHMIA:" },
    { type: "list", items: [
      "Nueva conversación urgente → notificación en canal #soporte",
      "Conversación sin respuesta por +5 min → alerta al equipo",
      "Nuevo contacto VIP → notificación en canal #ventas",
      "Resumen diario → métricas del día enviadas cada noche",
    ]},
    { type: "heading", id: "calendar", text: "Calendarios" },
    { type: "p", text: "Integra Google Calendar, Outlook Calendar o Calendly para gestionar citas desde el inbox de WITHMIA:" },
    { type: "list", items: [
      "Google Calendar — crea y gestiona eventos directamente desde una conversación",
      "Outlook Calendar — sincronización con Microsoft 365",
      "Calendly — envía links de agendamiento a clientes dentro del chat",
      "Cal.com — alternativa open-source para agendamiento",
    ]},
    { type: "callout", variant: "tip", title: "Agendamiento en chat", text: "Configura un flujo automático que ofrezca al cliente agendar una cita. WITHMIA muestra las disponibilidades del agente y confirma la cita automáticamente." },
  ],

  /* ── OAuth 2.0 ── */
  "sec-oauth": [
    { type: "heading", id: "oauth-flow", text: "Flujo de autorización" },
    { type: "p", text: "WITHMIA implementa el flujo OAuth 2.0 Authorization Code Grant para aplicaciones de terceros que necesitan acceder a datos de usuarios de WITHMIA de forma segura." },
    { type: "steps", steps: [
      { title: "Registra tu aplicación", desc: "Crea una aplicación en Configuración → Developers → OAuth Apps. Obtén tu client_id y client_secret." },
      { title: "Redirige al usuario", desc: "Envía al usuario a la URL de autorización de WITHMIA con los scopes necesarios." },
      { title: "Recibe el authorization code", desc: "Después de autorizar, WITHMIA redirige a tu callback URL con un code temporal." },
      { title: "Intercambia por token", desc: "Usa el code para obtener un access_token y refresh_token." },
    ]},
    { type: "code", code: "# 1. Redirige al usuario (navegador)\nhttps://app.withmia.com/oauth/authorize?\n  client_id=app_abc123&\n  redirect_uri=https://tu-app.com/callback&\n  response_type=code&\n  scope=messages:read+messages:write+contacts:read&\n  state=random_csrf_token\n\n# 2. Usuario autoriza → WITHMIA redirige a:\nhttps://tu-app.com/callback?code=AUTH_CODE_HERE&state=random_csrf_token\n\n# 3. Intercambia code por tokens (servidor)\ncurl -X POST https://api.withmia.com/oauth/token \\\n  -d \"grant_type=authorization_code\" \\\n  -d \"code=AUTH_CODE_HERE\" \\\n  -d \"client_id=app_abc123\" \\\n  -d \"client_secret=secret_xyz\" \\\n  -d \"redirect_uri=https://tu-app.com/callback\"\n\n# Respuesta:\n{\n  \"access_token\": \"at_live_...\",\n  \"refresh_token\": \"rt_live_...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 3600,\n  \"scope\": \"messages:read messages:write contacts:read\"\n}", lang: "bash" },
    { type: "heading", id: "tokens", text: "Tokens" },
    { type: "list", items: [
      "Access token — válido por 1 hora, se incluye en el header Authorization",
      "Refresh token — válido por 30 días, se usa para obtener nuevos access tokens",
      "Scopes — definen los permisos del token (principio de mínimos privilegios)",
    ]},
    { type: "heading", id: "refresh", text: "Refresh tokens" },
    { type: "p", text: "Cuando el access token expira, usa el refresh token para obtener uno nuevo sin necesidad de que el usuario re-autorice:" },
    { type: "code", code: "curl -X POST https://api.withmia.com/oauth/token \\\n  -d \"grant_type=refresh_token\" \\\n  -d \"refresh_token=rt_live_...\" \\\n  -d \"client_id=app_abc123\" \\\n  -d \"client_secret=secret_xyz\"", lang: "bash" },
    { type: "callout", variant: "danger", title: "Seguridad", text: "Nunca expongas el client_secret en código frontend. El intercambio de tokens siempre debe ocurrir en tu servidor backend." },
  ],

  /* ── Encriptación ── */
  "sec-encryption": [
    { type: "heading", id: "transit", text: "En tránsito (TLS)" },
    { type: "p", text: "Toda la comunicación con WITHMIA está protegida con TLS 1.3, el estándar más reciente y seguro de encriptación en tránsito." },
    { type: "list", items: [
      "TLS 1.3 — obligatorio para todas las conexiones API y dashboard",
      "HSTS — HTTP Strict Transport Security habilitado con max-age de 1 año",
      "Certificate pinning — disponible para aplicaciones móviles enterprise",
      "Cipher suites — solo suites modernas (AES-256-GCM, ChaCha20-Poly1305)",
      "Versiones legacy deshabilitadas — SSL 3.0, TLS 1.0, TLS 1.1 no soportados",
    ]},
    { type: "callout", variant: "info", title: "Verificación", text: "Puedes verificar la configuración TLS de WITHMIA en ssllabs.com — la calificación actual es A+." },
    { type: "heading", id: "at-rest", text: "En reposo (AES-256)" },
    { type: "p", text: "Los datos almacenados en WITHMIA están encriptados con AES-256, el estándar de encriptación más robusto disponible:" },
    { type: "list", items: [
      "Base de datos — todos los campos sensibles encriptados con AES-256-GCM",
      "Archivos adjuntos — encriptados en almacenamiento con server-side encryption",
      "Backups — encriptados con claves gestionadas por KMS (Key Management Service)",
      "Logs — información sensible redactada automáticamente",
      "API Keys — almacenadas como hashes bcrypt (la key original no se guarda)",
    ]},
    { type: "callout", variant: "tip", title: "Enterprise", text: "En el plan Enterprise, puedes traer tus propias claves de encriptación (BYOK — Bring Your Own Key) para control total sobre tus datos." },
  ],

  /* ── GDPR ── */
  "sec-gdpr": [
    { type: "heading", id: "compliance", text: "Cumplimiento GDPR" },
    { type: "p", text: "WITHMIA cumple con el Reglamento General de Protección de Datos (GDPR) de la Unión Europea. Nuestras prácticas de privacidad se aplican a todos los usuarios, independientemente de su ubicación." },
    { type: "list", items: [
      "Data Processing Agreement (DPA) — disponible para todos los planes de pago",
      "Procesamiento en la UE — opción de deploy en servidores europeos (Enterprise)",
      "Sub-procesadores — lista actualizada de sub-procesadores disponible públicamente",
      "Notificación de breach — compromiso de notificación en máximo 72 horas",
      "Privacy by Design — privacidad integrada en el diseño del producto",
    ]},
    { type: "heading", id: "data-rights", text: "Derechos de los datos" },
    { type: "p", text: "WITHMIA permite que tus contactos ejerzan sus derechos bajo el GDPR:" },
    { type: "list", items: [
      "Derecho de acceso — exportar todos los datos de un contacto en formato JSON",
      "Derecho de rectificación — editar datos incorrectos del contacto",
      "Derecho de supresión — eliminar permanentemente un contacto y todo su historial",
      "Derecho de portabilidad — exportar datos en formato estándar (JSON/CSV)",
      "Derecho de oposición — bloquear el procesamiento de datos de un contacto",
    ]},
    { type: "code", code: "// Ejercer derecho de supresión via API\nawait withmia.contacts.delete({\n  contactId: \"ct_321\",\n  gdpr: true,  // Eliminación permanente, sin posibilidad de recuperación\n  reason: \"User requested data deletion\"\n});\n\n// Exportar datos de un contacto (portabilidad)\nconst data = await withmia.contacts.export({\n  contactId: \"ct_321\",\n  format: \"json\" // json | csv\n});", lang: "javascript" },
    { type: "heading", id: "dpa", text: "Data Processing Agreement" },
    { type: "p", text: "El DPA de WITHMIA cubre todos los aspectos del procesamiento de datos personales como procesador:" },
    { type: "list", items: [
      "Propósito y alcance del procesamiento",
      "Obligaciones de confidencialidad",
      "Medidas de seguridad técnicas y organizativas",
      "Uso de sub-procesadores (con lista actualizada)",
      "Transferencias internacionales de datos",
      "Asistencia con solicitudes de derechos de interesados",
      "Notificación de brechas de seguridad",
    ]},
    { type: "callout", variant: "info", title: "Descargar DPA", text: "Puedes descargar y firmar el DPA desde Configuración → Privacidad → Data Processing Agreement, o contactar a privacy@withmia.com." },
  ],

  /* ── Auditoría ── */
  "sec-audit": [
    { type: "heading", id: "audit-log", text: "Log de auditoría" },
    { type: "p", text: "El log de auditoría registra todas las acciones importantes realizadas por usuarios y sistemas en tu workspace de WITHMIA. Es esencial para seguridad, compliance y troubleshooting." },
    { type: "p", text: "Eventos registrados:" },
    { type: "list", items: [
      "Autenticación — login, logout, intentos fallidos, cambio de contraseña",
      "Usuarios — crear, editar, eliminar, cambio de roles",
      "Conversaciones — asignar, cerrar, eliminar mensajes",
      "Contactos — crear, editar, eliminar, exportar datos",
      "Configuración — cambios en canales, integraciones, IA, billing",
      "API — creación y revocación de API Keys",
      "Webhooks — crear, editar, eliminar endpoints",
    ]},
    { type: "code", code: "// Consultar logs de auditoría via API\nconst logs = await withmia.audit.list({\n  start_date: \"2026-02-01\",\n  end_date: \"2026-02-23\",\n  action: \"user.login\",\n  actor_id: \"user_456\",\n  per_page: 50\n});\n\n// Ejemplo de entrada\n{\n  \"id\": \"audit_789\",\n  \"action\": \"conversation.assigned\",\n  \"actor\": { \"id\": \"user_456\", \"name\": \"Carlos López\", \"role\": \"admin\" },\n  \"target\": { \"type\": \"conversation\", \"id\": \"conv_123\" },\n  \"changes\": { \"assignee\": { \"from\": null, \"to\": \"agent_1\" } },\n  \"ip\": \"200.123.45.67\",\n  \"user_agent\": \"Mozilla/5.0...\",\n  \"timestamp\": \"2026-02-23T14:30:00Z\"\n}", lang: "javascript" },
    { type: "heading", id: "retention", text: "Retención de logs" },
    { type: "p", text: "Los logs de auditoría se almacenan de forma inmutable y no pueden ser modificados ni eliminados:" },
    { type: "list", items: [
      "Starter — 30 días de retención",
      "Growth — 90 días de retención",
      "Enterprise — 1 año de retención (extensible a 7 años por compliance)",
    ]},
    { type: "callout", variant: "info", title: "Exportar logs", text: "Exporta logs en formato JSON o CSV desde Configuración → Seguridad → Auditoría, o via API para integrar con tu SIEM (Splunk, Datadog, etc.)." },
  ],
};

/* ══════════════════════════════════════════════════════════════
   SYNTAX HIGHLIGHTING
   ══════════════════════════════════════════════════════════════ */

function highlightCode(code: string, lang: string): ReactNode {
  type Rule = { re: RegExp; cls: string };
  const rules: Rule[] = [];
  const g = ["javascript", "typescript", "js", "ts"].includes(lang) ? "js"
    : ["python", "py"].includes(lang) ? "py"
    : ["bash", "sh", "shell", "zsh"].includes(lang) ? "sh"
    : lang === "json" ? "json"
    : ["html", "xml"].includes(lang) ? "html"
    : lang === "markdown" ? "md"
    : null;

  if (g === "js") {
    rules.push(
      { re: /\/\/[^\n]*/g, cls: "text-white/25 italic" },
      { re: /(["'`])(?:(?!\1|\\).|\\.)*?\1/g, cls: "text-emerald-400/70" },
      { re: /\b(?:const|let|var|function|return|if|else|switch|case|break|default|import|from|export|await|async|try|catch|throw|new|class|typeof|instanceof|extends|in|of|type|interface)\b/g, cls: "text-violet-400/80" },
      { re: /\b(?:true|false|null|undefined|this|console|process|window)\b/g, cls: "text-amber-400/70" },
      { re: /\b\d+\.?\d*\b/g, cls: "text-amber-400/60" },
    );
  } else if (g === "py") {
    rules.push(
      { re: /#[^\n]*/g, cls: "text-white/25 italic" },
      { re: /(["'])(?:(?!\1|\\).|\\.)*?\1/g, cls: "text-emerald-400/70" },
      { re: /\b(?:def|class|import|from|return|if|elif|else|for|while|in|as|with|try|except|raise|pass|break|continue|lambda|yield|async|await|not|and|or|is)\b/g, cls: "text-violet-400/80" },
      { re: /\b(?:True|False|None|self|print|len|str|int|float|list|dict|set|tuple)\b/g, cls: "text-amber-400/70" },
      { re: /\b\d+\.?\d*\b/g, cls: "text-amber-400/60" },
    );
  } else if (g === "sh") {
    rules.push(
      { re: /#[^\n]*/g, cls: "text-white/25 italic" },
      { re: /(["'])(?:(?!\1|\\).|\\.)*?\1/g, cls: "text-emerald-400/70" },
      { re: /\$[\w{}]+/g, cls: "text-cyan-400/70" },
      { re: /(?<=\s)-{1,2}[\w-]+/g, cls: "text-violet-400/60" },
      { re: /\b(?:curl|npm|pip|yarn|pnpm|composer|export|echo|sudo|cd|mkdir|chmod|pip3)\b/g, cls: "text-amber-400/70" },
    );
  } else if (g === "json") {
    rules.push(
      { re: /"(?:[^"\\]|\\.)*"(?=\s*:)/g, cls: "text-cyan-400/70" },
      { re: /"(?:[^"\\]|\\.)*"/g, cls: "text-emerald-400/70" },
      { re: /\b(?:true|false|null)\b/g, cls: "text-amber-400/70" },
      { re: /\b-?\d+\.?\d*\b/g, cls: "text-amber-400/60" },
    );
  } else if (g === "html") {
    rules.push(
      { re: /<!--[\s\S]*?-->/g, cls: "text-white/25 italic" },
      { re: /<\/?[\w-]+/g, cls: "text-violet-400/80" },
      { re: /\/?>/g, cls: "text-violet-400/60" },
      { re: /\b[\w-]+(?==)/g, cls: "text-cyan-400/70" },
      { re: /(["'])(?:(?!\1|\\).|\\.)*?\1/g, cls: "text-emerald-400/70" },
    );
  } else if (g === "md") {
    rules.push(
      { re: /^#{1,6}\s.*/gm, cls: "text-amber-400/80" },
      { re: /\*\*[^*]+\*\*/g, cls: "text-white/70" },
      { re: /`[^`]+`/g, cls: "text-emerald-400/70" },
      { re: /^-\s/gm, cls: "text-violet-400/80" },
    );
  }

  if (rules.length === 0) return code;

  type Token = { start: number; end: number; cls: string };
  const tokens: Token[] = [];
  for (const rule of rules) {
    const re = new RegExp(rule.re.source, rule.re.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      tokens.push({ start: m.index, end: m.index + m[0].length, cls: rule.cls });
    }
  }
  tokens.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Token[] = [];
  for (const t of tokens) {
    if (merged.length === 0 || t.start >= merged[merged.length - 1].end) merged.push(t);
  }
  if (merged.length === 0) return code;

  const parts: ReactNode[] = [];
  let pos = 0;
  for (let i = 0; i < merged.length; i++) {
    const t = merged[i];
    if (t.start > pos) parts.push(code.slice(pos, t.start));
    parts.push(<span key={i} className={t.cls}>{code.slice(t.start, t.end)}</span>);
    pos = t.end;
  }
  if (pos < code.length) parts.push(code.slice(pos));
  return <>{parts}</>;
}

/* ══════════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ══════════════════════════════════════════════════════════════ */

/* ─── Code Block ─── */
function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-xl border border-white/[0.06] bg-[#0a0c14] overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04]">
        <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">{lang}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-[11px] text-white/20 hover:text-white/50 transition-colors">
          {copied ? <><Check className="w-3 h-3 text-emerald-400" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
        </button>
      </div>
      <pre className="px-5 py-4 overflow-x-auto">
        <code className="text-[13px] leading-[1.8] font-mono text-white/50">{highlightCode(code, lang)}</code>
      </pre>
    </div>
  );
}

/* ─── Code Tabs (multi-language) ─── */
function CodeTabs({ tabs }: { tabs: { label: string; lang: string; code: string }[] }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(tabs[active].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0c14] overflow-hidden my-4">
      <div className="flex items-center border-b border-white/[0.04] bg-white/[0.01]">
        <div className="flex flex-1">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`px-4 py-2 text-[12px] font-medium transition-colors relative ${
                active === i
                  ? "text-amber-400"
                  : "text-white/25 hover:text-white/50"
              }`}
            >
              {t.label}
              {active === i && (
                <div className="absolute bottom-0 left-0 right-0 h-px bg-amber-400" />
              )}
            </button>
          ))}
        </div>
        <button onClick={copy} className="flex items-center gap-1.5 text-[11px] text-white/20 hover:text-white/50 transition-colors mr-3">
          {copied ? <><Check className="w-3 h-3 text-emerald-400" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
        </button>
      </div>
      <pre className="px-5 py-4 overflow-x-auto">
        <code className="text-[13px] leading-[1.8] font-mono text-white/50">{highlightCode(tabs[active].code, tabs[active].lang)}</code>
      </pre>
    </div>
  );
}

/* ─── Callout (info / warning / tip / danger) ─── */
function Callout({ variant, title, children }: { variant: CalloutVariant; title: string; children: ReactNode }) {
  const cfg = {
    info:    { Icon: Info,           border: "border-cyan-500/20",    bg: "bg-cyan-500/[0.04]",    text: "text-cyan-400" },
    warning: { Icon: AlertTriangle,  border: "border-amber-500/20",   bg: "bg-amber-500/[0.04]",   text: "text-amber-400" },
    tip:     { Icon: Lightbulb,      border: "border-emerald-500/20", bg: "bg-emerald-500/[0.04]", text: "text-emerald-400" },
    danger:  { Icon: AlertTriangle,  border: "border-red-500/20",     bg: "bg-red-500/[0.04]",     text: "text-red-400" },
  }[variant];
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 my-6`}>
      <div className="flex items-center gap-2 mb-1.5">
        <cfg.Icon className={`w-4 h-4 ${cfg.text}`} />
        <span className={`text-[13px] font-semibold ${cfg.text}`}>{title}</span>
      </div>
      <div className="text-[13px] text-white/40 leading-relaxed pl-6">{children}</div>
    </div>
  );
}

/* ─── Feedback Widget ─── */
function FeedbackWidget({ pageId }: { pageId: string }) {
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const [prevPage, setPrevPage] = useState(pageId);
  if (pageId !== prevPage) { setFeedback(null); setPrevPage(pageId); }

  return (
    <div className="flex items-center gap-4 py-4">
      <span className="text-[13px] text-white/25">¿Te fue útil esta página?</span>
      {feedback ? (
        <span className="text-[13px] text-emerald-400/60">¡Gracias por tu feedback!</span>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => setFeedback("yes")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[12px] text-white/30 hover:text-emerald-400 hover:border-emerald-500/20 transition-all">
            <ThumbsUp className="w-3.5 h-3.5" /> Sí
          </button>
          <button onClick={() => setFeedback("no")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[12px] text-white/30 hover:text-amber-400 hover:border-amber-500/20 transition-all">
            <ThumbsDown className="w-3.5 h-3.5" /> No
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Block Renderer ─── */
function BlockRenderer({ blocks, navigateTo }: { blocks: ContentBlock[]; navigateTo?: (id: string) => void }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <h2 key={i} id={block.id} className="text-xl font-bold text-white mb-4 mt-10 first:mt-0 flex items-center gap-2 scroll-mt-32">
                <Hash className="w-4 h-4 text-white/15" />
                {block.text}
              </h2>
            );
          case "p":
            return <p key={i} className="text-[14px] text-white/40 leading-relaxed mb-4">{block.text}</p>;
          case "code":
            return <CodeBlock key={i} code={block.code} lang={block.lang} />;
          case "codetabs":
            return <CodeTabs key={i} tabs={block.tabs} />;
          case "callout":
            return <Callout key={i} variant={block.variant} title={block.title}>{block.text}</Callout>;
          case "list":
            if (block.ordered) {
              return (
                <ol key={i} className="space-y-2 mb-6 pl-1">
                  {block.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-[14px] text-white/40">
                      <span className="text-amber-400/50 font-mono text-[12px] mt-0.5 shrink-0 w-5">{j + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ol>
              );
            }
            return (
              <ul key={i} className="space-y-2 mb-6 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-[14px] text-white/40">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400/40 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            );
          case "steps":
            return (
              <div key={i} className="space-y-3 my-6">
                {block.steps.map((step, j) => (
                  <div key={j} className="flex items-start gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[11px] font-bold font-mono text-amber-400/70">{j + 1}</span>
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-white/70 mb-1">{step.title}</h4>
                      <p className="text-[13px] text-white/35 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          case "nav-cards":
            return (
              <div key={i} className="grid sm:grid-cols-2 gap-3 my-6">
                {block.cards.map((card) => {
                  const borderMap: Record<string, string> = { amber: "border-amber-500/10 hover:border-amber-500/25", violet: "border-violet-500/10 hover:border-violet-500/25", emerald: "border-emerald-500/10 hover:border-emerald-500/25", cyan: "border-cyan-500/10 hover:border-cyan-500/25" };
                  const textMap: Record<string, string> = { amber: "text-amber-400", violet: "text-violet-400", emerald: "text-emerald-400", cyan: "text-cyan-400" };
                  return (
                    <button
                      key={card.title}
                      onClick={() => navigateTo?.(card.link)}
                      className={`text-left p-5 rounded-xl border ${borderMap[card.color] || borderMap.amber} bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 group`}
                    >
                      <h3 className="text-[14px] font-semibold text-white/70 mb-1">{card.title}</h3>
                      <p className="text-[12px] text-white/30 mb-2">{card.desc}</p>
                      <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${textMap[card.color] || textMap.amber}`}>
                        <ArrowRight className="w-3 h-3" /> Ver más
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

/* ─── Sidebar Section ─── */
function SidebarSection({ section, activePage, onNavigate, expandedSections, toggleSection }: {
  section: NavItem; activePage: string; onNavigate: (id: string) => void;
  expandedSections: Set<string>; toggleSection: (id: string) => void;
}) {
  const Icon = section.icon;
  const isExpanded = expandedSections.has(section.id);
  const hasActive = section.children?.some(c => c.id === activePage);
  return (
    <div className="mb-1">
      <button
        onClick={() => toggleSection(section.id)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-200 ${hasActive ? "text-white/80" : "text-white/40 hover:text-white/60"}`}
      >
        {Icon && <Icon className={`w-4 h-4 shrink-0 ${hasActive ? "text-amber-400/70" : "text-white/25"}`} />}
        <span className="text-[13px] font-medium flex-1">{section.label}</span>
        <ChevronRight className={`w-3.5 h-3.5 text-white/15 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
      </button>
      {isExpanded && section.children && (
        <div className="ml-4 pl-3 border-l border-white/[0.04] mt-0.5 space-y-0.5">
          {section.children.map(child => (
            <button
              key={child.id}
              onClick={() => onNavigate(child.id)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-[13px] transition-all duration-150 ${
                activePage === child.id
                  ? "text-amber-400 bg-amber-500/[0.06] font-medium"
                  : "text-white/35 hover:text-white/60 hover:bg-white/[0.03]"
              }`}
            >
              {child.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ══════════════════════════════════════════════════════════════ */

const DocumentationPage = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  /* ── State ── */
  const [activePage, setActivePage] = useState("welcome");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(["_s_start"]));
  const [activeTocId, setActiveTocId] = useState<string>("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const page = pages[activePage] || pages.welcome;
  const blocks = richContent[activePage];

  /* ── Page transition key ── */
  const [transitionKey, setTransitionKey] = useState(activePage);
  const [isTransitioning, setIsTransitioning] = useState(false);
  useEffect(() => {
    setIsTransitioning(true);
    const t = setTimeout(() => { setTransitionKey(activePage); setIsTransitioning(false); }, 120);
    return () => clearTimeout(t);
  }, [activePage]);

  /* ── ⌘K keyboard shortcut ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        searchRef.current?.blur();
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ── Scroll progress ── */
  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement;
      const total = scrollable.scrollHeight - scrollable.clientHeight;
      setScrollProgress(total > 0 ? (scrollable.scrollTop / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Active TOC tracking ── */
  useEffect(() => {
    const headings = document.querySelectorAll("main h2[id]");
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveTocId(entry.target.id);
          }
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
    );
    headings.forEach(h => observer.observe(h));
    return () => observer.disconnect();
  }, [activePage]);

  /* ── Navigation helpers ── */
  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const navigateTo = useCallback((id: string) => {
    setActivePage(id);
    setMobileSidebarOpen(false);
    setActiveTocId("");
    for (const s of sidebarNav) {
      if (s.children?.some(c => c.id === id)) {
        setExpandedSections(prev => new Set(prev).add(s.id));
        break;
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ── Prev/Next ── */
  const currentIdx = pageOrder.indexOf(activePage);
  const prevPage = currentIdx > 0 ? pageOrder[currentIdx - 1] : null;
  const nextPage = currentIdx < pageOrder.length - 1 ? pageOrder[currentIdx + 1] : null;

  /* ── Search ── */
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return Object.entries(pages)
      .filter(([, p]) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
      .slice(0, 8)
      .map(([id, p]) => ({ id, title: p.title, breadcrumb: p.breadcrumb }));
  }, [searchQuery]);

  /* ═══════════════════════════════════════════════════════
     JSX
     ═══════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen relative">
      {/* ── Ambient background glows ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-amber-500/[0.03] blur-[150px]" />
        <div className="absolute top-[40%] right-0 w-[500px] h-[500px] rounded-full bg-violet-500/[0.02] blur-[140px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-cyan-500/[0.02] blur-[120px]" />
      </div>

      <Navigation />

      {/* Scroll Progress — fixed at very top */}
      <div className={`fixed top-0 left-0 right-0 z-[60] h-[2px] transition-opacity duration-300 ${scrollProgress > 1 ? 'opacity-100' : 'opacity-0'}`}>
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500/50 transition-[width] duration-100"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* ══ Three-column Layout ══ */}
      <div className="pt-24 max-w-[1440px] mx-auto flex min-h-[calc(100vh-96px)] relative z-[1]">

        {/* ═══ LEFT SIDEBAR ═══ */}
        <aside className={`
          fixed lg:sticky top-24 left-0 z-20
          w-[280px] h-[calc(100vh-96px)] overflow-y-auto
          border-r border-white/[0.04] bg-[hsl(var(--background))]/80 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none
          transition-transform duration-300 lg:transition-none
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden
        `}>
          <nav className="px-4 py-4">
            {/* Search */}
            <div className="relative mb-5">
              <div className={`flex items-center rounded-lg border transition-colors ${
                searchFocused ? "border-amber-500/25 bg-white/[0.04]" : "border-white/[0.06] bg-white/[0.02]"
              }`}>
                <Search className="ml-3 w-3.5 h-3.5 text-white/20 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  className="flex-1 pl-2 pr-3 py-1.5 bg-transparent text-[13px] text-white/70 placeholder-white/20 focus:outline-none"
                />
                <kbd className="hidden sm:inline mr-2 px-1.5 py-0.5 rounded text-[9px] font-mono text-white/15 bg-white/[0.04] border border-white/[0.06]">
                  ⌘K
                </kbd>
              </div>

              {searchFocused && searchResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 rounded-xl border border-white/[0.08] bg-[hsl(var(--background))] shadow-2xl shadow-black/40 z-50 overflow-hidden">
                  {searchResults.map(r => (
                    <button
                      key={r.id}
                      onMouseDown={() => { navigateTo(r.id); setSearchQuery(""); }}
                      className="w-full px-4 py-3 text-left hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0"
                    >
                      <p className="text-[13px] text-white/70 font-medium">{r.title}</p>
                      <p className="text-[10px] text-white/20 mt-0.5">{r.breadcrumb.join(" → ")}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebarNav.map(section => (
              <SidebarSection
                key={section.id}
                section={section}
                activePage={activePage}
                onNavigate={navigateTo}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
              />
            ))}
            <div className="mt-6 pt-4 border-t border-white/[0.04] space-y-1">
              <a href="/api" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/30 hover:text-white/50 transition-colors">
                <Terminal className="w-4 h-4" />
                API Interactiva
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
              <a href="https://app.withmia.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/30 hover:text-white/50 transition-colors">
                <Play className="w-4 h-4" />
                Ir al Dashboard
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </div>
          </nav>
        </aside>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-10 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
        )}

        {/* ═══ MAIN CONTENT ═══ */}
        <main ref={contentRef} className={`flex-1 min-w-0 px-6 md:px-10 lg:px-16 py-8 md:py-10 transition-all duration-200 ${isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>

          {/* Breadcrumb + mobile menu toggle */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-colors -ml-2"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 text-[12px] text-white/25 min-w-0">
              {page.breadcrumb.map((b, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="w-3 h-3 text-white/10" />}
                  <span className={i === page.breadcrumb.length - 1 ? "text-white/45" : ""}>{b}</span>
                </span>
              ))}
            </div>
          </div>

          {/* ────── WELCOME PAGE ────── */}
          {activePage === "welcome" && (
            <div className="max-w-3xl">
              {/* Hero area with ambient glow */}
              <div className="relative mb-10">
                <div className="absolute -top-8 -left-16 w-64 h-64 bg-amber-500/[0.06] rounded-full blur-[80px] pointer-events-none" />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/[0.06] border border-amber-500/10 mb-5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-medium text-amber-400/80 uppercase tracking-wider">Documentación</span>
                  </div>
                  <h1 className="text-3xl md:text-[2.5rem] font-bold mb-5 leading-[1.15]">
                    <span className="text-gradient">Bienvenido</span> <span className="text-white">a WITHMIA Docs</span>
                  </h1>
                  <p className="text-[15px] text-white/45 leading-relaxed mb-2 max-w-xl">{page.description}</p>
                  <p className="text-[15px] text-white/35 leading-relaxed">
                    Cubre todo, desde la configuración inicial hasta el uso avanzado de la API.
                    Es un trabajo en constante evolución y todas las{" "}
                    <a href="/contacto" className="text-amber-400/70 hover:text-amber-400 underline underline-offset-2 decoration-amber-400/20">contribuciones</a>{" "}
                    son bienvenidas.
                  </p>
                </div>
              </div>

              <h2 id="where-to-start" className="text-lg font-bold text-white mb-5 flex items-center gap-2 scroll-mt-32">
                <Hash className="w-4 h-4 text-white/15" /> Dónde empezar
              </h2>
              <div className="grid sm:grid-cols-2 gap-3 mb-12">
                {([
                  { title: "Inicio rápido", desc: "Comienza con la guía de inicio rápido.", link: "quickstart", color: "amber", icon: Rocket },
                  { title: "Elige tu configuración", desc: "Cloud, API, SDK o integraciones.", link: "choose-plan", color: "violet", icon: Layers },
                  { title: "Explora canales", desc: "Conecta WhatsApp, Instagram y más.", link: "whatsapp", color: "emerald", icon: MessageSquare },
                  { title: "IA y Automatización", desc: "Configura tu asistente IA.", link: "ai-assistant", color: "cyan", icon: Bot },
                ] as const).map(card => {
                  const bgMap: Record<string, string> = { amber: "bg-amber-500/[0.06] border-amber-500/10 hover:border-amber-500/20", violet: "bg-violet-500/[0.05] border-violet-500/10 hover:border-violet-500/20", emerald: "bg-emerald-500/[0.05] border-emerald-500/10 hover:border-emerald-500/20", cyan: "bg-cyan-500/[0.05] border-cyan-500/10 hover:border-cyan-500/20" };
                  const iconBg: Record<string, string> = { amber: "bg-amber-500/10", violet: "bg-violet-500/10", emerald: "bg-emerald-500/10", cyan: "bg-cyan-500/10" };
                  const iconText: Record<string, string> = { amber: "text-amber-400", violet: "text-violet-400", emerald: "text-emerald-400", cyan: "text-cyan-400" };
                  const CardIcon = card.icon;
                  return (
                    <button key={card.title} onClick={() => navigateTo(card.link)}
                      className={`text-left p-5 rounded-xl border ${bgMap[card.color]} hover:bg-white/[0.06] backdrop-blur-sm transition-all duration-300 group`}>
                      <div className={`w-8 h-8 rounded-lg ${iconBg[card.color]} flex items-center justify-center mb-3`}>
                        <CardIcon className={`w-4 h-4 ${iconText[card.color]}`} />
                      </div>
                      <h3 className="text-[14px] font-semibold text-white/80 mb-1.5">{card.title}</h3>
                      <p className="text-[12px] text-white/30 leading-relaxed mb-3">{card.desc}</p>
                      <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${iconText[card.color]} group-hover:gap-2.5 transition-all`}>
                        Comenzar <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>

              <h2 id="about-withmia" className="text-lg font-bold text-white mb-4 flex items-center gap-2 scroll-mt-32">
                <Hash className="w-4 h-4 text-white/15" /> Sobre WITHMIA
              </h2>
              <div className="text-[14px] text-white/35 leading-relaxed space-y-4 mb-12 p-5 rounded-xl border border-white/[0.04] bg-white/[0.015]">
                <p>WITHMIA es una plataforma de comunicación omnicanal que combina inteligencia artificial con automatización para transformar cómo las empresas se conectan con sus clientes.</p>
                <p>Conecta WhatsApp, Instagram, Messenger, Email y Chat Web en un solo inbox inteligente. La IA de WITHMIA responde automáticamente, clasifica conversaciones y sugiere respuestas a tus agentes — todo sin necesidad de código.</p>
                <p>Para developers, WITHMIA ofrece una API REST completa, SDKs oficiales en Node.js, Python y PHP, webhooks en tiempo real y compatibilidad con n8n y Zapier.</p>
              </div>

              <h2 id="resources" className="text-lg font-bold text-white mb-5 flex items-center gap-2 scroll-mt-32">
                <Hash className="w-4 h-4 text-white/15" /> Recursos adicionales
              </h2>
              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {[
                  { icon: Terminal, title: "API Reference", desc: "Endpoints y parámetros", href: "/api", color: "#22d3ee" },
                  { icon: Globe, title: "Status Page", desc: "Estado de la plataforma", href: "#", color: "#34d399", ext: true },
                  { icon: Sparkles, title: "Changelog", desc: "Nuevas features", href: "#", color: "#a78bfa" },
                  { icon: MessageSquare, title: "Comunidad", desc: "Preguntas y feedback", href: "#", color: "#f472b6", ext: true },
                ].map(res => (
                  <a key={res.title} href={res.href} target={res.ext ? "_blank" : undefined} rel={res.ext ? "noopener noreferrer" : undefined}
                    className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300 group">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${res.color}10`, border: `1px solid ${res.color}20` }}>
                      <res.icon className="w-4 h-4" style={{ color: res.color }} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-white/60 group-hover:text-white/80 transition-colors flex items-center gap-1.5">
                        {res.title} {res.ext && <ExternalLink className="w-3 h-3 text-white/15" />}
                      </h4>
                      <p className="text-[11px] text-white/25 mt-0.5">{res.desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ────── QUICKSTART PAGE ────── */}
          {activePage === "quickstart" && (
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
                  <Rocket className="w-4 h-4 text-amber-400" />
                </div>
                <span className="flex items-center gap-1 text-[11px] text-white/20"><Clock className="w-3 h-3" /> 5 min lectura</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{page.title}</h1>
              <p className="text-[15px] text-white/40 leading-relaxed mb-10">{page.description}</p>

              <h2 id="prerequisites" className="text-xl font-bold text-white mb-4 flex items-center gap-2 scroll-mt-32">
                <Hash className="w-4 h-4 text-white/15" /> Prerequisitos
              </h2>
              <ul className="space-y-2 mb-10">
                {["Una cuenta de WITHMIA (gratis)", "Node.js 18+ (para SDK de Node.js)", "Un canal de mensajería (WhatsApp, Instagram, etc.)"].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-[14px] text-white/40">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400/50 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <Callout variant="tip" title="Tip">
                Si prefieres explorar sin instalar nada, usa la API interactiva en <a href="/api" className="text-emerald-400/70 hover:text-emerald-400 underline underline-offset-2 decoration-emerald-400/20">/api</a> — puedes probar todos los endpoints desde tu navegador.
              </Callout>

              {/* Step 1 */}
              <h2 id="step-1" className="text-xl font-bold text-white mb-3 flex items-center gap-2 scroll-mt-32">
                <Hash className="w-4 h-4 text-white/15" /> 1. Crear tu cuenta
              </h2>
              <p className="text-[14px] text-white/40 leading-relaxed mb-6">
                Regístrate en <a href="https://app.withmia.com" target="_blank" rel="noopener noreferrer" className="text-amber-400/70 hover:text-amber-400 underline underline-offset-2 decoration-amber-400/20">app.withmia.com</a> y accede al dashboard. No necesitas tarjeta de crédito.
              </p>

              {/* Step 2 */}
              <h2 id="step-2" className="text-xl font-bold text-white mb-3 flex items-center gap-2 scroll-mt-32">
                <Hash className="w-4 h-4 text-white/15" /> 2. Obtener API Key
              </h2>
              <p className="text-[14px] text-white/40 leading-relaxed mb-3">Ve a Configuración → API Keys y genera tu token.</p>
              <CodeBlock code={'export WITHMIA_API_KEY="sk_live_..."'} lang="bash" />

              <Callout variant="danger" title="Seguridad">
                Guarda tu API Key de forma segura. Solo se muestra una vez. Usa variables de entorno, nunca hardcodees la key en tu código.
              </Callout>

              {/* Step 3 */}
              <h2 id="step-3" className="text-xl font-bold text-white mb-3 flex items-center gap-2 scroll-mt-32">
                <Hash className="w-4 h-4 text-white/15" /> 3. Instalar SDK
              </h2>
              <p className="text-[14px] text-white/40 leading-relaxed mb-3">Elige tu lenguaje favorito:</p>
              <CodeTabs tabs={[
                { label: "npm", lang: "bash", code: "npm install @withmia/sdk" },
                { label: "pip", lang: "bash", code: "pip install withmia" },
                { label: "composer", lang: "bash", code: "composer require withmia/sdk" },
              ]} />

              {/* Step 4 */}
              <h2 id="step-4" className="text-xl font-bold text-white mb-3 flex items-center gap-2 scroll-mt-32">
                <Hash className="w-4 h-4 text-white/15" /> 4. Enviar primer mensaje
              </h2>
              <p className="text-[14px] text-white/40 leading-relaxed mb-3">Un request y tu mensaje llega al destino:</p>
              <CodeTabs tabs={[
                { label: "Node.js", lang: "javascript", code: "import { Withmia } from '@withmia/sdk';\n\nconst withmia = new Withmia(process.env.WITHMIA_API_KEY);\n\nawait withmia.messages.send({\n  channel: 'whatsapp',\n  to: '+56912345678',\n  text: 'Hola desde WITHMIA 🚀'\n});" },
                { label: "Python", lang: "python", code: "from withmia import Withmia\n\nclient = Withmia(os.environ['WITHMIA_API_KEY'])\n\nclient.messages.send(\n    channel='whatsapp',\n    to='+56912345678',\n    text='Hola desde WITHMIA 🚀'\n)" },
                { label: "cURL", lang: "bash", code: "curl -X POST https://api.withmia.com/v1/messages \\\n  -H \"Authorization: Bearer $WITHMIA_API_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"channel\": \"whatsapp\",\n    \"to\": \"+56912345678\",\n    \"text\": \"Hola desde WITHMIA 🚀\"\n  }'" },
              ]} />

              <Callout variant="info" title="Respuesta">
                Si todo sale bien, recibirás un JSON con el message_id y status "queued". El estado cambiará a "sent" cuando WhatsApp confirme la entrega.
              </Callout>

              {/* Next steps */}
              <h2 id="next-steps" className="text-xl font-bold text-white mb-4 flex items-center gap-2 scroll-mt-32">
                <Hash className="w-4 h-4 text-white/15" /> Próximos pasos
              </h2>
              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {[
                  { title: "Configura tu asistente IA", link: "ai-assistant" },
                  { title: "Conecta WhatsApp", link: "whatsapp" },
                  { title: "Explora la API", link: "api-auth" },
                  { title: "Configura Webhooks", link: "api-webhooks" },
                ].map(ns => (
                  <button key={ns.title} onClick={() => navigateTo(ns.link)} className="text-left p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-amber-500/15 transition-all group">
                    <span className="text-[13px] font-medium text-white/60 group-hover:text-white/80 flex items-center gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400/60" /> {ns.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ────── RICH CONTENT PAGES ────── */}
          {activePage !== "welcome" && activePage !== "quickstart" && blocks && (
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                {page.readTime && (
                  <span className="flex items-center gap-1 text-[11px] text-white/20"><Clock className="w-3 h-3" /> {page.readTime} lectura</span>
                )}
                <span className="ml-auto px-2 py-0.5 rounded-md text-[10px] font-mono font-medium text-amber-400/60 bg-amber-500/[0.06] border border-amber-500/10">v1.0</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{page.title}</h1>
              <p className="text-[15px] text-white/40 leading-relaxed mb-8">{page.description}</p>
              <BlockRenderer blocks={blocks} navigateTo={navigateTo} />
            </div>
          )}

          {/* ────── STUB PAGES (no rich content yet) ────── */}
          {activePage !== "welcome" && activePage !== "quickstart" && !blocks && (
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                {page.readTime && (
                  <span className="flex items-center gap-1 text-[11px] text-white/20"><Clock className="w-3 h-3" /> {page.readTime} lectura</span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{page.title}</h1>
              <p className="text-[15px] text-white/40 leading-relaxed mb-8">{page.description}</p>

              {page.toc.map((t, i) => (
                <div key={t.id}>
                  <h2 id={t.id} className="text-xl font-bold text-white mb-4 mt-10 first:mt-0 flex items-center gap-2 scroll-mt-32">
                    <Hash className="w-4 h-4 text-white/15" />
                    {t.label}
                  </h2>
                  <p className="text-[14px] text-white/35 leading-relaxed mb-4">
                    {i === 0
                      ? `En esta sección cubrimos ${t.label.toLowerCase()} dentro del contexto de ${page.title}. WITHMIA ofrece una interfaz intuitiva y una API completa para configurar esta funcionalidad.`
                      : `Aquí encontrarás información detallada sobre ${t.label.toLowerCase()}. Consulta nuestra guía paso a paso y los ejemplos de código para implementar esta funcionalidad rápidamente.`
                    }
                  </p>
                  {i === 0 && (
                    <Callout variant="info" title="En desarrollo">
                      La documentación detallada de esta sección se está ampliando. Para consultas específicas,{" "}
                      <a href="/contacto" className="text-cyan-400/70 hover:text-cyan-400 underline underline-offset-2 decoration-cyan-400/20">contacta a nuestro equipo</a>.
                    </Callout>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ────── BOTTOM: Feedback + Prev/Next + Meta ────── */}
          <div className="max-w-3xl mt-12 pt-6 border-t border-white/[0.04]">
            <FeedbackWidget pageId={activePage} />

            {/* Prev / Next */}
            <div className="flex items-stretch gap-4 mt-4">
              {prevPage ? (
                <button onClick={() => navigateTo(prevPage)} className="flex-1 text-left p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group">
                  <span className="text-[10px] text-white/20 uppercase tracking-wider">Anterior</span>
                  <span className="flex items-center gap-2 mt-1 text-[14px] font-medium text-white/50 group-hover:text-white/80 transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5 text-white/25" />
                    {pages[prevPage]?.title}
                  </span>
                </button>
              ) : <div className="flex-1" />}

              {nextPage ? (
                <button onClick={() => navigateTo(nextPage)} className="flex-1 text-right p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group">
                  <span className="text-[10px] text-white/20 uppercase tracking-wider">Siguiente</span>
                  <span className="flex items-center justify-end gap-2 mt-1 text-[14px] font-medium text-white/50 group-hover:text-white/80 transition-colors">
                    {pages[nextPage]?.title}
                    <ArrowRight className="w-3.5 h-3.5 text-white/25" />
                  </span>
                </button>
              ) : <div className="flex-1" />}
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between mt-6 text-[11px] text-white/15">
              <span>Última actualización: {page.lastUpdated}</span>
              <div className="flex items-center gap-4">
                <a href="#" className="flex items-center gap-1.5 text-white/15 hover:text-white/40 transition-colors">
                  <FileText className="w-3 h-3" /> Editar esta página
                </a>
                <a href="/contacto" className="flex items-center gap-1.5 text-white/20 hover:text-amber-400/70 transition-colors">
                  ¿Necesitas ayuda? <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </main>

        {/* ═══ RIGHT TOC SIDEBAR ═══ */}
        <aside className="hidden xl:block w-[220px] shrink-0 sticky top-24 h-[calc(100vh-96px)] overflow-y-auto py-8 pr-4">
          <div className="pl-4 border-l border-white/[0.04]">
            <p className="text-[11px] text-white/25 uppercase tracking-widest font-semibold mb-4">
              En esta página
            </p>
            <nav className="space-y-1">
              {page.toc.map(t => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className={`block text-[12px] py-1 leading-snug transition-colors ${
                    activeTocId === t.id
                      ? "text-amber-400 font-medium"
                      : "text-white/30 hover:text-white/60"
                  }`}
                >
                  {t.label}
                </a>
              ))}
            </nav>

            <div className="mt-8 pt-4 border-t border-white/[0.04] space-y-2">
              <a href="https://app.withmia.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] text-white/20 hover:text-amber-400/60 transition-colors">
                <Sparkles className="w-3 h-3" /> Chat con soporte IA
              </a>
              <a href="/contacto" className="flex items-center gap-2 text-[11px] text-white/20 hover:text-white/40 transition-colors">
                <Headphones className="w-3 h-3" /> Contactar soporte
              </a>
            </div>
          </div>
        </aside>
      </div>

      <Footer />
    </div>
  );
};

export default DocumentationPage;
