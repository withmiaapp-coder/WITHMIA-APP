<p align="center">
  <img src="public/icons/logo-withmia.png" alt="Withmia" width="200">
</p>

<h3 align="center">AI-Powered Customer Service Platform for Latin American SMBs</h3>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPLv3-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/laravel-12-red.svg" alt="Laravel">
  <img src="https://img.shields.io/badge/react-19-blue.svg" alt="React">
  <img src="https://img.shields.io/badge/php-8.3+-purple.svg" alt="PHP">
</p>

---

**Withmia** is an open-source, multi-tenant AI customer service and sales platform. It provides a white-label AI chatbot assistant that handles customer conversations via **WhatsApp**, with built-in **CRM**, **knowledge management (RAG)**, **appointment scheduling**, and **e-commerce** capabilities.

> Built with love in Chile for Latin American businesses.

## Features

- **AI Assistant (WITHMIA)** - GPT-powered assistant with per-company personality, RAG knowledge base, and conversation memory
- **WhatsApp Integration** - Connect via Evolution API with QR code pairing
- **Multi-Tenant** - Each company gets isolated Chatwoot account, Qdrant collection, n8n workflow, and WhatsApp instance
- **Knowledge Base (RAG)** - Upload PDFs and documents, automatic chunking and vector search via Qdrant + OpenAI embeddings
- **Sales Pipeline** - Kanban-style pipelines with contacts, values, priorities, and assignments
- **Product Catalog** - Product management with WooCommerce sync and bot-driven sales
- **Calendar Hub** - Unified scheduling across Google Calendar, Outlook, Calendly, Reservo, AgendaPro, Dentalink, and Medilink
- **Team Management** - Role-based access (admin, agent) with granular permissions
- **Real-time Chat** - Live conversation interface powered by Laravel Reverb WebSockets
- **Multi-Channel** - WhatsApp, Web Widget, Facebook Messenger, Instagram, Email
- **Billing** - Subscription management with Flow.cl (Chilean payment gateway)
- **One-Click Onboarding** - Automated provisioning of all services per company


## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Laravel 12 + PHP 8.3 |
| Frontend | React 19 + TypeScript + Inertia.js |
| Database | PostgreSQL |
| Cache/Queue | Redis |
| AI | OpenAI GPT + text-embedding-3-small |
| Vector DB | Qdrant |
| Messaging | Chatwoot + Evolution API (WhatsApp) |
| Workflows | n8n |
| WebSockets | Laravel Reverb |
| Server | RoadRunner (Laravel Octane) |

## Architecture

`
User (WhatsApp) --> Evolution API --> Chatwoot --> n8n Workflow
                                                      |
                                            OpenAI GPT + Qdrant RAG
                                                      |
                                              Response --> User
                                              
Admin Dashboard (React) --> Laravel API --> PostgreSQL
                                       --> Redis (cache/queue/memory)
                                       --> Qdrant (knowledge vectors)
`


## Prerequisites

- PHP 8.3+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Composer 2+
- [Chatwoot](https://www.chatwoot.com/) (self-hosted)
- [Evolution API](https://github.com/EvolutionAPI/evolution-api) (WhatsApp)
- [n8n](https://n8n.io/) (self-hosted)
- [Qdrant](https://qdrant.tech/) (vector database)
- OpenAI API key

## Quick Start

### 1. Clone the repository

`ash
git clone https://github.com/withmiaapp-coder/WITHMIA-APP.git
cd WITHMIA-APP
`

### 2. Install dependencies

`ash
composer install
npm install
`

### 3. Configure environment

`ash
cp .env.example .env
php artisan key:generate
`

Edit `.env` with your database, Redis, and service credentials.

### 4. Run migrations

`ash
php artisan migrate
`

### 5. Build frontend

`ash
npm run build
`

### 6. Start the server

`ash
php artisan octane:start --server=roadrunner --host=0.0.0.0 --port=8080
`


## Docker (Self-Hosting)

`ash
docker compose up -d
`

See `docker-compose.yml` for the full stack: PostgreSQL, Redis, Chatwoot, Evolution API, n8n, Qdrant, and Withmia.

## Project Structure

`
app/
  Models/         # Eloquent models (Company, User, WhatsAppInstance, etc.)
  Services/       # Business logic (Chatwoot, Evolution, n8n, Qdrant, Flow)
  Http/Controllers/  # API & web controllers
  Jobs/           # Background jobs (onboarding, provisioning)
  Events/         # Real-time events (new messages, assignments)
resources/
  js/pages/       # React pages (Dashboard, Conversations, Training, etc.)
  js/components/  # Reusable React components
config/           # Service configuration files
database/
  migrations/     # Database schema
workflows/        # n8n workflow templates
`

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

If you discover a security vulnerability, please see [SECURITY.md](SECURITY.md).

## License

Withmia is open-source software licensed under the [GNU Affero General Public License v3.0](LICENSE).

## Community

- Website: [withmia.com](https://withmia.com)
- Issues: [GitHub Issues](https://github.com/withmiaapp-coder/WITHMIA-APP/issues)
- Discussions: [GitHub Discussions](https://github.com/withmiaapp-coder/WITHMIA-APP/discussions)

---

<p align="center">Made with love in Chile</p>
