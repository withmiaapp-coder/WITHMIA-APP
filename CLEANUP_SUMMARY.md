# 🧹 Resumen de Limpieza y Unificación

## Fecha: 2024-02-01

## ✅ Acciones Realizadas

### 1. Unificación de Controladores
- **Eliminado**: `ChatwootController.php` (base) - tenía lógica duplicada
- **Conservado**: `Api/ChatwootController.php` - controlador principal unificado
- **Eliminado**: `ChatwootWebhookController_DEPRECATED.php`
- **Eliminado**: `TempChatwootController.php`

### 2. Unificación de Servicios  
- **Unificado**: `ConversationDeduplicationServiceV2.php` → `ConversationDeduplicationService.php`
- El archivo V2 ahora es el único servicio de deduplicación

### 3. Archivos Temporales Eliminados (movidos a backup)
| Carpeta | Cantidad | Descripción |
|---------|----------|-------------|
| sql_check | 34 | Scripts de verificación SQL |
| sql_temp | 22 | Scripts temporales SQL |
| debug_php | 19 | Scripts de depuración PHP |
| json_workflows | 15 | Archivos JSON de workflows |
| sql_fix | 7 | Scripts de corrección SQL |
| diagnostic_scripts | 6 | Scripts de diagnóstico creados |
| sql_misc | 4 | Scripts SQL misceláneos |
| deprecated_controllers | 3 | Controladores deprecados |
| json_exec | 3 | Archivos de ejecución JSON |
| misc | 3 | Archivos varios |
| deprecated_services | 1 | Servicios deprecados |
| **TOTAL** | **117** | Archivos movidos |

### 4. Ubicación de Backups
```
backups/cleanup_2026-02-01_172407/
├── debug_php/
├── deprecated_controllers/
├── deprecated_services/
├── diagnostic_scripts/
├── json_exec/
├── json_workflows/
├── misc/
├── sql_check/
├── sql_fix/
├── sql_misc/
└── sql_temp/
```

## 📁 Estructura Final

### Controladores (app/Http/Controllers/)
```
├── AdminController.php
├── AttachmentProxyController.php
├── ChatwootEnterpriseController.php
├── ContactsController.php
├── Controller.php
├── DashboardController.php
├── HomeController.php
├── KnowledgeController.php
├── OnboardingApiController.php
├── OnboardingController.php
├── Api/
│   ├── BotConfigController.php
│   ├── ChatwootController.php (PRINCIPAL)
│   ├── ChatwootWebhookController.php (WEBHOOKS)
│   ├── EvolutionApiController.php
│   ├── GoogleAuthController.php
│   ├── MembersController.php
│   ├── N8nWorkflowController.php
│   ├── TeamInvitationController.php
│   └── WhatsAppInstanceController.php
└── Settings/
    ├── PasswordController.php
    └── ProfileController.php
```

### Servicios (app/Services/)
```
├── ChatwootProvisioningService.php
├── ChatwootService.php
├── ContactsExcelExporter.php
├── ConversationDeduplicationService.php (UNIFICADO)
├── DynamicContactsExcelManager.php
├── EvolutionApiService.php
├── N8nService.php
├── N8nWorkflowService.php
├── OnboardingService.php
└── QdrantService.php
```

## 🔗 Rutas Principales de Webhook

Las rutas esenciales para el funcionamiento del chat están en `routes/api.php`:

```php
// Webhooks de Chatwoot (líneas 1825-1827)
Route::post('/chatwoot/webhook/{instance}', [ChatwootWebhookController::class, 'handleWebhook']);
Route::post('/chatwoot/webhook', [ChatwootWebhookController::class, 'handleWebhook']);

// Webhook de Evolution API (línea 1831)
Route::post('/evolution/webhook', [EvolutionApiController::class, 'webhook']);
```

## ⚠️ Rutas de Diagnóstico Movidas

### routes/api.php → routes/debug.php
- **Antes**: 5343 líneas
- **Después**: 2564 líneas  
- **Reducción**: 52%
- **Rutas movidas**: 46 rutas de debug/fix/diagnose

Las rutas de diagnóstico ahora están en `routes/debug.php` y solo se cargan en entornos `local`, `development` o `staging`:

```php
if (app()->environment('local', 'development', 'staging')) {
    require __DIR__ . '/debug.php';
}
```

## ✨ Resultado

El proyecto ahora tiene:
- ✅ Un solo `ChatwootController` (en Api/)
- ✅ Un solo `ConversationDeduplicationService`
- ✅ Raíz del proyecto limpia (solo archivos de configuración)
- ✅ **120 archivos** temporales respaldados
- ✅ Sin errores de sintaxis
- ✅ Eventos no usados removidos (NewChatwootMessage, WhatsAppMessageReceived)
- ✅ Rutas de debug separadas en `routes/debug.php`

## 📊 Estadísticas Finales

| Componente | Cantidad |
|------------|----------|
| Controladores | 21 |
| Servicios | 10 |
| Eventos | 4 |
| Jobs | 4 |
| Líneas api.php | 2,564 (antes 5,343) |
| Líneas web.php | 719 |
| Líneas debug.php | 2,851 |

## 📦 Archivos Respaldados

| Carpeta | Cantidad |
|---------|----------|
| sql_check | 34 |
| sql_temp | 22 |
| debug_php | 19 |
| json_workflows | 15 |
| sql_fix | 7 |
| diagnostic_scripts | 6 |
| sql_misc | 4 |
| deprecated_controllers | 3 |
| json_exec | 3 |
| misc | 3 |
| unused_events | 2 |
| deprecated_services | 1 |
| routes | 1 |
| **TOTAL** | **120** |
