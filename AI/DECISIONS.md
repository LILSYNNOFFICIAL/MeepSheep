# MeepSheep Decision Log

This file records decisions, proposals, and unresolved questions. Update it when a decision changes. Do not silently overwrite historical reasoning.

## Status vocabulary

- **Accepted:** explicitly selected and current.
- **Proposed:** recommended but not yet approved or implemented.
- **Open:** requires research, a test, or user decision.
- **Superseded:** replaced by a later recorded decision.

## Accepted decisions

### D-001: Product name
- **Status:** Accepted
- **Decision:** The product is named **MeepSheep**.
- **Canonical domain:** `meepsheep.com`
- **Reason:** Explicit product-owner direction.
- **Constraint:** Do not rename it SYNINTEL or use that as the product identity.

### D-002: Repository
- **Status:** Accepted
- **Decision:** Use `LILSYNNOFFICIAL/MeepSheep` as the working GitHub repository.
- **Default branch:** `main`
- **Reason:** Explicit product-owner direction and repository inspection.

### D-003: Documentation memory
- **Status:** Accepted
- **Decision:** Maintain project-specific AI working documentation under `AI/`, with `AI/WF.md` as the master workflow.
- **Reason:** The repository should carry project context across sessions and tools.
- **Rule:** Read the AI documents before substantial work and update them after verified changes.

### D-004: Dual product surface
- **Status:** Accepted as product direction
- **Decision:** MeepSheep is both a standalone web product and a reusable AI-tool service. The two surfaces share one research core.
- **Reason:** The product must be useful outside an AI assistant and consistent inside one.

## Proposed decisions

### P-001: Cloudflare-first hosting
- **Status:** Proposed
- **Proposal:** Evaluate Cloudflare Workers and Static Assets as the initial deployment platform.
- **Reason:** The owner has Cloudflare access and wants a low-cost hosted product.
- **Validation needed:** Current account access, domain zone, runtime compatibility, quotas, pricing, observability, and deployment workflow.

### P-002: MCP as the first AI integration protocol
- **Status:** Proposed
- **Proposal:** Implement a remote MCP endpoint backed by the same API and research core as the web application.
- **Validation needed:** Current client support, transport requirements, authentication, app review requirements, and plan/platform restrictions for each target assistant.

### P-003: Provider-independent search
- **Status:** Proposed
- **Proposal:** Use an adapter layer and benchmark a small provider shortlist instead of hardwiring one vendor.
- **Validation needed:** Relevance, freshness, diversity, extraction, legal terms, pricing, latency, and rate limits.

### P-004: Responsive PWA before native apps
- **Status:** Proposed
- **Proposal:** Deliver desktop and mobile browser experiences first; evaluate native apps only after product usage demonstrates a need.
- **Validation needed:** Offline requirements, push notifications, app-store distribution, and device-specific features.

## Open decisions

- **O-001:** Which frontend stack best fits current Cloudflare deployment support and the desired UI?
- **O-002:** Which platform owns primary user identity and relational data: Cloudflare, Supabase, or a deliberately separated hybrid?
- **O-003:** Which search and extraction providers pass the benchmark?
- **O-004:** Which authentication model is required for web users and remote MCP clients?
- **O-005:** What data is persisted by default, and what retention/deletion controls are required?
- **O-006:** How should long-running research jobs be queued, canceled, retried, and resumed?
- **O-007:** What free-tier usage limits can be responsibly offered after cost testing?
- **O-008:** Which AI platforms and client surfaces are launch targets, based on current official support and account constraints?

## Decision change procedure

1. Identify the decision ID.
2. Record the new evidence or requirement.
3. Mark the previous entry superseded if applicable.
4. Add a new entry with status, decision, rationale, and consequences.
5. Update affected architecture, security, and workflow documents.
6. Verify code and deployment match the accepted decision before describing it as implemented.


## Accepted decisions

### D-005: Four-level Wellness Doctor status mapping
- **Status:** Accepted
- **Decision:** Use 🟢 OK, 🟡 ERROR_1, 🔵 ERROR_2, and 🔴 MAJOR_FAILURE.
- **Precedence:** Critical/red overrides error/blue, which overrides warning/yellow, which overrides healthy/green.
- **Source of truth:** `AI/STATUS_ICONS.md`.
- **Reason:** The owner explicitly requested these four visible states.

### D-006: README health region is generated
- **Status:** Accepted
- **Decision:** GitHub Actions generates the README health summary inside exactly one marker pair. It may update only that region.
- **Reason:** The project status should be visible on GitHub and reflect automated inspection rather than manual claims.
- **Constraint:** No timestamp-only commits. Scheduled inspections run every 15 minutes on a best-effort basis; exact execution times live in Actions run history.

### D-007: Separate read-only CI and trusted write automation
- **Status:** Accepted
- **Decision:** Pull-request quality validation is read-only. A separate trusted-branch/scheduled/manual Wellness workflow may have `contents: write`.
- **Reason:** Prevent untrusted pull-request code from accessing a write-enabled token.
- **Constraint:** The write-enabled workflow must not have a pull_request trigger.

### D-008: Wellness Doctor is deterministic and dependency-light
- **Status:** Accepted
- **Decision:** The initial doctor uses Python standard library checks against repository files and workflow definitions.
- **Reason:** It should run without API credentials or production secrets and be easy to reproduce.
- **Constraint:** It does not certify unconfigured production services or external providers.
