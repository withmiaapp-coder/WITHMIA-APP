# Evolution API - Deployment Guide for Railway

## 🚀 Manual Setup Required

Evolution API needs to be deployed as a **separate service** in Railway.

### Steps to Deploy:

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Open your project**: WITHMIA
3. **Click "+ New"** → **"Empty Service"**
4. **Name it**: `evolution-api`

### Configure the Service:

#### **1. Settings → Deploy:**
- **Source**: Docker Image
- **Image**: `atendai/evolution-api:v2.1.1`

#### **2. Settings → Variables:**

Add these environment variables:

```env
# Server Configuration
SERVER_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
SERVER_PORT=8080

# API Security
AUTHENTICATION_API_KEY=withmia_evolution_2026_secure_key_$(date +%s)

# Database (Use Railway PostgreSQL)
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=${{DATABASE_URL}}

# Redis Cache (Optional but recommended)
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=${{REDIS_URL}}

# Webhook
WEBHOOK_GLOBAL_URL=https://app.withmia.com/api/evolution/webhook
WEBHOOK_GLOBAL_ENABLED=true

# Instance Settings
DEL_INSTANCE=false
DEL_TEMP_INSTANCES=true

# Chatwoot Integration
CHATWOOT_ENABLED=true

# Logs
LOG_LEVEL=INFO
LOG_COLOR=true
```

#### **3. Add PostgreSQL Database:**
- Click **"+ New"** → **"Database"** → **"PostgreSQL"**
- Railway will auto-inject `DATABASE_URL`

#### **4. Add Redis (Optional):**
- Click **"+ New"** → **"Database"** → **"Redis"**
- Railway will auto-inject `REDIS_URL`

#### **5. Generate Domain:**
- Go to **Settings** → **Networking** → **Generate Domain**
- Copy the domain (e.g., `evolution-api-production.up.railway.app`)

### After Deployment:

Update your main app's environment variables in Railway:

```env
EVOLUTION_API_URL=https://[your-evolution-domain].up.railway.app
EVOLUTION_API_KEY=withmia_evolution_2026_secure_key_[timestamp]
```

---

## 🔧 Alternative: One-Click Template

Use this Railway template:
https://railway.app/template/evolution-api

---

## ✅ Verification

After deployment, test the API:

```bash
curl https://[your-evolution-domain].up.railway.app/
```

You should see Evolution API welcome page.

---

## 📝 Notes

- Evolution API will be on a different subdomain
- Your main app will communicate via HTTP
- Webhooks will come to your app at `/api/evolution/webhook`
- Each company will have their own WhatsApp instance

---

**Current Status**: ⏳ Waiting for manual setup in Railway Dashboard
