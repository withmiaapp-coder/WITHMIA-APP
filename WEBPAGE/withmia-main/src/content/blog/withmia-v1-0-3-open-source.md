---
title: "WITHMIA v1.0.3 — WITHMIA es Open Source"
description: "WITHMIA libera su código fuente bajo AGPLv3. Auto-hosting con Docker Compose, auditoría de seguridad completa, correcciones de vulnerabilidades, documentación comunitaria y más. Construye con nosotros."
date: 2026-03-02
author: "Equipo WITHMIA"
category: "Producto"
tags: ["actualización", "v1.0.3", "producto", "open-source", "AGPLv3", "docker", "seguridad", "comunidad"]
draft: false
readingTime: 6
---

La v1.0.0 fue el lanzamiento. La v1.0.1 trajo personalización. La v1.0.2 construyó el modelo de negocio. Ahora, la v1.0.3 hace algo que pocos startups se atreven a hacer tan temprano: **abrir todo el código fuente**.

## WITHMIA es Open Source

A partir de hoy, el repositorio completo de WITHMIA es público en [github.com/withmiaapp-coder/withmia](https://github.com/withmiaapp-coder/withmia) bajo la licencia **GNU Affero General Public License v3 (AGPLv3)**.

¿Por qué AGPLv3? Es la misma licencia que usan proyectos como Chatwoot, n8n y GitLab. Garantiza que:

- **Puedes** ver, modificar, ejecutar y distribuir el código libremente
- **Puedes** hacer self-hosting de tu propia instancia
- **Debes** mantener la misma licencia si redistribuyes el código (incluso como SaaS)
- **Proteges** el ecosistema de forks comerciales que no contribuyan de vuelta

Elegimos el modelo **Open Core**: todo el código de la plataforma es abierto. En el futuro, features enterprise premium (SSO, auditoría avanzada, SLA) serán comerciales, pero el motor completo de WITHMIA es y será libre.

## Self-hosting con Docker Compose

El sueño del self-hosting ya es realidad. Un solo archivo `docker-compose.yml` levanta toda la infraestructura:

```bash
git clone https://github.com/withmiaapp-coder/withmia.git
cd withmia
cp .env.example .env
# Editar .env con tus credenciales
docker compose up -d
```

En minutos tienes corriendo:

- **WITHMIA App** — Laravel 12 + React 19 sobre RoadRunner
- **PostgreSQL 16** — base de datos con inicialización automática de schemas
- **Redis 7** — cache, colas y broadcasting en tiempo real
- **Chatwoot** — motor de conversaciones omnicanal
- **Qdrant** — base de datos vectorial para RAG e inteligencia semántica
- **n8n** — automatización de workflows
- **Evolution API** — integración con WhatsApp Business

Todos los servicios tienen healthchecks configurados y volúmenes persistentes. El `.env.example` documenta más de 160 variables de entorno con valores por defecto y comentarios explicativos.

## Auditoría de seguridad completa

Antes de abrir el código, realizamos una auditoría exhaustiva para asegurarnos de que **cero credenciales, tokens o secretos** estuvieran en el repositorio.

Lo que se limpió:

- **Secretos**: todas las API keys, tokens y credentials usan `env()` con fallbacks seguros
- **Logs**: `laravel.log` y 45 vistas compiladas eliminados del tracking de git
- **Hostnames**: URLs internas de Railway reemplazadas por `localhost` en defaults
- **Datos personales**: emails anonimizados en config de Horizon, teléfonos reales reemplazados por ejemplos
- **Variable HORIZON_ADMIN_EMAILS**: añadida en Railway para mantener acceso al dashboard post-limpieza

## Correcciones de seguridad

La auditoría identificó vulnerabilidades que fueron corregidas antes del release:

### Alta severidad

- **Google OAuth Client ID hardcodeado en el frontend** — el Client ID de Google estaba directamente en `AcceptInvitation.tsx`. Ahora se pasa como prop desde el servidor via Inertia.js, leyendo `config('services.google.client_id')`. Ningún ID se expone en el código fuente.

### Severidad media

- **Emails de contacto hardcodeados** — `contacto@withmia.com` en templates de email del `WebsiteBookingController` ahora lee de `config('mail.admin_address')`. Cada instancia self-hosted usa su propio email.
- **URL de producción hardcodeada** — `https://app.withmia.com` en `ClientPortalController` reemplazada por `config('app.url')` con fallback a `localhost:8080`.
- **URLs de logo en emails** — Las URLs absolutas a los iconos ahora se construyen dinámicamente con `config('app.url')`.
- **IDs internos de Flow.cl** — IDs de planes de pago removidos de los comentarios en `billing.php`.
- **Contraseña PostgreSQL por defecto** — Cambiada de `withmia` a `changeme` con advertencia prominente en `docker-compose.yml`.
- **SECRET_KEY_BASE de Chatwoot** — Ya no tiene un valor estático. Requiere configuración explícita via variable de entorno.

## Documentación comunitaria

Para que WITHMIA funcione como un verdadero proyecto open source, creamos toda la documentación estándar:

| Archivo | Descripción |
|---|---|
| `.env.example` | 160+ variables documentadas por sección con valores por defecto |
| `README.md` | Documentación profesional con badges, stack técnico, arquitectura y quick start |
| `CONTRIBUTING.md` | Guía de contribución: workflow de PRs, convenciones de commits, setup de desarrollo |
| `CODE_OF_CONDUCT.md` | Contributor Covenant v2.1 en inglés |
| `SECURITY.md` | Política de vulnerabilidades con SLA de respuesta (24h/72h/7d) |
| `LICENSE` | Texto completo de AGPLv3 |

## Limpieza del repositorio

Además de las correcciones de seguridad, optimizamos el repositorio para ser un proyecto open source de calidad:

- `.gitignore` expandido para cubrir logs, vistas compiladas, cache y sesiones con patrón `.gitkeep`
- `composer.json` actualizado con nombre `withmia/withmia`, licencia `AGPL-3.0-or-later`, keywords y homepage
- `Dockerfile` mejorado con `mkdir -p` para garantizar directorios de storage en el container
- Script `init-databases.sql` creado para inicializar todas las bases de datos necesarias en PostgreSQL

## Breaking changes

> **Sin cambios para usuarios cloud**: Si usas WITHMIA en app.withmia.com, esta actualización es transparente. No requiere ninguna acción de tu parte.

Para desarrolladores que clonen el repositorio:

- Los defaults de config ya no apuntan a Railway — necesitas configurar `.env` para URLs de servicios
- `docker-compose.yml` requiere cambiar `POSTGRES_PASSWORD` antes de usar en producción
- El Google Client ID debe configurarse via `GOOGLE_CLIENT_ID` en `.env`

## Lo que viene

Esta es solo la primera piedra del WITHMIA open source. Lo que sigue:

- **Guías de self-hosting** detalladas para diferentes proveedores cloud
- **Plugin system** para extensiones comunitarias
- **GitHub Issues y Discussions** como canal principal de comunicación
- **Roadmap público** para que la comunidad vote y proponga features

WITHMIA nació como una idea para resolver el caos de la atención al cliente. Hoy, con el código abierto, esa misión le pertenece a todos.

**Star el repo, clona, contribuye.** Construyamos juntos. ⭐

[Ver el repositorio en GitHub →](https://github.com/withmiaapp-coder/withmia)
