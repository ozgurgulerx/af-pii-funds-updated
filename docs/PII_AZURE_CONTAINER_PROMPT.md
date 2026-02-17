# PII Detection Implementation Prompt - Azure Language Service Container

Use this prompt when implementing PII (Personally Identifiable Information) detection in enterprise applications using Azure's on-premises container solution.

---

## PROMPT START

Build a **PII detection system** using Azure Language Service's containerized PII detection. This approach simulates on-premises deployment where sensitive data never leaves your infrastructure while still leveraging Azure's AI capabilities.

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         PII DETECTION FLOW                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────┐     ┌───────────────┐     ┌─────────────────────────────┐  │
│   │   User      │     │   Frontend    │     │   PII Container             │  │
│   │   Input     │────▶│   API Route   │────▶│   (Azure Container Inst.)   │  │
│   │             │     │   /api/pii    │     │                             │  │
│   └─────────────┘     └───────┬───────┘     │   - No auth required        │  │
│                               │             │   - Handles billing to      │  │
│                               │             │     Azure subscription      │  │
│                               ▼             │   - On-prem simulation      │  │
│                       ┌───────────────┐     └─────────────────────────────┘  │
│                       │   Response    │                   │                   │
│                       │               │                   │                   │
│                       │  blocked:     │◀──────────────────┘                   │
│                       │   true/false  │                                       │
│                       │  categories:  │                                       │
│                       │   [...]       │                                       │
│                       └───────────────┘                                       │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Why Container vs Cloud Endpoint?

| Aspect | Container (On-Prem) | Cloud Endpoint |
|--------|---------------------|----------------|
| **Data Residency** | Data stays in your infrastructure | Data sent to Azure cloud |
| **Authentication** | None required (container handles billing) | API Key or Azure AD token |
| **Latency** | Lower (same network) | Higher (internet round-trip) |
| **Compliance** | Better for regulated industries | May require DPA review |
| **Cost** | Container hosting + Azure billing | Per-API-call pricing |

### Tech Stack Required

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "zod": "^3.23.0"
  }
}
```

### Environment Variables

```bash
# Option 1: Container endpoint (recommended for production)
PII_CONTAINER_ENDPOINT=http://pii-container.yourcompany.com:5000
PII_ENDPOINT=http://pii-container.yourcompany.com:5000

# Option 2: Azure cloud endpoint (requires authentication)
PII_ENDPOINT=https://your-language-service.cognitiveservices.azure.com
PII_API_KEY=your-api-key-here

# Local development fallback
# If neither is set, defaults to http://localhost:5000
```

### Azure Container Instances Deployment

Deploy the Azure Language Service PII container to Azure Container Instances:

```bash
# Create Azure Container Instance with PII detection container
az container create \
  --resource-group your-resource-group \
  --name pii-detection \
  --image mcr.microsoft.com/azure-cognitive-services/textanalytics/pii:latest \
  --cpu 2 \
  --memory 4 \
  --ports 5000 \
  --dns-name-label pii-yourcompany \
  --environment-variables \
    'Eula=accept' \
    'Billing=https://your-language-service.cognitiveservices.azure.com' \
    'ApiKey=your-language-service-api-key'

# Container will be available at:
# http://pii-yourcompany.eastus.azurecontainer.io:5000
```

**Important:** The container requires:
- `Eula=accept` - Accept Microsoft's license terms
- `Billing` - Your Azure Language Service endpoint (for billing)
- `ApiKey` - API key from your Azure Language Service resource

The container handles billing to your Azure subscription internally - no authentication headers needed from your application.

---

## TypeScript Implementation

### 1. Type Definitions (`src/types/index.ts`)

```typescript
// PII Detection Types
export interface PiiEntity {
  text: string;           // The detected PII text
  category: string;       // PII category (e.g., "USSocialSecurityNumber")
  offset: number;         // Character offset in original text
  length: number;         // Length of detected text
  confidenceScore: number; // 0.0 to 1.0 confidence
}

export interface PiiCheckResult {
  hasPii: boolean;        // Whether PII was detected
  entities: PiiEntity[];  // List of detected PII entities
  redactedText?: string;  // Text with PII replaced by category names
}
```

### 2. PII Detection Library (`src/lib/pii.ts`)

```typescript
import { z } from "zod";
import type { PiiCheckResult, PiiEntity } from "@/types";

// Schema for validating Azure PII response
const PiiEntitySchema = z.object({
  text: z.string(),
  category: z.string(),
  offset: z.number(),
  length: z.number(),
  confidenceScore: z.number(),
});

const AzurePiiResponseSchema = z.object({
  kind: z.literal("PiiEntityRecognitionResults"),
  results: z.object({
    documents: z.array(
      z.object({
        id: z.string(),
        redactedText: z.string(),
        entities: z.array(PiiEntitySchema),
        warnings: z.array(z.unknown()),
      })
    ),
    errors: z.array(z.unknown()),
    modelVersion: z.string(),
  }),
});

// Banking-relevant PII categories to detect
// Filter to only categories that matter for your domain
export const BANKING_PII_CATEGORIES = [
  "Person",
  "PersonType",
  "PhoneNumber",
  "Email",
  "Address",
  "USBankAccountNumber",
  "CreditCardNumber",
  "USSocialSecurityNumber",
  "USDriversLicenseNumber",
  "USPassportNumber",
  "USIndividualTaxpayerIdentification",
  "InternationalBankingAccountNumber",
  "SWIFTCode",
  "IPAddress",
] as const;

export type BankingPiiCategory = (typeof BANKING_PII_CATEGORIES)[number];

interface CheckPiiOptions {
  text: string;
  categories?: BankingPiiCategory[];
  confidenceThreshold?: number;  // Default: 0.8
}

/**
 * Get Azure AD access token for Cognitive Services (cloud endpoint only)
 */
async function getAzureAccessToken(): Promise<string | null> {
  // Check for cached token first
  const cachedToken = process.env.AZURE_ACCESS_TOKEN;
  if (cachedToken) {
    return cachedToken;
  }

  // Try to get token using Azure CLI (for local dev)
  try {
    const { execSync } = await import("child_process");
    const token = execSync(
      'az account get-access-token --resource https://cognitiveservices.azure.com --query accessToken -o tsv',
      { encoding: 'utf-8', timeout: 10000 }
    ).trim();
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Check text for PII using Azure Language Service (cloud or container)
 *
 * IMPORTANT: Fails open on errors - allows messages through if PII check fails.
 * This prioritizes availability over strict security. Adjust for your use case.
 */
export async function checkPii({
  text,
  categories = [...BANKING_PII_CATEGORIES],
  confidenceThreshold = 0.8,
}: CheckPiiOptions): Promise<PiiCheckResult> {
  const containerEndpoint = process.env.PII_CONTAINER_ENDPOINT;
  const endpoint = process.env.PII_ENDPOINT || containerEndpoint || "http://localhost:5000";
  const apiKey = process.env.PII_API_KEY || "";

  // Check if we're using a container (no auth needed)
  const isContainer = containerEndpoint && endpoint === containerEndpoint;

  // Build headers - container needs no auth, cloud needs API key or Azure AD
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!isContainer) {
    // Cloud endpoint - needs authentication
    if (apiKey) {
      headers["Ocp-Apim-Subscription-Key"] = apiKey;
    } else {
      // Try Azure AD authentication
      const token = await getAzureAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        console.warn("No PII API key or Azure AD token available");
        return { hasPii: false, entities: [] };  // Fail open
      }
    }
  }
  // Container endpoint - no auth needed, container handles billing

  try {
    // Build request body
    const requestBody: Record<string, unknown> = {
      kind: "PiiEntityRecognition",
      parameters: {
        modelVersion: "latest",
        // Only specify categories for cloud endpoint - container may not support all
        ...(isContainer ? {} : { piiCategories: categories }),
      },
      analysisInput: {
        documents: [
          {
            id: "1",
            language: "en",
            text: text,
          },
        ],
      },
    };

    const response = await fetch(
      `${endpoint}/language/:analyze-text?api-version=2023-04-01`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("PII check failed:", response.status, response.statusText, errorText);
      // FAIL OPEN: Allow message through on API error
      return { hasPii: false, entities: [] };
    }

    const data = await response.json();
    const parsed = AzurePiiResponseSchema.safeParse(data);

    if (!parsed.success) {
      console.error("Failed to parse PII response:", parsed.error);
      return { hasPii: false, entities: [] };  // Fail open
    }

    const document = parsed.data.results.documents[0];
    if (!document) {
      return { hasPii: false, entities: [] };
    }

    // Filter entities by confidence threshold AND banking-relevant categories
    // This prevents false positives like "NVIDIA", "IMF" being flagged as Person names
    const filteredEntities: PiiEntity[] = document.entities
      .filter((e) =>
        e.confidenceScore >= confidenceThreshold &&
        categories.includes(e.category as BankingPiiCategory)
      )
      .map((e) => ({
        text: e.text,
        category: e.category,
        offset: e.offset,
        length: e.length,
        confidenceScore: e.confidenceScore,
      }));

    return {
      hasPii: filteredEntities.length > 0,
      entities: filteredEntities,
      redactedText: document.redactedText,
    };
  } catch (error) {
    console.error("PII check error:", error);
    // FAIL OPEN: Allow message through on network error
    return { hasPii: false, entities: [] };
  }
}

/**
 * Format PII detection result for user-facing message
 */
export function formatPiiWarning(entities: PiiEntity[]): string {
  const categories = [...new Set(entities.map((e) => formatCategory(e.category)))];

  if (categories.length === 0) {
    return "Your message contains sensitive information that cannot be processed.";
  }

  if (categories.length === 1) {
    return `Your message contains ${categories[0]} information which cannot be processed for security reasons.`;
  }

  const lastCategory = categories.pop();
  return `Your message contains ${categories.join(", ")} and ${lastCategory} information which cannot be processed for security reasons.`;
}

/**
 * Format category name for display
 */
function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    Person: "personal name",
    PersonType: "personal",
    PhoneNumber: "phone number",
    Email: "email address",
    Address: "address",
    USBankAccountNumber: "bank account number",
    CreditCardNumber: "credit card",
    USSocialSecurityNumber: "Social Security Number",
    USDriversLicenseNumber: "driver's license",
    USPassportNumber: "passport number",
    USIndividualTaxpayerIdentification: "tax ID",
    InternationalBankingAccountNumber: "IBAN",
    SWIFTCode: "SWIFT code",
    IPAddress: "IP address",
  };

  return categoryMap[category] || category.toLowerCase();
}
```

### 3. Next.js API Route (`src/app/api/pii/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkPii, formatPiiWarning } from "@/lib/pii";

const RequestSchema = z.object({
  text: z.string().min(1).max(5000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const userMessage = parsed.data.text;
    const result = await checkPii({ text: userMessage });

    if (result.hasPii) {
      const warningMessage = formatPiiWarning(result.entities);
      const categories = result.entities.map((e) => e.category);

      return NextResponse.json({
        blocked: true,
        message: warningMessage,
        detectedCategories: categories,
      });
    }

    return NextResponse.json({
      blocked: false,
      message: null,
    });
  } catch (error) {
    // FAIL OPEN: On error, allow the message through
    console.error("PII API error:", error);
    return NextResponse.json({
      blocked: false,
      message: null,
      warning: "PII check unavailable",
    });
  }
}
```

---

## API Request/Response Format

### Azure Language Service PII API

**Endpoint:** `POST /language/:analyze-text?api-version=2023-04-01`

**Request Body:**

```json
{
  "kind": "PiiEntityRecognition",
  "parameters": {
    "modelVersion": "latest",
    "piiCategories": ["USSocialSecurityNumber", "CreditCardNumber", ...]
  },
  "analysisInput": {
    "documents": [
      {
        "id": "1",
        "language": "en",
        "text": "My SSN is 123-45-6789 and my card is 4111-1111-1111-1111"
      }
    ]
  }
}
```

**Response Body (PII Detected):**

```json
{
  "kind": "PiiEntityRecognitionResults",
  "results": {
    "documents": [
      {
        "id": "1",
        "redactedText": "My SSN is *********** and my card is *******************",
        "entities": [
          {
            "text": "123-45-6789",
            "category": "USSocialSecurityNumber",
            "offset": 10,
            "length": 11,
            "confidenceScore": 0.85
          },
          {
            "text": "4111-1111-1111-1111",
            "category": "CreditCardNumber",
            "offset": 38,
            "length": 19,
            "confidenceScore": 0.95
          }
        ],
        "warnings": []
      }
    ],
    "errors": [],
    "modelVersion": "2023-04-15-preview"
  }
}
```

### Your API Endpoint

**Endpoint:** `POST /api/pii`

**Request:**

```json
{
  "text": "My SSN is 123-45-6789"
}
```

**Response (Blocked):**

```json
{
  "blocked": true,
  "message": "Your message contains Social Security Number information which cannot be processed for security reasons.",
  "detectedCategories": ["USSocialSecurityNumber"]
}
```

**Response (Allowed):**

```json
{
  "blocked": false,
  "message": null
}
```

**Response (Error - Fail Open):**

```json
{
  "blocked": false,
  "message": null,
  "warning": "PII check unavailable"
}
```

---

## PII Categories Reference

### High-Risk Banking Categories (Always Block)

| Category | Description | Example |
|----------|-------------|---------|
| `USSocialSecurityNumber` | US Social Security Number | 123-45-6789 |
| `CreditCardNumber` | Credit/debit card number | 4111-1111-1111-1111 |
| `USBankAccountNumber` | US bank account number | 1234567890 |
| `InternationalBankingAccountNumber` | IBAN | GB82 WEST 1234 5698 7654 32 |
| `SWIFTCode` | Bank SWIFT/BIC code | DEUTDEFF |

### Medium-Risk Categories (Configurable)

| Category | Description | Example |
|----------|-------------|---------|
| `USDriversLicenseNumber` | US driver's license | D123-456-789-012 |
| `USPassportNumber` | US passport number | 123456789 |
| `USIndividualTaxpayerIdentification` | ITIN | 900-70-0000 |

### Low-Risk Categories (Consider Context)

| Category | Description | Example |
|----------|-------------|---------|
| `Person` | Person names | John Smith |
| `PhoneNumber` | Phone numbers | +1-555-123-4567 |
| `Email` | Email addresses | john@example.com |
| `Address` | Physical addresses | 123 Main St |
| `IPAddress` | IP addresses | 192.168.1.1 |

### Reducing False Positives

The default Azure PII model can produce false positives for:
- Company names flagged as "Person" (e.g., "NVIDIA", "Microsoft")
- Abbreviations flagged as "Organization" (e.g., "IMF", "SEC")
- Technical terms flagged incorrectly

**Solution:** Filter by confidence threshold (0.8+) and specific categories:

```typescript
const filteredEntities = entities.filter((e) =>
  e.confidenceScore >= 0.8 &&
  BANKING_PII_CATEGORIES.includes(e.category)
);
```

---

## Fail Open vs Fail Closed

This implementation uses **fail open** strategy:

```typescript
// On error, allow message through
catch (error) {
  return { hasPii: false, entities: [] };
}
```

### When to Use Fail Open
- User experience is priority (don't block legitimate messages)
- PII check is defense-in-depth, not sole protection
- System has other security controls

### When to Use Fail Closed
- Regulatory requirement (HIPAA, PCI-DSS)
- PII check is critical security control
- False positives are acceptable

**Fail Closed Implementation:**

```typescript
catch (error) {
  return {
    hasPii: true,
    entities: [{ category: "Unknown", text: "", confidenceScore: 1.0, offset: 0, length: 0 }],
    error: "PII check failed - message blocked for safety"
  };
}
```

---

## Frontend Integration

Call the PII endpoint before sending messages to your AI:

```typescript
// In your message composer component
async function handleSubmit(message: string) {
  // 1. Check for PII first
  const piiResponse = await fetch('/api/pii', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });

  const piiResult = await piiResponse.json();

  if (piiResult.blocked) {
    // Show error to user, don't send message
    setError(piiResult.message);
    setBlockedCategories(piiResult.detectedCategories);
    return;
  }

  // 2. PII check passed, send to AI
  await sendToAI(message);
}
```

For full UI animations on PII check results, see `docs/PII_ANIMATIONS_PROMPT.md`.

---

## Testing

### Test Cases

```bash
# Clean message (should pass)
curl -X POST "http://localhost:3001/api/pii" \
  -H "Content-Type: application/json" \
  -d '{"text":"What are the top 5 funds by AUM?"}'
# Expected: {"blocked":false,"message":null}

# SSN detected (should block)
curl -X POST "http://localhost:3001/api/pii" \
  -H "Content-Type: application/json" \
  -d '{"text":"My SSN is 123-45-6789"}'
# Expected: {"blocked":true,"message":"...Social Security Number...","detectedCategories":["USSocialSecurityNumber"]}

# Credit card detected (should block)
curl -X POST "http://localhost:3001/api/pii" \
  -H "Content-Type: application/json" \
  -d '{"text":"Pay with card 4111-1111-1111-1111"}'
# Expected: {"blocked":true,"message":"...credit card...","detectedCategories":["CreditCardNumber"]}

# Test container directly
curl -X POST "http://your-pii-container:5000/language/:analyze-text?api-version=2023-04-01" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "PiiEntityRecognition",
    "parameters": {"modelVersion": "latest"},
    "analysisInput": {
      "documents": [{"id": "1", "language": "en", "text": "SSN 123-45-6789"}]
    }
  }'
```

---

## Troubleshooting

### Container Not Responding

```bash
# Check container status
az container show --name pii-detection --resource-group your-rg --query instanceView.state

# View container logs
az container logs --name pii-detection --resource-group your-rg

# Restart container
az container restart --name pii-detection --resource-group your-rg
```

### Authentication Errors (Cloud Endpoint)

```bash
# Verify API key
curl -X POST "https://your-service.cognitiveservices.azure.com/language/:analyze-text?api-version=2023-04-01" \
  -H "Ocp-Apim-Subscription-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"PiiEntityRecognition","parameters":{"modelVersion":"latest"},"analysisInput":{"documents":[{"id":"1","language":"en","text":"test"}]}}'

# Get Azure AD token
az account get-access-token --resource https://cognitiveservices.azure.com
```

### False Positives

If legitimate messages are being blocked:

1. Increase confidence threshold: `confidenceThreshold: 0.9`
2. Narrow category list to high-risk only
3. Add logging to see what's being detected

```typescript
console.log("Detected entities:", document.entities);
```

## PROMPT END

---

## Reference Files in This Repository

| File | Path | Purpose |
|------|------|---------
| PII Library | `src/lib/pii.ts` | Main PII detection logic |
| API Route | `src/app/api/pii/route.ts` | Next.js endpoint |
| Types | `src/types/index.ts` | TypeScript interfaces |
| Animations | `docs/PII_ANIMATIONS_PROMPT.md` | UI feedback animations |
| CLAUDE.md | `CLAUDE.md` | Full system architecture |

---

*Azure Language Service PII Container Implementation v1.0*
