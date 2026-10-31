# MeepSheep Architecture

**Status:** Proposed target architecture. No application runtime or production infrastructure has been verified as deployed.
**Primary mission:** AI interoperability, agent discovery, delegation, and coordination.

## 1. Architecture goals

- Let independently operated AI clients and agents communicate through supported, authorized interfaces.
- Use MCP for AI-client-to-MeepSheep tool access and A2A for agent-to-agent task exchange.
- Bridge other documented provider APIs and webhooks through replaceable adapters.
- Normalize every protocol into one canonical task/message model.
- Use durable asynchronous orchestration by default, with a synchronous fast path.
- Enforce identity, authorization, privacy, budgets, deadlines, and provenance at the shared core.
- Keep model inference with connected AI providers. MeepSheep does not need to host a foundation model or local GPU.

## 2. Target topology

```text
AI clients / assistants
        | MCP
        v
MeepSheep MCP Gateway -------------------- Web Console
        |
        v
Authentication + Tenant Policy + Grants
        |
        v
Agent Registry + Capability Discovery
        |
        v
Task Router / Orchestrator
        |
        +---- A2A adapter ----------> A2A-compatible agents
        |
        +---- Vendor API adapters --> documented agent/model APIs
        |
        +---- Webhook adapter ------> explicitly configured endpoints
        |
        v
Durable task state + messages + events + audit + usage
```

All product surfaces share the same application services. The web console is not a separate implementation of routing or authorization.

## 3. Protocol responsibilities

### MCP

The remote MCP server exposes a narrow tool surface to compatible AI clients: list agents, inspect an agent, send a task, inspect/wait for a task, cancel a task where supported, and list the caller's own connections. Administrative credential and policy operations stay in a separately authenticated owner interface.

MCP makes MeepSheep capabilities available to an AI client. It does not automatically make the connected client itself an A2A agent.

### A2A

The A2A adapter discovers and communicates with agents that implement the protocol. It maps Agent Cards, messages, tasks, artifacts, and task states into the canonical MeepSheep model. MeepSheep may expose its own A2A endpoint and Agent Card for compatible peers.

### Vendor APIs and webhooks

Use official, documented interfaces for systems that do not expose A2A. A provider API integration is not the same as access to the provider's consumer chat UI. Never rely on unofficial browser automation as the default connector.

## 4. Core application boundaries

### Identity and policy

Authenticate the caller, derive tenant and principal identity from trusted credentials, resolve grants server-side, and check permissions for discovery, dispatch, status reads, cancellation, artifact access, and administration. Discovery does not imply invocation permission.

### Agent registry

Store agent identity, owner, trust state, protocol/version, endpoint reference, declared capabilities, modalities, limits, health, and connection state. Capability declarations are untrusted metadata, not authorization.

### Connection and credential manager

Each connection has an isolated credential reference, auth method, scopes, owner, health state, and revocation path. Credentials remain server-side, encrypted at rest, redacted from logs, and never embedded in task envelopes.

### Task router and orchestrator

Validate requests, enforce budgets and deadlines, select an authorized adapter, create durable task state, dispatch idempotently, track progress, normalize results, and record provenance. Child tasks may narrow but never expand parent permissions, deadlines, or budgets.

### Protocol adapters

Each adapter declares protocol/version, auth method, capabilities, sync/async/streaming behavior, payload limits, timeout/cancellation support, idempotency semantics, rate limits, and data handling constraints. Adapters normalize responses and errors without broadening authority.

### Web console

Manage connections, agent profiles, permissions, tasks, and audit history. Provide clear empty, loading, waiting, failed, canceled, and completed states. Do not expose secrets or privileged provider credentials to the browser.

## 5. Canonical task lifecycle

Internal states: `queued`, `dispatching`, `working`, `input_required`, `completed`, `failed`, `canceled`, `rejected`, and `expired`.

State transitions are validated and recorded as append-only events. Every task has a task ID, trace ID, authenticated caller, target agent, connection, deadline, budget, idempotency identity, context-sharing policy, and provenance. Short tasks may return synchronously; long tasks are retrieved by task ID. Streaming is optional, and durable polling/result retrieval must work without it.

See AI/API_SPEC.md for the envelope, MCP tool contracts, error codes, and protocol baselines.

## 6. Asynchronous execution

Use durable task records and a validated orchestration primitive. Required behaviors include:
- Deadline propagation and bounded retries.
- Idempotent dispatch and duplicate-event handling.
- Cancellation where supported.
- Durable progress and result retrieval.
- Input-required and human approval states.
- Bounded concurrency, fan-out, delegation depth, and total cost.
- Trace and provenance across every protocol boundary.

### Cloudflare candidates

- **Workers / Agents SDK:** API, MCP server/client integration, routing, and adapter execution.
- **Workflows:** leading candidate for durable multi-step tasks, retries, pauses, external events, and approvals.
- **Durable Objects:** candidate for per-agent coordination, strongly consistent state, and live connections.
- **D1:** candidate relational store for registry, grants, task metadata, audit indexes, and usage.
- **Queues:** optional decoupled fan-out or background delivery.
- **R2:** optional artifact storage.
- **KV:** non-authoritative cache only where consistency requirements allow it.

Cloudflare's official docs describe Workflows as durable multi-step execution with persisted state, automatic retries, and waits for external events or approvals. Durable Objects provide globally unique coordination and strongly consistent transactional storage. The Agents SDK documents MCP server and client support. These are candidates, not a final service selection. Verify account access, pricing, limits, and SDK compatibility before implementation.

References: https://developers.cloudflare.com/workflows/ ; https://developers.cloudflare.com/durable-objects/ ; https://developers.cloudflare.com/agents/model-context-protocol/ .

## 7. Data and storage boundaries

See AI/DATA_MODEL.md for logical entities. Select one primary owner for relational records; do not split authoritative records between D1 and Supabase without an explicit decision. Store large artifacts separately with expiring authorized references. Store credentials in a secret manager, not in relational text fields. Retain task payloads only according to a published retention policy.

## 8. Security and trust boundaries

- Treat remote agents, Agent Cards, callbacks, messages, artifacts, and provider responses as untrusted.
- Validate endpoints and redirects against SSRF protections.
- Enforce tenant isolation and least privilege on every operation.
- Verify callback authenticity and reject replayed or out-of-order events.
- Bound task duration, retries, payload sizes, fan-out, delegation depth, concurrency, and budget.
- Share only caller-authorized context.
- Never transmit hidden reasoning, private system prompts, or unapproved conversation history.
- Require explicit approval for sensitive actions.
- Preserve audit evidence without logging secrets or full private payloads.

See AI/SECURITY.md and AI/COST_MODEL.md.

## 9. Deployment candidates and constraints

Candidate endpoints:
- Web: https://meepsheep.com
- MCP: https://mcp.meepsheep.com/mcp
- A2A: https://agents.meepsheep.com (exact path follows selected SDK/spec)

These are proposed routes only. The connected Cloudflare account inventory inspected on 2026-10-31 returned no zones, Worker scripts, D1 databases, Durable Object namespaces, or Queues. This is an account-scoped snapshot and does not rule out another account or registrar. Do not deploy or change DNS until the correct domain zone and account are confirmed.

No local GPU is required for the relay architecture. Connected providers perform model inference; MeepSheep performs routing, authorization, orchestration, and result delivery. Free-tier availability does not mean unlimited usage or zero marginal cost.

## 10. Related specifications

- AI/INTEROPERABILITY.md: product interoperability strategy.
- AI/API_SPEC.md: canonical task contract and protocol interfaces.
- AI/DATA_MODEL.md: logical data entities.
- AI/SECURITY.md: threat model and controls.
- AI/COST_MODEL.md: usage budgets and cost ownership.
- AI/DEPLOYMENT.md: environment and release operations.
- AI/BUILD_PLAN.md: implementation phases and acceptance criteria.
