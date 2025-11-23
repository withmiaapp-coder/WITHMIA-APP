# WithMia Application

CRM integrado con Chatwoot para gestión de conversaciones y clientes.

## Deploy Automático

Este repositorio está configurado con GitHub Actions para deploy automático al hacer push a la rama main.

## Stack Tecnológico

- **Backend:** Laravel 11 + PHP 8.3
- **Frontend:** React + TypeScript + Inertia.js
- **Base de datos:** MySQL
- **Cache/Queue:** Redis
- **Mensajería:** Chatwoot + Evolution API (WhatsApp)

## Deployment

Cada push a main dispara automáticamente:
1. Git pull en el servidor
2. Instalación de dependencias (Composer + NPM)
3. Build de assets
4. Migraciones de base de datos
5. Cache de configuración/rutas/vistas
6. Reinicio de PHP-FPM

---
**Desarrollado por WithMia Team**
