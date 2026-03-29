# AF PII Funds Updated Operation Note

Last updated: 2026-03-29

## 1. What This App Is

`af-pii-funds-updated` is a redesigned frontend shell for the existing AF PII Funds mutual-fund intelligence system. It keeps the same backend estate and the same fund/macro retrieval logic, but wraps that system in a `g-fon`-style workspace UI with a more explicit evidence rail, live trace panel, and market-status hero card.

Operationally, it is not a brand-new platform. It is a new frontend repo and deployment that sits on top of the same core Azure backend/data stack:

- Next.js 15 frontend on Azure App Service
- Flask backend on AKS
- PostgreSQL for structured N-PORT data
- Azure AI Search for semantic fund retrieval and IMF macro retrieval
- Azure OpenAI for routing, SQL generation, embeddings, macro-to-fund reasoning, and answer synthesis
- Azure Language PII detection container as the PII gate
- Azure AI Foundry agent for the optional `foundry-iq` mode

The most important practical distinction is this:

- The live query path is real.
- Parts of the frontend session shell are still seeded/demo scaffolding.

That matters when describing how the app works.

## 2. Runtime Topology

### Frontend

The frontend is a standalone deployment:

- App Service: `af-pii-funds-updated-frontend`
- Stack: Next.js 15 / React 19
- Main user route: `/chat`
- Frontend-owned API routes:
  - `POST /api/pii`
  - `POST /api/chat`
  - `GET /api/health`

The browser does not call AKS directly. The browser talks to the Next.js server routes, and those routes proxy to the backend services.

### Backend

The backend is a Flask service running in AKS:

- Deployment: `fund-rag-backend`
- Namespace: `fund-rag`
- Service port: `5001`
- Health endpoint: `GET /health`
- Main chat endpoints:
  - `POST /api/chat`
  - `POST /api/chat/stream`

The backend deployment is configured with:

- 2 replicas
- large CPU / memory requests and limits
- permissive liveness / readiness thresholds to avoid killing long retrieval/synthesis requests
- PostgreSQL access via private networking

### PII Service

The PII gate is an Azure Language PII container endpoint:

- `http://pii-ozguler.eastus.azurecontainer.io:5000`

Both frontend and backend use this service. The frontend uses it as a preflight user-experience gate. The backend uses it again as server-side enforcement for the actual retrieval pipeline.

### Data And Model Services

The live app depends on these external services:

- Azure PostgreSQL database `fundrag`, schema `nport_funds`
- Azure AI Search endpoint `chatops-ozguler.search.windows.net`
- Azure AI Search indices:
  - `nport-funds-index`
  - `imf_raptor`
- Azure OpenAI endpoint `aoai-ep-swedencentral02.openai.azure.com`
- Azure AI Foundry project / Responses API for `funds-foundry-IQ-agent`

## 3. What The Frontend Actually Does

The `/chat` page is a hybrid of real runtime behavior and seeded UI state.

### Real Behavior

When a user submits a new question:

- the frontend performs a real PII check
- the frontend calls the real backend through Next.js `/api/chat`
- the answer streams in through SSE
- citations and trace steps are attached to the assistant message
- the right rail updates live with evidence and tool-trace information

This part is live and connected to the deployed backend.

### Seeded / Demo Behavior

The page does not boot into an empty persistent chat history from a server-side conversation store. Instead, it initializes from `src/data/seed.ts`:

- sample conversations
- sample citations
- hero profile suggestions
- follow-up prompt suggestions

This means:

- the initial sidebar conversations are seeded
- the initial evidence shown for those seeded messages is seeded
- the hero card and market-status commentary are frontend-driven presentation logic
- conversation persistence is in client state, not in a backend chat-history database

In practice, the app is currently a real query interface wrapped inside a seeded workspace shell.

### Page Layout

The main `/chat` layout is:

- left rail: seeded conversation/session list and prompt shortcuts
- center workspace: hero card, chat thread, follow-up chips, retrieval-mode switch, composer
- right rail: `Evidence` and `Tool trace`

The hero card has two modes:

- `expanded`
- `compact`

This mode is stored in `sessionStorage`, so it persists for the current browser session.

## 4. End-To-End Request Flow

The current request path for a normal query is:

1. User types into the message composer.
2. The composer calls `POST /api/pii`.
3. If PII is detected, the UI blocks submission and never calls chat.
4. If the message is allowed, the page calls `POST /api/chat`.
5. Next.js `/api/chat` immediately opens an SSE response to the browser.
6. Next.js `/api/chat` tries the Python streaming backend first:
   - `POST {BACKEND_URL}/api/chat/stream`
7. If the Python streaming endpoint fails, Next.js falls back to:
   - `POST {BACKEND_URL}/api/chat`
8. In the streaming path, SSE events are forwarded through to the browser.
9. In the fallback path, Next.js reconstructs a synthetic SSE sequence from the JSON response.
10. The page consumes SSE frames and updates:
    - inline streaming answer text
    - live trace state
    - citations
    - assistant message metadata

The preferred operational path is the streaming backend path. The legacy JSON path remains as a compatibility fallback.

## 5. Public Interfaces In Use

### Frontend-facing Next.js routes

- `POST /api/pii`
- `POST /api/chat`
- `GET /api/health`

### Backend routes

- `GET /health`
- `POST /api/chat`
- `POST /api/chat/stream`
- `POST /api/query` exists as a lower-level route with an optional forced route, but it is not the main user-facing chat path

### Retrieval modes

The frontend exposes two user-selectable retrieval modes:

- `code-rag`
- `foundry-iq`

### SSE frame types

The chat UI currently expects and uses these event types:

- `pii_status`
- `metadata`
- `progress`
- `text`
- `citations`
- `done`
- `error`

## 6. PII Protection Flow

PII protection is a two-layer system.

### Layer 1: frontend preflight gate

The message composer calls `POST /api/pii` before it calls chat. This route:

- validates input
- logs the request
- calls the Azure Language PII service through `checkPii()`
- returns:
  - `blocked: true` with categories and user-facing warning text, or
  - `blocked: false`

The composer then drives the visual security states:

- idle
- checking
- passed
- blocked

This is the user-visible “PII protected” experience.

### Layer 2: backend enforcement

The backend checks the raw user message again before retrieval:

- `retriever.check_pii(message)` in the streaming worker
- the retriever's internal `pii_filter.check(query)` inside `UnifiedRetriever.answer()` for the non-streaming path

If blocked:

- the trace emits a completed `pii-check`
- a `pii_status` event is sent with `thread="blocked"`
- metadata is emitted with route `BLOCKED`
- the backend returns a blocking warning instead of continuing to retrieval

### Important operational caveat

The system currently fails open on PII service failure:

- the frontend `/api/pii` route allows the message through on error
- the TypeScript PII helper also returns “no PII” on fetch/API failure
- the Python `PiiFilter` returns a non-blocking result on timeout/connection errors

So the intended security model is strict, but the current availability behavior is permissive if the PII service is unavailable.

## 7. Code-RAG Mode

`code-rag` is the main custom retrieval pipeline. It is implemented by `UnifiedRetriever`.

This mode is not a generalized multi-agent system. It is a routed RAG pipeline with several LLM-assisted sub-processes.

### Core components

- `QueryRouter`
  - chooses the retrieval route
  - normally uses Azure OpenAI `gpt-5-nano`
  - can fall back to keyword heuristics

- `SQLGenerator`
  - uses Azure OpenAI to generate SQL from natural language against the N-PORT schema

- `query_sql()`
  - executes generated SQL against PostgreSQL in production
  - uses SQLite locally if `USE_POSTGRES` is not enabled

- `query_semantic()`
  - computes an embedding
  - runs vector + text search against `nport-funds-index`

- `query_raptor()`
  - computes an embedding
  - runs vector + text search against `imf_raptor`
  - used for IMF / macro context

- `_synthesize_answer()` and `_synthesize_answer_streaming()`
  - use Azure OpenAI to turn retrieved context into the final answer

### Active route set

The current routed retrieval paths are:

- `SQL`
- `SEMANTIC`
- `RAPTOR`
- `SEMANTIC_RAPTOR`
- `HYBRID`
- `CHAIN`

### What each route does

#### SQL

Used for precise structured lookups:

- rankings
- comparisons
- specific holdings
- fund metrics
- filters and aggregations

This route:

- generates SQL with `SQLGenerator`
- runs it against the N-PORT relational schema
- builds citations from returned rows

#### SEMANTIC

Used for descriptive and style-oriented fund questions.

This route:

- embeds the query
- searches `nport-funds-index`
- returns fund-level descriptive context and semantic citations

#### RAPTOR

Used for pure macro/economic questions.

This route:

- embeds the query
- searches `imf_raptor`
- returns IMF WEO summary/chunk material

#### SEMANTIC_RAPTOR

Used when the question combines fund style and macro context but does not need precise SQL-heavy structured data.

This route:

- embeds once
- runs semantic fund search and macro RAPTOR search in parallel
- merges those contexts for synthesis

#### HYBRID

Used when the answer needs both fund data and macro context.

This route:

- embeds once
- runs SQL, semantic, and RAPTOR retrieval in parallel
- truncates and combines those result sets
- synthesizes one answer over the merged context

#### CHAIN

This is the most explicitly staged route.

It works like this:

1. retrieve macro context from RAPTOR first
2. derive fund-selection criteria from that macro context using an LLM call
3. build a new fund-oriented query using those derived criteria
4. run SQL and semantic fund retrieval
5. synthesize the final answer over:
   - macro context
   - derived criteria
   - fund retrieval outputs

Operationally, `CHAIN` is the closest thing in the app to orchestration logic, but it is still a single backend pipeline, not a fleet of autonomous agents.

## 8. Foundry IQ Mode

`foundry-iq` is the second retrieval mode. This path does not use `UnifiedRetriever`.

Instead, it uses `FoundryAgentClient`, which:

- calls the Azure AI Foundry Responses API
- references the prompt-type agent `funds-foundry-IQ-agent`
- sends the user message as the input
- loops through MCP approval requests and auto-approves them
- extracts final message text and annotations/citations from the Responses API output

This mode is the only place where the app clearly invokes an external agent in the stronger sense.

Practical differences from `code-rag`:

- retrieval is managed by the Foundry agent and its configured knowledge base
- the app does not expose the same deep route-by-route retrieval internals
- the trace shown in the UI is a compatibility trace around the Foundry call, not a deep internal breakdown of the Foundry agent’s own reasoning steps

So the right way to describe the system is:

- `code-rag`: routed custom RAG pipeline
- `foundry-iq`: external managed agent call

## 9. Data Sources

### 9.1 Structured fund data

The relational source of truth is SEC N-PORT data loaded into PostgreSQL in production and SQLite in local/development mode.

The documented schema includes:

- 15 core tables
- around 250 funds
- around 490,447 holdings
- around 572,768 identifiers
- around 305,413 debt-security rows

Representative tables include:

- `fund_reported_info`
- `registrant`
- `submission`
- `fund_reported_holding`
- `identifiers`
- `debt_security`
- `interest_rate_risk`
- `monthly_total_return`
- `securities_lending`
- `borrower`

This is the source used for:

- AUM rankings
- holdings lookups
- manager/fund metadata
- bond and rate-risk details
- various structured comparisons

### 9.2 Semantic fund corpus

The semantic fund source is Azure AI Search index `nport-funds-index`.

It contains fund-oriented text and metadata such as:

- fund name
- manager name
- total assets
- fund type
- free-text content
- top holdings text
- accession number
- vector field for semantic retrieval

This is the source used for:

- “funds like X”
- descriptive fund questions
- style matching
- semantic context in hybrid routes

### 9.3 Macro corpus

The macro source is Azure AI Search index `imf_raptor`.

The retriever expects fields like:

- `id`
- `doc_id`
- `level`
- `kind`
- `raw`
- `contentVector`

This is treated as a RAPTOR-style hierarchical macro corpus built from IMF WEO material. It is used for:

- inflation outlook
- growth outlook
- rate environment
- macro context in `RAPTOR`, `SEMANTIC_RAPTOR`, `HYBRID`, and `CHAIN`

### 9.4 Foundry knowledge base

In `foundry-iq` mode, the effective data source is the knowledge base configured on `funds-foundry-IQ-agent`. The repo treats that as an external managed knowledge layer and only consumes the answer/citations returned by the Foundry Responses API.

### 9.5 Seed data

`src/data/seed.ts` contains:

- sample conversations
- sample citations
- hero profile suggestions
- suggested prompts

This is not a source of truth for fund analysis. It is a frontend scaffold used to make the workspace feel populated on load.

## 10. Trace And Telemetry

The app now has real live trace streaming for the preferred chat path.

### Backend trace model

The Python backend uses `ProgressEmitter`, a request-scoped queue-backed emitter. It can emit:

- progress steps
- metadata
- PII status
- text chunks
- final result
- error

`/api/chat/stream` starts a worker thread and leaves the Flask response open while backend work proceeds. As steps complete, the emitter feeds SSE frames to the client.

### Step sequence

In the `code-rag` streaming path, the current step model is:

- `pii-check`
- `context-compaction`
- `query-rewrite`
- `query-analysis`
- `intent-router-v2`
- route-specific retrieval step
- `answer-brief`
- `llm-generate`
- `answer-validation`

Not all of these steps represent heavy independent subsystems. A few are thin operational wrappers used to make the backend lifecycle legible in the UI:

- `context-compaction` is currently lightweight session bookkeeping, not a sophisticated memory-compression system
- `query-rewrite` is often a fast skip decision rather than a full rewrite stage
- `answer-brief` and `answer-validation` are explicit backend trace stages, but they are not separate validator services

### Metadata

The metadata frame carries:

- `intent`
- `sourcesUsed`
- `route`
- `routeConfidence`
- `routeReasoning`
- `artifacts`

Artifacts are currently lightweight and mainly used to expose whether a SQL query was part of the route.

### Frontend trace behavior

The chat page:

- shows live trace steps inline in the waiting assistant bubble
- persists the final trace on the assistant message
- mirrors the trace in the right-rail `Tool trace` tab
- automatically switches the right rail toward trace during active progress
- switches back toward evidence when citations arrive, unless the user has manually chosen otherwise

### Recent correction

As of 2026-03-29, trace timing attribution was corrected so that:

- `Query Analysis` measures only local signal extraction
- `Intent Router V2` now owns the actual LLM route-selection latency

This matters because the previous trace made `Query Analysis` look artificially slow.

## 11. What “Agents” And “Processes” Are Actually Running

The system uses the word “agent” in multiple ways, and they should be separated clearly.

### External services

These are real runtime services, not in-process classes:

- Azure Language PII container
- Azure OpenAI
- Azure AI Search
- Azure PostgreSQL
- Azure AI Foundry Responses API / Foundry agent

### LLM-assisted in-app sub-processes

Inside `code-rag`, several steps are LLM-assisted:

- route selection
- SQL generation
- CHAIN criteria derivation
- final answer synthesis

These are not autonomous agents. They are model calls inside one orchestrated backend process.

### Request-scoped backend processes

Per chat request, the backend may run:

- Flask request handling
- a background worker thread for streaming
- PII detection call(s)
- route selection
- embeddings generation
- one or more search requests
- one or more SQL queries
- one or more synthesis/model calls
- progress emission over SSE

### True external agent use

The closest thing to a true agent in the runtime is `funds-foundry-IQ-agent` used in `foundry-iq` mode.

That client:

- calls a managed agent endpoint
- responds to tool approval requests
- waits for final output

### Legacy code path

The repo still contains `FundRAGAgent`, which is an older agent-style class. It is not the main runtime path for the deployed app. The deployed app primarily uses:

- `UnifiedRetriever`
- `FoundryAgentClient`
- Next.js proxy routes
- the current chat page state model

## 12. Persistence And State

The system currently mixes several state models:

### Persistent production data

- fund and holdings data in PostgreSQL
- search indices in Azure AI Search
- Foundry knowledge configuration outside this repo

### Session-level UI state

In the frontend, these are mainly in-memory React state:

- active messages
- current citations
- current trace
- selected right-rail tab
- active citation
- loading/streaming state

### Browser session state

The hero expanded/compact mode is stored in `sessionStorage`.

### Not currently persisted as first-class app data

There is no dedicated backend chat history store for the updated UI. The seeded conversations are not live conversation records, and new message history is not written back to a persistent conversation service by this frontend.

## 13. Deployment And Operations

### Frontend deployment

The frontend has a working GitHub Actions deployment pipeline:

- workflow: `deploy-frontend.yaml`
- trigger: pushes affecting frontend files
- deployment target: `af-pii-funds-updated-frontend`

That workflow:

- builds the Next.js app
- prepares a standalone deployment package
- deploys via `az webapp deploy`
- verifies:
  - `/api/health`
  - `/api/pii`
  - JavaScript chunk availability

### Backend deployment

The backend also has a GitHub Actions workflow:

- workflow: `deploy-backend.yaml`

It is intended to:

- log in to Azure
- log in to ACR
- build and push the backend image
- update AKS

However, as of 2026-03-29, the backend GitHub workflow is not reliably operational because the ACR login step fails with an auth/registry-resolution problem.

### Current backend operational reality

In practice, backend changes may need manual rollout:

- build remotely with `az acr build`
- push tagged image to `aistartuptr.azurecr.io/fund-rag-backend`
- update the AKS deployment image manually with `kubectl set image`
- verify rollout and health with `kubectl`

So the backend is deployable, but not yet fully hands-off through GitHub Actions.

## 14. Current Caveats And Rough Edges

This is the concise list of things an engineer should not miss:

1. The updated frontend is real, but its initial workspace state is still seeded.
2. The conversation list is not backed by a live conversation store.
3. Some UI elements are product shell / demo guidance rather than backend-driven truth:
   - hero card
   - market-status commentary
   - seeded sessions
   - some suggested prompts
4. The PII system currently fails open if the PII service is unavailable.
5. `code-rag` is not a multi-agent platform; it is a routed RAG system with several LLM-assisted stages.
6. `foundry-iq` is the real external agent path.
7. The backend deployment workflow in GitHub is currently weaker than the frontend deployment workflow because of ACR auth issues.
8. The app intentionally carries heavier backend resource settings to keep long-running retrieval/synthesis requests alive.

## 15. Bottom Line

`af-pii-funds-updated` is best understood as a new frontend deployment on top of an existing Azure fund-analysis backend.

What is fully real:

- the PII checks
- the Next.js proxy layer
- the Flask backend
- the routed retrieval logic
- PostgreSQL / AI Search / OpenAI / Foundry integrations
- live SSE answer streaming
- live trace telemetry

What is still partly scaffolded:

- initial session list
- initial conversation/evidence population
- hero-driven market/status framing
- frontend-only workspace affordances that are not backed by a chat-history service

Operationally, the app is already useful as a real fund-intelligence interface, but it is still a hybrid of production-backed retrieval and seeded workspace presentation.
