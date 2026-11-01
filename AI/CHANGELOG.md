# MeepSheep Change Log

Meaningful product, architecture, security, and release changes are recorded here. Dates use YYYY-MM-DD. This log does not replace Git history.

## 2026-11-01: Reusable task repository contract suite (draft PR #5)

- Extracted `registerTaskRepositoryContract({ test, createRepository, name })` into `tests/support/task-repository-contract.mjs`; the in-memory adapter registers the shared contract through `tests/task-store-memory.test.mjs`.
- Expanded the suite to eight provider-neutral behavioral checks, covering concurrent initial creation, idempotency uniqueness scoped by both tenant and caller, tenant-isolated reads, compare-and-swap transitions, exclusive/reclaimed leases, and strict stale/expired claim completion fencing.
- Future D1/PostgreSQL repository adapters should register the same behavioral suite against their own factory and add provider-specific transaction rollback, database-clock, cross-process, and restart-recovery tests.
- The follow-up documentation checkpoint `58f6ee0c73ad1e2836d9aba472d07bdab7c2a034` passed run [41289621348](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289621348), with the same 98/98 Node, 10/10 Python, 117 warning-free Repository Doctor, and workflow YAML results.
- Exact PR #5 feature head `b5904db4fdaf1d608e5264f86038a45380116fb5` passed full quality run [41289499297](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289499297), checked out as merge revision `6ebff4161b26a4f9e18f7fa759c68b9f94f3d89f`: 98/98 Node tests, 10/10 Python tests, 117 Repository Doctor checks with zero warnings/errors/critical, and both workflow YAML validations.
- This remains a test contract for the in-memory reference adapter. No provider, database, queue, or production worker has been selected or provisioned.

## 2026-11-01: Task outbox lease fencing (draft PR #5)

- Added regression coverage proving that an expired worker claim cannot complete an outbox item and that an old claim cannot complete after the same worker ID has reclaimed it.
- Updated the in-memory reference repository to require the current worker ID, monotonically increasing claim attempt, exact claimed lease deadline, and completion before expiry; the coordinator now forwards the claim metadata.
- TDD red run [41288627434](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41288627434) failed exactly the two new assertions on the unfixed implementation. Green run [41288727098](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41288727098) passed 92 Node tests, 10 Python Wellness Doctor tests, 117 Repository Doctor checks with zero warnings/errors/critical, and both workflow YAML validations on feature commit `95b69aeee7fab656aabd9d3e6056c3cda72ba8b4`.
- The persistent adapter contract now explicitly requires atomic claim-generation checks and authoritative database-clock expiry. The in-memory adapter remains non-durable; the suspended-worker race immediately before an external MCP call remains a production release blocker.
- No provider was selected, no database was resumed or changed, and no Cloudflare resources, DNS, credentials, or deployment were changed.

## 2026-10-31: Local asynchronous task orchestration verified (draft PR #5)

- Added a provider-neutral task coordinator, in-memory reference repository, task state/event lifecycle, tenant/caller-scoped idempotency, deadlines, optimistic transitions, leased outbox processing, bounded wait/cancel, and safe `REMOTE_OUTCOME_UNKNOWN` handling.
- Added a registry-backed dispatcher that rechecks the owner grant and approved remote tool schema immediately before dispatch.
- Wired optional `delegate_task`, `get_task`, `wait_task`, and `cancel_task` MCP tools to the trusted request principal; tools register only when the host injects a compatible coordinator.
- Corrected nullable optional opaque registry references and aligned outbound task dispatch with the MCP SDK v2 `callTool(params, options)` signature.
- Updated the read-only quality workflow to run every focused suite, the full Node suite, Python tests, Repository Doctor, and workflow YAML validation before the final complete quality gate.
- CI run [41276417903](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41276417903) on exact head `c9a94b50fd77f82b36e8454cfdc117bb90b2e8f5` passed: 90 Node tests, 10 Python Wellness Doctor tests, 117 Repository Doctor checks, zero warnings/errors/critical, and both workflow YAML validations.
- This is a verified local task implementation only. The reference repository is in-memory; durable SQL storage, queue/worker, restart recovery, retention, dead-letter handling, and live third-party agent execution remain unimplemented.

## 2026-10-31: Secure connection and owner lifecycle (draft PR #5)

- Added an RS256 JWT access-token resource-server verifier with trusted JWKS validation and an inbound bearer middleware that overwrites caller-controlled authentication context.
- Added strict HTTPS/443 endpoint validation, complete DNS answer checks, and a pinned Node HTTPS fetch adapter with TLS hostname preservation, redirect refusal, request/response restrictions, byte limits, timeouts, and cancellation.
- Added an encrypted AES-256-GCM credential vault with tenant/credential/key/version authenticated data, scoped reads, key rotation, revocation, tamper detection, and optimistic concurrency.
- Hardened the in-memory agent registry to retain only explicit safe fields and opaque credential/endpoint references.
- Added a secure outbound MCP connection factory that combines endpoint validation, pinned transport, per-request vault-backed bearer injection, and remote tool schema discovery.
- Added an internal owner connection manager for preview, explicit per-tool schema approval, owner/tenant isolation, expiry, registration, disconnect, credential revocation, and cleanup on failure. Privileged lifecycle methods are not exposed as ordinary inbound MCP tools.
- Added focused CI gates for each security subsystem and owner connection lifecycle.
- CI run 41269980816 on head `59b38b6e3b3329c983b696bd01da7ded667bb2e2` passed 63 Node tests, 10 Python Wellness Doctor tests, 113 Repository Doctor checks with zero warnings/errors/critical, and both workflow YAML validations.
- The connection manager and credential vault still use in-memory test/reference adapters. Production OAuth issuance, persistent DB/KMS adapters, public owner API/console, durable audit, schema reapproval UI, task queue, live external TLS/egress verification, and real AI integrations remain unimplemented.

## 2026-10-31

### Initial product direction correction
- Replaced the research-first product framing with AI-to-AI interoperability and coordination.
- Added MCP, A2A, and provider API planning documents.
- Added task lifecycle, security, cost, and deployment design guidance.

### Owner clarification: MCP-first agent relay
- Clarified that MeepSheep's primary purpose is for AI agents to communicate with other AI agents.
- Established MeepSheep as the relay, registry, permission boundary, and coordinator.
- Made the inbound MCP server the primary interface for requesting AI clients.
- Added the outbound MCP client as the first remote-agent connection type.
- Clarified that agents perform their own research, coding, browsing, and other work using their existing capabilities.
- Deferred MeepSheep-owned research-engine functionality from the MVP.
- Reclassified A2A, provider APIs, and webhooks as optional adapters, not first-release prerequisites.
- Rewrote the master workflow to remove research-first phases and define an MCP relay implementation path.
- Updated product, architecture, interoperability, API, data model, build, security, testing, integration, decision, and benchmark documents.

All entries describe product/documentation direction only. No application code, live MCP endpoint, remote AI connection, DNS, or production deployment is claimed.


## 2026-10-31: First local MCP relay laboratory

- Added a Node.js 26.13.0 local test harness with the official MCP TypeScript SDK v2.4.0.
- Added inbound `discover_agents` and `send_message` tools, an in-memory tenant-aware registry, outbound MCP tool allowlisting, response provenance, and sanitized remote errors.
- Added a deterministic mock MCP agent and seven CI integration tests.
- CI now runs Node MCP tests alongside the existing Python Wellness Doctor checks.
- This is a local protocol/relay proof only. It is not a live external AI connection or production deployment.
