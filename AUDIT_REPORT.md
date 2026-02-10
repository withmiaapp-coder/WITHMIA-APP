# Comprehensive Code Audit Report — WITHMIA (mia-app)

**Date:** June 2025  
**Scope:** Controllers, Services, Jobs, Traits, Helpers  
**Stack:** Laravel 11 + Inertia.js (React/TypeScript)  
**Auditor:** GitHub Copilot

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Critical Findings](#2-critical-findings)
3. [High Severity Findings](#3-high-severity-findings)
4. [Medium Severity Findings](#4-medium-severity-findings)
5. [Low Severity Findings](#5-low-severity-findings)
6. [Architecture Review](#6-architecture-review)
7. [Recommendations Summary](#7-recommendations-summary)

---

## 1. Executive Summary

The WITHMIA application is a multi-tenant SaaS platform for WhatsApp business automation. It integrates with **Chatwoot** (customer support), **Evolution API** (WhatsApp), **n8n** (workflow automation), **Qdrant** (vector database/RAG), and **OpenAI**. The application uses **direct PostgreSQL access** to Chatwoot's database alongside its HTTP API, and manages multi-tenant isolation via `company_slug`.

### Key Statistics

| Metric | Count |
|---|---|
| Controllers (Main) | 10 |
| Controllers (API) | 21 |
| Services | 8 |
| Jobs | 4 |
| Traits | 5 |
| Helpers | 3 |
| **Total Issues Found** | **47** |
| Critical | 7 |
| High | 14 |
| Medium | 16 |
| Low | 10 |

---

## 2. Critical Findings

### CRIT-01: DebugController Has No Authentication Middleware
**File:** `app/Http/Controllers/Api/DebugController.php`  
**Severity:** 🔴 CRITICAL  
**Category:** Security — Missing Authentication

The `DebugController` exposes Redis bot state manipulation (get/set/delete) for any phone number **without any authentication middleware**. An attacker could:
- Read any bot state
- Set takeover flags for any phone number
- Delete blocking keys, reactivating the bot for any conversation

```php
// No middleware('auth') or any guard applied
class DebugController extends Controller
{
    public function getBotState($phone) { ... }
    public function setBotState(Request $request, $phone) { ... }
    public function deleteBotState($phone) { ... }
}
```

**Recommendation:** Add `auth:sanctum` middleware or restrict these endpoints to admin users. Consider removing the controller entirely from production and using it only in local/development environments.

---

### CRIT-02: Sensitive API Keys Exposed in API Responses
**File:** `app/Http/Controllers/Api/N8nConfigController.php`  
**Severity:** 🔴 CRITICAL  
**Category:** Security — Information Disclosure

The `companyConfig()` and `companyConfigByInbox()` endpoints return `openai_api_key` in plain text in the JSON response. These endpoints are called by n8n workflows, but since they are HTTP endpoints, the API key is transmitted and logged.

```php
public function companyConfig(string $companySlug)
{
    return response()->json([
        // ...
        'openai_api_key' => $company->settings['openai_api_key']
                            ?? config('services.openai.api_key'),
        // ...
    ]);
}
```

**Recommendation:** 
- Never expose secret keys in API responses. Use environment variables directly in n8n instead.
- If keys must be transmitted, use encrypted payloads or short-lived tokens.
- Add authentication to these endpoints.

---

### CRIT-03: Document Webhook Endpoints Lack Authentication
**File:** `app/Http/Controllers/Api/DocumentController.php` (lines ~320-405)  
**Severity:** 🔴 CRITICAL  
**Category:** Security — Missing Authentication

The `updateVectorIdsWebhook()` and `chunkStored()` endpoints accept POST requests from n8n without any authentication. An attacker could:
- Inject fake vector IDs into company knowledge bases
- Manipulate document processing status

```php
public function updateVectorIdsWebhook(Request $request) { ... }
public function chunkStored(Request $request) { ... }
// No auth middleware, no secret verification
```

**Recommendation:** Add a shared secret header validation (e.g., `X-Webhook-Secret`) that matches a value configured in both Laravel and n8n.

---

### CRIT-04: Authentication Token in URL Query Parameters
**File:** `app/Traits/HandlesOnboarding.php` (line ~80), `app/Http/Controllers/Api/GoogleAuthController.php`  
**Severity:** 🔴 CRITICAL  
**Category:** Security — Token Exposure

Auth tokens are passed via URL query parameters, which are logged in web server access logs, browser history, referrer headers, and proxy logs.

```php
// HandlesOnboarding.php
$dashboardUrl = route('dashboard.company', ['companySlug' => $uniqueSlug])
    . '?auth_token=' . $user->auth_token;

// GoogleAuthController.php - similar pattern throughout
```

**Recommendation:** Use HTTP-only secure cookies or Authorization headers instead of query parameter tokens. If URL tokens are necessary for one-time redirects, make them single-use with short TTL.

---

### CRIT-05: AdminToolsController `rawInboxCheck()` Exposes Full Chatwoot Database
**File:** `app/Http/Controllers/Api/AdminToolsController.php` (lines ~490-510)  
**Severity:** 🔴 CRITICAL  
**Category:** Security — Data Exposure

The `rawInboxCheck()` method dumps **ALL** inboxes, channels, access tokens, and users from the Chatwoot database without any filtering. Even though it's admin-only, it exposes:
- All access tokens (authentication credentials for Chatwoot)
- All user data across all accounts
- All channel identifiers

```php
public function rawInboxCheck(): JsonResponse
{
    $accessTokens = $chatwootDb->select(
        'SELECT id, owner_id, owner_type FROM access_tokens ORDER BY id'
    );
    $users = $chatwootDb->select(
        'SELECT id, name, email FROM users ORDER BY id'
    );
    // Returns ALL data unfiltered
}
```

**Recommendation:** Remove this endpoint or severely restrict it. Never expose raw access_tokens. Filter by account_id at minimum.

---

### CRIT-06: `shell_exec` Used for PDF Text Extraction
**File:** `app/Http/Controllers/Api/DocumentController.php` (lines ~595-615)  
**Severity:** 🔴 CRITICAL  
**Category:** Security — Command Injection Risk

While `escapeshellarg()` is used for the file path, the `shell_exec("which pdftotext")` call and the `exec()` call introduce command execution on the server. If the temporary file path is manipulated, this could lead to command injection.

```php
$pdftotext = shell_exec("which pdftotext 2>/dev/null");
$cmd = "pdftotext -layout -enc UTF-8 "
     . escapeshellarg($tempPdfPath) . " "
     . escapeshellarg($tempTxtPath) . " 2>&1";
exec($cmd, $output, $returnCode);
```

**Recommendation:** 
- Use a PHP-native PDF parser exclusively (like `smalot/pdfparser` which is already used as fallback).
- If shell commands are necessary, use a whitelist approach and validate all inputs.
- Ensure `tempnam()` paths cannot be manipulated.

---

### CRIT-07: OpenAI API Key Passed Through n8n Workflow Payloads
**File:** `app/Http/Controllers/Api/DocumentController.php` (lines ~545-555)  
**Severity:** 🔴 CRITICAL  
**Category:** Security — Secret Transmission

The OpenAI API key is included in the payload sent to n8n webhooks, exposing it in n8n execution logs and potentially in transit.

```php
$payload = [
    'company_slug' => $companySlug,
    // ...
    'openai_api_key' => $openaiApiKey,  // SECRET IN PAYLOAD
    'qdrant_host' => $qdrantHost,
    'qdrant_api_key' => $qdrantApiKey,  // ANOTHER SECRET
];
Http::timeout(120)->post($webhookUrl, $payload);
```

**Recommendation:** Configure API keys as n8n credentials rather than passing them in webhook payloads. Use environment variables within n8n.

---

## 3. High Severity Findings

### HIGH-01: Weak File Ownership Validation
**File:** `app/Http/Controllers/ContactsController.php` (~line 130)  
**Severity:** 🟠 HIGH  
**Category:** Security — Broken Authorization

File download authorization uses `str_contains()` to check if the filename contains the user ID. An attacker could forge filenames containing another user's ID.

```php
if (!str_contains($fileName, (string)$user->id)) {
    abort(403, 'No tienes permiso para descargar este archivo');
}
```

**Recommendation:** Use a proper mapping table (e.g., `user_file_exports`) linking file IDs to user IDs, or store files under user-specific directories.

---

### HIGH-02: SSL Verification Disabled for Chatwoot Proxy
**File:** `app/Http/Controllers/AttachmentProxyController.php`  
**Severity:** 🟠 HIGH  
**Category:** Security — Transport Security

SSL certificate verification is disabled when proxying Chatwoot attachments, making the connection vulnerable to MITM attacks.

```php
$response = Http::withOptions(['verify' => false])
    ->timeout(30)
    ->get($fullUrl);
```

**Recommendation:** Fix the SSL certificate chain for Chatwoot or configure a specific CA bundle. Never disable SSL verification in production.

---

### HIGH-03: Blocking `usleep()` in Webhook Handler
**File:** `app/Http/Controllers/Api/ChatwootWebhookController.php` (lines ~300-350)  
**Severity:** 🟠 HIGH  
**Category:** Performance — Blocking I/O

The `forwardToN8nWithEnrichment()` method uses a retry loop with `usleep()` that can block for up to **14 seconds** (4 retries × 3.5s) inside a webhook handler. This ties up a PHP worker process and can cause webhook timeouts.

```php
// Retry loop with usleep (blocking!)
for ($retry = 0; $retry < 4; $retry++) {
    usleep(2000000 + ($retry * 500000)); // 2s, 2.5s, 3s, 3.5s
    // Try to fetch attachment data...
}
```

**Recommendation:** 
- Dispatch a queued job for media enrichment instead of blocking the webhook.
- Return 200 to Chatwoot immediately and process asynchronously.

---

### HIGH-04: Blocking `sleep()` in Controller
**File:** `app/Http/Controllers/Api/EvolutionApiController.php`  
**Severity:** 🟠 HIGH  
**Category:** Performance — Blocking I/O

`sleep(2)` is used in `cleanupIfNotConnected()` blocking the request for 2 seconds.

**Recommendation:** Use a queued job with a delay instead of blocking the HTTP request.

---

### HIGH-05: Jobs Using `sync` Connection Defeat Queue Purpose
**File:** `app/Jobs/CreateN8nWorkflowsJob.php`, `app/Jobs/CreateQdrantCollectionJob.php`  
**Severity:** 🟠 HIGH  
**Category:** Architecture — Anti-Pattern

Both jobs explicitly set `$this->onConnection('sync')` in the constructor, meaning they execute synchronously in the HTTP request cycle. Combined with `dispatchSync()` calls in `HandlesOnboarding`, these jobs provide no async benefit.

```php
// CreateN8nWorkflowsJob.php
public function __construct(int $companyId, string $companySlug)
{
    $this->onConnection('sync');  // Defeats the purpose of ShouldQueue
}
```

Additionally, `$tries = 3` and `$timeout = 120` on a sync job mean the HTTP request could retry and block for up to 6 minutes.

**Recommendation:** Either:
1. Remove `implements ShouldQueue` and make them simple service calls, or
2. Remove `onConnection('sync')` and let them run on a proper queue with a worker

---

### HIGH-06: PostOnboardingSetupJob Has No `$tries` or `$timeout`
**File:** `app/Jobs/PostOnboardingSetupJob.php`  
**Severity:** 🟠 HIGH  
**Category:** Reliability — Missing Job Configuration

Unlike the other jobs, `PostOnboardingSetupJob` lacks `$tries` and `$timeout` properties, meaning it uses Laravel defaults (unlimited retries, no timeout).

**Recommendation:** Add `public $tries = 3;` and `public $timeout = 120;` to prevent infinite retries.

---

### HIGH-07: DashboardController Has Massive Inline DB Queries
**File:** `app/Http/Controllers/DashboardController.php` (~150 lines in `show()`)  
**Severity:** 🟠 HIGH  
**Category:** Architecture — SRP Violation

The `show()` method performs direct Chatwoot DB queries for teams, agents, unread counts, and prefetches conversation data — all inline in a controller method. This violates SRP and makes the code untestable.

**Recommendation:** Extract Chatwoot data fetching into a dedicated service (e.g., `ChatwootDashboardService`).

---

### HIGH-08: Duplicate Onboarding Logic
**File:** `app/Http/Controllers/OnboardingController.php`, `app/Http/Controllers/OnboardingApiController.php`  
**Severity:** 🟠 HIGH  
**Category:** Architecture — Code Duplication

Two controllers handle onboarding (web + API) with substantial duplicated logic for authentication detection, step saving, and company creation, despite sharing the `HandlesOnboarding` trait.

**Recommendation:** Consolidate into a single controller or move all shared logic into the trait/service layer.

---

### HIGH-09: AdminToolsController Is 993 Lines with 23+ Methods
**File:** `app/Http/Controllers/Api/AdminToolsController.php`  
**Severity:** 🟠 HIGH  
**Category:** Architecture — God Class

This controller has 23+ administrative actions covering n8n workflows, Chatwoot configuration, Redis management, Qdrant recreation, Evolution API reconfiguration, and more. It violates SRP significantly.

**Recommendation:** Split into focused controllers:
- `AdminN8nController`
- `AdminChatwootController`
- `AdminEvolutionController`
- `AdminRedisController`

---

### HIGH-10: EvolutionApiController Is 1545 Lines
**File:** `app/Http/Controllers/Api/EvolutionApiController.php`  
**Severity:** 🟠 HIGH  
**Category:** Architecture — God Class

The largest controller at 1545 lines handles instance lifecycle, webhook events, message routing, n8n workflow creation, Chatwoot token management, and broadcasting — all in one class.

**Recommendation:** Split into:
- `WhatsAppInstanceController` (CRUD, connect/disconnect)
- `WhatsAppWebhookController` (webhook handling)
- `WhatsAppSettingsController` (settings management)

---

### HIGH-11: DocumentController Is 1313 Lines with Inline Workflow Generation
**File:** `app/Http/Controllers/Api/DocumentController.php`  
**Severity:** 🟠 HIGH  
**Category:** Architecture — SRP Violation

The controller contains:
- Document CRUD endpoints
- PDF text extraction (with `shell_exec`)
- UTF-8 mojibake fixing (~150 lines)
- GPT-4 Vision integration
- Complete n8n workflow generation code (node definitions in PHP arrays)
- JavaScript code blocks embedded as PHP strings

**Recommendation:** Extract into:
- `DocumentTextExtractor` service
- `N8nRagWorkflowBuilder` service
- Keep controller thin with routing logic only

---

### HIGH-12: `fixCompanyChatwoot()` Calls `getAgents()` Inside a Loop
**File:** `app/Http/Controllers/Api/TeamInvitationController.php` (~line 680)  
**Severity:** 🟠 HIGH  
**Category:** Performance — N+1 API Calls

For every user without a Chatwoot agent ID, the method calls `getAgents()` to search for an existing agent by email. This results in N API calls to Chatwoot where N is the number of users.

```php
foreach ($users as $user) {
    $agentsResult = $this->chatwootService->getAgents($accountId, $apiKey);
    // Linear search through all agents for each user
}
```

**Recommendation:** Fetch agents once before the loop and build an email-indexed map.

---

### HIGH-13: Conversation Export Uses Unbounded Loop with `usleep`
**File:** `app/Http/Controllers/Api/ChatwootConversationController.php` (lines ~430-510)  
**Severity:** 🟠 HIGH  
**Category:** Performance — Resource Exhaustion

`exportAllConversationsWithMessages()` fetches ALL conversations page by page, then for each conversation fetches its messages with a `usleep(100000)` delay. For accounts with thousands of conversations, this could run for minutes and exhaust memory/time limits.

**Recommendation:** Use a queued job for exports and return a download link. Implement pagination and streaming for large datasets.

---

### HIGH-14: Chatwoot DB Hardcoded `account_id = 1` in Admin Debug
**File:** `app/Http/Controllers/Api/AdminToolsController.php` (lines ~910-930)  
**Severity:** 🟠 HIGH  
**Category:** Multi-tenancy — Data Leak

The `chatwootDebug()` method hardcodes `WHERE account_id = 1`, leaking data across tenants. In a multi-tenant setup, this always returns data from account 1 regardless of which admin is logged in.

```php
$inboxes = $chatwootDb->select(
    'SELECT ... FROM inboxes WHERE account_id = 1'
);
```

**Recommendation:** Use the authenticated user's `chatwoot_account_id` instead of hardcoded value.

---

## 4. Medium Severity Findings

### MED-01: ChatwootService Mixes HTTP API and Direct DB Access
**File:** `app/Services/ChatwootService.php`  
**Severity:** 🟡 MEDIUM  
**Category:** Architecture — Inconsistency

Some methods (`getInbox`, `listInboxes`, `findInboxByName`) use `DB::connection('chatwoot')` for direct SQL queries, while most others use the HTTP API. This creates:
- Maintenance confusion
- Potential data inconsistencies
- Difficulty mocking in tests

**Recommendation:** Choose one access pattern per entity. Prefer HTTP API for mutations and direct DB for read-only performance queries, but document the strategy clearly.

---

### MED-02: ConversationDeduplicationService Uses Raw PDO Alongside Laravel DB
**File:** `app/Services/ConversationDeduplicationService.php`  
**Severity:** 🟡 MEDIUM  
**Category:** Architecture — Inconsistency

The service maintains its own PDO connection (`getChatwootConnection()`) with a fallback from Laravel's DB facade to raw PDO. This bypasses Laravel's query builder, transactions, and logging.

**Recommendation:** Use `DB::connection('chatwoot')` consistently. Remove the raw PDO fallback.

---

### MED-03: Base64 Images Stored in Database
**File:** `app/Http/Controllers/Api/CompanyProfileController.php`  
**Severity:** 🟡 MEDIUM  
**Category:** Architecture — Storage Anti-Pattern

Company logos are stored as base64 strings directly in the database, bloating the table and slowing queries.

```php
$company->update(['logo' => $request->input('logo')]); // base64 string
```

**Recommendation:** Store images in file storage (S3, local disk) and save only the URL/path in the database.

---

### MED-04: Inconsistent Error Response Format
**Severity:** 🟡 MEDIUM  
**Category:** Code Quality — Inconsistency

Error responses vary widely across controllers:
- Some use `$this->errorResponse($e)` (private helper)
- Some return `['success' => false, 'message' => ...]`
- Some return `['success' => false, 'error' => ...]`
- Some return `['error' => ...]`
- HTTP status codes are inconsistent (400 vs 500 vs 422)

**Recommendation:** Create a standardized `ApiResponse` trait or base controller method that enforces a consistent format: `{ success: bool, message: string, data?: any, errors?: any }`.

---

### MED-05: Missing Request Validation in Multiple Endpoints
**Severity:** 🟡 MEDIUM  
**Category:** Security — Input Validation

Several endpoints accept user input without proper validation:

- `ChatwootWebhookController::handle()` — processes webhook payloads without schema validation
- `EvolutionApiController::webhook()` — processes Evolution events without validation
- `BotConfigController::update()` — modifies n8n workflow nodes based on unvalidated input

**Recommendation:** Use Form Request classes for validation. For webhooks, validate the payload structure before processing.

---

### MED-06: Hardcoded Magic Strings for n8n Node Names
**File:** `app/Http/Controllers/Api/BotConfigController.php`, `ChatwootWebhookController.php`  
**Severity:** 🟡 MEDIUM  
**Category:** Maintainability — Magic Strings

n8n workflow nodes are looked up by hardcoded names like `'Verifica Palabra Clave'`, `'Agent mia'`, `'Human takeover?'`. If node names change in the n8n template, the code breaks silently.

```php
foreach ($result['data']['nodes'] as $node) {
    if ($node['name'] === 'Verifica Palabra Clave') { // Magic string!
        return $node['parameters']['conditions']['conditions'][0]['rightValue'] ?? 'BOTA';
    }
}
```

**Recommendation:** Define node names as constants and consider using node IDs instead of names for lookups.

---

### MED-07: `BotConfigController::getCompanyWorkflowId()` Has Fragile Fallback Chain
**File:** `app/Http/Controllers/Api/BotConfigController.php`  
**Severity:** 🟡 MEDIUM  
**Category:** Reliability — Fragile Logic

The method has a 5-level fallback chain including parsing the `Referer` header and falling back to "any active instance" — which could return a workflow from the wrong company.

**Recommendation:** Require explicit company identification and fail clearly instead of guessing.

---

### MED-08: Emoji Characters in Log Messages
**Severity:** 🟡 MEDIUM  
**Category:** Code Quality — Logging

Extensive use of emoji in `Log::debug()` and `Log::error()` calls (🚀, ✅, ❌, 📦, etc.) makes log parsing and alerting difficult with standard tools.

**Recommendation:** Use structured logging with severity levels and tags instead of emoji. If emoji is desired for development, make it conditional on environment.

---

### MED-09: Mixed Spanish and English in Code
**Severity:** 🟡 MEDIUM  
**Category:** Code Quality — Consistency

Comments, variable names, error messages, and log entries mix Spanish and English inconsistently. Some methods have Spanish docblocks while function names are English.

**Recommendation:** Standardize on English for all code (comments, logs, errors). User-facing strings should be in lang files for proper i18n.

---

### MED-10: ChatwootService Has Typo in Import
**File:** `app/Services/ChatwootService.php`  
**Severity:** 🟡 MEDIUM  
**Category:** Code Quality — Bug

```php
\Illuminate\Support\FacadesLog::error(...); // Missing backslash: Facades\Log
```

This would cause a `Class not found` error at runtime if this code path is hit.

**Recommendation:** Fix to `\Illuminate\Support\Facades\Log::error(...)` or use the `Log` facade with a `use` statement.

---

### MED-11: Cache Key Collisions Possible
**Severity:** 🟡 MEDIUM  
**Category:** Reliability — Cache

Cache keys like `"chatwoot_config_resolved_{$userId}"` and `"whatsapp_pending_settings_{$instanceName}"` lack namespacing and could collide in shared Redis instances.

**Recommendation:** Use a consistent prefix (e.g., `withmia:`) and consider using Laravel's cache prefix configuration.

---

### MED-12: `FormatsWhatsAppContacts` Trait Has Chile-Specific Logic
**File:** `app/Traits/FormatsWhatsAppContacts.php`  
**Severity:** 🟡 MEDIUM  
**Category:** Internationalization — Hardcoded Logic

Phone formatting has Chile-specific logic hardcoded (`starts_with('569')`), which won't work for other countries.

```php
if (strlen($number) == 11 && str_starts_with($number, '569')) {
    return '+56 9 ' . substr($number, 3, 4) . ' ' . substr($number, 7, 4);
}
```

**Recommendation:** Use a phone number formatting library (`libphonenumber`) or make country detection dynamic.

---

### MED-13: No Rate Limiting on Authentication Endpoints
**File:** `app/Http/Controllers/Api/GoogleAuthController.php`  
**Severity:** 🟡 MEDIUM  
**Category:** Security — Abuse Prevention

The Google Auth callback and token validation endpoints lack rate limiting, making them vulnerable to brute-force or token enumeration attacks.

**Recommendation:** Apply Laravel's `throttle` middleware to authentication endpoints.

---

### MED-14: ChatwootDbAccess Trait Assumes Properties Exist
**File:** `app/Traits/ChatwootDbAccess.php`  
**Severity:** 🟡 MEDIUM  
**Category:** Code Quality — Fragile Contract

The trait documents that controllers must have `$accountId`, `$inboxId`, `$userId` properties but has no way to enforce this at compile time. If a controller uses the trait without setting these properties, queries will fail with confusing errors.

**Recommendation:** Use an interface or abstract class to enforce the required properties. Add runtime checks in `findConversation()`.

---

### MED-15: Duplicate Workflow Template Loading Logic
**Severity:** 🟡 MEDIUM  
**Category:** Architecture — Code Duplication

Template loading (read JSON, strip BOM, decode) is duplicated in:
- `CreateN8nWorkflowsJob::buildRagWorkflow()`
- `AdminToolsController::repairInstance()`
- `AdminToolsController::loadRagTemplate()`
- `N8nService::createBotWorkflow()`
- `DocumentController::createCompanyWorkflow()`

**Recommendation:** Create a `WorkflowTemplateLoader` service that handles template reading, BOM stripping, JSON decoding, and placeholder replacement.

---

### MED-16: `WhatsAppInstanceController` Has Minimal Auth
**File:** `app/Http/Controllers/Api/WhatsAppInstanceController.php`  
**Severity:** 🟡 MEDIUM  
**Category:** Security — Weak Authentication

The controller relies on an `X-N8N-Secret` header for authentication but the header value is never verified in the visible code.

**Recommendation:** Verify the secret header against a configured value. Add proper middleware-based authentication.

---

## 5. Low Severity Findings

### LOW-01: Unused `$qdrantService` Parameter
**File:** `app/Jobs/CreateN8nWorkflowsJob.php`  
**Severity:** 🔵 LOW  
**Category:** Code Quality — Dead Code

The `handle()` method receives `QdrantService $qdrantService` via DI but it's only passed to `buildRagWorkflow()` where it's also unused.

**Recommendation:** Remove the unused parameter.

---

### LOW-02: `HasCompanyAccess` Trait Uses `abort(404)` Instead of `abort(403)`
**File:** `app/Traits/HasCompanyAccess.php`  
**Severity:** 🔵 LOW  
**Category:** Code Quality — Incorrect HTTP Status

When a user has no company, the trait returns 404 ("Not Found") instead of 403 ("Forbidden") or a proper error redirect.

```php
if (!$company) {
    abort(404, 'No company found');
}
```

**Recommendation:** Use `abort(403)` for authorization failures or return a more descriptive error.

---

### LOW-03: Inconsistent Service Instantiation
**File:** `app/Http/Controllers/Api/QdrantPointController.php`  
**Severity:** 🔵 LOW  
**Category:** Code Quality — Inconsistency

Uses both constructor DI and `app()` helper to get the same service:

```php
public function __construct(QdrantService $qdrantService) { ... }
// Later in a method:
$qdrantService = app(QdrantService::class);
```

**Recommendation:** Use constructor injection exclusively.

---

### LOW-04: `AdminToolsController` Uses `app()` for Service Resolution
**File:** `app/Http/Controllers/Api/AdminToolsController.php`  
**Severity:** 🔵 LOW  
**Category:** Code Quality — DI Anti-Pattern

Multiple methods resolve services via `app(ServiceClass::class)` instead of constructor injection, making dependencies implicit and testing harder.

**Recommendation:** Inject all services via the constructor.

---

### LOW-05: Temporary Files May Not Be Cleaned Up on Error
**File:** `app/Http/Controllers/Api/DocumentController.php`  
**Severity:** 🔵 LOW  
**Category:** Resource Management — File Leak

`tempnam()` creates temporary PDF files for text extraction. If an exception occurs before `unlink()`, the file remains on disk.

**Recommendation:** Use a `try/finally` block to ensure `unlink()` is always called, or use Laravel's `TemporaryDirectory` helper.

---

### LOW-06: `Utf8Helper::fix()` Has Potentially Lossy Conversion
**File:** `app/Helpers/Utf8Helper.php`  
**Severity:** 🔵 LOW  
**Category:** Code Quality — Data Loss Risk

The double encoding detection uses `iconv('UTF-8', 'ISO-8859-1//IGNORE', ...)` which silently drops characters that can't be represented in ISO-8859-1.

**Recommendation:** Use `//TRANSLIT` instead of `//IGNORE` or handle encoding errors explicitly.

---

### LOW-07: `$this->timeout` Hardcoded in EvolutionApiService
**File:** `app/Services/EvolutionApiService.php`  
**Severity:** 🔵 LOW  
**Category:** Maintainability — Hardcoded Values

Timeout values are defined as class properties but not configurable via config or env.

**Recommendation:** Load timeouts from `config('evolution.timeout')`.

---

### LOW-08: `TrainingChatController::detectIfQuestion()` Has Overlapping Patterns
**File:** `app/Http/Controllers/Api/TrainingChatController.php`  
**Severity:** 🔵 LOW  
**Category:** Code Quality — Redundancy

The question detection method has overlapping checks: step 2 (question starters) and step 3 (question patterns) check for the same words (`qué`, `cómo`, `tienen`, etc.) with slight differences.

**Recommendation:** Consolidate the detection logic into a single pass with combined patterns.

---

### LOW-09: `ResolvesChatwootConfig` Caches Different TTLs
**File:** `app/Traits/ResolvesChatwootConfig.php`  
**Severity:** 🔵 LOW  
**Category:** Code Quality — Inconsistency

`resolveChatwootConfig()` uses 180s (3 min) TTL, while `getChatwootConfigForEvolution()` uses 300s (5 min). There's no documented reason for the difference.

**Recommendation:** Standardize cache TTLs or document the rationale.

---

### LOW-10: Dead Comment Block & Duplicate `/**` in EvolutionApiController
**File:** `app/Http/Controllers/Api/EvolutionApiController.php` (line ~1460)  
**Severity:** 🔵 LOW  
**Category:** Code Quality — Syntax

```php
    /**
    /**
     * Asegurar que Evolution tenga el Channel Token correcto...
```

Duplicate `/**` block creates a malformed docblock.

**Recommendation:** Remove the duplicate line.

---

## 6. Architecture Review

### 6.1 Overall Architecture

```
┌──────────────┐     ┌──────────────┐     ┌────────────┐
│   Frontend   │────▶│   Laravel    │────▶│  Chatwoot   │
│  React/Inertia│    │  Controllers │     │  (DB+API)   │
└──────────────┘     │   Services   │     └────────────┘
                     │    Jobs      │     ┌────────────┐
                     │   Traits     │────▶│ Evolution   │
                     │   Helpers    │     │   API       │
                     └──────┬───────┘     └────────────┘
                            │             ┌────────────┐
                            ├────────────▶│    n8n      │
                            │             │ (Workflows) │
                            │             └────────────┘
                            │             ┌────────────┐
                            ├────────────▶│   Qdrant    │
                            │             │ (Vectors)   │
                            │             └────────────┘
                            │             ┌────────────┐
                            └────────────▶│   OpenAI    │
                                          │  (GPT/Emb) │
                                          └────────────┘
```

### 6.2 Strengths

1. **Good use of traits for shared logic** — `ResolvesChatwootConfig`, `ChatwootDbAccess`, `HandlesOnboarding` effectively reduce duplication.
2. **Centralized helpers** — `PhoneNormalizer`, `SystemMessagePatterns`, and `Utf8Helper` provide utility logic in clean, static classes.
3. **Service layer exists** — Services for Chatwoot, Evolution, n8n, and Qdrant encapsulate external API calls.
4. **Deduplication awareness** — Thoughtful cache-based deduplication in webhooks to prevent duplicate message processing.
5. **Multi-tenant security improvements** — Comments like "NO usar fallback a account_id=1" show awareness of multi-tenancy concerns.

### 6.3 Weaknesses

1. **Controller bloat** — Several controllers exceed 500+ lines (EvolutionApiController: 1545, DocumentController: 1313, AdminToolsController: 993, TeamInvitationController: 985).
2. **Mixed access patterns** — Chatwoot is accessed via HTTP API, direct PostgreSQL, and Laravel DB facade inconsistently.
3. **Business logic in controllers** — Workflows, template building, text extraction, and encoding fixes are in controllers instead of services.
4. **Tight coupling** — Controllers directly instantiate services via `app()`, query multiple databases, and build n8n workflow JSON inline.
5. **Missing middleware** — Several endpoints lack proper authentication/authorization middleware.
6. **No database transactions** — Most multi-step operations (create user + create Chatwoot agent + update DB) lack transaction wrapping.

### 6.4 Multi-Tenancy Concerns

The application uses `company_slug` as the tenant identifier, but:
- Some admin endpoints hardcode `account_id = 1`
- Cache keys don't consistently include tenant identifiers
- Some fallback logic defaults to global configs, potentially leaking data between tenants
- `BotConfigController::getCompanyWorkflowId()` can fall back to "any active instance"

---

## 7. Recommendations Summary

### Immediate Actions (Critical)
| # | Action | Effort |
|---|--------|--------|
| 1 | Add authentication to `DebugController` | Low |
| 2 | Remove API keys from response payloads | Low |
| 3 | Add webhook secret validation to Document webhook endpoints | Low |
| 4 | Move auth tokens from URL to cookies/headers | Medium |
| 5 | Remove or restrict `rawInboxCheck()` | Low |

### Short-Term Improvements (High)
| # | Action | Effort |
|---|--------|--------|
| 6 | Fix file ownership validation in `ContactsController` | Low |
| 7 | Enable SSL verification for Chatwoot proxy | Low |
| 8 | Replace blocking `usleep()`/`sleep()` with queued jobs | Medium |
| 9 | Fix job queue configuration (remove `sync` connection) | Low |
| 10 | Add `$tries`/`$timeout` to `PostOnboardingSetupJob` | Low |
| 11 | Split god controllers into focused classes | High |

### Medium-Term Refactoring
| # | Action | Effort |
|---|--------|--------|
| 12 | Extract business logic from controllers into services | High |
| 13 | Standardize error response format | Medium |
| 14 | Create `WorkflowTemplateLoader` service | Medium |
| 15 | Standardize Chatwoot access pattern (API vs DB) | High |
| 16 | Add Form Request validation classes | Medium |
| 17 | Implement proper multi-tenant cache namespacing | Medium |

### Long-Term Architecture
| # | Action | Effort |
|---|--------|--------|
| 18 | Implement API versioning | High |
| 19 | Add comprehensive integration test suite | High |
| 20 | Move to event-driven architecture for webhooks | High |
| 21 | Add rate limiting to all external-facing endpoints | Medium |
| 22 | Implement audit logging for sensitive operations | Medium |

---

*End of Audit Report*
