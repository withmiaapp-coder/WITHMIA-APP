#!/usr/bin/env node

/**
 * Script para generar una APP_KEY válida para Laravel
 * Alternativa en Node.js si no tienes PHP instalado
 * 
 * Ejecuta con: node generate-key.js
 */

const crypto = require('crypto');

// Generate a random 32-byte key for Laravel AES-256-CBC encryption
const key = crypto.randomBytes(32).toString('base64');

console.log('==============================================');
console.log('        LARAVEL APP_KEY GENERADA');
console.log('==============================================\n');

console.log('Tu APP_KEY es:\n');
console.log(`base64:${key}\n`);

console.log('==============================================');
console.log('PASOS PARA CONFIGURAR EN RAILWAY:');
console.log('==============================================');
console.log('1. Ve a Railway.app');
console.log('2. Selecciona tu proyecto "mia-app-production-1462"');
console.log('3. Ve a la pestaña "Variables"');
console.log('4. Busca o crea la variable "APP_KEY"');
console.log('5. Pega el valor completo (con "base64:")');
console.log('6. Guarda y espera el redespliegue automático');
console.log('==============================================\n');
