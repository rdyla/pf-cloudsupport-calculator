# CloudSupport Calculator — Setup Guide

## 1. Azure App Registration (already created — just needs these configured)

In your App Registration:

- **Redirect URIs**: Add `http://localhost:5173` (dev) and `https://cloudsupport-calculator.<your-pages-domain>.workers.dev` (prod)
- **Expose an API**: Add scope `access_as_user` → full URI becomes `api://<client-id>/access_as_user`
- **App roles** (optional): Add roles named `admin` and `manager` — assign them to users in Azure to control permissions
- **API Permissions**: Add `Dynamics CRM → user_impersonation` and `Microsoft Graph → Sites.ReadWrite.All` (for SharePoint) → Grant admin consent

## 2. Cloudflare Resources

```bash
# Log in (opens browser)
npx wrangler login

# Create the D1 database
npx wrangler d1 create cloudsupport-calculator
# → Copy the database_id into wrangler.toml [[d1_databases]]

# Create the KV namespace
npx wrangler kv namespace create SESSION_KV
# → Copy the id into wrangler.toml [[kv_namespaces]]

# Apply the DB schema
npx wrangler d1 execute cloudsupport-calculator --remote --file=worker/src/db/schema.sql
```

## 3. Secrets (never go in wrangler.toml or git)

```bash
npx wrangler secret put AZURE_CLIENT_SECRET
# → Paste your Azure client secret when prompted
```

## 4. Non-secret variables (wrangler.toml [vars])

Edit `wrangler.toml` and fill in:
```toml
AZURE_TENANT_ID = "your-tenant-id"
AZURE_CLIENT_ID = "your-client-id"
DYNAMICS_URL    = "https://yourorg.crm.dynamics.com"
SHAREPOINT_SITE = "https://packetfusion.sharepoint.com/sites/sales"
```

## 5. Frontend env (local dev only)

```bash
cp frontend/.env.local.example frontend/.env.local
# Edit frontend/.env.local with your client/tenant IDs
```

## 6. Local development

```bash
# Terminal 1 — Worker API
npx wrangler dev --local

# Terminal 2 — React frontend (proxies /api to :8787)
cd frontend && npm run dev
```

Open http://localhost:5173 — you'll be redirected to Microsoft login.

## 7. Deploy to Cloudflare

```bash
npm run build   # builds frontend/dist
npx wrangler deploy
```
