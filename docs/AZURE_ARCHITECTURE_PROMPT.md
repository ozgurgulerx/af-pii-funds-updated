# Azure Enterprise RAG Architecture Prompt

Use this prompt to build a production-grade RAG (Retrieval-Augmented Generation) application on Azure with secure networking, Kubernetes backend, and App Service frontend.

---

## PROMPT START

Build an **enterprise AI chat application** with the following Azure architecture:
- **Frontend**: Next.js on Azure App Service with VNet integration
- **Backend**: Python Flask API on Azure Kubernetes Service (AKS)
- **Database**: Azure PostgreSQL with private endpoint
- **AI Services**: Azure OpenAI + Azure AI Search
- **Security**: PII detection via Azure Language Service container
- **CI/CD**: GitHub Actions with OIDC authentication (no expiring secrets)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AZURE DEPLOYMENT                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐        ┌──────────────────────────────────────┐   │
│  │   Azure App Service  │        │     Azure Kubernetes Service (AKS)    │   │
│  │   (Frontend)         │        │     (Backend)                         │   │
│  │                      │        │                                       │   │
│  │  {app-name}-frontend │ ───────▶  {app-name}-backend (Flask)          │   │
│  │  .azurewebsites.net  │  VNet  │  - /api/chat (RAG queries)           │   │
│  │                      │        │  - /health                            │   │
│  │  Next.js 15 + React  │        │                                       │   │
│  │  - PII UI animations │        │  aks-{app-name} (1-2 nodes autoscale) │   │
│  │  - Chat interface    │        │  rg-{app-name} / {region}             │   │
│  └──────────┬───────────┘        └──────────────┬───────────────────────┘   │
│             │                                    │                          │
│             │ PII Check                          │ SQL Queries              │
│             ▼                                    ▼                          │
│  ┌──────────────────────┐        ┌──────────────────────────────────────┐   │
│  │  Azure Container     │        │    Azure PostgreSQL (Private EP)     │   │
│  │  Instances (PII)     │        │                                       │   │
│  │                      │        │  {db-name}.postgres.database.         │   │
│  │  pii-{name}.{region} │        │  azure.com                           │   │
│  │  .azurecontainer.io  │        │                                       │   │
│  │  :5000               │        │  Database: {db-name}                  │   │
│  │                      │        │  Schema: {schema-name}                │   │
│  │  Azure Language PII  │        │  - Tables with your data              │   │
│  │  Detection Service   │        │                                       │   │
│  └──────────────────────┘        └──────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────┐        ┌──────────────────────────────────────┐   │
│  │  Azure AI Search     │        │    Azure OpenAI                       │   │
│  │                      │        │                                       │   │
│  │  {search-name}       │        │  {aoai-name}                          │   │
│  │  .search.windows.net │        │                                       │   │
│  │                      │        │  - GPT-4/4o (routing/synthesis)       │   │
│  │  - semantic-index    │        │  - text-embedding-3-small             │   │
│  │  - raptor-index      │        │                                       │   │
│  └──────────────────────┘        └──────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────┐                                                   │
│  │  Azure Container     │                                                   │
│  │  Registry (ACR)      │                                                   │
│  │                      │                                                   │
│  │  {acr-name}          │                                                   │
│  │  .azurecr.io         │                                                   │
│  │                      │                                                   │
│  │  - backend:latest    │                                                   │
│  └──────────────────────┘                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Network Architecture

```
VNet: vnet-{app-name} (10.0.0.0/16)
├── subnet-aks (10.0.0.0/22)              - AKS nodes + internal LoadBalancer
├── subnet-appservice (10.0.4.0/24)       - App Service VNet integration
└── subnet-privateendpoint (10.0.5.0/24)  - PostgreSQL private endpoint

Private DNS Zone: privatelink.postgres.database.azure.com
└── A record: {db-name} → 10.0.5.4 (private endpoint IP)

Traffic Flow:
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Internet      │     │   App Service   │     │   AKS Internal  │
│   Users         │────▶│   Frontend      │────▶│   LoadBalancer  │
│                 │     │   (10.0.4.x)    │     │   (10.0.0.10)   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌────────────────────────────────┼────────────────────┐
                        │                                │                    │
                        ▼                                ▼                    ▼
              ┌─────────────────┐            ┌─────────────────┐   ┌─────────────────┐
              │   PostgreSQL    │            │   Azure AI      │   │   Azure OpenAI  │
              │   (10.0.5.4)    │            │   Search        │   │                 │
              │   Private EP    │            │   (Public)      │   │   (Public)      │
              └─────────────────┘            └─────────────────┘   └─────────────────┘
```

---

## Azure Resources Required

### Resource Group Structure

```bash
# Main resource group for the application
rg-{app-name}
├── App Service Plan (plan-{app-name}-frontend)
├── App Service (fundrag-frontend)
├── AKS Cluster (aks-{app-name})
├── VNet (vnet-{app-name})
├── Private Endpoint (pe-postgres-{app-name})
├── Private DNS Zone (privatelink.postgres.database.azure.com)

# Shared services resource group (may already exist)
rg-{shared-name}
├── Azure Container Registry ({acr-name})
├── Azure OpenAI ({aoai-name})
├── Azure AI Search ({search-name})
├── Azure PostgreSQL ({db-name})
├── Azure Language Service (for PII container billing)
```

### 1. Azure Container Registry (ACR)

```bash
# Create ACR for container images
az acr create \
  --resource-group rg-{shared-name} \
  --name {acrname} \
  --sku Basic \
  --admin-enabled true

# Get ACR credentials for AKS
ACR_USERNAME=$(az acr credential show --name {acrname} --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name {acrname} --query passwords[0].value -o tsv)
```

### 2. Virtual Network

```bash
# Create VNet with subnets
az network vnet create \
  --resource-group rg-{app-name} \
  --name vnet-{app-name} \
  --address-prefix 10.0.0.0/16

# AKS subnet (needs /22 for node scaling)
az network vnet subnet create \
  --resource-group rg-{app-name} \
  --vnet-name vnet-{app-name} \
  --name subnet-aks \
  --address-prefix 10.0.0.0/22

# App Service subnet (for VNet integration)
az network vnet subnet create \
  --resource-group rg-{app-name} \
  --vnet-name vnet-{app-name} \
  --name subnet-appservice \
  --address-prefix 10.0.4.0/24 \
  --delegations Microsoft.Web/serverFarms

# Private endpoint subnet
az network vnet subnet create \
  --resource-group rg-{app-name} \
  --vnet-name vnet-{app-name} \
  --name subnet-privateendpoint \
  --address-prefix 10.0.5.0/24 \
  --disable-private-endpoint-network-policies true
```

### 3. Azure Kubernetes Service (AKS)

```bash
# Create AKS cluster
az aks create \
  --resource-group rg-{app-name} \
  --name aks-{app-name} \
  --node-count 1 \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 2 \
  --node-vm-size Standard_B2s \
  --network-plugin azure \
  --vnet-subnet-id /subscriptions/{sub-id}/resourceGroups/rg-{app-name}/providers/Microsoft.Network/virtualNetworks/vnet-{app-name}/subnets/subnet-aks \
  --generate-ssh-keys \
  --attach-acr {acrname}

# Get AKS credentials
az aks get-credentials --resource-group rg-{app-name} --name aks-{app-name}

# Create ACR pull secret for AKS
kubectl create secret docker-registry acr-secret \
  --namespace {namespace} \
  --docker-server={acrname}.azurecr.io \
  --docker-username=$ACR_USERNAME \
  --docker-password=$ACR_PASSWORD
```

### 4. Azure PostgreSQL (Flexible Server)

```bash
# Create PostgreSQL server
az postgres flexible-server create \
  --resource-group rg-{shared-name} \
  --name {db-name} \
  --location {region} \
  --admin-user {admin-user} \
  --admin-password {admin-password} \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15

# Create database
az postgres flexible-server db create \
  --resource-group rg-{shared-name} \
  --server-name {db-name} \
  --database-name {database}

# Create private endpoint
az network private-endpoint create \
  --resource-group rg-{app-name} \
  --name pe-postgres-{app-name} \
  --vnet-name vnet-{app-name} \
  --subnet subnet-privateendpoint \
  --private-connection-resource-id /subscriptions/{sub-id}/resourceGroups/rg-{shared-name}/providers/Microsoft.DBforPostgreSQL/flexibleServers/{db-name} \
  --group-id postgresqlServer \
  --connection-name postgres-connection

# Create private DNS zone and link
az network private-dns zone create \
  --resource-group rg-{app-name} \
  --name privatelink.postgres.database.azure.com

az network private-dns link vnet create \
  --resource-group rg-{app-name} \
  --zone-name privatelink.postgres.database.azure.com \
  --name postgres-dns-link \
  --virtual-network vnet-{app-name} \
  --registration-enabled false

# Create DNS record for private endpoint
PRIVATE_IP=$(az network private-endpoint show \
  --resource-group rg-{app-name} \
  --name pe-postgres-{app-name} \
  --query "customDnsConfigs[0].ipAddresses[0]" -o tsv)

az network private-dns record-set a create \
  --resource-group rg-{app-name} \
  --zone-name privatelink.postgres.database.azure.com \
  --name {db-name}

az network private-dns record-set a add-record \
  --resource-group rg-{app-name} \
  --zone-name privatelink.postgres.database.azure.com \
  --record-set-name {db-name} \
  --ipv4-address $PRIVATE_IP

# Create read-only database user (for production security)
psql "host={db-name}.postgres.database.azure.com dbname={database} user={admin-user}" << EOF
CREATE USER {app-name}_readonly WITH PASSWORD '{readonly-password}';
GRANT CONNECT ON DATABASE {database} TO {app-name}_readonly;
GRANT USAGE ON SCHEMA {schema} TO {app-name}_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA {schema} TO {app-name}_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA {schema} GRANT SELECT ON TABLES TO {app-name}_readonly;
EOF
```

### 5. Azure OpenAI

```bash
# Create Azure OpenAI resource
az cognitiveservices account create \
  --resource-group rg-{shared-name} \
  --name {aoai-name} \
  --kind OpenAI \
  --sku S0 \
  --location {region} \
  --yes

# Deploy models
az cognitiveservices account deployment create \
  --resource-group rg-{shared-name} \
  --name {aoai-name} \
  --deployment-name gpt-4o \
  --model-name gpt-4o \
  --model-version "2024-05-13" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 10

az cognitiveservices account deployment create \
  --resource-group rg-{shared-name} \
  --name {aoai-name} \
  --deployment-name text-embedding-3-small \
  --model-name text-embedding-3-small \
  --model-version "1" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 10

# Get API key
AOAI_KEY=$(az cognitiveservices account keys list \
  --resource-group rg-{shared-name} \
  --name {aoai-name} \
  --query key1 -o tsv)
```

### 6. Azure AI Search

```bash
# Create AI Search service
az search service create \
  --resource-group rg-{shared-name} \
  --name {search-name} \
  --sku Basic \
  --partition-count 1 \
  --replica-count 1

# Get admin key
SEARCH_KEY=$(az search admin-key show \
  --resource-group rg-{shared-name} \
  --service-name {search-name} \
  --query primaryKey -o tsv)
```

### 7. Azure Container Instances (PII Detection)

```bash
# Create Language Service for billing (if not exists)
az cognitiveservices account create \
  --resource-group rg-{shared-name} \
  --name {language-service-name} \
  --kind TextAnalytics \
  --sku S \
  --location {region} \
  --yes

LANGUAGE_KEY=$(az cognitiveservices account keys list \
  --resource-group rg-{shared-name} \
  --name {language-service-name} \
  --query key1 -o tsv)

LANGUAGE_ENDPOINT=$(az cognitiveservices account show \
  --resource-group rg-{shared-name} \
  --name {language-service-name} \
  --query properties.endpoint -o tsv)

# Deploy PII container
az container create \
  --resource-group rg-{shared-name} \
  --name pii-{name} \
  --image mcr.microsoft.com/azure-cognitive-services/textanalytics/pii:latest \
  --cpu 2 \
  --memory 4 \
  --ports 5000 \
  --dns-name-label pii-{name} \
  --environment-variables \
    "Eula=accept" \
    "Billing=$LANGUAGE_ENDPOINT" \
    "ApiKey=$LANGUAGE_KEY"

# Container will be available at:
# http://pii-{name}.{region}.azurecontainer.io:5000
```

### 8. Azure App Service (Frontend)

```bash
# Create App Service Plan
az appservice plan create \
  --resource-group rg-{app-name} \
  --name plan-{app-name}-frontend \
  --sku P1V3 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group rg-{app-name} \
  --plan plan-{app-name}-frontend \
  --name {app-name}-frontend \
  --runtime "NODE:20-lts"

# Enable VNet integration
az webapp vnet-integration add \
  --resource-group rg-{app-name} \
  --name {app-name}-frontend \
  --vnet vnet-{app-name} \
  --subnet subnet-appservice

# Configure app settings
az webapp config appsettings set \
  --resource-group rg-{app-name} \
  --name {app-name}-frontend \
  --settings \
    BACKEND_URL="http://10.0.0.10" \
    PII_ENDPOINT="http://pii-{name}.{region}.azurecontainer.io:5000" \
    PII_CONTAINER_ENDPOINT="http://pii-{name}.{region}.azurecontainer.io:5000" \
    WEBSITE_VNET_ROUTE_ALL=1 \
    PORT=3000 \
    WEBSITES_PORT=3000

# Set startup command
az webapp config set \
  --resource-group rg-{app-name} \
  --name {app-name}-frontend \
  --startup-file "node server.js"
```

---

## Kubernetes Configuration

### Namespace (`k8s/namespace.yaml`)

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: {namespace}
  labels:
    app: {app-name}
```

### ConfigMap (`k8s/backend-configmap.yaml`)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
  namespace: {namespace}
data:
  # Azure OpenAI Configuration
  AZURE_OPENAI_ENDPOINT: "https://{aoai-name}.openai.azure.com/"
  AZURE_OPENAI_DEPLOYMENT_NAME: "gpt-4o"
  AZURE_TEXT_EMBEDDING_DEPLOYMENT_NAME: "text-embedding-3-small"

  # Azure AI Search Configuration
  AZURE_SEARCH_ENDPOINT: "https://{search-name}.search.windows.net"

  # PII Container Configuration (use DNS name, not IP!)
  PII_ENDPOINT: "http://pii-{name}.{region}.azurecontainer.io:5000"
  PII_CONTAINER_ENDPOINT: "http://pii-{name}.{region}.azurecontainer.io:5000"

  # PostgreSQL Configuration (using private endpoint)
  PGHOST: "{db-name}.postgres.database.azure.com"
  PGPORT: "5432"
  PGDATABASE: "{database}"
  PGUSER: "{app-name}_readonly"

  # Application Configuration
  FLASK_ENV: "production"
  LOG_LEVEL: "INFO"
  USE_POSTGRES: "true"
```

### Secret (`k8s/backend-secret.yaml`)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secrets
  namespace: {namespace}
type: Opaque
stringData:
  # These are populated by CI/CD, not stored in git
  AZURE_OPENAI_API_KEY: "${AZURE_OPENAI_API_KEY}"
  AZURE_SEARCH_ADMIN_KEY: "${AZURE_SEARCH_ADMIN_KEY}"
  PGPASSWORD: "${PGPASSWORD}"
```

### Deployment (`k8s/backend-deployment.yaml`)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {app-name}-backend
  namespace: {namespace}
  labels:
    app: {app-name}-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: {app-name}-backend
  template:
    metadata:
      labels:
        app: {app-name}-backend
    spec:
      containers:
      - name: backend
        image: {acrname}.azurecr.io/{app-name}-backend:latest
        ports:
        - containerPort: 5001
          name: http
        envFrom:
        - configMapRef:
            name: backend-config
        - secretRef:
            name: backend-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5001
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 5001
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
      imagePullSecrets:
      - name: acr-secret
---
# ClusterIP service for internal access
apiVersion: v1
kind: Service
metadata:
  name: {app-name}-backend
  namespace: {namespace}
spec:
  selector:
    app: {app-name}-backend
  ports:
  - port: 5001
    targetPort: 5001
    name: http
  type: ClusterIP
```

### Services (`k8s/backend-service.yaml`)

```yaml
# Public LoadBalancer (for external testing only)
apiVersion: v1
kind: Service
metadata:
  name: {app-name}-backend-lb
  namespace: {namespace}
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-health-probe-request-path: /health
spec:
  type: LoadBalancer
  selector:
    app: {app-name}-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 5001
---
# Internal LoadBalancer (for App Service VNet integration)
# THIS IS CRITICAL - App Service uses this to reach AKS
apiVersion: v1
kind: Service
metadata:
  name: {app-name}-backend-internal
  namespace: {namespace}
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    service.beta.kubernetes.io/azure-load-balancer-health-probe-request-path: /health
spec:
  type: LoadBalancer
  selector:
    app: {app-name}-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 5001
```

---

## Docker Configuration

### Backend Dockerfile (`Dockerfile.backend`)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install additional dependencies for Azure
RUN pip install --no-cache-dir \
    gunicorn \
    psycopg2-binary \
    flask-cors

# Copy application code
COPY src/api_server.py .
COPY src/unified_retriever.py .
COPY src/query_router.py .
COPY src/sql_generator.py .
COPY src/pii_filter.py .
# ... other Python files

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5001/health || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "2", "--timeout", "120", "api_server:app"]
```

### Frontend Next.js Config (`next.config.mjs`)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",  // CRITICAL for Azure App Service
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    return [
      {
        source: "/((?!_next|api).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.azurewebsites.net https://*.azurecontainer.io",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/api/:path*",
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

---

## GitHub Actions CI/CD

### Azure OIDC Setup (One-Time)

```bash
# Create App Registration
az ad app create --display-name "github-{app-name}-deploy"

APP_ID=$(az ad app list --display-name "github-{app-name}-deploy" --query "[0].appId" -o tsv)
OBJECT_ID=$(az ad app list --display-name "github-{app-name}-deploy" --query "[0].id" -o tsv)

# Create Service Principal
az ad sp create --id $APP_ID

# Assign Contributor role to resource groups
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/{sub-id}/resourceGroups/rg-{app-name}

az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/{sub-id}/resourceGroups/rg-{shared-name}

# Create Federated Credential for GitHub Actions
az ad app federated-credential create --id $OBJECT_ID --parameters '{
  "name": "github-main-branch",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:{github-org}/{repo-name}:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Get IDs for GitHub Secrets
echo "AZURE_CLIENT_ID: $APP_ID"
az account show --query tenantId -o tsv  # AZURE_TENANT_ID
az account show --query id -o tsv        # AZURE_SUBSCRIPTION_ID
```

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | App Registration Application ID |
| `AZURE_TENANT_ID` | Azure AD Tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key |
| `AZURE_SEARCH_ADMIN_KEY` | Azure AI Search admin key |
| `PGPASSWORD` | PostgreSQL password (read-only user) |

### Backend Workflow (`.github/workflows/deploy-backend.yaml`)

```yaml
name: Deploy Backend to AKS

on:
  push:
    branches: [main]
    paths:
      - 'src/api_server.py'
      - 'src/unified_retriever.py'
      - 'src/query_router.py'
      - 'src/sql_generator.py'
      - 'requirements.txt'
      - 'Dockerfile.backend'
      - 'k8s/**'
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

env:
  AZURE_CONTAINER_REGISTRY: {acrname}.azurecr.io
  IMAGE_NAME: {app-name}-backend
  AKS_CLUSTER: aks-{app-name}
  AKS_RESOURCE_GROUP: rg-{app-name}
  NAMESPACE: {namespace}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Azure (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Login to ACR
        run: az acr login --name {acrname}

      - name: Build and push Docker image
        run: |
          docker build -f Dockerfile.backend \
            -t ${{ env.AZURE_CONTAINER_REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -t ${{ env.AZURE_CONTAINER_REGISTRY }}/${{ env.IMAGE_NAME }}:latest .
          docker push ${{ env.AZURE_CONTAINER_REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          docker push ${{ env.AZURE_CONTAINER_REGISTRY }}/${{ env.IMAGE_NAME }}:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

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
            --name ${{ env.AKS_CLUSTER }}

      - name: Apply Kubernetes manifests
        run: |
          kubectl apply -f k8s/namespace.yaml
          kubectl apply -f k8s/backend-service.yaml
          kubectl apply -f k8s/backend-configmap.yaml

      - name: Create/Update secrets
        run: |
          kubectl create secret generic backend-secrets \
            --namespace=${{ env.NAMESPACE }} \
            --from-literal=AZURE_OPENAI_API_KEY=${{ secrets.AZURE_OPENAI_API_KEY }} \
            --from-literal=AZURE_SEARCH_ADMIN_KEY=${{ secrets.AZURE_SEARCH_ADMIN_KEY }} \
            --from-literal=PGPASSWORD=${{ secrets.PGPASSWORD }} \
            --dry-run=client -o yaml | kubectl apply -f -

      - name: Deploy
        run: |
          kubectl apply -f k8s/backend-deployment.yaml
          kubectl set image deployment/{app-name}-backend \
            backend=${{ env.AZURE_CONTAINER_REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            --namespace=${{ env.NAMESPACE }}

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/{app-name}-backend \
            --namespace=${{ env.NAMESPACE }} --timeout=300s
```

### Frontend Workflow (`.github/workflows/deploy-frontend.yaml`)

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
      - 'src/package.json'
      - 'src/next.config.mjs'
      - 'src/tailwind.config.ts'
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
      - uses: actions/checkout@v4

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

          # Find standalone server.js (path structure varies)
          SERVER_JS=$(find .next/standalone -type f -name "server.js" ! -path "*/node_modules/*" | head -1)
          STANDALONE_PATH=$(dirname "$SERVER_JS")

          # Copy standalone files
          cp "$STANDALONE_PATH/server.js" /tmp/deploy/
          cp "$STANDALONE_PATH/package.json" /tmp/deploy/
          cp -r "$STANDALONE_PATH/node_modules" /tmp/deploy/

          # Copy .next files
          if [ -d "$STANDALONE_PATH/.next" ]; then
            cp -r "$STANDALONE_PATH/.next"/* /tmp/deploy/.next/
          fi

          # Copy static files (always from build root)
          cp -r .next/static /tmp/deploy/.next/static

          # Create public directory
          mkdir -p /tmp/deploy/public
          cp -r public/* /tmp/deploy/public/ 2>/dev/null || true

          # Create zip
          cd /tmp/deploy && zip -r /tmp/app.zip .

      - name: Deploy to App Service
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
          curl -s -X POST "https://${{ env.AZURE_WEBAPP_NAME }}.azurewebsites.net/api/pii" \
            -H "Content-Type: application/json" \
            -d '{"text":"test"}' -m 30
```

### Infrastructure Health Check (`.github/workflows/infra-health-check.yaml`)

```yaml
name: Infrastructure Health Check

on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

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
            --name {db-name} \
            --resource-group rg-{shared-name} \
            --query state -o tsv)

          if [ "$STATE" != "Ready" ]; then
            az postgres flexible-server start \
              --name {db-name} \
              --resource-group rg-{shared-name}
            echo "started=true" >> $GITHUB_OUTPUT
          else
            echo "started=false" >> $GITHUB_OUTPUT
          fi

      - name: Check and Start AKS
        id: aks
        run: |
          STATE=$(az aks show \
            --resource-group rg-{app-name} \
            --name aks-{app-name} \
            --query powerState.code -o tsv)

          if [ "$STATE" != "Running" ]; then
            az aks start \
              --resource-group rg-{app-name} \
              --name aks-{app-name}
            echo "started=true" >> $GITHUB_OUTPUT
          else
            echo "started=false" >> $GITHUB_OUTPUT
          fi

      - name: Wait for services
        run: |
          if [ "${{ steps.aks.outputs.started }}" = "true" ] || \
             [ "${{ steps.postgres.outputs.started }}" = "true" ]; then
            sleep 120
          else
            sleep 30
          fi

      - name: Verify pods
        run: |
          az aks get-credentials \
            --resource-group rg-{app-name} \
            --name aks-{app-name} \
            --overwrite-existing
          kubectl get pods -n {namespace}
```

---

## Request Flow

```
1. User enters message in chat UI
   └── Frontend: POST /api/pii with message text

2. PII Check (via Azure Container Instances)
   ├── If PII detected → RED animation, message blocked
   │   └── Response: {"blocked": true, "detectedCategories": [...]}
   └── If clean → GREEN animation, proceed
       └── Response: {"blocked": false}

3. Chat Request (via VNet to AKS)
   └── Frontend: POST /api/chat → Internal LoadBalancer (10.0.0.10)
       └── AKS Backend receives request

4. Backend Query Routing
   ├── SQL route → PostgreSQL (via private endpoint 10.0.5.4)
   ├── SEMANTIC route → Azure AI Search (public endpoint)
   ├── RAPTOR route → Azure AI Search (different index)
   └── HYBRID route → Parallel SQL + Semantic + RAPTOR

5. Backend Synthesis
   └── Azure OpenAI generates response with citations

6. Response Streaming
   └── SSE stream back to frontend
       ├── type: "text" (tokens)
       ├── type: "citations" (sources)
       ├── type: "metadata" (route info)
       └── type: "done" (completion)
```

---

## Environment Variables Summary

### Frontend (App Service)

| Variable | Example Value | Purpose |
|----------|---------------|---------|
| `BACKEND_URL` | `http://10.0.0.10` | AKS internal LoadBalancer IP |
| `PII_ENDPOINT` | `http://pii-{name}.{region}.azurecontainer.io:5000` | PII container |
| `PII_CONTAINER_ENDPOINT` | (same as above) | Indicates container mode |
| `WEBSITE_VNET_ROUTE_ALL` | `1` | Route all traffic through VNet |
| `PORT` | `3000` | Next.js server port |
| `WEBSITES_PORT` | `3000` | Azure port mapping |

### Backend (AKS ConfigMap)

| Variable | Example Value | Purpose |
|----------|---------------|---------|
| `AZURE_OPENAI_ENDPOINT` | `https://{aoai-name}.openai.azure.com/` | OpenAI endpoint |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | `gpt-4o` | Chat model |
| `AZURE_TEXT_EMBEDDING_DEPLOYMENT_NAME` | `text-embedding-3-small` | Embeddings |
| `AZURE_SEARCH_ENDPOINT` | `https://{search-name}.search.windows.net` | AI Search |
| `PII_ENDPOINT` | `http://pii-{name}.{region}.azurecontainer.io:5000` | PII container |
| `PGHOST` | `{db-name}.postgres.database.azure.com` | PostgreSQL host |
| `PGPORT` | `5432` | PostgreSQL port |
| `PGDATABASE` | `{database}` | Database name |
| `PGUSER` | `{app-name}_readonly` | Read-only user |
| `USE_POSTGRES` | `true` | Enable PostgreSQL |

### Backend (AKS Secret)

| Variable | Purpose |
|----------|---------|
| `AZURE_OPENAI_API_KEY` | OpenAI authentication |
| `AZURE_SEARCH_ADMIN_KEY` | AI Search authentication |
| `PGPASSWORD` | PostgreSQL password |

---

## Critical Configuration Notes

### 1. Internal LoadBalancer IP

After AKS deployment, get the internal LoadBalancer IP:

```bash
kubectl get svc {app-name}-backend-internal -n {namespace} \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

Update `BACKEND_URL` in App Service with this IP.

### 2. VNet Route All

`WEBSITE_VNET_ROUTE_ALL=1` is **critical** - without it, App Service cannot reach AKS.

### 3. PII Container DNS

**Always use DNS name**, not IP address:
- ✅ `http://pii-{name}.{region}.azurecontainer.io:5000`
- ❌ `http://4.157.124.30:5000` (IP can change on restart)

### 4. PostgreSQL Private Endpoint

The PostgreSQL server should **only be accessible via private endpoint**:
- AKS pods reach it via `{db-name}.postgres.database.azure.com` → resolves to private IP
- Public access should be disabled

### 5. Read-Only Database User

Production apps should use a read-only database user to prevent accidental data modifications.

---

## Troubleshooting Commands

```bash
# Check AKS pods
kubectl get pods -n {namespace}
kubectl logs -n {namespace} -l app={app-name}-backend --tail=50

# Check services and IPs
kubectl get svc -n {namespace}

# Test backend health
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never \
  -n {namespace} -- curl -s http://{app-name}-backend:5001/health

# Check App Service logs
az webapp log tail --name {app-name}-frontend --resource-group rg-{app-name}

# Check App Service settings
az webapp config appsettings list --name {app-name}-frontend \
  --resource-group rg-{app-name} -o table

# Test PII container
curl -X POST "http://pii-{name}.{region}.azurecontainer.io:5000/language/:analyze-text?api-version=2023-04-01" \
  -H "Content-Type: application/json" \
  -d '{"kind":"PiiEntityRecognition","parameters":{"modelVersion":"latest"},"analysisInput":{"documents":[{"id":"1","language":"en","text":"SSN 123-45-6789"}]}}'

# Restart AKS deployment
kubectl rollout restart deployment/{app-name}-backend -n {namespace}
```

## PROMPT END

---

## Related Documentation

| Document | Path | Purpose |
|----------|------|---------|
| Styling Guide | `docs/STYLING_PROMPT.md` | UI theme and components |
| PII Animations | `docs/PII_ANIMATIONS_PROMPT.md` | Security check visual feedback |
| PII Implementation | `docs/PII_AZURE_CONTAINER_PROMPT.md` | Azure PII container setup |
| Project Guidelines | `CLAUDE.md` | Full development guidelines |

---

*Azure Enterprise RAG Architecture v1.0*
