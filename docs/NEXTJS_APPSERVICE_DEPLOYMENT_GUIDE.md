# Next.js 15 on Azure App Service - Complete Deployment Guide

This guide covers deploying a Next.js 15 application to Azure App Service with standalone output mode, including common issues and fixes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AZURE APP SERVICE DEPLOYMENT                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GitHub Repository                                                           │
│         │                                                                    │
│         │ Push to main branch                                                │
│         ▼                                                                    │
│  ┌─────────────────────┐                                                    │
│  │  GitHub Actions     │                                                    │
│  │  ─────────────────  │                                                    │
│  │  1. npm ci          │                                                    │
│  │  2. npm run build   │  (creates .next/standalone)                        │
│  │  3. Package app     │  (zip with correct structure)                      │
│  │  4. az webapp deploy│                                                    │
│  └──────────┬──────────┘                                                    │
│             │                                                                │
│             ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Azure App Service (Linux)                        │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                      │   │
│  │  Startup Command: node server.js                                     │   │
│  │                                                                      │   │
│  │  Directory Structure:                                                │   │
│  │  /home/site/wwwroot/                                                │   │
│  │  ├── server.js           ← Next.js standalone server                │   │
│  │  ├── package.json        ← Minimal dependencies                     │   │
│  │  ├── node_modules/       ← Production dependencies only             │   │
│  │  ├── public/             ← Static assets                            │   │
│  │  └── .next/                                                         │   │
│  │      ├── server/         ← Server-side code                         │   │
│  │      ├── static/         ← Static chunks (CSS, JS)                  │   │
│  │      ├── BUILD_ID        ← Build identifier                         │   │
│  │      └── *.json          ← Manifests                                │   │
│  │                                                                      │   │
│  │  Environment Variables:                                              │   │
│  │  ├── PORT=3000                                                      │   │
│  │  ├── WEBSITES_PORT=3000                                             │   │
│  │  └── [Your app env vars]                                            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. Next.js Configuration

Your `next.config.mjs` **MUST** have `output: "standalone"`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",  // CRITICAL - enables standalone build

  // Optional: Server actions
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Optional: Security headers
  async headers() {
    return [
      {
        source: "/((?!_next|api).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 2. Azure Resources

Create these resources:

```bash
# Variables
RESOURCE_GROUP="rg-your-app"
APP_NAME="your-app-frontend"
LOCATION="westeurope"
APP_PLAN="plan-your-app"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service Plan (Linux, P1V3 recommended for production)
az appservice plan create \
  --name $APP_PLAN \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku P1V3 \
  --is-linux

# Create Web App
az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_PLAN \
  --runtime "NODE:20-lts"

# Configure startup command
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --startup-file "node server.js"
```

---

## App Service Configuration

### Required Environment Variables

```bash
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    PORT=3000 \
    WEBSITES_PORT=3000 \
    NODE_ENV=production
```

| Variable | Value | Purpose |
|----------|-------|---------|
| `PORT` | `3000` | Next.js server listens on this port |
| `WEBSITES_PORT` | `3000` | Azure routes traffic to this port |
| `NODE_ENV` | `production` | Enables production optimizations |

### Optional: VNet Integration (for backend access)

If your frontend needs to access resources in a VNet (like a private backend):

```bash
# Enable VNet integration
az webapp vnet-integration add \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --vnet your-vnet \
  --subnet your-subnet

# Route ALL traffic through VNet (required to reach private endpoints)
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings WEBSITE_VNET_ROUTE_ALL=1

# If connecting to internal backend
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings BACKEND_URL="http://10.0.0.10"  # Internal IP
```

---

## Deployment Package Structure

### The Problem

Next.js standalone builds create a nested directory structure that mirrors your build machine:

```
.next/standalone/
└── Users/
    └── yourname/
        └── Projects/
            └── your-app/
                └── src/
                    ├── server.js      ← Need this
                    ├── package.json   ← Need this
                    ├── node_modules/  ← Need this
                    └── .next/         ← Need this
```

### The Solution

Extract files to a flat structure:

```
/deployment/
├── server.js           ← From standalone nested path
├── package.json        ← From standalone nested path
├── node_modules/       ← From standalone nested path
├── public/             ← From your src/public
└── .next/
    ├── server/         ← From standalone nested path
    ├── static/         ← From .next/static (NOT standalone!)
    ├── BUILD_ID
    └── *.json manifests
```

### Manual Deployment Script

```bash
#!/bin/bash
set -e

# Build
cd /path/to/your-app/src
npm ci
npm run build

# Find the standalone server.js (nested path)
SERVER_JS=$(find .next/standalone -type f -name "server.js" ! -path "*/node_modules/*" | head -1)
STANDALONE_PATH=$(dirname "$SERVER_JS")

echo "Found standalone at: $STANDALONE_PATH"

# Create deployment package
rm -rf /tmp/deploy && mkdir -p /tmp/deploy/.next

# Copy standalone files
cp "$STANDALONE_PATH/server.js" /tmp/deploy/
cp "$STANDALONE_PATH/package.json" /tmp/deploy/
cp -r "$STANDALONE_PATH/node_modules" /tmp/deploy/

# Copy .next server files
if [ -d "$STANDALONE_PATH/.next" ]; then
  cp -r "$STANDALONE_PATH/.next"/* /tmp/deploy/.next/
fi

# CRITICAL: Copy static files from build root (not standalone!)
cp -r .next/static /tmp/deploy/.next/static

# Copy public assets
mkdir -p /tmp/deploy/public
cp -r public/* /tmp/deploy/public/ 2>/dev/null || true

# Verify structure
echo "=== Deployment structure ==="
ls -la /tmp/deploy/
echo "=== .next contents ==="
ls -la /tmp/deploy/.next/

# Create zip and deploy
cd /tmp/deploy
zip -r /tmp/app.zip . -x "*.DS_Store"

az webapp deploy \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --src-path /tmp/app.zip \
  --type zip \
  --restart true
```

---

## GitHub Actions Workflow

### Complete Workflow File

Create `.github/workflows/deploy-frontend.yaml`:

```yaml
name: Deploy Frontend to App Service

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - '!src/**/*.md'
  workflow_dispatch:

# Required for OIDC authentication
permissions:
  id-token: write
  contents: read

env:
  AZURE_WEBAPP_NAME: your-app-frontend
  AZURE_RESOURCE_GROUP: rg-your-app
  NODE_VERSION: '20.x'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: src/package-lock.json

      - name: Install dependencies
        working-directory: ./src
        run: npm ci

      - name: Build application
        working-directory: ./src
        run: npm run build

      - name: Login to Azure (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Prepare deployment package
        working-directory: ./src
        run: |
          mkdir -p /tmp/deploy/.next

          # Find standalone server.js
          SERVER_JS=$(find .next/standalone -type f -name "server.js" ! -path "*/node_modules/*" | head -1)

          if [ -z "$SERVER_JS" ]; then
            echo "ERROR: server.js not found"
            exit 1
          fi

          STANDALONE_PATH=$(dirname "$SERVER_JS")
          echo "Standalone path: $STANDALONE_PATH"

          # Copy standalone files
          cp "$STANDALONE_PATH/server.js" /tmp/deploy/
          cp "$STANDALONE_PATH/package.json" /tmp/deploy/
          cp -r "$STANDALONE_PATH/node_modules" /tmp/deploy/

          # Copy .next server files
          if [ -d "$STANDALONE_PATH/.next" ]; then
            cp -r "$STANDALONE_PATH/.next"/* /tmp/deploy/.next/
          fi

          # CRITICAL: Static files from build root
          cp -r .next/static /tmp/deploy/.next/static

          # Public assets
          mkdir -p /tmp/deploy/public
          cp -r public/* /tmp/deploy/public/ 2>/dev/null || true

          # Create zip
          cd /tmp/deploy && zip -r /tmp/app.zip .

          # Debug output
          echo "=== Package contents ==="
          ls -la /tmp/deploy/

      - name: Deploy to Azure App Service
        run: |
          az webapp deploy \
            --resource-group ${{ env.AZURE_RESOURCE_GROUP }} \
            --name ${{ env.AZURE_WEBAPP_NAME }} \
            --src-path /tmp/app.zip \
            --type zip \
            --restart true

      - name: Verify deployment
        run: |
          sleep 30
          curl -s "https://${{ env.AZURE_WEBAPP_NAME }}.azurewebsites.net" -m 30 || echo "App starting..."
```

### GitHub Secrets Required

Set these in your repository Settings → Secrets → Actions:

| Secret | Description | How to Get |
|--------|-------------|------------|
| `AZURE_CLIENT_ID` | App Registration Client ID | Azure Portal → App Registrations |
| `AZURE_TENANT_ID` | Azure AD Tenant ID | Azure Portal → Azure Active Directory |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID | Azure Portal → Subscriptions |

### Setting Up OIDC Authentication (No Expiring Secrets!)

```bash
# 1. Create App Registration
az ad app create --display-name "github-your-app-deploy"

# Get the App ID
APP_ID=$(az ad app list --display-name "github-your-app-deploy" --query "[0].appId" -o tsv)

# 2. Create Service Principal
az ad sp create --id $APP_ID

# 3. Assign Contributor role to resource group
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/rg-your-app

# 4. Create Federated Credential
az ad app federated-credential create --id $APP_ID --parameters '{
  "name": "github-main-branch",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:YOUR_GITHUB_ORG/YOUR_REPO:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

---

## Common Issues & Fixes

### Issue 1: "Application Error" on startup

**Symptoms:** Browser shows "Application Error" or blank page

**Cause:** Missing files or wrong startup command

**Fix:**
```bash
# Check startup command
az webapp config show --name $APP_NAME --resource-group $RESOURCE_GROUP --query linuxFxVersion

# Set correct startup
az webapp config set --name $APP_NAME --resource-group $RESOURCE_GROUP \
  --startup-file "node server.js"

# Check if PORT is set
az webapp config appsettings list --name $APP_NAME --resource-group $RESOURCE_GROUP | grep PORT
```

### Issue 2: Static assets (CSS/JS) return 404

**Symptoms:** Page loads but looks broken, console shows 404 for `/_next/static/*`

**Cause:** Static files not copied from correct location

**Fix:** Make sure you copy `.next/static` from the **build root**, NOT from standalone:

```bash
# WRONG
cp -r .next/standalone/.../src/.next/static /tmp/deploy/.next/static

# CORRECT
cp -r .next/static /tmp/deploy/.next/static
```

### Issue 3: API routes return 500 errors

**Symptoms:** `/api/*` routes fail

**Cause:** Missing environment variables or backend unreachable

**Fix:**
```bash
# Check logs
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP

# Verify env vars
az webapp config appsettings list --name $APP_NAME --resource-group $RESOURCE_GROUP -o table
```

### Issue 4: VNet backend unreachable

**Symptoms:** Frontend can't reach internal backend IP

**Cause:** VNet routing not enabled

**Fix:**
```bash
# Enable VNet route all
az webapp config appsettings set --name $APP_NAME --resource-group $RESOURCE_GROUP \
  --settings WEBSITE_VNET_ROUTE_ALL=1

# Restart
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP
```

### Issue 5: Build fails - "server.js not found"

**Symptoms:** GitHub Actions fails at package step

**Cause:** `output: "standalone"` missing in next.config.mjs

**Fix:** Add to next.config.mjs:
```javascript
const nextConfig = {
  output: "standalone",
  // ...
};
```

### Issue 6: Slow cold starts

**Symptoms:** First request takes 10-30 seconds

**Cause:** App Service needs to start Node.js process

**Fix:**
- Use P1V3 or higher plan (not B1/B2)
- Enable "Always On" in App Service configuration
- Use health check endpoint to keep app warm

```bash
# Enable Always On
az webapp config set --name $APP_NAME --resource-group $RESOURCE_GROUP \
  --always-on true

# Configure health check
az webapp config set --name $APP_NAME --resource-group $RESOURCE_GROUP \
  --generic-configurations '{"healthCheckPath": "/api/health"}'
```

---

## Verification Checklist

After deployment, verify:

```bash
# 1. Health check
curl -s "https://$APP_NAME.azurewebsites.net" | head -20

# 2. Static assets load
curl -sI "https://$APP_NAME.azurewebsites.net/_next/static/chunks/main.js" | grep HTTP

# 3. API routes work
curl -s "https://$APP_NAME.azurewebsites.net/api/health"

# 4. Check logs for errors
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP
```

---

## Configuration Reference

### App Service Settings

| Setting | Value | Notes |
|---------|-------|-------|
| Runtime | `NODE:20-lts` | Node.js 20 LTS |
| Startup Command | `node server.js` | Next.js standalone entry |
| `PORT` | `3000` | Must match Next.js default |
| `WEBSITES_PORT` | `3000` | Azure port mapping |
| `NODE_ENV` | `production` | Production mode |
| `WEBSITE_VNET_ROUTE_ALL` | `1` | For VNet integration |

### Deployment Package Structure

```
wwwroot/
├── server.js           # Entry point (from standalone)
├── package.json        # Dependencies manifest
├── node_modules/       # Production dependencies
├── public/             # Static public assets
└── .next/
    ├── server/         # Server-side bundles
    ├── static/         # Client-side chunks
    ├── BUILD_ID        # Build identifier
    ├── build-manifest.json
    ├── prerender-manifest.json
    └── routes-manifest.json
```

---

## Quick Commands Reference

```bash
# Deploy
az webapp deploy --resource-group $RG --name $APP --src-path /tmp/app.zip --type zip --restart true

# Restart
az webapp restart --resource-group $RG --name $APP

# View logs
az webapp log tail --resource-group $RG --name $APP

# Check settings
az webapp config appsettings list --resource-group $RG --name $APP -o table

# Update setting
az webapp config appsettings set --resource-group $RG --name $APP --settings KEY=value

# SSH into container
az webapp ssh --resource-group $RG --name $APP
```

---

## Dependencies (package.json)

Example production dependencies for Next.js 15:

```json
{
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

The standalone build includes only necessary dependencies in `node_modules`.

---

**Need help?** Check Azure App Service logs:
```bash
az webapp log tail --name YOUR_APP --resource-group YOUR_RG
```
