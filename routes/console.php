<?php

use Illuminate\Support\Facades\Schedule;

// Comandos Artisan personalizados de WITHMIA
// Los comandos principales están en app/Console/Commands/

// ============================================================
// SCHEDULER - Tareas programadas
// ============================================================

// 🔍 WhatsApp Health Check: Monitorea instancias cada 5 minutos
// Reconecta automáticamente las que se caigan
Schedule::command('whatsapp:health-check')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->runInBackground();

// 💳 dLocal Subscription Renewal: Auto-renews international subscriptions daily
// Charges saved cards for subscriptions expiring today/tomorrow
// Retries failed charges on days 0, 1, 3, 7 after expiry
Schedule::command('subscriptions:renew-dlocal')
    ->dailyAt('06:00')     // 6 AM UTC — morning in LATAM
    ->withoutOverlapping()
    ->runInBackground();
