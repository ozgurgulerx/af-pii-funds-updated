# af-pii-funds-updated Plan

## Summary

- Create a new repo at `/Users/ozgurguler/Developer/Projects/af-pii-funds-updated` by copying the actual Git root from `af-pii-funds/fund-rag-poc`, not the outer wrapper folder.
- First execution step in the new repo: create `plan.md` with this plan before any other code changes.
- Keep the backend behavior and backend code unchanged. The redesign is frontend-only: existing chat, PII, health, and backend integration must continue to work exactly as they do now.
- Rebuild the frontend using the `g-fon` shell and interaction style, but recolor it with a blue palette derived from the attached swatch instead of `g-fon`'s green.
- Execution order after bootstrap: `plan.md` -> local frontend design preview and screenshots -> finish implementation -> sync to new public GitHub repo -> deploy only the new frontend App Service.

## Implementation Changes

- Repo bootstrap:
  - Copy `af-pii-funds/fund-rag-poc` into `/Users/ozgurguler/Developer/Projects/af-pii-funds-updated`.
  - Keep this as an isolated repo and repoint the Git remote to the new GitHub repository.
  - Do not modify anything under `/Users/ozgurguler/Developer/Projects/af-pii-funds`.
  - Do not copy the outer wrapper-only assets such as `af-pii-funds/.env`, `af-pii-funds/2025q4_nport`, or `af-pii-funds/docu` into the new repo unless a runtime check proves they are required.

- Frontend redesign scope:
  - Keep the existing route surface: `/` redirect behavior, `/login`, `/chat`, `/api/chat`, `/api/pii`, `/api/health`.
  - Keep the existing request and SSE contract used by `af-pii-funds`; do not port `g-fon`'s extra API model.
  - Port `g-fon`'s visual language into the new repo:
    - typography stack (`IBM Plex Sans`, `Space Grotesk`, `JetBrains Mono`)
    - airy light canvas, soft gradients, subtle grid texture, rounded cards, compact chips, and rail-based workspace layout
    - responsive desktop/mobile behavior similar to `g-fon`
  - Replace `g-fon`'s green brand tokens with a blue system sampled from the attached image:
    - use the sampled swatch as the primary brand token
    - derive lighter blue-tinted surfaces, borders, hover states, and muted accents from it
    - keep positive/negative status colors distinct from the brand blue
  - Rebuild `/chat` as a `g-fon`-style workspace while preserving `af-pii-funds` functionality:
    - left rail for new chat, conversation history, and prompt shortcuts based on current `af-pii-funds` conversation data
    - center panel for the current streaming chat flow and message composer
    - right rail for citations, source excerpts, and PII/status context using the current `af-pii-funds` citation data
    - retain the current retrieval mode control (`code-rag` vs `foundry-iq`) but present it in the new shell
  - Re-skin `/login` to the same blue `g-fon`-derived style so it feels like part of the same product.
  - Do not add `g-fon`-only interactive pages or widgets that depend on APIs `af-pii-funds` does not have, including fund movers, sparklines, data-estate pages, AI-search-performance pages, and agent-framework pages.

- Code boundaries:
  - Leave backend Python, backend Docker, AKS manifests, and current backend runtime logic unchanged.
  - Keep Next API route behavior unchanged unless a minimal non-behavioral refactor is needed for the new UI structure.
  - Frontend work should stay concentrated in the Next app, shared UI components, and frontend deploy workflow.

- Preview-first delivery:
  - Before GitHub sync or Azure deploy, produce a working local preview of the redesigned frontend and capture desktop and mobile screenshots.
  - The screenshot set is the "show me the frontend design first" milestone; after that, continue through the remaining tasks unless a blocking issue appears.

- GitHub and deployment:
  - Push the new repo to a new public GitHub repository.
  - Create a new frontend App Service named `af-pii-funds-updated-frontend` in `rg-fund-rag`, reusing the existing Linux App Service plan `plan-fundrag-frontend`.
  - Configure app settings to match the current frontend topology:
    - `BACKEND_URL=http://10.0.0.10`
    - `NODE_ENV=production`
    - `PORT=3000`
  - Enable HTTPS-only on the new App Service.
  - Update the copied frontend deployment workflow to target `af-pii-funds-updated-frontend` and the new repo.
  - Reuse the same Azure subscription and identity model, but extend the GitHub OIDC/federated credential for the new public repo if the current credential is repo-scoped.
  - Do not provision a new backend deployment or change `aks-fund-rag`.

## Public Interfaces / Contracts

- No changes to these externally visible contracts:
  - `POST /api/chat` request shape and SSE event types used by the current `af-pii-funds` frontend
  - `POST /api/pii`
  - `GET /api/health`
- No backend schema, Python API, or AKS manifest changes.
- Any new frontend types should be presentation-only and map onto the existing `af-pii-funds` data structures.

## Test Plan

- Repo bootstrap checks:
  - confirm `/Users/ozgurguler/Developer/Projects/af-pii-funds` remains untouched
  - confirm the new repo has its own remote
- Frontend verification:
  - `npm ci` and `npm run build` succeed in the new repo
  - `/chat` renders the new desktop three-pane layout
  - mobile layout collapses correctly and remains usable
  - `/login` matches the new brand style and still navigates to `/chat`
  - sending a chat message still streams text correctly
  - citations still populate and open in the right rail
  - PII-blocked responses still surface clearly
  - retrieval mode switching still sends the correct mode
- Preview artifacts:
  - capture at least one desktop screenshot and one mobile screenshot of the redesigned frontend before deployment
- Deployment verification:
  - push to the new public GitHub repo
  - deploy to `af-pii-funds-updated-frontend`
  - verify `/api/health` on the new hostname
  - verify a live `/chat` interaction on the new frontend
  - verify the original `fundrag-frontend` and original repo remain unchanged

## Assumptions And Defaults

- GitHub visibility is public.
- The new repo name is `af-pii-funds-updated`.
- Deployment scope is frontend-only; the new frontend will point to the existing `af-pii-funds` backend endpoint.
- The source of truth for the copy is `af-pii-funds/fund-rag-poc`, because that is the actual Git repo root.
- The design preview will use the light theme as the primary presentation, with the blue palette derived from the attached swatch.
- `g-fon` is being used as a design-system and layout donor, not as a full feature donor, because its full workspace expects APIs that `af-pii-funds` does not expose.
