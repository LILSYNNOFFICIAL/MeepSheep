# MeepSheep Master Workflow

**Purpose:** Authoritative workflow for designing, building, testing, securing, deploying, and maintaining MeepSheep.  
**Product:** MCP-first AI-to-AI communication and coordination.  
**Source of truth:** This workflow and the linked documents under `AI/`.  
**Branch policy:** `main` is the default branch. Use feature branches and pull requests for substantial work.  
**Completion rule:** A task is checked only after its outcome is independently verified.

## Product boundary

MeepSheep is the relay, registry, permission boundary, and coordinator. Compatible AI clients call MeepSheep through its MCP server. MeepSheep calls separately configured remote agents through outbound MCP connections first, with optional A2A, vendor API, or webhook adapters when a real integration requires them.

Agents perform their own work using their own models, tools, and capabilities. MeepSheep does not become a research engine or dictate how an agent completes a task. Research, coding, browsing, and other skills are agent-side capabilities.

**MCP is the primary interface, not magic connectivity.** Every target agent must expose a supported endpoint and be explicitly configured and authorized.

## Workflow notation

- `[x]` completed and verified.
- `[ ]` not completed.
- `[~]` in progress or partially complete.
- `[!]` blocked by a known issue or missing decision.

## Mandatory task method

1. Read README, this workflow, STATE, and relevant design/security docs.
2. Inspect the actual branch, files, dependencies, account state, and existing implementation.
3. Define scope, acceptance criteria, dependencies, and risks.
4. Make the smallest coherent change.
5. Run relevant unit, contract, integration, build, security, and live checks.
6. Fetch/re-read changed files and inspect the diff.
7. Independently try to disprove the result with negative and edge-case tests.
8. Update this workflow, decision log, changelog, and state ledger with evidence.
9. Report verified, partial, blocked, and unverified outcomes separately.

Never infer implementation from documentation, a successful API response, or a mock test.

## Phase 0: Repository foundation and automation

- [x] Confirm repository identity and default branch.
- [x] Establish README and AI documentation structure.
- [x] Establish GitHub Actions quality workflow and Wellness Doctor.
- [x] Establish unit tests for the repository doctor.
- [x] Establish four-level README health indicators.
- [x] Record the initial interoperability direction in a feature branch.
- [ ] Merge the reviewed MCP-first documentation update after CI and review.

**Exit:** Repository rules and project documents agree, and the PR is merged only after review and successful checks.

## Phase 1: Freeze the MVP product contract

- [ ] Confirm the first real caller and target agent connection surfaces.
- [ ] Define agent registration and connection ownership.
- [ ] Define caller identity, tenant, and permission scopes.
- [ ] Define MCP server tool schemas and versioning.
- [ ] Define outbound MCP client lifecycle and approved remote tool allowlists.
- [ ] Define canonical message, task, event, and response envelopes.
- [ ] Define synchronous and asynchronous task behavior.
- [ ] Define context-sharing, retention, and deletion defaults.
- [ ] Define limits for payloads, deadlines, concurrency, retries, and budgets.
- [ ] Define admin-only operations and owner approval requirements.
- [ ] Freeze acceptance scenarios in API_SPEC.md and TEST_STRATEGY.md.

**Exit:** An engineer can implement the first relay without guessing at identities, permissions, message shapes, or task behavior.

## Phase 2: Verify actual integrations and infrastructure

- [ ] Inspect current GitHub branch, PR, workflows, and repository settings.
- [ ] Confirm the correct Cloudflare account and meepsheep.com zone.
- [ ] Verify domain ownership and DNS control read-only.
- [ ] Inventory Workers, Agents SDK, Workflows, Durable Objects, D1, Queues, KV, R2, and Static Assets.
- [ ] Verify current MCP protocol revision, SDK support, transport, and authentication.
- [ ] Select one remote MCP test agent and verify its endpoint and auth.
- [ ] Verify the intended caller's exact MCP client surface and account-plan requirements.
- [ ] Compare D1 and Supabase for one authoritative relational data owner.
- [ ] Verify current platform limits, pricing, logging, and secret storage.
- [ ] Record sources, dates, test evidence, and unresolved issues.

**Exit:** The first deployment and connection path are supported by current evidence and actual account access.

## Phase 3: Contract and security foundation

- [ ] Create versioned schemas for agent, connection, grant, message, task, event, artifact, and response.
- [ ] Implement strict input/output validation.
- [ ] Implement authentication and tenant resolution.
- [ ] Implement server-side authorization and separate discovery/invocation scopes.
- [ ] Implement credential references, encryption, rotation, and revocation.
- [ ] Implement endpoint validation and SSRF protections.
- [ ] Implement idempotency and duplicate event handling.
- [ ] Implement context minimization and redaction.
- [ ] Implement audit provenance and privacy-safe logs.
- [ ] Add adversarial fixtures and negative tests.

**Exit:** Security and protocol contracts are testable before connecting live agents.

## Phase 4: Minimal relay implementation

- [ ] Establish runtime, package manager, pinned versions, lint, types, and tests.
- [ ] Implement one authoritative persistence layer and migrations.
- [ ] Implement agent registry and connection manager.
- [ ] Implement inbound remote MCP server.
- [ ] Implement outbound MCP client for remote agent connections.
- [ ] Discover remote tools and apply owner-approved allowlists.
- [ ] Implement canonical router and task service.
- [ ] Implement synchronous message/request-response path.
- [ ] Implement durable asynchronous task path.
- [ ] Implement `discover_agents`, `get_agent`, `send_message`, `delegate_task`, `get_task`, `wait_task`, and `cancel_task` MCP tools.
- [ ] Implement deterministic mock MCP agents for tests.
- [ ] Add local setup and configuration documentation.

**Exit:** A local MCP client can send a message through MeepSheep to a mock remote MCP agent and receive a validated response. This is a contract proof, not a live integration claim.

## Phase 5: First real AI-to-AI round trip

- [ ] Configure one separately operated remote agent with owner-authorized credentials.
- [ ] Configure one compatible AI client to connect to MeepSheep.
- [ ] Verify caller authentication and target authorization.
- [ ] Send a unique test task through the actual MCP endpoint.
- [ ] Verify the remote agent endpoint received and processed the request.
- [ ] Verify the returned content originated from the remote agent.
- [ ] Verify target identity, task ID, trace ID, status, and provenance.
- [ ] Test denial, timeout, malformed response, duplicate request, and revoked credential.
- [ ] Save sanitized evidence and exact tested client/plan/protocol versions.

**Exit:** One genuine independent system-to-system round trip works. A local mock, hardcoded response, or two model calls inside one process does not satisfy this phase.

## Phase 6: Reliability and multi-agent coordination

- [ ] Add bounded sequential delegation.
- [ ] Add bounded parallel fan-out.
- [ ] Add result aggregation with per-agent provenance.
- [ ] Add durable progress events and resumable tasks.
- [ ] Add deadline propagation and bounded retries.
- [ ] Add cancellation where the target supports it.
- [ ] Add input-required and human approval states.
- [ ] Add circuit breakers, concurrency limits, and dead-letter handling.
- [ ] Add usage reconciliation and budget reservation before dispatch.
- [ ] Test worker restarts, queue redelivery, partial failure, and duplicate callbacks.

**Exit:** Multi-agent work remains observable, bounded, recoverable, and permission-safe.

## Phase 7: Optional adapter expansion

- [ ] Add A2A only when a target agent requires it and official compatibility is verified.
- [ ] Add provider API adapters only for documented, authorized endpoints.
- [ ] Add webhook adapters only with explicit endpoint ownership, authentication, signatures, and replay defense.
- [ ] Reuse the same registry, grants, canonical envelopes, task lifecycle, and audit model.
- [ ] Add one adapter at a time with contract and end-to-end tests.
- [ ] Maintain a product/surface/plan/platform compatibility matrix.

**Exit:** Each additional adapter solves a real interoperability need without creating a parallel product architecture.

## Phase 8: Owner console and onboarding

- [ ] Build connection setup and verification UI.
- [ ] Build agent registry and capability view.
- [ ] Build permission and scope management.
- [ ] Build task timeline, progress, result, and error inspection.
- [ ] Add credential rotation and revoke/disconnect controls.
- [ ] Add audit and usage views with secrets redacted.
- [ ] Test mobile, desktop, keyboard, and accessibility behavior.
- [ ] Publish clear setup and data-sharing documentation.

**Exit:** An owner can understand and control which agents can communicate and what context they receive.

## Phase 9: Security, quality, and cost release gates

- [ ] Cross-tenant isolation tests pass.
- [ ] Confused-deputy and privilege-escalation tests pass.
- [ ] Malicious tool description and prompt-injection tests pass.
- [ ] SSRF and redirect tests pass for IPv4 and IPv6.
- [ ] Replay, duplicate, forged callback, and out-of-order event tests pass.
- [ ] Credential revocation and rotation are verified.
- [ ] Fan-out, depth, concurrency, payload, deadline, and budget limits are enforced.
- [ ] Logs and traces contain no credentials or unapproved private context.
- [ ] Latency, reliability, and cost baselines are measured.
- [ ] Backups, restore, retention, and deletion are tested.

**Exit:** No unresolved critical/high security issue remains without explicit owner-approved risk acceptance.

## Phase 10: Deployment and launch

- [ ] Confirm Cloudflare account and domain zone.
- [ ] Select runtime, database, auth, and orchestration services.
- [ ] Configure isolated development, staging, and production environments.
- [ ] Configure secrets outside Git.
- [ ] Deploy web console, API, and MCP endpoint.
- [ ] Configure DNS and TLS only after explicit owner approval.
- [ ] Verify real endpoint health and client setup.
- [ ] Verify monitoring, alerts, cost controls, and rollback.
- [ ] Publish privacy, retention, acceptable-use, and service-limit documents.
- [ ] Obtain owner approval before public launch.

**Exit:** Production behavior and support claims are backed by tested live endpoints.

## Deferred product work

- General-purpose research platform.
- Search-provider comparisons and evidence synthesis as MeepSheep-owned services.
- Built-in model hosting or training.
- Native mobile applications before web usage justifies them.
- Large protocol catalog without concrete target integrations.

Research can be performed by an agent connected to MeepSheep. It is not a core MeepSheep engine.

## Current next action

Review and merge the MCP-first documentation correction. Then finalize the exact first caller/target pair, verify the correct Cloudflare account and domain, pin the MCP SDK/protocol baseline, and implement the local mock MCP round trip before live provider credentials are introduced.
