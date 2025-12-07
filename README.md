# WithMia Application

CRM integrado con Chatwoot para gestión de conversaciones y clientes.

## Deploy Automático en Railway

Este repositorio se despliega automáticamente en Railway al hacer push a la rama main.

## Stack Tecnológico

- **Backend:** Laravel 11 + PHP 8.3
- **Frontend:** React + TypeScript + Inertia.js
- **Base de datos:** MySQL
- **Cache/Queue:** Redis
- **Mensajería:** Chatwoot + Evolution API (WhatsApp)
- **Hosting:** Railway

## Deployment

Cada push a main dispara automáticamente en Railway:
1. Build con Nixpacks (PHP 8.3 + Node.js)
2. Instalación de dependencias (Composer + NPM)
3. Build de assets con Vite
4. Migraciones de base de datos
5. Optimización de Laravel (config, routes, views)
6. Healthcheck en `/up`

---
**Desarrollado por WithMia Team**
