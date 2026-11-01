# Local MCP Relay Laboratory

**Status:** Local relay, inbound resource-server authentication, pinned outbound MCP connection factory, encrypted credential-vault abstraction, registry secret isolation, internal owner connection lifecycle, and optional asynchronous task coordination are CI-tested. Exact-head quality run 41276417903 passed 90/90 Node tests. Not deployed.  
**Purpose:** Prove the core MCP relay path before adding databases, production auth, provider adapters, or a dashboard.

## What is implemented

- Node.js 26.13.0 selected for the lab.
- Official MCP TypeScript SDK v2.4.0:
  - `@modelcontextprotocol/server`
  - `@modelcontextprotocol/client`
- Zod 4.6.7 for MCP tool schemas.
- Inbound MeepSheep MCP tools:
  - `discover_agents`
  - `send_message`
- Optional caller-bound task tools when the host injects a compatible coordinator:
  - `delegate_task`
  - `get_task`
  - `wait_task`
  - `cancel_task`
- Provider-neutral task coordinator with an in-memory reference repository, task event history, idempotency scope, deadlines, optimistic state transitions, worker leases, bounded cancellation/wait, and safe remote-outcome handling.
- Registry-backed task dispatcher that rechecks the caller's owner grant and the remote tool's approved schema fingerprint immediately before invocation.
- Outbound MCP client that connects to a registered remote MCP handler.
- In-memory agent registry with tenant-aware discovery and dispatch permission checks.
- Owner-approved remote tool allowlist with canonical SHA-256 snapshots of each approved tool contract.
- Canonical schema fingerprints sort object keys, preserving array order, and include tool name, description, input schema, and output schema.
- Remote tool name and full approved schema fingerprint are checked before every invocation; schema drift fails closed with `SCHEMA_CHANGED`.
- Structured response provenance and sanitized remote failure mapping.
- Deterministic mock MCP agent fixture.
- GitHub Actions integration tests.
- An optional inbound bearer-authentication wrapper that verifies RS256 JWT access tokens against an injected JWKS resolver and derives the principal from verified claims.
- A DNS/IP endpoint validator and pinned HTTPS fetch adapter for explicit, exact-host outbound endpoint policies.
- `createSecureRemoteMcpClient`, which validates the endpoint before client construction, combines pinned transport with vault-backed bearer authentication, strips caller-controlled Authorization headers, and discovers remote tool schemas for owner review.
- An AES-256-GCM credential vault with injected atomic storage/key-provider interfaces, tenant/credential/key/version authenticated data, callback-scoped decryption, key rotation, revocation, and optimistic concurrency.
- An explicit agent-registry record allowlist that rejects raw credential/authorization fields and raw endpoint URLs, retaining only opaque `credentialRef` and `endpointRef` identifiers.
- An internal owner connection manager that previews endpoints and remote tools, binds preview records to owner/tenant, expires and closes abandoned previews, requires explicit per-tool selection, registers only the selected tools with schema fingerprints derived from the preview snapshot, and disconnects/revokes credentials with cleanup on failure.

## Request path

```text
Test MCP caller
   |
   | Streamable HTTP MCP client
   v
Optional RS256 bearer middleware
   |
   | verified identity / tenant / scopes
   v
MeepSheep inbound MCP handler
   |
   | authorization checks
   v
In-memory agent registry + approved schema snapshot
   |
   | secure remote MCP client
   | endpoint allowlist + validated DNS snapshot
   | pinned HTTPS fetch + vault-backed bearer credential
   v
Independent mock MCP handler
   |
   | remote tool response
   v
MeepSheep response with trace + provenance
   |
   v
Test MCP caller
```

## Tool contracts currently exposed

### `discover_agents`

Input: empty object.

Returns same-tenant, active, discoverable agent metadata:
- `id`
- `name`
- `description`
- `capabilities`
- `status`

Endpoint URLs, secret references, and connection credentials are never returned.

### `send_message`

Input:
- `targetAgentId`
- `toolName`
- `arguments` (structured JSON object)

The caller cannot supply its principal ID, tenant ID, endpoint URL, or credentials. The server derives principal and tenant from the trusted `authInfo` passed by the hosting layer.

Dispatch requires:
1. Caller has `agent:message`.
2. Target exists, is active, and belongs to the caller's tenant.
3. Requested remote tool is on the connection's owner-approved tool allowlist.
4. The remote MCP server still lists that tool.
5. The remote MCP call succeeds.

Success response includes:
- `messageId`
- `traceId`
- `sourceAgentId`
- `targetAgentId`
- `status`
- `output`
- `provenance.protocol`
- `provenance.remoteToolName`

Remote errors are returned as `REMOTE_FAILED`; remote stack traces and raw error content are not forwarded.

## Test coverage and evidence

The suite includes `tests/mcp-relay.integration.test.mjs`, `tests/tool-schema.test.mjs`, `tests/security-boundary.test.mjs`, `tests/endpoint-security.test.mjs`, `tests/credential-vault.test.mjs`, `tests/agent-registry.test.mjs`, `tests/remote-mcp-connection.test.mjs`, `tests/agent-connection-manager.test.mjs`, `tests/task-coordinator.test.mjs`, and `tests/task-dispatcher.test.mjs`.

Latest verified run for draft PR #5 tested exact head `c9a94b50fd77f82b36e8454cfdc117bb90b2e8f5`: [GitHub Actions run 41276417903](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41276417903).

| Gate | Result |
|---|---:|
| Authentication boundary | 8/8 |
| Endpoint security | 11/11 |
| Credential vault | 11/11 |
| Agent registry isolation | 7/7 |
| Secure remote MCP connection | 5/5 |
| Owner connection lifecycle | 10/10 |
| Task coordinator | 15/15 |
| Task dispatcher | 8/8 |
| Full Node suite | 90/90 |
| Python Wellness Doctor | 10/10 |
| Repository Doctor | 117 passed, 0 warnings, 0 errors, 0 critical |
| Workflow YAML | Both workflow files parsed successfully |

The CI workflow also verifies clean dependency installation via `npm ci --ignore-scripts --no-audit --no-fund`. All focused gates and the final complete quality gate passed on the same exact commit.

The owner lifecycle tests cover preview without premature registration, credential-vault interface requirements, owner/tenant boundaries, selected-tool-only approval, rejection of unknown/duplicate/empty selections, expiry and client cleanup, disconnect and credential revocation, and cleanup when revocation fails. Security tests cover signed-token claims, forged auth context, IPv4/IPv6 and mixed DNS answers, pinned lookup/TLS settings, request/response header policy, request deadlines and cancellation, vault tampering/rotation/revocation, tenant isolation, credential reference validation, and prototype-like tool names. Task tests cover in-memory repository atomic-operation contracts, tenant/caller-scoped idempotency, payload/deadline bounds, authorization-before-persistence, state/event transitions, cancellation races, outbox lease recovery, schema revalidation, sanitized remote errors, and trusted caller binding for optional MCP tools.

The separate-process loopback TCP test proves a local process-level MCP transport path only. The task repository remains in-memory; none of the tests proves persistence after restart, cross-process durable locking, production queue redelivery, or live third-party AI execution.

**Regression evidence:** Earlier failed runs 41271513643, 41272917191, and 41276348993 exposed stale grant/timeout fixtures, nullable-reference validation, the pinned MCP SDK v2 `callTool(params, options)` signature, missing optional task-tool registration, and integration fixture setup mistakes. The latest complete run 41276417903 passes all focused security, owner lifecycle, task, and full-suite gates on the exact head above.

## Asynchronous task execution

The feature branch adds a provider-neutral task coordinator, an in-memory reference repository, a registry-backed dispatcher, and optional inbound MCP task tools. The supported caller operations are `delegate_task`, `get_task`, `wait_task`, and `cancel_task`. The relay registers these tools only when the host injects a compatible task coordinator and binds every call to the trusted principal resolved for that request. The dispatcher rechecks tenant/caller grants and the remote tool's owner-approved schema fingerprint immediately before dispatch.

Task creation requires an atomic repository operation that writes the task, its initial event, and an outbox record. State transitions require compare-and-swap on the task version with the corresponding event appended atomically. Worker dispatch uses a leased outbox item and abort signal. A possibly delivered invocation is not retried automatically after an uncertain worker outcome; the task becomes `REMOTE_OUTCOME_UNKNOWN`.

The coordinator, task MCP tools, and dispatcher are CI-verified on exact head `c9a94b50fd77f82b36e8454cfdc117bb90b2e8f5` by run [41276417903](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41276417903). The current in-memory store is test/reference code, not a durable queue or database.

## Important limitations

This remains a local engineering implementation, not a production identity or hosting system:

- The bearer middleware is an RS256 JWT access-token resource-server verifier. It does not issue tokens, implement the OAuth authorization-code/PKCE flow, register clients, manage production signing keys, rotate signing keys, maintain a token revocation list, or establish a real identity-provider trust relationship.
- The relay still retains the original injected principal resolver as a test seam. A deployed runtime must configure the verified bearer middleware and must never expose that resolver as a public auth path.
- The credential vault's storage and key-provider contracts are implemented, but only in-memory test adapters exist. No persistent database adapter, KMS, platform secret manager, or production master-key lifecycle is connected.
- The secure outbound connection factory combines endpoint validation, pinned fetch, and vault-backed bearer credential loading. The internal owner manager previews and approves selected tools and manages connection cleanup, but its preview/active maps are process memory. It has no persistent endpoint registration, durable audit, public owner API, or web console.
- Tool schema drift fails closed during invocation. The owner-facing workflow to preview changed schemas and explicitly reapprove them after registration is not yet implemented.
- Tests use injected DNS, request, MCP client, transport, and credential adapters. They verify pinning decisions and configuration passed to Node HTTPS, but do not yet perform a real external TLS handshake, prove the selected runtime's DNS behavior under attack, or enforce network-level egress controls.
- The registry and task repository remain in-memory. Tasks, grants, connection previews, and active connections are lost on process restart. There is no production SQL adapter, migration set, durable outbox/queue, worker service, durable task history, or message retention.
- The task coordinator is locally verified but production transaction rollback, cross-process compare-and-swap, worker restart recovery, queue redelivery, dead-letter handling, and uncertain remote-call reconciliation remain release gates.
- `delegate_task`, `get_task`, `wait_task`, and `cancel_task` are optional and register only when a compatible coordinator is injected. `get_agent` and `list_my_connections` remain planned.
- No real AI provider or consumer chat UI is connected.
- No Cloudflare resource, DNS, TLS, or production deployment has been changed. The accessible Cloudflare account has no MeepSheep resources. The existing Supabase `meepsheep-storage` project is `INACTIVE` and its database was not reachable during read-only inspection.

## Next engineering gates

1. Resolve the authoritative relational database and key-management provider using the current account inventory; do not provision or resume a resource until approved.
2. Implement durable task, registry, connection, and vault adapters plus migrations that satisfy atomic task+event+outbox and compare-and-swap contracts.
3. Select the durable queue/orchestration primitive and implement a worker with restart recovery, idempotency-aware retry rules, dead-letter handling, and monitoring.
4. Add a public owner API/console around the internal connection manager, durable audit history, and owner-driven schema reapproval workflow.
5. Select the production OAuth issuer, client registration/PKCE flow, trusted JWKS source, signing-key rotation, and revocation owner.
6. Add a real TLS/socket integration test against an independently operated remote MCP server and validate network egress controls in the selected hosting runtime.
7. Verify the first actual requesting MCP client and target remote agent before introducing live credentials or claiming provider support.

See [BUILD_PLAN.md](BUILD_PLAN.md), [API_SPEC.md](API_SPEC.md), [TEST_STRATEGY.md](TEST_STRATEGY.md), and [STATE.md](STATE.md).
