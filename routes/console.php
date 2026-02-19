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
