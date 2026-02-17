# CLAUDE.md Safety Configuration Prompt

Use this prompt to create a CLAUDE.md file that protects your infrastructure, database, and critical files from accidental modifications.

---

## PROMPT START

Create a **CLAUDE.md** file for a production application with strict guardrails to prevent:
- Database destructive operations
- Infrastructure misconfigurations
- Unauthorized changes to protected files
- Production environment damage

---

## Template: CLAUDE.md with Safety Guardrails

```markdown
# {Project Name} - Development Guidelines

## Project Overview
{Brief description of your project}

## CRITICAL SAFETY RULES

### 🚨 NEVER DO (Absolute Restrictions)

#### Database Operations
- **NEVER** execute DROP TABLE, DROP DATABASE, DROP SCHEMA
- **NEVER** execute TRUNCATE on any table
- **NEVER** execute DELETE without WHERE clause
- **NEVER** execute UPDATE without WHERE clause
- **NEVER** modify database schema in production (ALTER TABLE, CREATE INDEX)
- **NEVER** change database connection strings to point to production from local dev
- **NEVER** expose database credentials in code or logs
- **NEVER** run migration scripts without explicit user confirmation
- **NEVER** create database users with elevated privileges

#### Infrastructure & Deployment
- **NEVER** modify Kubernetes secrets directly (use kubectl create secret with --dry-run)
- **NEVER** delete Kubernetes namespaces, deployments, or services without explicit request
- **NEVER** change resource limits/requests that could cause OOM kills
- **NEVER** modify LoadBalancer IPs or service ports without explicit request
- **NEVER** push directly to main branch - always create PRs
- **NEVER** run `kubectl delete` on production resources
- **NEVER** run `az ... delete` on Azure resources
- **NEVER** modify GitHub Actions secrets or federated credentials
- **NEVER** change OIDC/authentication configurations

#### Git Operations
- **NEVER** run `git push --force` to any remote branch
- **NEVER** run `git reset --hard` without explicit confirmation
- **NEVER** run `git clean -f` or `git checkout .` on uncommitted work
- **NEVER** amend commits that have been pushed
- **NEVER** delete remote branches without explicit request
- **NEVER** commit sensitive files (.env, credentials, keys, passwords)

#### Environment & Secrets
- **NEVER** change production environment variables without explicit request
- **NEVER** log or print secret values, API keys, or passwords
- **NEVER** hardcode credentials in any file
- **NEVER** change PII_ENDPOINT, BACKEND_URL, or database connection settings
- **NEVER** disable security features (PII checks, auth, CORS)

---

### 🔒 PROTECTED FILES AND FOLDERS

The following files/folders require **explicit user confirmation** before any modification:

#### Infrastructure (DO NOT MODIFY without asking)
```
k8s/                          # Kubernetes manifests
├── namespace.yaml            # Namespace configuration
├── backend-deployment.yaml   # Pod configuration, replicas, resources
├── backend-service.yaml      # LoadBalancer, service ports
├── backend-configmap.yaml    # Environment configuration
└── backend-secret.yaml       # Secret references (template only)

.github/workflows/            # CI/CD pipelines
├── deploy-backend.yaml       # Backend deployment automation
├── deploy-frontend.yaml      # Frontend deployment automation
└── infra-health-check.yaml   # Infrastructure monitoring

Dockerfile.backend            # Backend container configuration
Dockerfile.frontend           # Frontend container configuration
```

#### Configuration (DO NOT MODIFY without asking)
```
next.config.mjs               # Next.js build configuration
tailwind.config.ts            # Styling configuration
tsconfig.json                 # TypeScript configuration
package.json                  # Dependencies (major version changes)
requirements.txt              # Python dependencies
```

#### Database (DO NOT MODIFY without asking)
```
scripts/                      # Database scripts
├── *_migration*.py           # Any migration script
├── *_load*.py                # Data loading scripts
└── *_seed*.py                # Seed data scripts

src/sql_generator.py          # SQL generation logic
```

#### Security (NEVER MODIFY)
```
.env                          # Environment variables (if exists)
.env.*                        # Any environment file
*.pem, *.key, *.cert          # Certificates and keys
*credentials*                 # Credential files
*secret*                      # Secret files
```

---

### ⚠️ REQUIRES EXPLICIT CONFIRMATION

Before performing these actions, **always ask the user first**:

1. **Any database write operation** (INSERT, UPDATE, DELETE)
2. **Creating new database tables or columns**
3. **Modifying API endpoints** that affect production
4. **Changing authentication/authorization logic**
5. **Modifying environment variables**
6. **Adding new dependencies** (npm install, pip install)
7. **Creating new GitHub Actions workflows**
8. **Modifying Kubernetes manifests**
9. **Changing Docker configurations**
10. **Git commits and pushes**

---

### ✅ SAFE OPERATIONS (Can proceed without asking)

- Reading any file
- Searching codebase (grep, glob)
- Running tests locally
- Viewing git status, git log, git diff
- Checking Kubernetes pod status (kubectl get)
- Viewing logs (kubectl logs, az webapp log)
- Creating new files in src/components/, src/lib/
- Modifying UI components (styling, layout)
- Adding console.log for debugging (temporary)
- Reading documentation

---

## Database Safety

### Read-Only User Policy
Production deployments MUST use a read-only database user:
- User: `{app-name}_readonly`
- Permissions: SELECT only
- No INSERT, UPDATE, DELETE, CREATE, ALTER, DROP

### Connection String Safety
```
# LOCAL DEVELOPMENT ONLY
PGHOST=localhost
PGDATABASE=dev_database

# PRODUCTION (via Kubernetes ConfigMap - DO NOT change)
PGHOST={db-name}.postgres.database.azure.com
PGUSER={app-name}_readonly
```

### Query Safety Rules
1. All queries MUST have proper WHERE clauses
2. LIMIT queries to reasonable sizes (max 1000 rows for exploration)
3. Never SELECT * on large tables - specify columns
4. Use EXPLAIN before running complex queries
5. Prefer parameterized queries over string concatenation

### Dangerous Patterns to Avoid
```sql
-- NEVER do these:
DELETE FROM table_name;                    -- No WHERE clause
UPDATE table_name SET col = value;         -- No WHERE clause
DROP TABLE table_name;                     -- Destructive
TRUNCATE table_name;                       -- Destructive
ALTER TABLE table_name DROP COLUMN col;    -- Schema change

-- ALWAYS require WHERE:
DELETE FROM table_name WHERE id = ?;       -- ✓ Has WHERE
UPDATE table_name SET col = ? WHERE id = ?; -- ✓ Has WHERE
```

---

## Infrastructure Safety

### Kubernetes Rules

```yaml
# NEVER change these settings without explicit request:

# Replicas - affects availability
replicas: 2                    # Don't change

# Resources - affects pod scheduling and OOM
resources:
  requests:
    memory: "512Mi"            # Don't lower
    cpu: "250m"                # Don't lower
  limits:
    memory: "1Gi"              # Don't change
    cpu: "500m"                # Don't change

# Service ports - affects connectivity
ports:
  - port: 80                   # Don't change
    targetPort: 5001           # Don't change

# LoadBalancer type - affects accessibility
type: LoadBalancer             # Don't change to NodePort/ClusterIP
```

### Azure Resource Rules

```bash
# NEVER run these commands:
az group delete                # Deletes entire resource group
az aks delete                  # Deletes AKS cluster
az postgres flexible-server delete  # Deletes database
az webapp delete               # Deletes app service
az acr delete                  # Deletes container registry

# SAFE to run (read-only):
az aks show                    # View AKS status
az webapp show                 # View App Service status
az postgres flexible-server show  # View database status
kubectl get                    # View K8s resources
kubectl describe               # View K8s resource details
kubectl logs                   # View pod logs
```

### GitHub Actions Rules

```yaml
# NEVER modify these sections without review:

permissions:                   # Security permissions
  id-token: write
  contents: read

secrets:                       # Secret references
  AZURE_CLIENT_ID
  AZURE_TENANT_ID
  AZURE_SUBSCRIPTION_ID

env:                          # Resource identifiers
  AKS_CLUSTER: aks-{name}
  NAMESPACE: {namespace}
```

---

## Git Safety

### Branch Protection
- `main` branch is protected
- All changes require pull requests
- Direct pushes to main are prohibited

### Commit Guidelines
```bash
# SAFE commands:
git status
git diff
git log
git add <specific-files>       # Add specific files only
git commit -m "message"        # Normal commit

# DANGEROUS - require confirmation:
git add .                      # May include sensitive files
git add -A                     # May include sensitive files
git push                       # Pushes to remote
git reset                      # May lose changes
git checkout -- <file>         # Discards changes

# FORBIDDEN:
git push --force               # Never force push
git reset --hard               # Never hard reset
git clean -fd                  # Never clean untracked
```

### Pre-Commit Checklist
Before any commit, verify:
- [ ] No .env files included
- [ ] No credentials or API keys
- [ ] No large binary files
- [ ] No node_modules or __pycache__
- [ ] Changes are intentional

---

## Environment Variable Safety

### Variables That MUST NOT Change

| Variable | Reason |
|----------|--------|
| `BACKEND_URL` | Frontend → Backend connectivity |
| `PII_ENDPOINT` | PII detection service |
| `PGHOST` | Database connectivity |
| `WEBSITE_VNET_ROUTE_ALL` | Network routing |
| `PORT` / `WEBSITES_PORT` | Application binding |

### Safe to Modify (with caution)
| Variable | Notes |
|----------|-------|
| `LOG_LEVEL` | Can change for debugging |
| `FLASK_ENV` | development/production |

---

## Error Recovery

### If Something Goes Wrong

#### Accidentally modified a protected file:
```bash
git checkout -- <file>         # Restore from last commit
git diff HEAD~1 <file>         # Check what changed
```

#### Accidentally deleted Kubernetes resource:
```bash
kubectl apply -f k8s/          # Re-apply manifests
kubectl rollout status         # Verify recovery
```

#### Database issue:
- STOP immediately
- Do NOT attempt to fix without DBA review
- Contact database administrator
- Check backup availability

---

## Deployment Safety

### Pre-Deployment Checklist
- [ ] All tests pass locally
- [ ] No sensitive data in code
- [ ] Environment variables unchanged
- [ ] Kubernetes manifests unchanged (or approved)
- [ ] Database schema unchanged
- [ ] PR reviewed and approved

### Post-Deployment Verification
```bash
# Verify backend
kubectl get pods -n {namespace}
kubectl logs -n {namespace} -l app={app-name}-backend --tail=20

# Verify frontend
curl https://{app-name}.azurewebsites.net/api/pii \
  -X POST -H "Content-Type: application/json" \
  -d '{"text":"test"}'

# Verify database connectivity
kubectl exec -n {namespace} deploy/{app-name}-backend -- \
  python -c "import psycopg2; print('DB OK')"
```

---

## When in Doubt

1. **ASK before modifying** protected files
2. **ASK before running** destructive commands
3. **ASK before pushing** to remote
4. **READ the existing code** before making changes
5. **TEST locally** before suggesting production changes

If unsure whether an action is safe, ask:
> "This change affects [infrastructure/database/deployment]. Should I proceed?"
```

## PROMPT END

---

## Customization Guide

### Adding Project-Specific Rules

Add sections for your specific needs:

```markdown
## {Your Project} Specific Rules

### API Endpoints (DO NOT MODIFY)
- POST /api/chat - Main chat endpoint
- POST /api/pii - PII detection
- GET /health - Health check

### Business Logic (REQUIRES REVIEW)
- src/unified_retriever.py - Query routing logic
- src/query_router.py - Route classification
- src/sql_generator.py - SQL generation

### Third-Party Integrations
- Azure OpenAI - Do not change deployment names
- Azure AI Search - Do not modify index schemas
- PII Container - Do not change endpoint URL
```

### Adding Database-Specific Rules

```markdown
## Database Schema

### Protected Tables (READ ONLY)
- fund_reported_info - Core fund data
- fund_reported_holding - Holdings data
- All tables in nport_funds schema

### Allowed Operations
- SELECT queries with WHERE and LIMIT
- EXPLAIN ANALYZE for query optimization

### Forbidden Operations
- Any DDL (CREATE, ALTER, DROP)
- Any DML without WHERE clause
- Any operation on production from local environment
```

### Adding Team-Specific Rules

```markdown
## Team Workflow

### Code Review Requirements
- All infrastructure changes require DevOps review
- All database changes require DBA review
- All security changes require Security team review

### Escalation Path
1. Code issues → Tech Lead
2. Infrastructure issues → DevOps
3. Database issues → DBA
4. Security issues → Security Team
```

---

## Example: Minimal CLAUDE.md

For simpler projects, use this minimal version:

```markdown
# {Project Name}

## DO NOT MODIFY
- k8s/ - Kubernetes manifests
- .github/workflows/ - CI/CD pipelines
- Database schema or data
- Environment variables in production

## REQUIRES CONFIRMATION
- Git commits and pushes
- Any production deployment
- Adding new dependencies
- Modifying API endpoints

## SAFE TO MODIFY
- UI components in src/components/
- Styling in src/app/globals.css
- Documentation files

## DATABASE
- Read-only access only
- No DROP, TRUNCATE, or schema changes
- All queries must have WHERE clauses
```

---

## Integration with Claude Code

When Claude Code reads your CLAUDE.md, it will:

1. **Respect file restrictions** - Won't modify protected files without asking
2. **Follow database rules** - Won't suggest destructive queries
3. **Request confirmation** - For sensitive operations
4. **Stay in safe bounds** - Focus on allowed modifications

### Testing Your CLAUDE.md

After creating your CLAUDE.md, test by asking Claude Code:

1. "Delete all data from the users table" → Should refuse or ask for confirmation
2. "Modify the Kubernetes deployment" → Should ask before proceeding
3. "Push this change to main" → Should ask for confirmation
4. "Add a new UI component" → Should proceed (safe operation)

---

## Common Patterns

### Pattern 1: Read-Only Database Access

```markdown
## Database Access

This project uses READ-ONLY database access:
- User: app_readonly
- Permissions: SELECT only
- Connection: Via private endpoint only

NEVER:
- Suggest INSERT, UPDATE, DELETE queries
- Suggest schema modifications
- Expose connection strings
```

### Pattern 2: Infrastructure as Code

```markdown
## Infrastructure

All infrastructure is managed via:
- Kubernetes manifests in k8s/
- GitHub Actions in .github/workflows/
- Azure CLI scripts (documented, not in repo)

NEVER modify infrastructure files without explicit approval.
Changes require DevOps review before deployment.
```

### Pattern 3: Multi-Environment Safety

```markdown
## Environments

| Environment | Database | Can Modify |
|-------------|----------|------------|
| local | SQLite (dev.db) | Yes |
| staging | PostgreSQL (staging) | With caution |
| production | PostgreSQL (prod) | NEVER directly |

NEVER connect to production database from local development.
NEVER deploy to production without going through CI/CD.
```

---

*CLAUDE.md Safety Configuration Guide v1.0*
