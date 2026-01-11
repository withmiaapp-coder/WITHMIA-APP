# 🔑 Generar APP_KEY para Railway

Este script genera una APP_KEY segura para tu proyecto en producción.

## 🚀 Uso Rápido

### Opción 1: PowerShell (Windows)
```powershell
php -r "echo 'base64:' . base64_encode(random_bytes(32)) . PHP_EOL;"
```

### Opción 2: Artisan (Recomendado)
```powershell
php artisan key:generate --show
```

## 📋 Pasos para Configurar en Railway

1. **Ejecuta uno de los comandos de arriba**
2. **Copia el resultado completo** (debe empezar con `base64:`)
3. **Ve a Railway**: https://railway.app/dashboard
4. **Abre tu proyecto** → Click en tu servicio
5. **Ve a Variables** → Busca o crea `APP_KEY`
6. **Pega el valor** que copiaste
7. **Guarda** → Railway redesplegará automáticamente

## ⚠️ IMPORTANTE

- ⛔ **NO uses la misma APP_KEY** en local y producción
- ✅ **Genera una nueva clave** específica para Railway
- 🔒 **No compartas** tu APP_KEY públicamente
- 💾 **Guárdala en un lugar seguro** (por si necesitas restaurarla)

## 🔐 Tu APP_KEY Actual (Local)

Tu archivo `.env` local ya tiene esta clave (NO LA USES EN PRODUCCIÓN):
```
APP_KEY=base64:4KvJ8x9zQpT2wN5mH7yR6kL3sF1dG9bV8cX0jP4nM2A=
```

## ✨ Generar Nueva Clave AHORA

Ejecuta en tu terminal:
