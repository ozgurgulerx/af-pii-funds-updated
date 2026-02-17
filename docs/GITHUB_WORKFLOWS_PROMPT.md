# GitHub Actions CI/CD Implementation Guide

Complete guide for setting up GitHub Actions CI/CD with Azure OIDC authentication. This document covers common deployment issues and their solutions.

---

## PROMPT START

Set up **GitHub Actions CI/CD** for an Azure-deployed application with:
- OIDC authentication (no expiring secrets)
- Backend deployment to Azure Kubernetes Service (AKS)
- Frontend deployment to Azure App Service
- Infrastructure health monitoring
- Database migration workflow

---

## Prerequisites Checklist

Before setting up workflows, ensure these Azure resources exist:

```
□ Azure Container Registry (ACR) created
□ AKS cluster created and running
□ App Service created with VNet integration
□ PostgreSQL server created (if using database)
□ Azure OpenAI deployed with models
□ Azure AI Search created with indexes
□ PII container deployed (if using PII detection)
□ VNet with proper subnets configured
□ Private endpoints created (PostgreSQL)
```

---

## Part 1: Azure OIDC Setup (Critical)

OIDC (OpenID Connect) allows GitHub Actions to authenticate with Azure without storing long-lived secrets. This is the most common source of deployment failures.

### Step 1: Create App Registration

```bash
# Create the App Registration
az ad app create --display-name "github-{app-name}-deploy"

# Get the Application (client) ID and Object ID
APP_ID=$(az ad app list --display-name "github-{app-name}-deploy" --query "[0].appId" -o tsv)
OBJECT_ID=$(az ad app list --display-name "github-{app-name}-deploy" --query "[0].id" -o tsv)

echo "Application (client) ID: $APP_ID"
echo "Object ID: $OBJECT_ID"

# Store these - you'll need them for GitHub secrets
```

### Step 2: Create Service Principal

```bash
# Create service principal for the app registration
az ad sp create --id $APP_ID

# Verify it was created
az ad sp show --id $APP_ID --query "displayName" -o tsv
```

### Step 3: Assign Roles to Resource Groups

**This is where most deployments fail!** The service principal needs Contributor access to ALL resource groups it touches.

```bash
# Get your subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Assign Contributor role to MAIN resource group (AKS, App Service, VNet)
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-{app-name}

# Assign Contributor role to SHARED resource group (if different)
# This is needed for ACR, PostgreSQL, OpenAI, Search, etc.
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-{shared-name}

# If PostgreSQL is in a different resource group, add that too
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-{database-rg}

# Verify role assignments
az role assignment list --assignee $APP_ID --output table
```

**Common Mistake:** Only assigning roles to one resource group when resources span multiple groups.

### Step 4: Create Federated Credential

```bash
# Create federated credential for GitHub Actions
# IMPORTANT: Replace {github-org} and {repo-name} with your actual values

az ad app federated-credential create --id $OBJECT_ID --parameters '{
  "name": "github-main-branch",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:{github-org}/{repo-name}:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Verify the credential was created
az ad app federated-credential list --id $OBJECT_ID --query "[].{name:name, subject:subject}" -o table
```

**Subject Format Reference:**

| Scenario | Subject Format |
|----------|----------------|
| Push to main branch | `repo:{org}/{repo}:ref:refs/heads/main` |
| Push to any branch | `repo:{org}/{repo}:ref:refs/heads/*` |
| Pull request | `repo:{org}/{repo}:pull_request` |
| Environment (e.g., production) | `repo:{org}/{repo}:environment:production` |
| Manual workflow dispatch | `repo:{org}/{repo}:ref:refs/heads/main` |

### Step 5: Get Values for GitHub Secrets

```bash
# Application (client) ID - already have this
echo "AZURE_CLIENT_ID: $APP_ID"

# Tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "AZURE_TENANT_ID: $TENANT_ID"

# Subscription ID
echo "AZURE_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
```

---

## Part 2: GitHub Secrets Configuration

### Required Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

| Secret Name | Value | Source |
|-------------|-------|--------|
| `AZURE_CLIENT_ID` | App Registration Application ID | `az ad app list --display-name "github-..." --query "[0].appId"` |
| `AZURE_TENANT_ID` | Azure AD Tenant ID | `az account show --query tenantId` |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID | `az account show --query id` |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | `az cognitiveservices account keys list --name {aoai-name} --resource-group {rg}` |
| `AZURE_SEARCH_ADMIN_KEY` | Azure AI Search admin key | `az search admin-key show --service-name {search-name} --resource-group {rg}` |
| `PGPASSWORD` | PostgreSQL password | Your database password |

### Optional Secrets (for database migration)

| Secret Name | Value |
|-------------|-------|
| `PGHOST` | `{db-name}.postgres.database.azure.com` |
| `PGPORT` | `5432` |
| `PGDATABASE` | Database name |
| `PGUSER` | Database username |

### Verification Script

Run this to verify all required values are available:

```bash
#!/bin/bash
echo "=== Verifying GitHub Secrets Values ==="

# OIDC Values
APP_NAME="github-{app-name}-deploy"
APP_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv)

if [ -z "$APP_ID" ]; then
  echo "❌ App Registration not found: $APP_NAME"
  exit 1
fi
echo "✅ AZURE_CLIENT_ID: $APP_ID"

TENANT_ID=$(az account show --query tenantId -o tsv)
echo "✅ AZURE_TENANT_ID: $TENANT_ID"

SUB_ID=$(az account show --query id -o tsv)
echo "✅ AZURE_SUBSCRIPTION_ID: $SUB_ID"

# Check role assignments
echo ""
echo "=== Role Assignments ==="
az role assignment list --assignee $APP_ID --query "[].{scope:scope, role:roleDefinitionName}" -o table

# Check federated credentials
echo ""
echo "=== Federated Credentials ==="
OBJECT_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].id" -o tsv)
az ad app federated-credential list --id $OBJECT_ID --query "[].{name:name, subject:subject}" -o table

# Service keys
echo ""
echo "=== Service Keys (verify these exist) ==="

# Azure OpenAI
AOAI_KEY=$(az cognitiveservices account keys list --name {aoai-name} --resource-group {rg} --query key1 -o tsv 2>/dev/null)
if [ -n "$AOAI_KEY" ]; then
  echo "✅ AZURE_OPENAI_API_KEY: ${AOAI_KEY:0:10}..."
else
  echo "❌ AZURE_OPENAI_API_KEY: Not found"
fi

# Azure Search
SEARCH_KEY=$(az search admin-key show --service-name {search-name} --resource-group {rg} --query primaryKey -o tsv 2>/dev/null)
if [ -n "$SEARCH_KEY" ]; then
  echo "✅ AZURE_SEARCH_ADMIN_KEY: ${SEARCH_KEY:0:10}..."
else
  echo "❌ AZURE_SEARCH_ADMIN_KEY: Not found"
fi
```

---

## Part 3: Backend Deployment Workflow

### File: `.github/workflows/deploy-backend.yaml`

```yaml
name: Deploy Backend to AKS

on:
  push:
    branches: [main]
    paths:
      # Trigger on backend code changes
      - 'src/api_server.py'
      - 'src/unified_retriever.py'
      - 'src/query_router.py'
      - 'src/sql_generator.py'
      - 'src/pii_filter.py'
      - 'src/*.py'
      - 'requirements.txt'
      - 'Dockerfile.backend'
      - 'k8s/**'
  workflow_dispatch:  # Manual trigger

# CRITICAL: Required for OIDC authentication
permissions:
  id-token: write   # Required for OIDC token request
  contents: read    # Required to checkout code

env:
  # Azure Container Registry
  AZURE_CONTAINER_REGISTRY: {acrname}.azurecr.io
  ACR_NAME: {acrname}  # Without .azurecr.io for az acr login

  # Image configuration
  IMAGE_NAME: {app-name}-backend

  # AKS configuration
  AKS_CLUSTER: aks-{app-name}
  AKS_RESOURCE_GROUP: rg-{app-name}
  NAMESPACE: {namespace}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Login to Azure (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Login to Azure Container Registry
        run: az acr login --name ${{ env.ACR_NAME }}

      - name: Build and push Docker image
        run: |
          # Build with commit SHA tag for traceability
          docker build -f Dockerfile.backend \
            -t ${{ env.AZURE_CONTAINER_REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -t ${{ env.AZURE_CONTAINER_REGISTRY }}/${{ env.IMAGE_NAME }}:latest \
            .

          # Push both tags
          docker push ${{ env.AZURE_CONTAINER_REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          docker push ${{ env.AZURE_CONTAINER_REGISTRY }}/${{ env.IMAGE_NAME }}:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Login to Azure (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Get AKS credentials
        run: |
          az aks get-credentials \
            --resource-group ${{ env.AKS_RESOURCE_GROUP }} \
            --name ${{ env.AKS_CLUSTER }} \
            --overwrite-existing

      - name: Create namespace if not exists
        run: kubectl apply -f k8s/namespace.yaml

      - name: Create ACR pull secret
        run: |
          # Get ACR credentials
          ACR_USERNAME=$(az acr credential show --name ${{ env.ACR_NAME }} --query username -o tsv)
          ACR_PASSWORD=$(az acr credential show --name ${{ env.ACR_NAME }} --query "passwords[0].value" -o tsv)

          # Create or update pull secret
          kubectl create secret docker-registry acr-secret \
            --namespace=${{ env.NAMESPACE }} \
            --docker-server=${{ env.AZURE_CONTAINER_REGISTRY }} \
            --docker-username=$ACR_USERNAME \
            --docker-password=$ACR_PASSWORD \
            --dry-run=client -o yaml | kubectl apply -f -

      - name: Create/Update application secrets
        run: |
          kubectl create secret generic backend-secrets \
            --namespace=${{ env.NAMESPACE }} \
            --from-literal=AZURE_OPENAI_API_KEY=${{ secrets.AZURE_OPENAI_API_KEY }} \
            --from-literal=AZURE_SEARCH_ADMIN_KEY=${{ secrets.AZURE_SEARCH_ADMIN_KEY }} \
            --from-literal=PGPASSWORD=${{ secrets.PGPASSWORD }} \
            --dry-run=client -o yaml | kubectl apply -f -

      - name: Apply Kubernetes manifests
        run: |
          kubectl apply -f k8s/backend-configmap.yaml
          kubectl apply -f k8s/backend-service.yaml
          kubectl apply -f k8s/backend-deployment.yaml

      - name: Update deployment image
        run: |
          kubectl set image deployment/${{ env.IMAGE_NAME }} \
            backend=${{ env.AZURE_CONTAINER_REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            --namespace=${{ env.NAMESPACE }}

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/${{ env.IMAGE_NAME }} \
            --namespace=${{ env.NAMESPACE }} \
            --timeout=300s

      - name: Verify deployment
        run: |
          echo "=== Pod Status ==="
          kubectl get pods -n ${{ env.NAMESPACE }} -l app=${{ env.IMAGE_NAME }}

          echo ""
          echo "=== Services ==="
          kubectl get svc -n ${{ env.NAMESPACE }}

          echo ""
          echo "=== Recent Pod Logs ==="
          kubectl logs -n ${{ env.NAMESPACE }} -l app=${{ env.IMAGE_NAME }} --tail=20 || true
```

---

## Part 4: Frontend Deployment Workflow

### File: `.github/workflows/deploy-frontend.yaml`

```yaml
name: Deploy Frontend to App Service

on:
  push:
    branches: [main]
    paths:
      - 'src/app/**'
      - 'src/components/**'
      - 'src/lib/**'
      - 'src/hooks/**'
      - 'src/types/**'
      - 'src/data/**'
      - 'src/package.json'
      - 'src/package-lock.json'
      - 'src/next.config.mjs'
      - 'src/tailwind.config.ts'
      - 'src/tsconfig.json'
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

env:
  AZURE_WEBAPP_NAME: {app-name}-frontend
  AZURE_RESOURCE_GROUP: rg-{app-name}
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
        env:
          # Add any build-time environment variables here
          NEXT_TELEMETRY_DISABLED: 1

      - name: Login to Azure (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Prepare deployment package
        working-directory: ./src
        run: |
          # Create deployment directory structure
          mkdir -p /tmp/deploy/.next

          echo "=== Finding standalone output ==="
          # Next.js standalone output path varies based on build machine
          find .next/standalone -type f -name "server.js" | head -5

          # Find server.js (excluding node_modules copies)
          SERVER_JS=$(find .next/standalone -type f -name "server.js" ! -path "*/node_modules/*" | head -1)

          if [ -z "$SERVER_JS" ]; then
            echo "❌ ERROR: server.js not found in standalone output"
            echo "Contents of .next/standalone:"
            ls -la .next/standalone/
            exit 1
          fi

          STANDALONE_PATH=$(dirname "$SERVER_JS")
          echo "✅ Found standalone path: $STANDALONE_PATH"

          # Copy standalone files
          cp "$STANDALONE_PATH/server.js" /tmp/deploy/
          cp "$STANDALONE_PATH/package.json" /tmp/deploy/

          # Copy node_modules (only production dependencies)
          if [ -d "$STANDALONE_PATH/node_modules" ]; then
            cp -r "$STANDALONE_PATH/node_modules" /tmp/deploy/
          fi

          # Copy .next server files
          if [ -d "$STANDALONE_PATH/.next" ]; then
            cp -r "$STANDALONE_PATH/.next"/* /tmp/deploy/.next/
          fi

          # CRITICAL: Copy static files from build root (not standalone)
          if [ -d ".next/static" ]; then
            cp -r .next/static /tmp/deploy/.next/static
          else
            echo "❌ ERROR: .next/static not found"
            exit 1
          fi

          # Copy public assets
          mkdir -p /tmp/deploy/public
          if [ -d "public" ]; then
            cp -r public/* /tmp/deploy/public/ 2>/dev/null || true
          fi

          # Create deployment zip
          cd /tmp/deploy
          zip -r /tmp/app.zip . -x "*.DS_Store" -x "*.git*"

          # Verify package contents
          echo ""
          echo "=== Deployment package contents ==="
          ls -la /tmp/deploy/
          echo ""
          echo "=== .next directory ==="
          ls -la /tmp/deploy/.next/
          echo ""
          echo "=== Package size ==="
          du -sh /tmp/app.zip

      - name: Deploy to Azure App Service
        run: |
          az webapp deploy \
            --resource-group ${{ env.AZURE_RESOURCE_GROUP }} \
            --name ${{ env.AZURE_WEBAPP_NAME }} \
            --src-path /tmp/app.zip \
            --type zip \
            --restart true \
            --clean true

      - name: Wait for deployment
        run: |
          echo "Waiting for App Service to restart..."
          sleep 45

      - name: Verify deployment
        run: |
          MAX_RETRIES=5
          RETRY_INTERVAL=15

          for i in $(seq 1 $MAX_RETRIES); do
            echo "Attempt $i of $MAX_RETRIES..."

            RESPONSE=$(curl -s -X POST \
              "https://${{ env.AZURE_WEBAPP_NAME }}.azurewebsites.net/api/pii" \
              -H "Content-Type: application/json" \
              -d '{"text":"test"}' \
              -m 30 || echo "CURL_FAILED")

            if echo "$RESPONSE" | grep -q "blocked"; then
              echo "✅ Deployment verified - API responding correctly"
              exit 0
            else
              echo "Response: $RESPONSE"
              if [ "$i" -lt "$MAX_RETRIES" ]; then
                echo "Waiting $RETRY_INTERVAL seconds before retry..."
                sleep $RETRY_INTERVAL
              fi
            fi
          done

          echo "⚠️ Warning: Deployment verification failed after $MAX_RETRIES attempts"
          echo "Check App Service logs for details"
          # Don't fail the workflow, app might just need more time
```

---

## Part 5: Infrastructure Health Check Workflow

### File: `.github/workflows/infra-health-check.yaml`

```yaml
name: Infrastructure Health Check

on:
  schedule:
    # Run every 30 minutes to keep services alive
    - cron: '*/30 * * * *'
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

env:
  AKS_CLUSTER: aks-{app-name}
  AKS_RESOURCE_GROUP: rg-{app-name}
  POSTGRES_SERVER: {db-name}
  POSTGRES_RESOURCE_GROUP: rg-{shared-name}
  NAMESPACE: {namespace}

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Login to Azure (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Check and Start PostgreSQL
        id: postgres
        run: |
          STATE=$(az postgres flexible-server show \
            --name ${{ env.POSTGRES_SERVER }} \
            --resource-group ${{ env.POSTGRES_RESOURCE_GROUP }} \
            --query state -o tsv 2>/dev/null || echo "NotFound")

          echo "PostgreSQL state: $STATE"
          echo "initial_state=$STATE" >> $GITHUB_OUTPUT

          if [ "$STATE" = "Stopped" ]; then
            echo "::warning::PostgreSQL is stopped, starting..."
            az postgres flexible-server start \
              --name ${{ env.POSTGRES_SERVER }} \
              --resource-group ${{ env.POSTGRES_RESOURCE_GROUP }}
            echo "started=true" >> $GITHUB_OUTPUT
          else
            echo "PostgreSQL is $STATE"
            echo "started=false" >> $GITHUB_OUTPUT
          fi

      - name: Check and Start AKS
        id: aks
        run: |
          STATE=$(az aks show \
            --resource-group ${{ env.AKS_RESOURCE_GROUP }} \
            --name ${{ env.AKS_CLUSTER }} \
            --query powerState.code -o tsv 2>/dev/null || echo "NotFound")

          echo "AKS power state: $STATE"
          echo "initial_state=$STATE" >> $GITHUB_OUTPUT

          if [ "$STATE" = "Stopped" ]; then
            echo "::warning::AKS is stopped, starting..."
            az aks start \
              --resource-group ${{ env.AKS_RESOURCE_GROUP }} \
              --name ${{ env.AKS_CLUSTER }}
            echo "started=true" >> $GITHUB_OUTPUT
          else
            echo "AKS is $STATE"
            echo "started=false" >> $GITHUB_OUTPUT
          fi

      - name: Wait for services to stabilize
        run: |
          if [ "${{ steps.aks.outputs.started }}" = "true" ] || \
             [ "${{ steps.postgres.outputs.started }}" = "true" ]; then
            echo "Services were started, waiting 120 seconds for stabilization..."
            sleep 120
          else
            echo "Services already running, waiting 30 seconds..."
            sleep 30
          fi

      - name: Get AKS credentials and verify pods
        run: |
          az aks get-credentials \
            --resource-group ${{ env.AKS_RESOURCE_GROUP }} \
            --name ${{ env.AKS_CLUSTER }} \
            --overwrite-existing

          echo "=== Checking pods in ${{ env.NAMESPACE }} namespace ==="
          kubectl get pods -n ${{ env.NAMESPACE }}

          # Count pods not in Running state
          NOT_RUNNING=$(kubectl get pods -n ${{ env.NAMESPACE }} --no-headers 2>/dev/null | grep -v Running | wc -l || echo "0")
          if [ "$NOT_RUNNING" -gt 0 ]; then
            echo "::warning::$NOT_RUNNING pods are not in Running state"
          fi

      - name: Test backend health (with retries)
        run: |
          # Get internal LoadBalancer IP
          INTERNAL_IP=$(kubectl get svc {app-name}-backend-internal -n ${{ env.NAMESPACE }} \
            -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

          # Fallback to public LoadBalancer for testing
          PUBLIC_IP=$(kubectl get svc {app-name}-backend-lb -n ${{ env.NAMESPACE }} \
            -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

          echo "Internal LB IP: $INTERNAL_IP"
          echo "Public LB IP: $PUBLIC_IP"

          if [ -n "$PUBLIC_IP" ]; then
            MAX_RETRIES=5
            for i in $(seq 1 $MAX_RETRIES); do
              echo "Health check attempt $i of $MAX_RETRIES..."

              HEALTH=$(curl -s -o /dev/null -w "%{http_code}" \
                "http://$PUBLIC_IP/health" \
                --connect-timeout 10 || echo "000")

              if [ "$HEALTH" = "200" ]; then
                echo "✅ Backend health check passed"
                break
              else
                echo "Health check returned: $HEALTH"
                if [ "$i" -lt "$MAX_RETRIES" ]; then
                  sleep 15
                fi
              fi
            done

            if [ "$HEALTH" != "200" ]; then
              echo "::warning::Backend health check failed (status: $HEALTH)"
            fi
          else
            echo "::warning::No LoadBalancer IP available"
          fi

      - name: Test PII container
        run: |
          PII_ENDPOINT="http://pii-{name}.{region}.azurecontainer.io:5000"

          RESPONSE=$(curl -s -X POST \
            "$PII_ENDPOINT/language/:analyze-text?api-version=2023-04-01" \
            -H "Content-Type: application/json" \
            -d '{
              "kind": "PiiEntityRecognition",
              "parameters": {"modelVersion": "latest"},
              "analysisInput": {
                "documents": [{"id": "1", "language": "en", "text": "test"}]
              }
            }' \
            --connect-timeout 10 || echo '{"error":"timeout"}')

          if echo "$RESPONSE" | grep -q "error"; then
            echo "::warning::PII container may be unavailable"
            echo "Response: $RESPONSE"
          else
            echo "✅ PII container is responding"
          fi

      - name: Summary
        if: always()
        run: |
          echo "## Infrastructure Health Check Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Component | Initial State | Action |" >> $GITHUB_STEP_SUMMARY
          echo "|-----------|---------------|--------|" >> $GITHUB_STEP_SUMMARY

          PG_STATE="${{ steps.postgres.outputs.initial_state }}"
          PG_STARTED="${{ steps.postgres.outputs.started }}"
          AKS_STATE="${{ steps.aks.outputs.initial_state }}"
          AKS_STARTED="${{ steps.aks.outputs.started }}"

          if [ "$PG_STARTED" = "true" ]; then
            echo "| PostgreSQL | $PG_STATE | ✅ Started |" >> $GITHUB_STEP_SUMMARY
          else
            echo "| PostgreSQL | $PG_STATE | Already running |" >> $GITHUB_STEP_SUMMARY
          fi

          if [ "$AKS_STARTED" = "true" ]; then
            echo "| AKS | $AKS_STATE | ✅ Started |" >> $GITHUB_STEP_SUMMARY
          else
            echo "| AKS | $AKS_STATE | Already running |" >> $GITHUB_STEP_SUMMARY
          fi
```

---

## Part 6: Common Deployment Issues and Solutions

### Issue 1: "OIDC token request failed"

**Symptoms:**
```
Error: AADSTS700024: Client assertion is not within its valid time range.
```

**Causes:**
1. Federated credential subject doesn't match the workflow trigger
2. App Registration doesn't have a service principal

**Solution:**
```bash
# Verify federated credential subject matches your workflow
az ad app federated-credential list --id $OBJECT_ID

# For workflows triggered by push to main, subject should be:
# repo:{org}/{repo}:ref:refs/heads/main

# Recreate if needed
az ad app federated-credential delete --id $OBJECT_ID --federated-credential-id {cred-id}
az ad app federated-credential create --id $OBJECT_ID --parameters '{
  "name": "github-main-branch",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:{org}/{repo}:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

### Issue 2: "Authorization failed" or "Access denied"

**Symptoms:**
```
The client '{app-id}' with object id '{object-id}' does not have authorization
to perform action 'Microsoft.ContainerRegistry/registries/push/write'
```

**Causes:**
1. Service principal missing Contributor role
2. Role assigned to wrong resource group

**Solution:**
```bash
# List current role assignments
az role assignment list --assignee $APP_ID --output table

# Add Contributor role to ALL required resource groups
az role assignment create --assignee $APP_ID --role Contributor \
  --scope /subscriptions/{sub-id}/resourceGroups/rg-{app-name}

az role assignment create --assignee $APP_ID --role Contributor \
  --scope /subscriptions/{sub-id}/resourceGroups/rg-{shared-services}

# For ACR specifically, you might need AcrPush role
az role assignment create --assignee $APP_ID --role AcrPush \
  --scope /subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.ContainerRegistry/registries/{acr-name}
```

### Issue 3: Deployment stalls at "Wait for rollout"

**Symptoms:**
```
Waiting for deployment "app-backend" rollout to finish: 0 of 2 updated replicas are available...
```

**Causes:**
1. Image pull fails (ACR auth issue)
2. Pods crashing (missing secrets, bad config)
3. Health checks failing
4. Resource limits too low

**Solution:**
```bash
# Check pod status
kubectl get pods -n {namespace}

# Check pod events for errors
kubectl describe pod -n {namespace} -l app={app-name}-backend

# Check pod logs
kubectl logs -n {namespace} -l app={app-name}-backend --tail=50

# Common fixes:

# 1. Recreate ACR secret
kubectl delete secret acr-secret -n {namespace}
kubectl create secret docker-registry acr-secret \
  --namespace={namespace} \
  --docker-server={acr-name}.azurecr.io \
  --docker-username=$(az acr credential show --name {acr-name} --query username -o tsv) \
  --docker-password=$(az acr credential show --name {acr-name} --query "passwords[0].value" -o tsv)

# 2. Recreate app secrets
kubectl delete secret backend-secrets -n {namespace}
kubectl create secret generic backend-secrets \
  --namespace={namespace} \
  --from-literal=AZURE_OPENAI_API_KEY={key} \
  --from-literal=AZURE_SEARCH_ADMIN_KEY={key} \
  --from-literal=PGPASSWORD={password}

# 3. Restart deployment
kubectl rollout restart deployment/{app-name}-backend -n {namespace}
```

### Issue 4: Frontend shows "Application Error"

**Symptoms:**
- App Service shows generic error page
- No application logs

**Causes:**
1. Wrong startup command
2. Missing server.js in deployment package
3. Missing .next/static files
4. Wrong PORT configuration

**Solution:**
```bash
# Check App Service configuration
az webapp config show --name {app-name}-frontend --resource-group {rg} \
  --query "linuxFxVersion" -o tsv

# Check app settings
az webapp config appsettings list --name {app-name}-frontend --resource-group {rg} -o table

# Required settings:
az webapp config appsettings set --name {app-name}-frontend --resource-group {rg} \
  --settings \
    PORT=3000 \
    WEBSITES_PORT=3000 \
    WEBSITE_VNET_ROUTE_ALL=1 \
    BACKEND_URL="http://10.0.0.10"

# Set startup command
az webapp config set --name {app-name}-frontend --resource-group {rg} \
  --startup-file "node server.js"

# Check logs
az webapp log tail --name {app-name}-frontend --resource-group {rg}
```

### Issue 5: Secrets corrupted or contain whitespace

**Symptoms:**
- API calls fail with authentication errors
- Secrets appear correct but don't work

**Causes:**
- Copying secrets with extra whitespace/newlines
- Secrets duplicated in GitHub UI

**Solution:**
```bash
# Verify secret values in Kubernetes
kubectl get secret backend-secrets -n {namespace} -o jsonpath='{.data.AZURE_OPENAI_API_KEY}' | base64 -d | xxd | head

# Look for newlines (0a) or spaces (20) at the end

# Recreate secrets with clean values
# Get fresh values directly from Azure
AOAI_KEY=$(az cognitiveservices account keys list --name {aoai-name} --resource-group {rg} --query key1 -o tsv)
SEARCH_KEY=$(az search admin-key show --service-name {search-name} --resource-group {rg} --query primaryKey -o tsv)

# Recreate the secret
kubectl delete secret backend-secrets -n {namespace}
kubectl create secret generic backend-secrets \
  --namespace={namespace} \
  --from-literal=AZURE_OPENAI_API_KEY="$AOAI_KEY" \
  --from-literal=AZURE_SEARCH_ADMIN_KEY="$SEARCH_KEY" \
  --from-literal=PGPASSWORD="{password}"

# Restart pods to pick up new secrets
kubectl rollout restart deployment/{app-name}-backend -n {namespace}
```

### Issue 6: Workflow doesn't trigger

**Symptoms:**
- Push to main doesn't start workflow
- Manual dispatch button missing

**Causes:**
1. Workflow file has YAML syntax errors
2. Path filters don't match changed files
3. Workflow file not on default branch

**Solution:**
```bash
# Validate YAML syntax
python -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-backend.yaml'))"

# Check if workflow is recognized
# Go to: https://github.com/{org}/{repo}/actions

# Ensure workflow file is in default branch (main)
git checkout main
git pull
ls -la .github/workflows/

# Test with workflow_dispatch (manual trigger)
# Add this to your workflow if not present:
on:
  workflow_dispatch:  # Enables "Run workflow" button
```

---

## Part 7: Workflow Debugging

### Enable Debug Logging

Add these secrets to enable verbose logging:

| Secret | Value |
|--------|-------|
| `ACTIONS_RUNNER_DEBUG` | `true` |
| `ACTIONS_STEP_DEBUG` | `true` |

### Add Debug Steps to Workflow

```yaml
- name: Debug - Environment
  run: |
    echo "=== Environment Variables ==="
    env | sort

    echo ""
    echo "=== GitHub Context ==="
    echo "Repository: ${{ github.repository }}"
    echo "Ref: ${{ github.ref }}"
    echo "SHA: ${{ github.sha }}"
    echo "Actor: ${{ github.actor }}"
    echo "Event: ${{ github.event_name }}"

- name: Debug - Azure CLI
  run: |
    echo "=== Azure CLI Version ==="
    az version

    echo ""
    echo "=== Logged in as ==="
    az account show

    echo ""
    echo "=== Resource Groups ==="
    az group list --query "[].name" -o tsv

- name: Debug - Kubernetes
  run: |
    echo "=== kubectl version ==="
    kubectl version --client

    echo ""
    echo "=== Current context ==="
    kubectl config current-context

    echo ""
    echo "=== Namespaces ==="
    kubectl get namespaces
```

---

## Part 8: Complete Setup Script

Run this script to set up everything from scratch:

```bash
#!/bin/bash
set -e

# Configuration - UPDATE THESE
APP_NAME="myapp"
GITHUB_ORG="your-org"
GITHUB_REPO="your-repo"
RESOURCE_GROUP="rg-$APP_NAME"
SHARED_RG="rg-shared"  # If different from RESOURCE_GROUP
LOCATION="westeurope"

echo "=== Setting up GitHub Actions OIDC for $APP_NAME ==="

# Step 1: Create App Registration
echo "Creating App Registration..."
az ad app create --display-name "github-$APP_NAME-deploy"
APP_ID=$(az ad app list --display-name "github-$APP_NAME-deploy" --query "[0].appId" -o tsv)
OBJECT_ID=$(az ad app list --display-name "github-$APP_NAME-deploy" --query "[0].id" -o tsv)
echo "App ID: $APP_ID"

# Step 2: Create Service Principal
echo "Creating Service Principal..."
az ad sp create --id $APP_ID || true

# Step 3: Get IDs
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

# Step 4: Assign Roles
echo "Assigning Contributor roles..."
az role assignment create --assignee $APP_ID --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP

if [ "$SHARED_RG" != "$RESOURCE_GROUP" ]; then
  az role assignment create --assignee $APP_ID --role Contributor \
    --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$SHARED_RG
fi

# Step 5: Create Federated Credential
echo "Creating Federated Credential..."
az ad app federated-credential create --id $OBJECT_ID --parameters "{
  \"name\": \"github-main-branch\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:$GITHUB_ORG/$GITHUB_REPO:ref:refs/heads/main\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}"

# Step 6: Output secrets for GitHub
echo ""
echo "=============================================="
echo "Add these secrets to GitHub:"
echo "=============================================="
echo ""
echo "AZURE_CLIENT_ID=$APP_ID"
echo "AZURE_TENANT_ID=$TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID"
echo ""
echo "=============================================="
echo "Setup complete!"
echo "=============================================="
```

## PROMPT END

---

## Quick Reference

### Required GitHub Secrets

| Secret | Required For | How to Get |
|--------|--------------|------------|
| `AZURE_CLIENT_ID` | All workflows | App Registration |
| `AZURE_TENANT_ID` | All workflows | `az account show` |
| `AZURE_SUBSCRIPTION_ID` | All workflows | `az account show` |
| `AZURE_OPENAI_API_KEY` | Backend | Azure Portal / CLI |
| `AZURE_SEARCH_ADMIN_KEY` | Backend | Azure Portal / CLI |
| `PGPASSWORD` | Backend | Your password |

### Workflow Files

| File | Trigger | Purpose |
|------|---------|---------|
| `deploy-backend.yaml` | Push to `src/*.py`, `k8s/**` | Build + deploy backend to AKS |
| `deploy-frontend.yaml` | Push to `src/app/**`, `src/components/**` | Build + deploy frontend to App Service |
| `infra-health-check.yaml` | Every 30 min | Keep services running |

---

*GitHub Actions CI/CD Implementation Guide v1.0*
