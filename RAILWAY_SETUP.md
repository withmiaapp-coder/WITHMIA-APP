# 🔧 Solución al Error de Cifrado en Railway

## ✅ Cambios Realizados

### 1. Archivo `config/app.php`
- **Cambio**: Cifrado de `'AES-256-CBC'` a `'aes-256-cbc'`
- **Razón**: Laravel requiere el nombre del cifrado en minúsculas

### 2. Archivos Creados
- ✅ `.env` - Archivo de entorno local con APP_KEY
- ✅ `generate-key.php` - Script para generar nuevas claves
- ✅ `RAILWAY_SETUP.md` - Este archivo con instrucciones

---

## 📝 Instrucciones para Railway

### Paso 1: Generar una Nueva APP_KEY (Recomendado)

Ejecuta en tu terminal:
```bash
php generate-key.php
```

Esto generará una clave como:
```
base64:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**💡 NOTA**: Por seguridad, deberías generar una clave nueva y única para producción.

### Paso 2: Configurar la APP_KEY en Railway

1. Ve a [Railway.app](https://railway.app)
2. Selecciona tu proyecto: **mia-app-production-1462**
3. Haz clic en tu servicio
4. Ve a la pestaña **Variables**
5. Busca la variable `APP_KEY` (o créala si no existe)
6. Pega el valor completo generado (debe incluir el prefijo `base64:`)
7. Haz clic en **Add** o **Save**

### Paso 3: Hacer Commit y Push

```bash
git add config/app.php .env.railway generate-key.php RAILWAY_SETUP.md
git commit -m "fix: Cambiar cipher a minúsculas para compatibilidad con Laravel"
git push origin main
```

### Paso 4: Verificar el Despliegue

Railway detectará automáticamente el push y hará un nuevo deploy. 

Una vez completado:
1. Ve a tu aplicación: https://mia-app-production-1462.up.railway.app
2. La aplicación debería cargar sin el error de cifrado

---

## 🔐 Claves de Ejemplo Generadas

### Para Desarrollo Local (.env)
```
APP_KEY=base64:4KvJ8x9zQpT2wN5mH7yR6kL3sF1dG9bV8cX0jP4nM2A=
```

### Para Railway (Genera una nueva)
⚠️ **NO uses la misma clave en producción y desarrollo**

Ejecuta `php generate-key.php` y usa la clave generada.

---

## ❓ Solución de Problemas

### Error persiste después del deploy
- Verifica que la variable `APP_KEY` en Railway comience con `base64:`
- Verifica que la clave tenga exactamente 44 caracteres después de `base64:`
- Limpia la caché en Railway (Deploy > Three dots > Restart)

### No puedo ejecutar php generate-key.php
Alternativa - Genera la clave manualmente en la terminal:
```bash
php -r "echo 'base64:' . base64_encode(random_bytes(32)) . PHP_EOL;"
```

O usa esta herramienta online (solo para desarrollo):
https://generate-random.org/laravel-key-generator

---

## 📚 Recursos Adicionales

- [Documentación de Laravel - Encryption](https://laravel.com/docs/11.x/encryption)
- [Railway Docs - Environment Variables](https://docs.railway.app/guides/variables)

---

## ✨ Resumen del Error Original

**Error**: 
```
RuntimeException - Internal Server Error
Unsupported cipher or incorrect key length. 
Supported ciphers are: aes-128-cbc, aes-256-cbc, aes-128-gcm, aes-256-gcm.
```

**Causa**: El cifrado estaba configurado como `AES-256-CBC` (mayúsculas)

**Solución**: Cambiar a `aes-256-cbc` (minúsculas) en `config/app.php`

---

¡Listo! 🚀 Tu aplicación debería funcionar correctamente en Railway después de estos cambios.
