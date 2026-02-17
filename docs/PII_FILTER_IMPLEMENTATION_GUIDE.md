# PII Filter Implementation Guide

This guide explains how to implement PII (Personally Identifiable Information) detection and blocking for user inputs, based on the fund-rag project implementation.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INPUT FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User types message                                                 │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────────┐    POST /api/pii     ┌───────────────────────┐│
│  │  Frontend       │ ──────────────────── │  Azure PII Container  ││
│  │  (React/Next.js)│                      │  (Language Service)   ││
│  │                 │ ◄─────────────────── │                       ││
│  │  message-       │   {blocked, message, │  Runs on Azure ACI    ││
│  │  composer.tsx   │    detectedCategories│  No auth needed       ││
│  └────────┬────────┘    }                 └───────────────────────┘│
│           │                                                         │
│           │ If blocked=false                                        │
│           ▼                                                         │
│  ┌─────────────────┐                                               │
│  │  Send to AI     │                                               │
│  │  Backend        │                                               │
│  └─────────────────┘                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Azure Resources Needed

### Option 1: Azure PII Container (Recommended for On-Prem Simulation)
- **Service:** Azure Container Instances (ACI)
- **Image:** `mcr.microsoft.com/azure-cognitive-services/textanalytics/pii`
- **No API key needed** - container handles billing internally via Azure resource connection
- **Endpoint example:** `http://your-container.eastus.azurecontainer.io:5000`

### Option 2: Azure Language Service (Cloud)
- **Service:** Azure Cognitive Services - Language
- **Requires:** API key or Azure AD authentication
- **Endpoint example:** `https://your-service.cognitiveservices.azure.com`

## Files to Copy/Reference

### 1. TypeScript Types (`src/types/index.ts`)

Add these PII-related types:

```typescript
// PII Detection Types
export interface PiiEntity {
  text: string;
  category: string;
  offset: number;
  length: number;
  confidenceScore: number;
}

export interface PiiCheckResult {
  hasPii: boolean;
  entities: PiiEntity[];
  redactedText?: string;
}
```

### 2. PII Detection Library (`src/lib/pii.ts`)

This is the core PII checking logic:

```typescript
import { z } from "zod";
import type { PiiCheckResult, PiiEntity } from "@/types";

// Schema for PII entity from Azure response
const PiiEntitySchema = z.object({
  text: z.string(),
  category: z.string(),
  offset: z.number(),
  length: z.number(),
  confidenceScore: z.number(),
});

// Schema for Azure PII response
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

// PII categories to check for (customize based on your use case)
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
  confidenceThreshold?: number;
}

/**
 * Check text for PII using Azure Language Service (cloud or container)
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

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!isContainer && apiKey) {
    headers["Ocp-Apim-Subscription-Key"] = apiKey;
  }

  try {
    const requestBody = {
      kind: "PiiEntityRecognition",
      parameters: {
        modelVersion: "latest",
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
      console.error("PII check failed:", response.status);
      return { hasPii: false, entities: [] };
    }

    const data = await response.json();
    const parsed = AzurePiiResponseSchema.safeParse(data);

    if (!parsed.success) {
      console.error("Failed to parse PII response:", parsed.error);
      return { hasPii: false, entities: [] };
    }

    const document = parsed.data.results.documents[0];
    if (!document) {
      return { hasPii: false, entities: [] };
    }

    // Filter by confidence threshold AND relevant categories
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
    // Fail open for availability
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

function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    Person: "personal name",
    PhoneNumber: "phone number",
    Email: "email address",
    USBankAccountNumber: "bank account number",
    CreditCardNumber: "credit card",
    USSocialSecurityNumber: "Social Security Number",
    // Add more as needed
  };
  return categoryMap[category] || category.toLowerCase();
}
```

### 3. API Route (`src/app/api/pii/route.ts`)

Next.js API route that the frontend calls:

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
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const result = await checkPii({ text: parsed.data.text });

    if (result.hasPii) {
      return NextResponse.json({
        blocked: true,
        message: formatPiiWarning(result.entities),
        detectedCategories: result.entities.map((e) => e.category),
      });
    }

    return NextResponse.json({
      blocked: false,
      message: null,
    });
  } catch (error) {
    // Fail open - allow message through on error
    return NextResponse.json({
      blocked: false,
      message: null,
      warning: "PII check unavailable",
    });
  }
}
```

### 4. Frontend Integration

In your message composer component, add PII checking before submit:

```typescript
type PiiStatus = "idle" | "checking" | "passed" | "blocked";

const [piiStatus, setPiiStatus] = useState<PiiStatus>("idle");
const [piiError, setPiiError] = useState<string | null>(null);
const [detectedCategories, setDetectedCategories] = useState<string[]>([]);

const checkForPii = async (text: string): Promise<boolean> => {
  setPiiStatus("checking");
  setPiiError(null);
  setDetectedCategories([]);

  try {
    const response = await fetch("/api/pii", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const result = await response.json();

    if (result.blocked) {
      setPiiStatus("blocked");
      setPiiError(result.message);
      setDetectedCategories(result.detectedCategories || []);
      return false; // Block submission
    }

    setPiiStatus("passed");
    // Reset to idle after showing success
    setTimeout(() => setPiiStatus("idle"), 3000);
    return true; // Allow submission
  } catch (error) {
    setPiiStatus("idle");
    return true; // Fail open
  }
};

const handleSubmit = async () => {
  const isClean = await checkForPii(input.trim());
  if (!isClean) return; // Don't submit if PII detected

  // Proceed with sending message to AI
  onSubmit(input.trim());
};
```

## Environment Variables

Add these to your `.env` file:

```bash
# Option 1: Azure PII Container (recommended)
PII_ENDPOINT="http://your-container.eastus.azurecontainer.io:5000"
PII_CONTAINER_ENDPOINT="http://your-container.eastus.azurecontainer.io:5000"

# Option 2: Azure Language Service (cloud)
# PII_ENDPOINT="https://your-service.cognitiveservices.azure.com"
# PII_API_KEY="your-api-key-here"
```

## Deploying the Azure PII Container

### Using Azure CLI:

```bash
# Create resource group
az group create --name rg-pii-filter --location eastus

# Deploy container
az container create \
  --resource-group rg-pii-filter \
  --name pii-container \
  --image mcr.microsoft.com/azure-cognitive-services/textanalytics/pii:latest \
  --cpu 1 \
  --memory 4 \
  --ports 5000 \
  --ip-address Public \
  --environment-variables \
    Eula=accept \
    Billing=https://your-cognitive-service.cognitiveservices.azure.com/ \
    ApiKey=your-cognitive-services-key

# Get the public IP
az container show \
  --resource-group rg-pii-filter \
  --name pii-container \
  --query ipAddress.ip \
  --output tsv
```

### Container Environment Variables:
| Variable | Value | Description |
|----------|-------|-------------|
| `Eula` | `accept` | Accept the license terms |
| `Billing` | Your Cognitive Services endpoint | For billing purposes |
| `ApiKey` | Your Cognitive Services key | For billing authentication |

## UI/UX States (Optional - For Visual Feedback)

The fund-rag project uses Framer Motion for animations. Here are the visual states:

### 1. Idle State
- Neutral gray badge showing "PII Protected"
- Shield icon

### 2. Checking/Scanning State
- Amber/yellow color scheme
- Animated scanning line
- Pulsing border
- Rotating scan icon

### 3. Passed State
- Green color scheme
- Green flash overlay
- Checkmark badge
- Success banner (auto-hides after 2 seconds)

### 4. Blocked State
- Red color scheme
- Red flash with glow effect
- Shake animation
- Error banner with detected PII categories
- Persists until user edits the message

## Testing

Test the PII detection with these examples:

```bash
# Should be blocked (SSN)
curl -X POST http://localhost:3000/api/pii \
  -H "Content-Type: application/json" \
  -d '{"text":"My SSN is 123-45-6789"}'

# Should be blocked (Credit Card)
curl -X POST http://localhost:3000/api/pii \
  -H "Content-Type: application/json" \
  -d '{"text":"Card number 4532-1234-5678-9012"}'

# Should pass (no PII)
curl -X POST http://localhost:3000/api/pii \
  -H "Content-Type: application/json" \
  -d '{"text":"What are the top 5 funds?"}'
```

## PII Categories Reference

| Category | Description | Example |
|----------|-------------|---------|
| `USSocialSecurityNumber` | US SSN | 123-45-6789 |
| `CreditCardNumber` | Credit/debit cards | 4532-1234-5678-9012 |
| `USBankAccountNumber` | Bank account numbers | Account: 12345678 |
| `InternationalBankingAccountNumber` | IBAN | GB82 WEST 1234 5698 7654 32 |
| `SWIFTCode` | SWIFT/BIC codes | DEUTDEFF |
| `PhoneNumber` | Phone numbers | +1-555-123-4567 |
| `Email` | Email addresses | user@example.com |
| `Person` | Person names | John Smith |
| `Address` | Physical addresses | 123 Main St, City |

## Dependencies

```json
{
  "dependencies": {
    "zod": "^3.x",
    "framer-motion": "^11.x"  // Optional, for animations
  }
}
```

## Key Design Decisions

1. **Fail Open**: On API errors, messages are allowed through (availability over security in edge cases)
2. **Confidence Threshold**: Default 0.8 (80%) to reduce false positives
3. **Category Filtering**: Only banking-relevant PII categories are checked
4. **No Server-Side Storage**: PII text is never logged or stored
5. **Container Preference**: Using ACI container simulates on-prem deployment

## Files to Copy from fund-rag

| File | Purpose |
|------|---------|
| `src/types/index.ts` | PiiEntity, PiiCheckResult types |
| `src/lib/pii.ts` | Core PII checking logic |
| `src/app/api/pii/route.ts` | API endpoint |
| `src/components/chat/message-composer.tsx` | UI with animations (optional) |

---

**Questions?** Reference the fund-rag-poc implementation at:
`/Users/ozgurguler/Developer/Projects/af-pii-funds/fund-rag-poc/`
