# MeepSheep Build Plan

**Status:** Proposed execution plan. No application implementation is claimed by this document.
**Product priority:** AI-to-AI interoperability, agent discovery, delegation, and coordination.

## Delivery principles

- Build the smallest end-to-end interoperability path before a large dashboard.
- Prefer open protocols and adapters over vendor-specific coupling.
- Use asynchronous task orchestration as the default, with an optimized synchronous path for short calls.
- Keep model inference outside MeepSheep. The service routes and coordinates authorized agents; it does not need to host a foundation model.
- Keep the web console, MCP interface, A2A interface, and future adapters on one shared application core.
- Every integration must be explicitly configured, authenticated, authorized, and tested.
- No platform is considered connected merely because a protocol is theoretically compatible.

## Phase 0: Product correction and protocol baseline

- [x] Owner clarified that the primary purpose is AI systems communicating with other AI systems.
- [x] Reframe the product around interoperability and coordination, not research as the primary use case.
- [x] Identify MCP as the AI-tool interface and A2A as the agent-to-agent task protocol.
- [ ] Review current released MCP and A2A specifications and record pinned versions.
- [ ] Confirm initial target client surfaces and their real connection requirements.
- [ ] Freeze MVP scope and acceptance scenarios.

**Exit:** The product brief, protocol strategy, constraints, and target integration matrix agree.

## Phase 1: Contracts and threat boundaries

- [ ] Finalize agent identity, registration, discovery, and capability schemas.
- [ ] Finalize message envelope and task lifecycle.
- [ ] Finalize MCP tool schemas and A2A interoperability boundary.
- [ ] Define connection ownership, credentials, scopes, and consent.
- [ ] Define context-sharing and data-retention defaults.
- [ ] Define idempotency, retries, timeouts, cancellation, and concurrency.
- [ ] Review SSRF, confused-deputy, prompt-injection, replay, and cross-tenant threats.
- [ ] Add contract fixtures and negative security tests.

**Exit:** An implementation can be built against stable contracts without choosing a specific AI vendor.

## Phase 2: Provider and hosting validation

- [ ] Inspect the active Cloudflare account and confirm domain zone access.
- [ ] Verify current Workers, Durable Objects, Queues, D1, KV, R2, and Static Assets capabilities and limits.
- [ ] Compare Cloudflare-native and Supabase responsibilities; select one owner per data domain.
- [ ] Confirm a suitable async orchestration primitive and durable task storage.
- [ ] Verify current MCP and A2A SDK support in the chosen runtime.
- [ ] Validate official connection paths for ChatGPT, Grok, Claude, and other selected clients.
- [ ] Record current quotas, pricing, auth requirements, and terms.
- [ ] Build a cost model for short calls and multi-minute tasks.

**Exit:** Hosting and protocol choices are backed by current account and vendor evidence.

## Phase 3: Minimal working interoperability core

- [ ] Implement canonical internal agent and connection models.
- [ ] Implement one authenticated outbound adapter.
- [ ] Implement the task/message router.
- [ ] Implement durable task state and idempotency.
- [ ] Implement one MCP server exposing discovery and delegation tools.
- [ ] Implement one A2A client adapter or a controlled test agent endpoint.
- [ ] Implement a mock agent for deterministic integration tests.
- [ ] Demonstrate one assistant request being delegated to a second agent and returned.
- [ ] Preserve trace IDs, task IDs, origin, permissions, and structured outputs.

**Exit:** A complete AI-to-AI round trip works in an automated test and a real supported client path.

## Phase 4: Reliability, safety, and observability

- [ ] Add cancellation, deadline propagation, bounded retries, and dead-letter handling.
- [ ] Add per-tenant and per-agent quotas and concurrency limits.
- [ ] Add credential encryption, rotation, and revocation.
- [ ] Add audit events and privacy-safe logs.
- [ ] Add prompt-injection and malicious-agent fixtures.
- [ ] Add cross-tenant isolation and authorization tests.
- [ ] Add provider health and circuit breakers.
- [ ] Add usage and cost accounting.
- [ ] Add monitoring for API, MCP, A2A, queue, and task completion.

**Exit:** Failures are bounded, diagnosable, and cannot silently expand permissions or cost.

## Phase 5: Multi-agent orchestration

- [ ] Support sequential delegation.
- [ ] Support parallel fan-out with explicit limits.
- [ ] Support result aggregation and conflict presentation.
- [ ] Support human approval gates for sensitive actions.
- [ ] Support task handoff and resumable state.
- [ ] Support context minimization and per-agent context filters.
- [ ] Benchmark latency, reliability, and cost across agent combinations.

**Exit:** Multi-agent workflows are reproducible, bounded, and user-controllable.

## Phase 6: Console and public onboarding

- [ ] Build responsive web console for connections, agents, tasks, and audit history.
- [ ] Add connection setup guides per supported client.
- [ ] Add capability registry and discovery UI.
- [ ] Add task timeline and message inspection with secret redaction.
- [ ] Add user data export and deletion.
- [ ] Add accessible mobile and desktop layouts.
- [ ] Publish setup docs and integration compatibility matrix.

**Exit:** A user can configure agents and understand exactly what can communicate and what data is shared.

## Phase 7: Release readiness

- [ ] Complete security review and abuse testing.
- [ ] Verify branch protections and required checks.
- [ ] Verify staging deployment and rollback.
- [ ] Verify production DNS, TLS, MCP and A2A endpoints.
- [ ] Test supported clients individually on their actual plans/platforms.
- [ ] Publish privacy, retention, acceptable-use, and service-limit documentation.
- [ ] Complete incident response and credential-rotation drills.
- [ ] Label all supported integrations by verified maturity.

**Exit:** Public claims match actual end-to-end behavior.

## First end-to-end acceptance scenario

1. A user asks an AI client to consult another AI through MeepSheep.
2. The client invokes MeepSheep's MCP delegation tool.
3. MeepSheep authenticates the caller and checks its delegated-agent permission.
4. MeepSheep resolves a registered target agent and checks its declared capabilities.
5. MeepSheep creates a durable task with an idempotency key and deadline.
6. The appropriate protocol adapter sends the bounded request to the target.
7. The target returns a result or asynchronous task state.
8. MeepSheep validates the response, records provenance, and returns a structured result to the caller.
9. The caller can inspect the target, task status, and any limitations.
10. Unauthorized agents, expired credentials, oversized payloads, timeouts, and malicious responses are rejected safely.

## Explicit non-goals for the first release

- Hosting or training foundation models.
- Bypassing consumer product restrictions or private interfaces.
- Scraping or controlling AI websites through unofficial automation as a default integration.
- Giving one agent unrestricted access to another agent's tools, memory, or credentials.
- Autonomous financial, destructive, or external side effects without explicit policy and approval.
- Unlimited fan-out or unbounded recursive agent delegation.


## Cloudflare orchestration research note (2026-10-31)

Cloudflare Workflows are the leading candidate for durable multi-step task execution because official docs describe persisted steps, automatic retries, external-event waits, and long-running execution. Durable Objects are candidates for real-time per-agent coordination and strongly consistent state. The Agents SDK documents MCP server/client capabilities. These are candidates, not accepted infrastructure decisions; verify account access, pricing, limits, and runtime compatibility before selecting.
