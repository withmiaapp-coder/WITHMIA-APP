# WITHMIA Performance & Optimization Audit Report

**Date:** February 7, 2026  
**Stack:** Laravel 11 + Inertia.js + React + Octane/Roadrunner  
**Deployment:** Railway (Docker)

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| 🔴 **CRITICAL** | Immediate performance impact, fix ASAP |
| 🟠 **HIGH** | Significant performance concern |
| 🟡 **MEDIUM** | Notable optimization opportunity |
| 🟢 **LOW** | Minor improvement, nice-to-have |

---

## 1. Backend Performance

### 1.1 Octane / Roadrunner Configuration

**File:** `config/octane.php`  
**Severity:** 🟡 MEDIUM

**Findings:**
- ✅ Roadrunner server correctly configured as default
- ✅ Garbage collection threshold set to 50MB
- ✅ Max execution time set to 30s
- ⚠️ `DisconnectFromDatabases` and `CollectGarbage` are **commented out** in `OperationTerminated` listener
- ⚠️ `FlushUploadedFiles` is **commented out** in `RequestTerminated`

```php
// config/octane.php L112-114
OperationTerminated::class => [
    FlushOnce::class,
    FlushTemporaryContainerInstances::class,
    // DisconnectFromDatabases::class,  // ⚠️ COMMENTED OUT
    // CollectGarbage::class,           // ⚠️ COMMENTED OUT
],
```

**Recommendation:**  
With Roadrunner's long-lived workers, not collecting garbage can lead to memory leaks over time. Re-enable `CollectGarbage` unless you have a specific reason (the 50MB threshold already limits it). For database connections, Roadrunner handles reconnection, so leaving `DisconnectFromDatabases` commented is acceptable.

---

### 1.2 Dockerfile – Worker & Startup

**File:** `Dockerfile`  
**Severity:** 🟠 HIGH

**Findings:**
- ✅ OPcache enabled with JIT (`opcache.jit=1255`, 128M buffer)
- ✅ `opcache.validate_timestamps=0` (production-ready)
- ✅ `config:cache` and `route:cache` run at startup
- ✅ Octane with 4 workers, `--max-requests=500`
- ✅ Composer `--no-dev --optimize-autoloader`
- ⚠️ **Only 1 queue worker** started (`php artisan queue:work &`)

```bash
# Single queue worker in background
php artisan queue:work --sleep=3 --tries=3 --max-time=3600 &
```

**Issues:**
1. **Single queue worker:** Only one `queue:work` process is spawned. Horizon is configured (with up to 5 processes in production) but is **not started** in the Dockerfile.
2. **No Horizon:** Despite having `config/horizon.php` with proper queue priorities (`high`, `default`, `low`) and auto-scaling, Horizon is never launched.
3. **No `view:cache`:** Views are cleared but never cached at startup.

**Recommendation:**
```bash
# Replace: php artisan queue:work --sleep=3 --tries=3 --max-time=3600 &
# With:
php artisan horizon &
# OR at minimum: add view:cache
php artisan view:cache
```

---

### 1.3 N+1 Queries & Missing Eager Loading

#### 1.3a `ChatwootTeamController::getTeamMembers()` — N+1 Query

**File:** `app/Http/Controllers/Api/ChatwootTeamController.php` (L258-275)  
**Severity:** 🔴 CRITICAL

```php
$members = $this->chatwootDb()->table('team_members')
    ->join('users', 'team_members.user_id', '=', 'users.id')
    ->where('team_members.team_id', $teamId)
    ->select('users.id', 'users.name', 'users.display_name', 'users.email')
    ->get()
    ->map(function ($member) {
        // ❌ N+1: Query per member inside loop!
        $localUser = \App\Models\User::where('email', $member->email)->first();
        return [
            'id' => $member->id,
            'name' => $localUser->full_name ?? $member->display_name ?? $member->name,
            'email' => $member->email,
        ];
    })
    ->toArray();
```

**Fix:** Batch-load local users like `getTeam()` and `DashboardController` already do:
```php
$emails = $chatwootMembers->pluck('email')->filter()->toArray();
$localUsers = !empty($emails)
    ? \App\Models\User::whereIn('email', $emails)->get()->keyBy('email')
    : collect();
```

#### 1.3b `TeamInvitationController::syncUsersWithChatwoot()` — API Call per User in Loop

**File:** `app/Http/Controllers/Api/TeamInvitationController.php` (L715-740)  
**Severity:** 🟠 HIGH

```php
foreach ($users as $user) {
    // ❌ Calls getAgents() for EVERY user in the loop!
    $agentsResult = $this->chatwootService->getAgents($accountId, $apiKey);
    // ...then iterates over all agents to find matching email
    foreach ($agents as $agent) { ... }
}
```

The `getAgents()` API call is made **inside the foreach loop** for each user. This makes N HTTP calls to Chatwoot when 1 would suffice.

**Fix:** Move `getAgents()` call **before** the loop:
```php
$agentsResult = $this->chatwootService->getAgents($accountId, $apiKey);
$agents = $agentsResult['success'] ? ($agentsResult['data'] ?? []) : [];
$agentsByEmail = collect($agents)->keyBy(fn($a) => strtolower($a['email']));

foreach ($users as $user) {
    $existingAgent = $agentsByEmail->get(strtolower($user->email));
    // ...
}
```

#### 1.3c `ChatwootTeamController::addTeamMembers()` — Individual Queries in Loop

**File:** `app/Http/Controllers/Api/ChatwootTeamController.php` (L309-330)  
**Severity:** 🟡 MEDIUM

```php
foreach ($validated['user_ids'] as $userId) {
    $userExists = $chatwootDb->table('users')->where('id', $userId)->exists();  // ❌ 1 query per user
    $alreadyMember = $chatwootDb->table('team_members')
        ->where('team_id', $teamId)->where('user_id', $userId)->exists();       // ❌ 1 query per user
    if (!$alreadyMember) {
        $chatwootDb->table('team_members')->insert([...]);                      // ❌ 1 insert per row
    }
}
```

**Fix:** Use `whereIn()` to batch-check existence, then batch-insert:
```php
$validUserIds = $chatwootDb->table('users')->whereIn('id', $validated['user_ids'])->pluck('id');
$existingMembers = $chatwootDb->table('team_members')
    ->where('team_id', $teamId)->whereIn('user_id', $validUserIds)->pluck('user_id');
$toInsert = $validUserIds->diff($existingMembers)->map(fn($id) => [
    'team_id' => $teamId, 'user_id' => $id, 'created_at' => $now, 'updated_at' => $now
])->toArray();
$chatwootDb->table('team_members')->insert($toInsert);
```

#### 1.3d `updateTeamMembers()` — Same Pattern

**File:** `app/Http/Controllers/Api/ChatwootTeamController.php` (L351-370)  
**Severity:** 🟡 MEDIUM

Same `exists()` check per user, and individual `insert()` calls per row.

---

### 1.4 Blocking Webhook Processing

**File:** `app/Http/Controllers/Api/ChatwootWebhookController.php` (L260-340)  
**Severity:** 🔴 CRITICAL

The `forwardToN8nWithEnrichment()` method includes a **synchronous retry loop with `usleep()`** that blocks the Octane worker for up to **14 seconds**:

```php
for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
    $waitSeconds = $attempt + 1; // 2s, 3s, 4s, 5s
    usleep($waitSeconds * 1000000);  // ❌ BLOCKS WORKER for 2-5s per attempt
    // ...API call to Chatwoot...
}
```

With only 4 Octane workers, this can exhaust your entire request capacity during high message volume.

**Fix:** Move this to a **queued job**:
```php
// In handleWebhook():
if ($event === 'message_created') {
    ForwardToN8nJob::dispatch($data, $inboxId, $accountId);
}
```

---

### 1.5 Dashboard Controller — No Caching for Prefetched Data

**File:** `app/Http/Controllers/DashboardController.php` (L100-175)  
**Severity:** 🟡 MEDIUM

The dashboard makes **4+ database queries** to Chatwoot DB on every page load (teams, team members, users, agents) without any caching:

```php
$teams = $chatwootDb->table('teams')->where(...)→get();
$allMembers = $chatwootDb->table('team_members')->join(...)->get();
$localUsers = User::whereIn('email', $allEmails)->get();
$chatwootAgents = $chatwootDb->table('account_users')->join(...)->get();
$agentLocalUsers = User::whereIn('email', $agentEmails)->get();
```

**Fix:** Cache prefetched data for 2-3 minutes:
```php
$prefetchedData = Cache::remember("dashboard_prefetch_{$accountId}", 180, function () use (...) {
    // ...existing queries...
    return ['teams' => $prefetchedTeams, 'agents' => $prefetchedAgents];
});
```

---

## 2. Caching Strategy

### 2.1 Default Cache Driver

**File:** `config/cache.php`  
**Severity:** 🟠 HIGH

```php
'default' => env('CACHE_STORE', 'file'),
```

The default fallback is **file-based caching**. If `CACHE_STORE` env var is not set in Railway, you'll be using file cache which is:
- Not shared between Octane workers
- Not atomic (race conditions with `Cache::add()` in duplicate prevention)
- Very slow compared to Redis

**Verify:** Ensure `CACHE_STORE=redis` is set in Railway environment variables. The duplicate conversation prevention in `ChatwootWebhookController` relies on `Cache::add()` atomicity, which **only works with Redis/Memcached**.

### 2.2 Cache Usage Summary

| Location | Cache Key | TTL | Invalidation | Verdict |
|----------|-----------|-----|-------------|---------|
| `Company::findBySlugCached()` | `company_by_slug:{slug}` | 600s (10m) | ✅ On update/delete | ✅ Good |
| `User::getPermissions()` | `user_permissions_{id}_{role}` | 300s (5m) | ✅ On update | ✅ Good |
| `ResolvesChatwootConfig` | `chatwoot_config_resolved_{id}` | 180s (3m) | ✅ `clearConfigCache()` | ✅ Good |
| `ResolvesChatwootConfig` | `chatwoot_evolution_config_{id}` | 300s (5m) | ✅ `clearConfigCache()` | ✅ Good |
| `EvolutionApiService` | `whatsapp_pending_settings_{name}` | ? | ✅ Manual forget | ✅ OK |
| `EvolutionApiService` | instance list cache | 30s | Auto-expire | ✅ Good |
| Webhook deduplication | `msg_id_{conv}_{msg}` | 60s | Auto-expire | ✅ Good |
| Conversation dedup | `conversation:phone:{phone}:{inbox}` | 7 days | ✅ Manual | ⚠️ Long TTL |
| Webhook events | `chatwoot_events_{account}` | 5m | Auto-expire | ✅ OK |
| Broadcast state | various | 30s | Auto-expire | ✅ OK |
| `MembersController` | `user_{id}_permissions` | - | ✅ Invalidated | ✅ Good |

### 2.3 Missing Cache Opportunities

**Severity:** 🟡 MEDIUM

1. **`ChatwootService::platformClient()` / `accountClient()`** — No response caching on repeated API calls (e.g., `getAgents()`, `getTeams()` called multiple times).
2. **`N8nService::getWorkflows()`** — Fetches all workflows from n8n API every time, no caching.
3. **`DashboardController` prefetch data** — 4+ DB queries on every dashboard load without caching.
4. **`DocumentController::index()`** — Loads all documents without caching (`$query->get()`).
5. **`CompanyProfileController::googleSearch()`** — Google CSE results are never cached.

### 2.4 No Cache Warming Strategy

**Severity:** 🟢 LOW

There is no cache warming mechanism. Consider a scheduled command that pre-warms:
- Company slugs
- User permissions
- Chatwoot configs for active users

---

## 3. Queue & Worker Configuration

### 3.1 Queue Driver

**File:** `config/queue.php`  
**Severity:** 🟠 HIGH

```php
'default' => env('QUEUE_CONNECTION', 'database'),
```

Default fallback is **database** queue. Combined with cache issue, this suggests Railway env vars may be misconfigured.

**Verify:** Ensure `QUEUE_CONNECTION=redis` is set. The Horizon config assumes Redis (`'connection' => 'redis'`).

### 3.2 Horizon Configuration

**File:** `config/horizon.php`  
**Severity:** ✅ GOOD (but unused)

- ✅ 3 priority queues: `high`, `default`, `low`
- ✅ Auto-scaling with `time` strategy
- ✅ Production: max 5 processes, 512MB memory
- ✅ Job trimming configured
- ✅ Wait time thresholds set
- ❌ **Horizon is never started** in the Dockerfile

### 3.3 Only 1 Job Dispatched from Controllers

**File:** `app/Http/Controllers/Api/ChatwootConversationController.php` (L167)  
**Severity:** 🟠 HIGH

Only **one** dispatch call found in all controllers:

```php
\App\Jobs\MergeDuplicateConversationsJob::dispatch($this->inboxId, $this->accountId)
```

Several operations that **should be queued** are running synchronously:

| Operation | File | Impact |
|-----------|------|--------|
| `forwardToN8nWithEnrichment()` with 14s retry loop | `ChatwootWebhookController.php` | 🔴 Blocks worker |
| `syncUsersWithChatwoot()` — multiple API calls | `TeamInvitationController.php` | 🟠 Slow response |
| Document processing & Qdrant indexing | `DocumentController.php` | 🟡 Slow upload |
| Google Search proxy | `CompanyProfileController.php` | 🟢 Minor |

### 3.4 Jobs Available

| Job | Purpose |  Queue |
|-----|---------|--------|
| `PostOnboardingSetupJob` | Chatwoot provisioning + n8n + Qdrant | ✅ Queued |
| `MergeDuplicateConversationsJob` | Merge conversations | ✅ Dispatched |
| `CreateQdrantCollectionJob` | Create vector collection | ✅ Queued |
| `CreateN8nWorkflowsJob` | Create n8n workflows | ✅ Queued |

---

## 4. External API Calls

### 4.1 Timeout Configuration

**Severity:** ✅ MOSTLY GOOD

| Service | Timeout | Connect Timeout | File |
|---------|---------|----------------|------|
| Chatwoot (macro) | 15s | Default | `AppServiceProvider.php` |
| Evolution (macro) | 30s | Default | `AppServiceProvider.php` |
| n8n (macro) | 30s | Default | `AppServiceProvider.php` |
| EvolutionApiService | 5s (default), 30s (client), 60s (media) | 3s | `EvolutionApiService.php` |
| QdrantService (OpenAI) | 30s | Default | `QdrantService.php` |
| n8n webhook | `config('services.timeouts.default', 10)` | Default | `N8nService.php` |
| n8n workflow CRUD | **No timeout** ❌ | Default | `N8nService.php` |
| Doc processing (n8n) | `config('services.timeouts.n8n', 120)` | Default | `DocumentController.php` |
| OpenAI (direct) | `config('services.timeouts.openai', 180)` | Default | `DocumentController.php` |
| Google Search | **No timeout** ❌ | Default | `CompanyProfileController.php` |

### 4.2 Missing Timeouts

**Severity:** 🟠 HIGH

```php
// N8nService.php — Multiple methods have NO timeout
Http::withHeaders([
    'X-N8N-API-KEY' => $this->apiKey,
])->get("{$this->baseUrl}/api/v1/workflows");  // ❌ No timeout!
```

The `N8nService` uses **raw `Http::withHeaders()`** instead of the `Http::n8n()` macro for most methods, losing the 30s timeout.

**Fix:** Use the macro or add `->timeout(30)` to all n8n calls.

### 4.3 No Circuit Breaker Pattern

**Severity:** 🟡 MEDIUM

No circuit breaker, retry, or backoff logic exists for any external API. If Chatwoot, Evolution, n8n, or Qdrant goes down, requests will fail and hang until timeout.

**Recommendation:** Use Laravel's `Http::retry()`:
```php
Http::retry(3, 100, throw: false)->timeout(15)->get(...);
```

### 4.4 N8nService Not Using Macros

**File:** `app/Services/N8nService.php`  
**Severity:** 🟡 MEDIUM

The `N8nService` manually constructs headers on every call instead of using the `Http::n8n()` macro defined in `AppServiceProvider`. This means:
- No timeout on most calls
- Repeated header construction
- Inconsistent behavior vs macro-based calls

Same issue with `ChatwootService` — `platformClient()` and `accountClient()` don't use the `Http::chatwoot()` macro and **don't set timeouts**.

---

## 5. Database Query Optimization

### 5.1 Column Selection (`select()`)

**Severity:** ✅ GOOD

The codebase consistently uses `->select()` in most queries:
- `DashboardController` — selects specific columns from Chatwoot DB
- `ChatwootTeamController` — selective column queries
- `MembersController` — `select('id', 'name', 'email', 'role', ...)`
- `TeamInvitationController` — proper column selection
- `ChatwootController` — selective label/agent queries

### 5.2 Pagination

**Severity:** 🟠 HIGH

**No pagination found anywhere in the codebase.** All queries use `->get()` which returns all rows.

| Query | File | Risk |
|-------|------|------|
| `KnowledgeDocument::where(...)→get()` | `DocumentController.php` | High if many docs |
| `User::select(...)→get()` | `TeamInvitationController.php` | Moderate |
| All conversation queries | `ChatwootConversationController.php` | Mitigated: `->limit(200)` |
| Team queries | `ChatwootTeamController.php` | Low (few teams) |

**Recommendation:** Add pagination to `DocumentController::index()` at minimum:
```php
$documents = $query->orderBy('created_at', 'desc')->paginate(20);
```

### 5.3 Bulk vs Individual Operations

**Severity:** 🟡 MEDIUM (partially addressed)

**Good patterns found:**
- `DashboardController` — batch loads members, then groups by team
- `ChatwootConversationController` — batch loads contacts, assignees, last messages
- `TeamInvitationController::syncUsersWithChatwoot()` — uses `Http::pool()` ✅

**Bad patterns found:**
- `ChatwootTeamController::addTeamMembers()` — individual `insert()` per member (see section 1.3c)
- `ChatwootTeamController::updateTeamMembers()` — same issue (see section 1.3d)

### 5.4 Correlated Subquery in Conversation Loading

**File:** `app/Http/Controllers/Api/ChatwootConversationController.php` (L100-110)  
**Severity:** 🟡 MEDIUM

```php
$lastMessagesRaw = $chatwootDb->table('messages')
    ->whereIn('conversation_id', $conversationIds)
    ->whereRaw('messages.id = (
        SELECT MAX(m2.id) FROM messages m2 
        WHERE m2.conversation_id = messages.conversation_id 
        AND m2.message_type IN (0, 1)
    )')
    ->get();
```

This correlated subquery can be slow with large `messages` tables. Consider using a `LATERAL JOIN` or pre-aggregating with a `GROUP BY`:

```sql
SELECT m.* FROM messages m
INNER JOIN (
    SELECT conversation_id, MAX(id) as max_id
    FROM messages WHERE conversation_id IN (?) AND message_type IN (0, 1)
    GROUP BY conversation_id
) latest ON m.id = latest.max_id
```

---

## 6. Asset & Build Performance

### 6.1 Vite Configuration

**File:** `vite.config.ts`  
**Severity:** ✅ MOSTLY GOOD

```typescript
build: {
    minify: 'esbuild',           // ✅ Fast minification
    sourcemap: false,             // ✅ No sourcemaps in production
    rollupOptions: {
        output: {
            manualChunks: {
                'vendor-react': ['react', 'react-dom'],          // ✅ Separated
                'vendor-ui': ['lucide-react', '@headlessui/react'], // ✅ Separated
                'vendor-pusher': ['pusher-js', 'laravel-echo'],  // ✅ Separated
            },
        },
    },
},
```

**Missing optimizations:**
1. **No compression plugin** (gzip/brotli) — assets are served uncompressed unless Railway/CDN handles it
2. **No CSS code splitting** — single CSS bundle
3. **`MainDashboard.tsx` is listed as a separate entry point** — may cause duplicate module loading

**Fix:** Add `vite-plugin-compression`:
```typescript
import compression from 'vite-plugin-compression';
// plugins: [..., compression({ algorithm: 'gzip' })]
```

### 6.2 Lazy Loading / Code Splitting

**Severity:** 🟠 HIGH

**Only 1 component uses lazy loading** in the entire frontend:

```typescript
// ConversationsInterface.tsx L1
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
```

`Suspense` and `lazy` are imported but usage is limited. No route-level code splitting found.

**Recommendation:** Use Inertia's lazy loading for page components:
```typescript
// In app.tsx, use React.lazy() for page resolution
resolve: (name) => {
    const pages = import.meta.glob('./pages/**/*.tsx');
    return pages[`./pages/${name}.tsx`]();
}
```

This is likely already configured via Inertia but verify all heavy pages use dynamic imports.

### 6.3 Image Optimization

**Severity:** 🟢 LOW

- ✅ Images already use WebP format (`logo-withmia.webp`, icons in `.webp`)
- ⚠️ No `loading="lazy"` on images (except one instance in `TeamsManagement.tsx`)
- ⚠️ No `srcSet` or responsive images
- ⚠️ No image size constraints (images may be larger than needed)

---

## 7. Summary & Priority Matrix

### 🔴 CRITICAL (Fix Immediately)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | `forwardToN8nWithEnrichment()` blocks Octane workers for up to 14s | Request starvation under load | Medium |
| 2 | N+1 query in `getTeamMembers()` | Linear DB query growth | Low |
| 3 | Verify `CACHE_STORE=redis` in Railway | `Cache::add()` atomicity broken with file driver | Config |

### 🟠 HIGH (Fix This Sprint)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 4 | Start Horizon instead of single queue:work | Only 1 worker, no auto-scaling, no priority queues | Low |
| 5 | `getAgents()` called N times inside loop (TeamInvitationController L715) | N×HTTP calls instead of 1 | Low |
| 6 | Missing timeouts on N8nService CRUD methods | Requests hang indefinitely | Low |
| 7 | No pagination on document listing | Memory issues with many documents | Low |
| 8 | `ChatwootService` clients have no timeout | Requests hang indefinitely | Low |
| 9 | Verify `QUEUE_CONNECTION=redis` in Railway | Database queue is much slower | Config |
| 10 | No frontend route-level code splitting | Larger initial bundle size | Medium |

### 🟡 MEDIUM (Next Sprint)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 11 | Dashboard prefetch data not cached (4+ DB queries per load) | Wasted DB resources | Low |
| 12 | Batch inserts for team members | Multiple round trips | Low |
| 13 | N8nService not using Http::n8n() macro | Inconsistent timeout/header behavior | Low |
| 14 | Cache `getWorkflows()`, `getAgents()` responses | Repeated API calls | Low |
| 15 | Correlated subquery for last messages | Slow with large tables | Medium |
| 16 | No circuit breaker / retry on external APIs | Cascading failures | Medium |
| 17 | Add Vite compression plugin | Larger asset transfer | Low |
| 18 | Re-enable `CollectGarbage` in Octane listeners | Memory leak risk | Low |

### 🟢 LOW (Backlog)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 19 | Cache warming for Company slugs / User permissions | Cold cache on deploy | Low |
| 20 | `loading="lazy"` on images | Slightly faster initial paint | Low |
| 21 | Cache Google Search proxy results | Minor external API savings | Low |
| 22 | Add `view:cache` to Dockerfile startup | Marginal view rendering speedup | Low |

---

## 8. Quick Wins Checklist

```
[ ] Verify CACHE_STORE=redis in Railway env
[ ] Verify QUEUE_CONNECTION=redis in Railway env
[ ] Replace queue:work with Horizon in Dockerfile
[ ] Move forwardToN8nWithEnrichment() to a Job
[ ] Fix N+1 in ChatwootTeamController::getTeamMembers()
[ ] Move getAgents() call outside foreach in TeamInvitationController
[ ] Add ->timeout() to all N8nService and ChatwootService methods
[ ] Cache dashboard prefetch data (180s)
[ ] Batch-insert team members
[ ] Add pagination to DocumentController::index()
```
