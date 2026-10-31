# MeepSheep Architecture

**Status:** Proposed target architecture. No application runtime has been verified as deployed.

## 1. Architecture goals

- One research engine powers the website and MCP interface.
- Provider integrations are replaceable adapters.
- Stateless request handling is preferred for the first release.
- Persistence is introduced only where product requirements justify it.
- Every external request has explicit limits, timeouts, and error handling.
- The design can begin on low-cost/free tiers without assuming those tiers are unlimited.

## 2. Proposed high-level topology

```text
Desktop / Mobile Browser                 MCP-compatible AI clients
          |                                        |
          v                                        v
   MeepSheep Web App                         Remote MCP endpoint
          |                                        |
          +-------------------+--------------------+
                              |
                              v
                    Shared application layer
                              |
             +----------------+----------------+
             |                |                |
             v                v                v
       Research core     Source pipeline   Policy / quotas
             |                |
             v                v
       Provider adapters  Fetch / parse / normalize
             |
      +------+------+------+
      |             |      |
    Search A     Search B  Future providers

       Optional persistence and artifacts:
          D1 / KV / R2 (Cloudflare)
```

This is a conceptual boundary diagram, not a claim that these services are configured.

## 3. Candidate hosting and data platform

### Cloudflare
Candidate responsibilities:
- Workers: API, MCP endpoint, orchestration, and server-side request controls.
- Workers Static Assets: delivery of the web client where suitable.
- D1: relational records such as users, saved research, jobs, and source metadata.
- KV: short-lived cache and lightweight lookup data where consistency requirements permit.
- R2: optional report exports, uploaded documents, and larger artifacts.

Do not add every service by default. Validate current product limits, pricing, bindings, regional behavior, and deployment compatibility before selecting each one.

### Supabase
Supabase is available as an alternative or complementary backend, not an automatic dependency. Before choosing it, compare the actual needs for authentication, relational storage, row-level security, storage, realtime, operational complexity, and cost against a Cloudflare-native design.

Avoid splitting ownership of the same records between D1 and Supabase without a documented reason and clear source of truth.

## 4. Application boundaries

### Web client
Responsibilities:
- Research input and configuration.
- Research progress and status.
- Evidence and source presentation.
- Report viewing, saving, and export.
- Account and privacy controls when authentication exists.
- Accessible responsive layouts.

The client must not contain provider secrets or privileged credentials.

### API/application layer
Responsibilities:
- Validate requests and enforce schemas.
- Authenticate users and clients.
- Apply quotas, rate limits, and request budgets.
- Coordinate research jobs.
- Normalize errors and outputs.
- Apply retention and privacy rules.
- Record operational telemetry without leaking sensitive content.

### Research core
Responsibilities:
- Parse and normalize the research question.
- Generate a bounded research plan.
- Route queries to selected providers.
- Merge, normalize, and deduplicate results.
- Retrieve and extract allowed public sources.
- Build evidence records.
- Assess support, contradiction, context, and gaps.
- Produce a traceable report object.

The research core must be independent of the website framework and MCP transport.

### Provider adapters
Each adapter should implement a shared internal contract:
- Capability declaration.
- Request construction.
- Authentication through server-side secrets.
- Timeout and retry policy.
- Provider-specific quota handling.
- Normalized results.
- Attribution and terms metadata.
- Health and error reporting.

Do not assume all providers support the same operators, freshness, content depth, or rights.

### MCP adapter
Expose a narrow, stable set of tools backed by the shared application layer. Initial candidate tools:
- `research`
- `verify_claim`
- `fetch_source`

MCP schemas must be explicit, bounded, and documented. Avoid exposing arbitrary internal functions or unrestricted fetch operations.

## 5. Data flow

1. Client submits a question or source URL.
2. API authenticates and validates the request.
3. Policy layer checks permissions, quotas, and budgets.
4. Research planner creates a bounded plan.
5. Provider adapters retrieve candidate sources.
6. Normalizer canonicalizes URLs and source metadata.
7. Deduplication groups repeated or syndicated material.
8. Source pipeline fetches permitted pages with SSRF and size protections.
9. Extractor captures text and metadata while preserving source attribution.
10. Evidence analysis classifies support, contradiction, context, and gaps.
11. Report builder produces structured findings and citations.
12. API returns results and optionally persists them under the user's retention settings.

A failure in one provider should not silently invalidate all results. Partial results must be labeled.

## 6. Candidate report schema

The exact schema must be versioned and validated before implementation. Initial conceptual fields:

- `report_id`
- `schema_version`
- `question`
- `created_at`
- `completed_at`
- `research_scope`
- `methodology`
- `sources[]`
- `claims[]`
- `evidence_items[]`
- `findings[]`
- `contradictions[]`
- `limitations[]`
- `provider_status[]`
- `cost_and_usage`

Every evidence item should reference a source record and preserve excerpt boundaries or a reproducible locator where possible.

## 7. Hosting and endpoint candidates

Candidate public addresses:
- Web app: `https://meepsheep.com`
- MCP endpoint: `https://mcp.meepsheep.com/mcp`

These are proposed routing choices only. DNS, domain ownership in the active Cloudflare account, certificates, Workers routes, and endpoint health must be verified before claiming availability.

## 8. Deployment architecture decisions still required

- Vite + React PWA versus a framework with server rendering.
- Cloudflare Workers native implementation versus framework adapter.
- Cloudflare D1 versus Supabase as primary relational store.
- Authentication provider and OAuth design.
- Provider shortlist and benchmark winner.
- Queue/job model for long-running research.
- Retention defaults and user-controlled deletion.
- Whether report exports require R2 in the first release.

## 9. Architecture constraints

- No local GPU requirement.
- No API keys in browser bundles.
- No unbounded fan-out across search providers.
- No unrestricted URL fetching.
- No hidden use of sources whose terms prohibit the intended use.
- No claim of unlimited free usage.
- No dependency on a single search provider for the product's core value.
