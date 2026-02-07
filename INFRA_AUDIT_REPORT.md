# 🔒 WITHMIA Infrastructure Audit Report

**Date:** February 7, 2026  
**Scope:** Railway deployment, Docker, PHP, Laravel config, dependencies, security  
**Auditor:** GitHub Copilot (Automated)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 5 |
| 🟠 HIGH | 8 |
| 🟡 MEDIUM | 10 |
| 🔵 LOW | 7 |
| ✅ GOOD | 12 |

---

## 1. Railway Configuration

### ✅ `railway.json` — Good
- Uses `DOCKERFILE` builder correctly
- `restartPolicyType: ON_FAILURE` with max 10 retries is reasonable
- Watch patterns cover relevant directories

### ✅ `railway-reverb.json` — Good
- Dedicated Dockerfile for WebSocket server (separation of concerns)
- Scoped watch patterns for broadcasting-related files only

---

## 2. Docker Configuration

### 2.1 `Dockerfile` (Main App)

#### 🔴 CRITICAL — `fakerphp/faker` in Production Dependencies
**File:** `composer.json` line 13  
**Issue:** `fakerphp/faker` is listed in `require` (production) instead of `require-dev`. This library generates fake data and should NEVER be in production.  
```json
"require": {
    "fakerphp/faker": "^1.23",  // ← WRONG: should be in require-dev
}
```
**Impact:** Increases attack surface, wasted memory, potential data pollution.  
**Fix:** Move to `require-dev`:
```json
"require-dev": {
    "fakerphp/faker": "^1.23",
}
```

#### 🟠 HIGH — Container Runs as Root
**File:** `Dockerfile`  
**Issue:** No `USER` directive — the entire application runs as root inside the container.  
**Fix:** Add a non-root user:
```dockerfile
RUN addgroup --system app && adduser --system --ingroup app app
USER app
```

#### 🟡 MEDIUM — Inline Start Script in Dockerfile  
**File:** `Dockerfile` lines 88-112  
**Issue:** The entire start script is generated inline with `echo`. This is fragile, hard to version, and prone to escaping errors.  
**Fix:** Create a dedicated `start.sh` file and `COPY` it in.

#### 🟡 MEDIUM — Single Queue Worker in Start Script
**File:** `Dockerfile` (inline start script)  
**Issue:** Queue worker runs in background with `&` — if it crashes, it won't restart. No supervisor or health monitoring.
```bash
php artisan queue:work --sleep=3 --tries=3 --max-time=3600 &
```
**Fix:** Use Laravel Horizon (already installed) or a process supervisor. Since Horizon is in `composer.json`, consider replacing the raw queue worker with Horizon.

#### ✅ GOOD — OPcache Configuration
- OPcache enabled with JIT (`opcache.jit=1255`)
- `validate_timestamps=0` correct for production (files don't change at runtime)
- 256MB memory consumption, 128M JIT buffer — adequate

#### ✅ GOOD — Multi-stage Compatible Build
- Composer files copied first for layer caching
- `npm ci` used (deterministic installs)
- `--no-dev` flag on composer install
- Autoloader optimized

#### ✅ GOOD — Secure Practices
- `apt-get clean && rm -rf /var/lib/apt/lists/*` — reduces image size
- `composer dump-autoload --optimize` — performance optimization
- Migrations run at startup with `--force`

### 2.2 `Dockerfile.reverb` (WebSocket Server)

#### ✅ GOOD — Minimal Dependencies
- Only includes extensions needed for WebSocket operation
- Separate from main app (good microservice practice)

#### 🟠 HIGH — Also Runs as Root
**File:** `Dockerfile.reverb`  
**Same fix as main Dockerfile.**

### 2.3 `start-reverb.sh`

#### ✅ GOOD — Port Validation
- Validates `PORT` is a valid number before use
- Graceful fallback chain: `REVERB_SERVER_PORT` → `PORT` → `8080`
- Cache clearing before start ensures fresh config

---

## 3. Application Configuration Audit

### 3.1 `config/app.php`

#### ✅ GOOD — Debug Mode
```php
'debug' => (bool) env('APP_DEBUG', false),  // Default false — correct
```

#### 🔵 LOW — Deploy Timestamp Hardcoded
**File:** `config/app.php` line 33  
```php
'deploy_timestamp' => '2026-02-01 16:29:32',
```
**Issue:** Hardcoded deploy timestamp exposes deployment history. Non-functional but unnecessary.  
**Fix:** Remove or use `env('DEPLOY_TIMESTAMP')`.

#### ✅ GOOD — Encryption Key from Environment
```php
'key' => env('APP_KEY'),  // Correct — no hardcoded key
```

### 3.2 `config/auth.php`

#### ✅ GOOD — Standard Configuration
- Session-based authentication with Eloquent provider
- Password reset tokens expire in 60 minutes (reasonable)
- Throttle set to 60 seconds

### 3.3 `config/broadcasting.php`

#### ✅ GOOD — All Credentials from `env()`
- Reverb, Pusher, Ably keys all use environment variables
- Default broadcaster is `null` (requires explicit configuration)

### 3.4 `config/cache.php`

#### 🟡 MEDIUM — Default Cache Store is `file`
**File:** `config/cache.php` line 18  
```php
'default' => env('CACHE_STORE', 'file'),
```
**Issue:** On Railway (ephemeral filesystem), file-based cache is lost on every deploy/restart. This should default to `redis` since Redis/Predis is already installed.  
**Fix:** Set `CACHE_STORE=redis` in Railway environment variables, or change default:
```php
'default' => env('CACHE_STORE', 'redis'),
```

### 3.5 `config/chatwoot.php`

#### ✅ GOOD — All Secrets from Environment
- `super_admin_token`, `api_key`, `platform_token`, `database_url` — all via `env()`
- No hardcoded credentials

### 3.6 `config/cors.php`

#### 🟠 HIGH — Overly Permissive CORS `paths`
**File:** `config/cors.php` line 4  
```php
'paths' => ['*'],
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
```
**Issue:** CORS applies to ALL paths with ALL methods and ALL headers. This is excessively permissive for a production application.  
**Fix:** Restrict to API routes:
```php
'paths' => ['api/*', 'broadcasting/auth', 'sanctum/csrf-cookie'],
'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
```

#### 🟡 MEDIUM — Hardcoded localhost Origins
**File:** `config/cors.php` lines 10-12  
```php
'allowed_origins' => array_filter([
    env('APP_URL'),
    env('FRONTEND_URL'),
    'http://localhost:8000',   // ← Development only
    'http://localhost:5173',   // ← Development only  
    'http://127.0.0.1:8000',  // ← Development only
]),
```
**Issue:** Localhost origins should not be in production CORS config.  
**Fix:** Use environment-based configuration only:
```php
'allowed_origins' => array_filter([
    env('APP_URL'),
    env('FRONTEND_URL'),
    ...explode(',', env('CORS_EXTRA_ORIGINS', '')),
]),
```

### 3.7 `config/database.php`

#### ✅ GOOD — All Credentials from Environment
- PostgreSQL, MySQL, Redis — all use `env()` for passwords
- Multiple database connections (chatwoot, evolution) properly isolated

#### 🟡 MEDIUM — Default Database Username is `root`
**File:** `config/database.php` lines 120, 134  
```php
'username' => env('DB_USERNAME', 'root'),
```
**Issue:** Default fallback to `root` is insecure if env var is accidentally missing.  
**Fix:** Remove default or use a safer fallback:
```php
'username' => env('DB_USERNAME'),  // No default — forces explicit configuration
```

### 3.8 `config/evolution.php`

#### ✅ GOOD — Clean Configuration
- API key from environment, no hardcoded secrets
- Webhook URL properly nullable

### 3.9 `config/filesystems.php`

#### 🟡 MEDIUM — Local Filesystem Only
**File:** `config/filesystems.php`  
**Issue:** No S3/cloud storage configured. On Railway's ephemeral filesystem, uploaded files are lost on redeploy.  
**Fix:** Add S3 disk configuration if file persistence is needed:
```php
's3' => [
    'driver' => 's3',
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => env('AWS_DEFAULT_REGION'),
    'bucket' => env('AWS_BUCKET'),
],
```

### 3.10 `config/horizon.php`

#### ✅ GOOD — Dashboard Access Control
- Admin emails restricted via environment variable
- Middleware includes `web` and `auth`
- Gate check uses role-based + email-based authorization

#### 🟠 HIGH — Horizon Installed but Not Used in Startup
**File:** `Dockerfile` inline start script  
**Issue:** `laravel/horizon` is installed in `composer.json`, but the start script uses a raw `queue:work` command instead of `php artisan horizon`. Horizon provides a much better supervisor, monitoring, and auto-restart capability.  
**Fix:** Replace in start script:
```bash
# Instead of:
php artisan queue:work --sleep=3 --tries=3 --max-time=3600 &
# Use:
php artisan horizon &
```

### 3.11 `config/inertia.php`

#### 🔵 LOW — SSR Enabled but Not in Dockerfile
**File:** `config/inertia.php` line 22  
```php
'ssr' => [
    'enabled' => true,
    'url' => 'http://127.0.0.1:13714',
],
```
**Issue:** SSR is enabled but the Dockerfile does not start an SSR server. This will cause SSR to silently fail and fall back to client-side rendering.  
**Fix:** Either start the SSR server in the startup script, or disable SSR:
```php
'enabled' => env('INERTIA_SSR_ENABLED', false),
```

### 3.12 `config/logging.php`

#### ✅ GOOD — Railway-Aware Logging
```php
'channels' => explode(',', env('LOG_STACK', env('RAILWAY_ENVIRONMENT') ? 'stderr' : 'single')),
```
- Automatically uses `stderr` on Railway (visible in Railway logs)
- Falls back to `single` file for local dev

#### 🟡 MEDIUM — Default Log Level is `debug`
**File:** `config/logging.php` multiple channels  
```php
'level' => env('LOG_LEVEL', 'debug'),
```
**Issue:** Default `debug` level in production generates excessive logs, potential performance impact, and may leak sensitive data.  
**Fix:** Set `LOG_LEVEL=warning` or `info` in Railway environment variables.

### 3.13 `config/mail.php`

#### ✅ GOOD — Safe Default
```php
'default' => env('MAIL_MAILER', 'log'),  // Default to logging — safe
```
- SMTP credentials from environment
- Admin address configured: `a.diaz@withmia.com`

### 3.14 `config/n8n.php`

#### ✅ GOOD — Clean Configuration
- API key and webhook secret from environment
- Internal and public URL separation

### 3.15 `config/octane.php`

#### ✅ GOOD — Roadrunner Configuration
- Proper event listeners for request lifecycle
- Garbage collection threshold at 50MB
- 30-second max execution time

### 3.16 `config/qdrant.php`

#### 🔵 LOW — Redundant URL Processing
```php
'url' => env('RAILWAY_SERVICE_QDRANT_URL') 
    ? 'https://' . ltrim(env('RAILWAY_SERVICE_QDRANT_URL'), 'https://') 
    : env('QDRANT_HOST', 'http://qdrant.railway.internal:6333'),
```
**Issue:** `ltrim` with `'https://'` won't correctly strip the protocol — `ltrim` removes individual characters, not strings. `ltrim('https://abc', 'https://')` removes `h`, `t`, `p`, `s`, `:`, `/` characters.  
**Fix:**
```php
'url' => env('RAILWAY_SERVICE_QDRANT_URL')
    ? 'https://' . preg_replace('#^https?://#', '', env('RAILWAY_SERVICE_QDRANT_URL'))
    : env('QDRANT_HOST', 'http://qdrant.railway.internal:6333'),
```

### 3.17 `config/queue.php`

#### 🟡 MEDIUM — Default Queue Connection is `database`
**File:** `config/queue.php` line 16  
```php
'default' => env('QUEUE_CONNECTION', 'database'),
```
**Issue:** With Redis already installed and Horizon configured for Redis queues, database queue is suboptimal. Database queues create lock contention and are significantly slower.  
**Fix:** Set `QUEUE_CONNECTION=redis` in Railway environment, or change default.

### 3.18 `config/reverb.php`

#### 🟠 HIGH — Wildcard Allowed Origins
**File:** `config/reverb.php` line 85  
```php
'allowed_origins' => ['*'],
```
**Issue:** Any website can connect to your WebSocket server. This enables cross-site WebSocket hijacking.  
**Fix:**
```php
'allowed_origins' => array_filter([
    env('APP_URL'),
    env('FRONTEND_URL'),
]),
```

### 3.19 `config/services.php`

#### ✅ GOOD — All API Keys from Environment
- OpenAI, Google, Mailgun, Postmark, Slack — all use `env()`
- Configurable HTTP timeouts

### 3.20 `config/session.php`

#### ✅ GOOD — Secure Cookie Settings
```php
'secure' => env('SESSION_SECURE_COOKIE', true),     // HTTPS only
'http_only' => env('SESSION_HTTP_ONLY', true),       // No JS access
'partitioned' => env('SESSION_PARTITIONED_COOKIE', true),  // CHIPS support
```

#### 🟠 HIGH — `SameSite` Set to `none`
**File:** `config/session.php` line 201  
```php
'same_site' => env('SESSION_SAME_SITE', 'none'),
```
**Issue:** `SameSite=none` allows the session cookie to be sent in cross-site requests. Combined with `supports_credentials: true` in CORS, this can facilitate CSRF attacks.  
**Fix:** Use `lax` unless cross-site embedding is explicitly required:
```php
'same_site' => env('SESSION_SAME_SITE', 'lax'),
```

#### 🟡 MEDIUM — Session Encryption Disabled
**File:** `config/session.php` line 52  
```php
'encrypt' => env('SESSION_ENCRYPT', false),
```
**Fix:** Enable session encryption:
```php
'encrypt' => env('SESSION_ENCRYPT', true),
```

#### 🟡 MEDIUM — File-Based Sessions on Ephemeral Filesystem
**File:** `config/session.php` line 22  
```php
'driver' => env('SESSION_DRIVER', 'file'),
```
**Issue:** Same as cache — file sessions are lost on Railway redeploy. Users will be logged out.  
**Fix:** Set `SESSION_DRIVER=redis` or `database` in Railway environment.

---

## 4. PHP Configuration

### `php.ini`

#### ✅ GOOD — Error Display Disabled
```ini
display_errors = Off
log_errors = On
error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT
```

#### ✅ GOOD — UTF-8 Encoding
- Comprehensive multibyte string configuration
- Internal encoding forced to UTF-8

#### 🔵 LOW — Upload Limit of 50MB
```ini
upload_max_filesize = 50M
post_max_size = 55M
```
**Note:** Acceptable for most use cases, but verify this aligns with business requirements. Octane's `max_execution_time = 30` may conflict with large file uploads.

---

## 5. Dependencies

### 5.1 `composer.json`

#### 🔴 CRITICAL — `fakerphp/faker` in Production
_(Detailed above in Section 2.1)_

#### 🟠 HIGH — `laravel/tinker` in Production
**File:** `composer.json` line 20  
```json
"require": {
    "laravel/tinker": "^2.10.1",
}
```
**Issue:** Tinker provides an interactive REPL that can execute arbitrary PHP code. Should be in `require-dev`.  
**Fix:** Move to `require-dev`.

#### 🔵 LOW — No PHP Version Constraint in Dockerfile
**File:** `Dockerfile` line 3  
```dockerfile
FROM php:8.4-cli
```
**Note:** Pinning to `8.4-cli` is fine, but consider using a specific patch version (e.g., `8.4.2-cli`) for reproducible builds.

### 5.2 `package.json`

#### 🟠 HIGH — Server-Side Packages in Frontend Bundle
**File:** `package.json` lines (dependencies)  
```json
"dependencies": {
    "ioredis": "^5.9.2",    // ← Server-side Redis client
    "pg": "^8.17.1",         // ← PostgreSQL client  
}
```
**Issue:** `ioredis` and `pg` are Node.js server-side packages. They have no purpose in a Vite-built frontend React app and increase bundle size significantly. They may also cause build warnings.  
**Fix:** Remove them, or move to a separate server package if actually used server-side.

#### 🔵 LOW — `concurrently` in Dependencies
**File:** `package.json`  
```json
"dependencies": {
    "concurrently": "^9.0.1",  // ← Development tool
}
```
**Fix:** Move to `devDependencies`.

### 5.3 `vite.config.ts`

#### ✅ GOOD — Production Optimizations
- Sourcemaps disabled in production
- Manual chunk splitting (vendor-react, vendor-ui, vendor-pusher)
- Minification via esbuild

### 5.4 `eslint.config.js`

#### 🔵 LOW — `no-explicit-any` Disabled
```js
'@typescript-eslint/no-explicit-any': 'off',
```
**Note:** Reduces type safety but acceptable for rapid development. Consider enabling as `warn` as codebase matures.

---

## 6. Routing & Middleware Security

### 6.1 Routes

#### 🔴 CRITICAL — Debug Routes File is 1,700 Lines
**File:** `routes/debug.php` (1,700 lines)  
**Issue:** Extremely large debug routes file loaded in `local`, `development`, and **`staging`** environments. Staging often mirrors production and should NOT have debug routes.  
**Partial protection:** Requires `X-Debug-Key` header in non-local environments, but:
- The `debug_key` is not defined in `config/app.php` (checked — only `admin_secret_key` exists)
- If `config('app.debug_key')` returns `null`, the middleware check `!$debugKey` will block access, which is safe but suggests dead code

**Fix:**
1. Only load in `local` environment
2. Or ensure `debug_key` is properly configured in `config/app.php`:
```php
'debug_key' => env('APP_DEBUG_KEY'),
```

#### 🟠 HIGH — Admin Routes Lack Role Check
**File:** `routes/web.php` lines 227-244  
```php
Route::middleware(['auth'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [AdminController::class, 'dashboard']);
    Route::get('/users', [AdminController::class, 'users']);
    Route::delete('/api/users/{id}', [AdminController::class, 'deleteUser']);
    // ...
});
```
**Issue:** Admin routes only require `auth` middleware — any authenticated user can access admin endpoints including user deletion. No role or permission check at the route level.  
**Fix:** Add admin role middleware:
```php
Route::middleware(['auth', 'can:admin'])->prefix('admin')->group(function () {
```
Or verify the controller enforces authorization internally.

#### 🔴 CRITICAL — Attachment Proxy Without Authentication
**File:** `routes/web.php` line 33, `routes/api.php` line 210  
```php
// web.php
Route::get('/chatwoot-image-proxy', [AttachmentProxyController::class, 'proxy']);

// api.php
Route::get('/chatwoot-proxy/attachment-proxy', [AttachmentProxyController::class, 'proxy']);
```
**Issue:** Two unauthenticated proxy endpoints that fetch and serve arbitrary files from Chatwoot. Without URL validation, these could be used as SSRF (Server-Side Request Forgery) vectors or open redirects.  
**Fix:** Add authentication or at minimum validate that proxied URLs point to your Chatwoot instance only.

#### 🔴 CRITICAL — Image Proxy Without Auth or Validation
**File:** `routes/web.php` line 27  
```php
Route::get('/img-proxy', [ImageProxyController::class, 'proxy'])
    ->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class]);
```
**Issue:** Open image proxy endpoint without any authentication or CSRF protection. Classic SSRF attack vector.  
**Fix:** At minimum validate destination URLs against an allowlist.

### 6.2 Middleware

#### ✅ GOOD — `RailwayAuthToken` Middleware
- Token-based authentication with flexible source (query, header, body)
- Optional enforcement via `$requireAuth` parameter
- Logs failed authentication attempts

#### ✅ GOOD — `ValidateN8nSecret` Middleware
- Validates webhook secret against config
- Returns 401 for unauthorized requests

#### 🔵 LOW — Auth Token in Query String
**File:** `app/Http/Middleware/RailwayAuthToken.php` line 31  
```php
$token = $request->query('auth_token') 
    ?? $request->header('X-Railway-Auth-Token')
    ?? $request->input('auth_token');
```
**Issue:** Auth tokens in query strings are logged in server access logs, browser history, and referrer headers.  
**Fix:** Prefer header-based authentication. If query parameter is needed for redirects, consume and remove it after use.

---

## 7. Environment Configuration

#### No `.env` or `.env.example` Found
**Issue:** No `.env.example` file exists in the repository. This makes it difficult for new developers to know which environment variables are required.  
**Fix:** Create a `.env.example` with all required variable names (no values):
```env
APP_NAME=WITHMIA
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=

DB_CONNECTION=pgsql
DB_HOST=
DB_PORT=5432
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=

REDIS_URL=
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

CHATWOOT_URL=
CHATWOOT_API_KEY=
CHATWOOT_ACCOUNT_ID=

EVOLUTION_API_URL=
EVOLUTION_API_KEY=

N8N_URL=
N8N_API_KEY=
N8N_WEBHOOK_SECRET=

OPENAI_API_KEY=

REVERB_APP_KEY=
REVERB_APP_SECRET=
REVERB_APP_ID=
REVERB_HOST=
```

---

## 8. Provider Configuration

### `AppServiceProvider.php`

#### ✅ GOOD — HTTP Macros
- Chatwoot, Evolution, n8n macros centralize HTTP client configuration
- Timeouts configured (15s, 30s)
- UTF-8 encoding properly forced

### `BroadcastServiceProvider.php`

#### ✅ GOOD — Standard broadcast route registration

### `HorizonServiceProvider.php`

#### ✅ GOOD — Proper Gate Authorization
- Role-based access (`hasRole('admin')`)
- Email-based allowlist from config

---

## Summary of Required Actions

### Immediate (CRITICAL)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | `fakerphp/faker` in production deps | `composer.json` | Move to `require-dev` |
| 2 | Open image proxy (SSRF risk) | `routes/web.php` L27 | Add auth + URL allowlist |
| 3 | Open attachment proxy (SSRF risk) | `routes/web.php` L33, `routes/api.php` L210 | Add auth + URL validation |
| 4 | Debug routes loaded in staging | `routes/debug.php` | Restrict to `local` only |
| 5 | Admin routes lack role authorization | `routes/web.php` L227 | Add admin middleware |

### Short-term (HIGH)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 6 | Containers run as root | `Dockerfile`, `Dockerfile.reverb` | Add non-root USER |
| 7 | Wildcard CORS paths | `config/cors.php` | Restrict to API paths |
| 8 | WebSocket wildcard origins | `config/reverb.php` | Restrict allowed origins |
| 9 | `SameSite=none` cookies | `config/session.php` | Change to `lax` |
| 10 | `laravel/tinker` in production | `composer.json` | Move to `require-dev` |
| 11 | Horizon installed but not used | `Dockerfile` | Use `php artisan horizon` |
| 12 | Server-side npm packages (`ioredis`, `pg`) | `package.json` | Remove from dependencies |
| 13 | Localhost in CORS origins | `config/cors.php` | Remove hardcoded localhost |

### Medium-term (MEDIUM)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 14 | File-based cache on ephemeral FS | `config/cache.php` | Set `CACHE_STORE=redis` |
| 15 | File-based sessions on ephemeral FS | `config/session.php` | Set `SESSION_DRIVER=redis` |
| 16 | Database queue (should be Redis) | `config/queue.php` | Set `QUEUE_CONNECTION=redis` |
| 17 | Default log level `debug` | `config/logging.php` | Set `LOG_LEVEL=warning` |
| 18 | Session encryption disabled | `config/session.php` | Enable encryption |
| 19 | Default DB username `root` | `config/database.php` | Remove default |
| 20 | No cloud storage configured | `config/filesystems.php` | Add S3 if needed |
| 21 | Qdrant URL `ltrim` bug | `config/qdrant.php` | Use `preg_replace` |
| 22 | Inline start script in Dockerfile | `Dockerfile` | Extract to file |
| 23 | No `.env.example` | Root | Create template file |

---

## ✅ What's Done Well

1. **OPcache + JIT** properly configured for production performance
2. **Octane + Roadrunner** for concurrent request handling
3. **All secrets use `env()`** — no hardcoded credentials found in config files
4. **Railway-aware logging** auto-switches to stderr
5. **Secure session cookies** (HTTPS-only, HttpOnly, Partitioned)
6. **UTF-8 enforced** at PHP, application, and middleware levels
7. **Sentry integration** for error monitoring
8. **Rate limiting** on auth and webhook endpoints
9. **Dedicated WebSocket container** (microservice separation)
10. **Horizon dashboard** properly gated with role-based authorization
11. **CSRF protection** with appropriate exclusions for APIs
12. **Trust proxies** configured for Railway's reverse proxy
