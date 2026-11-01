# MeepSheep Build Plan

**Status:** Partially implemented. The local MCP relay laboratory is running in CI; production runtime, persistence, and live provider integration are not implemented.  
**Priority:** MCP-first AI-to-AI communication.

## Principles

- Build a working relay before building a large dashboard.
- MCP is the primary inbound interface and first outbound agent connection type.
- MeepSheep supplies routing, registry, authorization, task state, and provenance.
- Remote agents perform their own work with their own models, tools, and skills.
- A2A and provider APIs are optional adapters, not MVP prerequisites.
- Every integration must be explicit, authenticated, authorized, and actually tested.
- Use one canonical message/task model across every adapter.

## Phase 0: Product direction

- [x] Confirm AI-to-AI communication is the primary purpose.
- [x] Reframe MeepSheep as an MCP-first relay and coordination service.
- [x] Clarify inbound MCP server and outbound MCP client roles.
- [x] Move research-engine functionality out of the MVP.
- [x] Merge and verify the MCP-first documentation correction (PR #2, merge commit `d0bec625eb191d71781ab3e1d239245e54dd9594`).

## Phase 1: Lock the contracts

- [ ] Finalize agent, connection, grant, message, task, event, and response schemas.
- [ ] Finalize inbound MCP tools and JSON Schemas.
- [ ] Define outbound MCP connection lifecycle and tool allowlisting.
- [ ] Define identity, tenant, owner, caller, and agent permissions.
- [ ] Define explicit context-sharing policy.
- [ ] Define sync response and async task behavior.
- [ ] Define idempotency, deadlines, retries, cancellation, and error mapping.
- [ ] Define payload, concurrency, fan-out, depth, and budget ceilings.
- [ ] Define admin-only actions and owner approval.
- [ ] Add positive and negative contract fixtures.

**Exit:** A developer can implement the relay without guessing at protocol or security behavior.

## Phase 2: Validate actual environment and first endpoints

- [ ] Confirm the correct Cloudflare account and meepsheep.com zone.
- [ ] Inspect available Workers/Agents SDK, Workflows, Durable Objects, storage, and limits.
- [ ] Select one authoritative database and authentication owner.
- [ ] Pin MCP specification revision, SDK, transport, and auth behavior.
- [ ] Select one remote MCP agent endpoint and verify it independently.
- [ ] Select one requesting MCP client surface and verify its actual connection requirements.
- [ ] Record pricing, quotas, rate limits, and terms.
- [ ] Do not configure DNS or deploy until the correct account/domain is confirmed.

## Persistence platform review checkpoint (2026-11-01, read-only)

- [x] Restore the existing `meepsheep-storage` project after owner authorization and verify `ACTIVE_HEALTHY`.
- [x] Inspect PostgreSQL version, public schema, RLS policies, constraints, indexes, extension availability, migration history, and Supabase security/performance advisors.
- [x] Recheck the separate BlueNote project without modifying it.
- [x] Re-inventory the connected Cloudflare account: zero Zones, Workers, D1 databases, Queues, and Durable Object namespaces.
- [ ] Obtain owner approval for the primary database/authentication platform and the operating-plan budget.
- [ ] Recover the eleven exact Supabase SQL migration files or create a reviewed, reproducible baseline before repository-driven schema work.

**Recommendation, not a final platform decision:** Use the existing Supabase PostgreSQL 17 project as the preferred database candidate for the next adapter design, and evaluate Supabase Queues/PGMQ as its durable queue. The project already has Vault and crypto extensions installed, plus earlier owner-scoped MCP server/tool/credential-reference tables. PGMQ version 1.5.1 is available but not installed. The existing schema is not sufficient for the current product model: it lacks tenant/principal/grant and task/event/outbox records, and its owner-based RLS needs explicit mapping to the relay's verified tenant/principal claims. The public application tables and auth users currently report zero rows.

The organization is on Supabase Free. Free projects with low activity over seven days may be paused, so an always-on production service requires an explicit paid-plan and budget decision. No upgrade, extension installation, migration, schema change, or deployment was made. Cloudflare D1 + Queues + Workflows remains viable if Cloudflare is selected as the runtime, but the connected account currently has no MeepSheep infrastructure.

## Phase 3: Engineering foundation

- [x] Select Node.js 26.13.0 for the local laboratory.
- [x] Select npm and pin direct MCP SDK/Zod dependencies.
- [x] Add Node's built-in test runner and GitHub Actions execution.
- [x] Generate and commit `package-lock.json`; CI uses `npm ci`.
- [ ] Add formatting, lint, and typecheck gates.
- [ ] Add production environment schema, safe example config, secret scanning, and dependency auditing.
- [x] Verify a clean CI checkout installs dependencies and runs the local MCP tests.

## Phase 4: Minimal MCP relay

- [ ] Implement one authoritative persistence layer and migrations.
- [ ] Implement agent registry and connection manager.
- [ ] Implement inbound MCP server.
- [ ] Implement outbound MCP client.
- [ ] Discover remote tools and require owner-approved allowlists.
- [ ] Implement shared authentication and authorization service.
- [ ] Implement canonical router and message/task services.
- [ ] Implement `discover_agents`, `get_agent`, `send_message`, `delegate_task`, `get_task`, `wait_task`, `cancel_task`, and `list_my_connections`.
- [ ] Implement sync request/response path.
- [ ] Implement durable async task path.
- [ ] Implement deterministic mock MCP agent.
- [ ] Add contract tests and local integration tests.

**Current evidence:** PR #5 task-contract implementation commit `b5904db4fdaf1d608e5264f86038a45380116fb5` passed run [41289499297](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289499297). The current documentation checkpoint `58f6ee0c73ad1e2836d9aba472d07bdab7c2a034` also passed run [41289621348](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289621348): 98/98 Node tests, 10/10 Python tests, 117 Repository Doctor checks with zero warnings/errors/critical, eight shared repository-contract tests, and both workflow YAML validations. CI checked out merge revision `e60e52c301f3a98c3cf9dc64c0ddc2ca031b5941`. The local loopback TCP case does not prove a public network deployment or live external AI agent.

## Verified local security and connection lifecycle (PR #5, stacked on PR #4)

- [x] Add RS256 JWT access-token resource-server verification using an injected trusted JWKS resolver.
- [x] Validate issuer, audience, token type, subject, tenant, client ID, OAuth scope-token grammar, JTI, issue/expiry times, clock skew, and maximum lifetime.
- [x] Replace inbound MCP auth context after token verification and prove forged `authInfo.extra` cannot change caller identity.
- [x] Add exact-host HTTPS/443 endpoint validation and validate every IPv4/IPv6 DNS answer.
- [x] Reject any endpoint that resolves to a non-public address or a mixed public/non-public address set.
- [x] Add a pinned-fetch adapter with strict origin/path/method checks, pinned lookup set, preserved TLS hostname/SNI, request/response header filtering, identity encoding, upload/response byte bounds, deadlines, cancellation, and redirect non-following.
- [x] Add AES-256-GCM credential-vault logic with tenant/credential/key/version-bound authenticated data, callback-scoped decryption, key rotation, revocation, tamper detection, and optimistic concurrency.
- [x] Restrict registry records to an explicit allowlist, require canonical opaque credential/endpoint references, and reject raw credentials or endpoint URLs.
- [x] Add `createSecureRemoteMcpClient` to combine endpoint validation, pinned fetch, per-request vault-backed bearer credentials, MCP tool discovery, and schema fingerprint snapshots.
- [x] Add an internal owner connection manager for short-lived endpoint previews, owner/tenant binding, explicit discovered-tool approval, registration, disconnect, credential revocation, and client cleanup after failures.
- [x] Require both credential retrieval and revocation operations for any credential-backed connection.
- [x] CI run [41269980816](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41269980816) on exact head `59b38b6e3b3329c983b696bd01da7ded667bb2e2`: focused suites passed (auth 8, endpoint 11, vault 11, registry 4, secure connector 5, owner lifecycle 10); full Node suite 63/63; Python Wellness Doctor 10/10; Repository Doctor 113 passed, zero warnings/errors/critical; both workflow YAML files parsed.

**Still open:** This is not an OAuth authorization server or production identity integration. Registry, connection previews and active connection state remain in memory. There is no persistent DB/KMS adapter, public owner API/console, durable audit log, schema reapproval workflow, durable task system, or live external agent. The actual external TLS handshake and deployed egress policy remain unverified. No secrets, production endpoints, Cloudflare resources, DNS, or deployment were changed.

## Phase 4B: Asynchronous task execution (local implementation, CI verified)

- [x] Define task, event, outbox, deadline, idempotency and worker lease contracts, including claim-generation fencing and expiry-checked completion.
- [x] Extract eight provider-neutral repository contract tests that future SQL adapters can register against a repository factory, including tenant-and-caller-scoped idempotency uniqueness.
- [x] Add the task coordinator with tenant/caller authorization, bounded input/output, deadlines, optimistic state transitions, cancellation and bounded wait.
- [x] Add an in-memory reference repository for deterministic local tests.
- [x] Add registry-backed dispatch with owner-approved schema revalidation before invocation.
- [x] Add optional MCP tools for `delegate_task`, `get_task`, `wait_task`, and `cancel_task`, bound to the trusted request principal.
- [x] Reject stale/expired outbox completion by checking worker ID, monotonic claim attempt, exact lease deadline and expiry; prevent blind retries after a potentially delivered remote invocation with `REMOTE_OUTCOME_UNKNOWN`.
- [x] Verify the updated feature head with all focused gates and full quality workflow: [run 41289499297](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289499297), code commit `b5904db4fdaf1d608e5264f86038a45380116fb5` (CI merge revision `6ebff4161b26a4f9e18f7fa759c68b9f94f3d89f`).
- [x] CI evidence: task coordinator 15/15, task dispatcher 8/8, reusable task repository contract suite 8/8, full Node suite 98/98, Wellness Doctor 10/10, Repository Doctor 117 passed with zero warnings/errors/critical, and both workflow YAML validations.
- [ ] Implement the production SQL repository and migrations with database-authoritative lease expiry, durable outbox/queue, worker deployment and operational recovery.
- [ ] Test transaction rollback, cross-process contention, worker crashes at every state boundary, the suspended-worker-to-dispatch race, queue redelivery, and real remote idempotency/cancellation.

**Boundary:** The committed in-memory store is a test/reference adapter. It does not provide durability, distributed locking or restart recovery. Lease completion is fenced locally, but the durable adapter must enforce expiry atomically with its own clock and the worker must close the pause/resume window immediately before remote dispatch. No database provider or durable worker has been selected.

## Phase 5: First real AI-to-AI proof

- [ ] Configure a real remote agent endpoint and credential.
- [ ] Configure a real compatible MCP client to connect to MeepSheep.
- [ ] Submit a unique request through the actual MeepSheep MCP endpoint.
- [ ] Verify the remote agent received and processed the request.
- [ ] Verify the response came from the remote endpoint.
- [ ] Verify identity, authorization, trace, task status, and provenance.
- [ ] Test unauthorized access, expired/revoked credential, timeout, malformed output, replay, and duplicate delivery.
- [ ] Record exact product surface, account plan, OS, protocol/SDK versions, date, and evidence.

**Exit:** One genuine independently operated agent round trip succeeds. A mock, hardcoded reply, or two model calls in one process does not qualify.

## Phase 6: Reliability and collaboration

- [ ] Add progress events and resumable tasks.
- [ ] Add deadline propagation and bounded retries.
- [ ] Add cancellation where supported.
- [ ] Add sequential agent handoff.
- [ ] Add bounded parallel delegation.
- [ ] Add result aggregation and per-agent provenance.
- [ ] Add human approval/input-required state.
- [ ] Add circuit breakers, quotas, and concurrency controls.
- [ ] Add cost reservation and usage reconciliation.
- [ ] Test worker restart, queue redelivery, partial failure, and out-of-order events.

## Phase 7: Optional adapters

- [ ] Add A2A only for a real target requiring it.
- [ ] Add vendor APIs only where documented and authorized.
- [ ] Add webhook adapters only with explicit endpoint ownership, authentication, signatures, and replay defense.
- [ ] Reuse the same registry, permissions, envelopes, and task lifecycle.
- [ ] Test each adapter independently and end-to-end.

## Phase 8: Owner console and onboarding

- [ ] Configure agents and credentials securely.
- [ ] Review discovered tools and approve allowlists.
- [ ] Manage grants, scopes, limits, revoke, and disconnect.
- [ ] Inspect task timeline, results, errors, and provenance.
- [ ] Inspect usage and audit events with secret redaction.
- [ ] Test responsive desktop/mobile UI and accessibility.
- [ ] Publish connection instructions and a truthful compatibility matrix.

## Phase 9: Security and release

- [ ] Pass cross-tenant isolation and confused-deputy tests.
- [ ] Pass SSRF, prompt injection, replay, duplicate, and malicious-agent tests.
- [ ] Verify credential rotation and revocation.
- [ ] Verify budgets, payload limits, timeouts, and fan-out ceilings.
- [ ] Verify privacy, retention, export, and deletion.
- [ ] Verify staging, monitoring, alerts, backups, and rollback.
- [ ] Confirm actual DNS/TLS and live endpoint health.
- [ ] Obtain explicit owner approval before public launch.

## Deferred

A standalone research engine, model hosting, broad protocol catalog, and native apps are not MVP requirements. Research is performed by connected agents when their owner-configured capabilities support it.
