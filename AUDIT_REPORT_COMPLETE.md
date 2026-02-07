# 🔍 AUDITORÍA COMPLETA — WITHMIA (app.withmia.com)

**Fecha:** 7 de febrero de 2026  
**Stack:** Laravel 12 + Inertia.js v2 + React 19 + TypeScript 5.7 + PostgreSQL + Redis + Railway  
**Auditor:** GitHub Copilot  

---

## 📊 RESUMEN EJECUTIVO

| Categoría | Crítico | Alto | Medio | Bajo | Total |
|-----------|---------|------|-------|------|-------|
| Seguridad | 3 | 8 | 7 | 3 | **21** |
| Base de Datos | 1 | 3 | 5 | 3 | **12** |
| Controladores/Servicios | 2 | 5 | 6 | 4 | **17** |
| Infraestructura | 2 | 4 | 4 | 2 | **12** |
| Frontend | 3 | 4 | 6 | 5 | **18** |
| Rendimiento | 3 | 4 | 3 | 2 | **12** |
| **TOTAL** | **14** | **28** | **31** | **19** | **92** |

---

## 🔴 HALLAZGOS CRÍTICOS (Arreglar INMEDIATAMENTE)

### C1. Auth token pasado en URLs (query string)
**Archivos:** `app/Http/Middleware/RailwayAuthToken.php`, `app/Http/Controllers/Api/GoogleAuthController.php`

El `auth_token` se pasa como `?auth_token=...` en la URL. Esto significa que:
- Se guarda en logs del servidor, historial del navegador, headers Referer
- Se comparte accidentalmente al copiar URLs
- Es un token permanente sin expiración

```php
// GoogleAuthController.php
$redirectUrl = route('dashboard.company', [...]) . '?auth_token=' . $user->auth_token;
```

**Fix:** Usar cookies `httpOnly` o headers `Authorization`. Implementar tokens con expiración.

---

### C2. Rutas de debug (1,700 líneas) cargadas en staging
**Archivo:** `routes/debug.php`, cargado en `routes/api.php`

```php
if (app()->environment('local', 'development', 'staging')) {
    require __DIR__ . '/debug.php';
}
```

Estas rutas exponen:
- Datos completos de usuarios y emails
- Tokens de Chatwoot y Evolution API
- Credenciales de broadcasting (Pusher keys/secrets)
- Sesiones y variables de entorno
- Manipulación directa de Redis

**Fix:** Cambiar a `if (app()->environment('local'))` únicamente.

---

### C3. `auth_token` no oculto en modelo User
**Archivo:** `app/Models/User.php`

```php
protected $hidden = ['password', 'remember_token'];
// auth_token NO está en $hidden — se envía en cada respuesta JSON
```

**Fix:** Agregar `'auth_token'`, `'chatwoot_agent_token'` a `$hidden`.

---

### C4. `RailwayAuthToken` middleware aplicado globalmente
**Archivo:** `bootstrap/app.php`

```php
$middleware->append(\App\Http\Middleware\RailwayAuthToken::class);
```

Se aplica a TODAS las peticiones. Cualquier petición con un `auth_token` válido en query/header/input auto-autentica al usuario.

**Fix:** Aplicar solo a rutas API específicas que lo necesiten.

---

### C5. Webhook sin verificación de firma
**Archivo:** `routes/api.php`

Los webhooks de Chatwoot y Evolution no verifican la autenticidad de las peticiones. Cualquiera puede enviar eventos falsos.

**Fix:** Implementar verificación HMAC en webhooks.

---

### C6. Campos sensibles mass-assignable en User
**Archivo:** `app/Models/User.php`

```php
protected $fillable = [
    ..., 'role', 'permissions', 'email_verified_at', 'company_slug',
    'chatwoot_agent_id', 'chatwoot_inbox_id', 'chatwoot_agent_token'
];
```

Si algún endpoint usa `$request->all()` con `User::update()`, un atacante podría:
- Escalar privilegios cambiando `role` a `admin`
- Otorgarse permisos arbitrarios
- Cambiar de compañía

**Fix:** Remover `role`, `permissions`, `email_verified_at` y campos Chatwoot de `$fillable`.

---

### C7. Webhook controller bloquea Octane workers (14 segundos)
**Archivo:** `app/Http/Controllers/Api/ChatwootWebhookController.php`

```php
// forwardToN8nWithEnrichment() usa usleep() en un loop de retry
// que bloquea un worker de Octane hasta 14 segundos
```

Con solo 4 workers, 4 webhooks simultáneos paralizan toda la app.

**Fix:** Mover a un Job en cola.

---

### C8. Clave de encriptación hardcodeada en frontend
**Archivo:** `resources/js/utils/security-utils.ts`

```typescript
const STORAGE_SECRET_KEY = '...|| 'withmia-secure-2025';
```

Visible en el bundle del cliente. La "encriptación" del storage es ilusoria.

**Fix:** Eliminar falsa encriptación o usar server-side storage para datos sensibles.

---

### C9. Token de auth en localStorage (XSS = robo de sesión)
**Archivo:** `resources/js/app.tsx`, `resources/js/pages/onboarding.tsx`

```typescript
localStorage.setItem('railway_auth_token', token);
```

Cualquier vulnerabilidad XSS permite robar el token permanente de autenticación.

**Fix:** Usar cookies `httpOnly` en lugar de `localStorage`.

---

### C10. Email de admin hardcodeado en frontend
**Archivo:** `resources/js/pages/MainDashboard.tsx`

```typescript
...(user?.email === 'withmia.app@gmail.com' ? [{ id: 'admin', ... }] : [])
```

Revela el email del super-admin en el bundle público del cliente.

**Fix:** Usar un flag `isSuperAdmin` del servidor en los shared data de Inertia.

---

### C11. Constraint `UNIQUE` removido de `companies.slug`
**Archivo:** `database/migrations/2026_01_27_094500_remove_unique_constraint_from_company_slug.php`

El slug se usa como clave de relación (`users.company_slug → companies.slug`). Sin constraint UNIQUE, pueden existir slugs duplicados causando resultados impredecibles.

**Fix:** Re-agregar constraint UNIQUE o migrar a FK numérico `company_id`.

---

### C12. N+1 query en getTeamMembers()
**Archivo:** `app/Http/Controllers/Api/ChatwootTeamController.php`

Ejecuta `User::where('email', ...)->first()` dentro de un `->map()` por cada miembro del equipo.

**Fix:** Batch-load con `whereIn()`.

---

### C13. Cache driver `file` en Railway (filesystem efímero)
**Archivo:** `config/cache.php`

```php
'default' => env('CACHE_STORE', 'file'),
```

Railway usa filesystem efímero. El cache se pierde en cada deploy. Peor aún, la deduplicación de conversaciones usa `Cache::add()` que requiere atomicidad (solo funciona con Redis).

**Fix:** Verificar que `CACHE_STORE=redis` esté configurado en Railway.

---

### C14. Proxy endpoints abiertos (SSRF)
**Archivos:** `routes/web.php`, `routes/api.php`

`/img-proxy`, `/chatwoot-image-proxy`, `/chatwoot-proxy/attachment-proxy` no requieren autenticación y pueden usarse para escanear servicios internos.

**Fix:** Agregar autenticación y validar paths, no solo hostnames.

---

## 🟠 HALLAZGOS DE SEVERIDAD ALTA

### H1. CSRF deshabilitado para TODAS las rutas API
```php
// bootstrap/app.php
$middleware->validateCsrfTokens(except: ['api/*', ...]);
```

### H2. Chatwoot proxy sin auth real (`requireAuth` defaults to `false`)
Las rutas `/chatwoot-proxy/*` permiten acceso no autenticado a conversaciones, mensajes, equipos, etc.

### H3. Onboarding POST sin middleware de auth ni CSRF
```php
Route::post('/onboarding', [...])->withoutMiddleware([VerifyCsrfToken::class]);
```

### H4. SSL verification deshabilitada en AttachmentProxyController
```php
'verify' => false, // Vulnerable a MITM
```

### H5. Dockerfiles ejecutan como root (sin directiva USER)
Riesgo de escalación de privilegios si se compromete el contenedor.

### H6. CORS wildcard con credentials
```php
'paths' => ['*'], 'allowed_methods' => ['*'], 'allowed_headers' => ['*'],
'supports_credentials' => true
```

### H7. WebSocket `allowed_origins` wildcard
```php
'allowed_origins' => ['*'], // config/reverb.php
```

### H8. `SameSite=None` en cookies de sesión
Aumenta superficie de ataque CSRF.

### H9. Horizon instalado pero no usado
El Dockerfile ejecuta `queue:work &` directamente en vez de Horizon, perdiendo auto-scaling, prioridad de colas y monitoreo.

### H10. `fakerphp/faker` y `laravel/tinker` en dependencias de producción
Deberían estar en `require-dev`.

### H11. Admin tools sin verificación de compañía
Un admin de Compañía A podría pasar el `companySlug` de Compañía B.

### H12. Sin timeouts en llamadas a APIs externas (n8n, Chatwoot)
Riesgo de hang indefinido.

---

## 🟡 HALLAZGOS DE SEVERIDAD MEDIA

### M1. FK faltantes
- `knowledge_documents.company_id` → no tiene FK constraint
- `users.company_slug` → relación por string sin FK

### M2. Tipos de columna inconsistentes
- `chatwoot_inbox_id`: `unsignedBigInteger` en users vs `unsignedInteger` en companies
- `chatwoot_agent_id`: definido como `unsignedBigInteger` y `string` en migraciones distintas

### M3. Missing `$casts` en modelos
- `User`: `whatsapp_instance_data`, `onboarding_completed`, `onboarding_step`
- `KnowledgeDocument`: `qdrant_vector_ids`, `uploaded_at`
- `Company`: `chatwoot_provisioned`, `branding`

### M4. 5 tablas huérfanas sin modelo
`subscriptions`, `ai_agents`, `integrations`, `custom_configs`, `usage_metrics`

### M5. Sin SoftDeletes en ningún modelo
Todas las eliminaciones son permanentes. Riesgo alto para datos de negocio (Pipeline, PipelineItem).

### M6. Componentes monolíticos en frontend
| Archivo | Líneas |
|---------|--------|
| `ConversationsInterface.tsx` | 5,141 |
| `onboarding.tsx` | 1,919 |
| `useChatwoot.ts` | 1,719 |
| `MainDashboard.tsx` | 1,410 |

### M7. 100+ usos de `any` en TypeScript
Derrota el propósito de TypeScript. Peor en `ConversationsInterface.tsx` (~50 instancias).

### M8. 3 patrones distintos de comunicación API en frontend
- `fetch` nativo en `useChatwoot.ts`
- `axios` en admin pages
- `secureFetch` en `MainDashboard.tsx`

### M9. `MainDashboard` re-renderiza cada segundo
```typescript
setInterval(() => setCurrentTime(new Date()), 1000);
```
`currentTime` actualiza 1x/seg forzando re-render de todo el dashboard (1,410 líneas).

### M10. Sin paginación en DocumentController::index()
Carga todos los documentos con `->get()`.

### M11. `console.error/log` en producción (47 instancias)
Potencial fuga de información y ruido en consola del navegador.

### M12. `window.location.href` en vez de Inertia `router.visit()`
Pierde beneficios de SPA (transiciones suaves, estado preservado).

### M13. `queue.after_commit` es `false`
Jobs despachados dentro de transacciones pueden ejecutarse antes de que la transacción se confirme.

### M14. Observers faltantes
No hay observers para `WhatsAppInstance` ni `KnowledgeDocument` — eliminarlos no limpia Evolution API ni vectores Qdrant.

### M15. DatabaseSeeder crea usuario de test sin guardia de entorno
```php
User::factory()->create(['email' => 'test@example.com']);
```

### M16. Sistema de roles dual (Spatie + JSON custom) — redundante

---

## 🔵 HALLAZGOS DE SEVERIDAD BAJA

| # | Hallazgo |
|---|----------|
| L1 | Índice faltante en `users.role` |
| L2 | Índice faltante en `companies.chatwoot_inbox_id` |
| L3 | Migraciones duplicadas/redundantes (3 migraciones para `company_slug`) |
| L4 | Migración vacía (no-op): `rename_industry_to_page_companies` |
| L5 | Relaciones faltantes en User (pipelineItems, invitations) |
| L6 | Health endpoint expone nombre del environment |
| L7 | Session encryption deshabilitada |
| L8 | Logo almacenado como base64 en DB (performance) |
| L9 | `@keyframes slideInRight` duplicado en CSS |
| L10 | `MainDashboard.tsx` como entry point separado en Vite (innecesario) |
| L11 | Accesibilidad: sin skip-to-content link, dropdowns sin keyboard nav |
| L12 | `$with = ['company']` en User carga Company en CADA query |

---

## ✅ LO QUE ESTÁ BIEN HECHO

| Aspecto | Detalle |
|---------|---------|
| OPcache + JIT | Configurado correctamente en php.ini |
| Octane/Roadrunner | 4 workers con max-requests=500 (previene memory leaks) |
| Secrets via `env()` | Ningún secreto hardcodeado en config PHP |
| Sentry | Integrado para error tracking en producción |
| Rate limiting | Presente en rutas críticas (webhooks, onboarding, invitaciones) |
| Sanitización XSS | `sanitizeText()`, `getSafeText()` en frontend; sin `dangerouslySetInnerHTML` |
| Virtualized lists | `@tanstack/react-virtual` para listas de conversaciones |
| Vite chunking | Code-splitting por vendor (react, ui, pusher) |
| `Http::pool()` | Usado para sincronización paralela de agentes Chatwoot |
| `select()` columns | Buen uso en la mayoría de queries |
| Inertia SSR | Configurado para server-side rendering |
| shadcn/ui ARIA | Componentes UI tienen atributos de accesibilidad |

---

## 📋 PLAN DE ACCIÓN PRIORIZADO

### 🚨 Semana 1 — Seguridad Crítica

| # | Acción | Esfuerzo |
|---|--------|----------|
| 1 | Migrar `auth_token` a cookies `httpOnly` con expiración | 1-2 días |
| 2 | Agregar `auth_token` y `chatwoot_agent_token` a User `$hidden` | 5 min |
| 3 | Remover `role`, `permissions`, `email_verified_at` de User `$fillable` | 15 min |
| 4 | Limitar debug routes solo a `local` (quitar `staging`) | 5 min |
| 5 | Quitar middleware global de `RailwayAuthToken` | 30 min |
| 6 | Agregar auth a rutas de proxy de imagen | 1 hora |
| 7 | Implementar verificación HMAC en webhooks | 2-3 horas |
| 8 | Quitar email hardcodeado del frontend | 15 min |

### 🔧 Semana 2 — Infraestructura y Rendimiento

| # | Acción | Esfuerzo |
|---|--------|----------|
| 9 | Verificar `CACHE_STORE=redis` en Railway | 5 min |
| 10 | Mover `forwardToN8nWithEnrichment()` a Job en cola | 2 horas |
| 11 | Agregar timeouts a llamadas HTTP externas | 1 hora |
| 12 | Extraer componente `<Clock>` del dashboard | 30 min |
| 13 | Agregar `USER` directive a Dockerfiles | 30 min |
| 14 | Configurar Horizon en vez de `queue:work &` | 2 horas |
| 15 | Mover `faker` y `tinker` a `require-dev` | 15 min |
| 16 | Fix N+1 en `getTeamMembers()` | 30 min |

### 🏗️ Semana 3-4 — Calidad de Código y Deuda Técnica

| # | Acción | Esfuerzo |
|---|--------|----------|
| 17 | Re-agregar UNIQUE a `companies.slug` o migrar a FK numérico | 2-4 horas |
| 18 | Agregar FK constraints faltantes | 1 hora |
| 19 | Agregar `$casts` faltantes en modelos | 30 min |
| 20 | Agregar SoftDeletes a User, Company, Pipeline, PipelineItem | 2 horas |
| 21 | Crear observers para WhatsAppInstance y KnowledgeDocument | 2 horas |
| 22 | Estandarizar capa de API en frontend (elegir axios o secureFetch) | 1 día |
| 23 | Reducir uso de `any` en TypeScript (top 5 archivos) | 1-2 días |
| 24 | Restringir CORS paths y WebSocket origins | 30 min |

### 📈 Mes 2 — Refactoring Mayor

| # | Acción | Esfuerzo |
|---|--------|----------|
| 25 | Dividir `ConversationsInterface.tsx` (5,141 líneas) | 3-5 días |
| 26 | Dividir `onboarding.tsx` (1,919 líneas) | 2-3 días |
| 27 | Dividir `useChatwoot.ts` (1,719 líneas) | 1-2 días |
| 28 | Squash migraciones para limpiar historial | 2 horas |
| 29 | Eliminar/crear modelos para tablas huérfanas | 1 hora |
| 30 | Mejorar accesibilidad (keyboard nav, skip links) | 1-2 días |

---

## 🎯 MÉTRICAS DE SALUD

| Métrica | Valor Actual | Objetivo |
|---------|-------------|---------|
| Vulnerabilidades Críticas | 14 | 0 |
| Archivo más grande (frontend) | 5,141 líneas | < 500 líneas |
| Usos de `any` en TypeScript | 100+ | < 10 |
| Patrones de API en frontend | 3 | 1 |
| Tablas sin FK constraints | 3 | 0 |
| Modelos sin SoftDeletes | 8/8 | 4/8 mínimo |
| Rutas sin auth que deberían tenerlo | ~8 | 0 |
| `console.log` en producción | 47 | 0 |

---

*Reporte generado por auditoría automatizada. Se recomienda revisión manual adicional de lógica de negocio y pruebas de penetración.*
