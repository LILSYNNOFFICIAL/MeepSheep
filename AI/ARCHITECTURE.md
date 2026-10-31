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


## 10. Repository health and automation architecture

The repository maintenance layer is separate from the MeepSheep application runtime.

```text
GitHub push / pull request ──> Read-only quality workflow
                                      |
                                      v
                                Unit tests + doctor
                                      |
                                      v
                                YAML validation

Trusted main push / schedule / manual dispatch
                    |
                    v
          Wellness Doctor (Python)
                    |
          +---------+----------+
          |                    |
          v                    v
    Findings + severity   README marker updater
                               |
                               v
                        Conditional bot commit
```

The doctor inspects repository files, Markdown integrity, required project documents, and workflow contracts. It uses no production secrets and makes no network requests. GitHub Actions handles workflow YAML parsing and supplies the run history.

The README updater owns only the content between `MEEPSHEEP_HEALTH_START` and `MEEPSHEEP_HEALTH_END` markers. It must preserve all other content and avoid no-op commits.

This subsystem does not monitor production HTTP availability, Cloudflare resources, Supabase databases, external search providers, or MCP clients. Those require separate authenticated probes and explicit product decisions.


## 11. Owner-approved architecture direction: AI interoperability

This section supersedes the earlier research-first topology as the primary product architecture. Research and evidence handling may later be exposed as an agent capability, but it is not the first-release core.

### Target topology

```text
AI clients / assistants
       | MCP
       v
MeepSheep MCP Gateway ---------------------+
       |                                    |
       v                                    v
Identity + Policy + Capability Registry   Web Console
       |
       v
Task Router / Orchestrator
       |
       +---- A2A adapter ----> A2A agents
       |
       +---- Vendor API adapters -> documented agent/model APIs
       |
       +---- Webhook adapter ---> explicitly configured endpoints
       |
       v
Durable task state + events + audit + usage
```

### Architectural rules

- MCP is the primary client-facing tool interface; A2A is the primary agent-to-agent protocol candidate.
- Both protocols map into a canonical internal task/message envelope defined in AI/API_SPEC.md.
- Use asynchronous task orchestration as the default, with a synchronous fast path for short tasks.
- Keep provider-specific SDKs and credentials inside adapters.
- A capability registry is not an authorization system. Discovery and invocation permissions are separate.
- Each agent connection has its own credentials, scopes, owner, health state, and revocation path.
- The caller explicitly controls what conversation context and attachments may be shared.
- Never transfer hidden reasoning, private system prompts, or unapproved conversation history.
- Bound task deadlines, retries, payload sizes, concurrency, fan-out, and aggregate cost.
- Preserve caller/target identity, remote task IDs, trace IDs, timestamps, status transitions, and result provenance.
- Do not allow unbounded recursive delegation.

### Asynchronous execution

Use durable task records and a validated queue/coordination primitive. Persist state transitions and make dispatch idempotent. Support queued, dispatching, working, input-required, completed, failed, canceled, rejected, and expired states. Streaming is optional; polling and durable retrieval must remain correct without it.

### Candidate Cloudflare topology

Workers may host the API, MCP endpoint, A2A endpoint, and adapters. Durable Objects and Queues are candidates for coordination and dispatch; D1 is a candidate relational store; R2 is optional artifact storage; KV is non-authoritative cache only. Validate current account access, pricing, limits, and runtime support before selecting services. No production infrastructure is claimed to exist.

See AI/INTEROPERABILITY.md, AI/API_SPEC.md, AI/DATA_MODEL.md, AI/DEPLOYMENT.md, and AI/BUILD_PLAN.md for the detailed contracts and plan.