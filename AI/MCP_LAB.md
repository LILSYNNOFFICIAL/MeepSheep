# Local MCP Relay Laboratory

**Status:** Local relay, inbound resource-server authentication, pinned outbound MCP connection factory, encrypted credential-vault abstraction, registry secret-isolation, and internal owner connection lifecycle are CI-tested. Not deployed.  
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

The suite includes `tests/mcp-relay.integration.test.mjs`, `tests/tool-schema.test.mjs`, `tests/security-boundary.test.mjs`, `tests/endpoint-security.test.mjs`, `tests/credential-vault.test.mjs`, `tests/agent-registry.test.mjs`, `tests/remote-mcp-connection.test.mjs`, and `tests/agent-connection-manager.test.mjs`.

Latest verified run for draft PR #5 tested exact head `59b38b6e3b3329c983b696bd01da7ded667bb2e2`: [GitHub Actions run 41269980816](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41269980816).

- Authentication boundary: **8 passed, 0 failed**.
- Endpoint security and pinned-fetch policy: **11 passed, 0 failed**.
- Credential vault: **11 passed, 0 failed**.
- Registry secret isolation: **4 passed, 0 failed**.
- Secure outbound MCP connector: **5 passed, 0 failed**.
- Owner connection lifecycle: **10 passed, 0 failed**.
- Full Node suite: **63 passed, 0 failed**.
- Python Wellness Doctor: **10 passed**.
- Repository Doctor: **113 passed, 0 warnings, 0 errors, 0 critical**.
- Both GitHub Actions workflow YAML files parsed successfully.
- Clean CI dependency installation via `npm ci --ignore-scripts --no-audit --no-fund` passed.

The owner lifecycle tests cover preview without premature registration, credential-vault interface requirements, owner/tenant boundaries, selected-tool-only approval, rejection of unknown/duplicate/empty selections, expiry and client cleanup, disconnect and credential revocation, and cleanup when revocation fails. Security tests cover signed-token claims, forged auth context, IPv4/IPv6 and mixed DNS answers, pinned lookup/TLS settings, request/response header policy, request deadlines and cancellation, vault tampering/rotation/revocation, tenant isolation, credential reference validation, and prototype-like tool names.

**TDD evidence:** Authentication/endpoint/registry/connector/lifecycle suites were added before their corresponding production changes and failed for the expected missing-module or missing-behavior reason. Subsequent fixes were challenged by additional tests. The latest complete run 41269980816 passes all focused suites and the full regression suite on the exact head above.

## Asynchronous task execution

The feature branch adds a provider-neutral task coordinator, an in-memory reference repository, a registry-backed dispatcher, and optional inbound MCP task tools. The supported caller operations are `delegate_task`, `get_task`, `wait_task`, and `cancel_task`. The dispatcher rechecks tenant/caller authorization and the remote tool's owner-approved schema fingerprint immediately before dispatch.

Task creation requires an atomic repository operation that writes the task, its initial event, and an outbox record. State transitions require compare-and-swap on the task version with the corresponding event appended atomically. Worker dispatch uses a leased outbox item and abort signal. A possibly delivered invocation is not retried automatically after an uncertain worker outcome; the task becomes `REMOTE_OUTCOME_UNKNOWN`.

The current in-memory store is test/reference code, not a durable queue or database. **CI verification of these task additions on the latest exact branch head is pending.** The previously green security/connection run does not cover these later task changes. See [TASK_EXECUTION.md](TASK_EXECUTION.md).

## Important limitations

This remains a local engineering implementation, not a production identity or hosting system:

- The bearer middleware is an RS256 JWT access-token resource-server verifier. It does not issue tokens, implement the OAuth authorization-code/PKCE flow, register clients, manage production signing keys, rotate signing keys, maintain a token revocation list, or establish a real identity-provider trust relationship.
- The relay still retains the original injected principal resolver as a test seam. A deployed runtime must configure the verified bearer middleware and must never expose that resolver as a public auth path.
- The credential vault's storage and key-provider contracts are implemented, but only in-memory test adapters exist. No persistent database adapter, KMS, platform secret manager, or production master-key lifecycle is connected.
- The secure outbound connection factory combines endpoint validation, pinned fetch, and vault-backed bearer credential loading. The internal owner manager now previews and approves selected tools and manages connection cleanup, but its preview/active maps are process memory. It has no persistent endpoint registration, durable audit, public owner API, or web console.
- Tool schema drift fails closed during invocation. The owner-facing workflow to preview changed schemas and explicitly reapprove them after registration is not yet implemented.
- Tests use injected DNS, request, MCP client, transport, and credential adapters. They verify pinning decisions and configuration passed to Node HTTPS, but do not yet perform a real external TLS handshake, prove the selected runtime's DNS behavior under attack, or enforce network-level egress controls.
- The registry remains in-memory. There is no persistent agent/connection registry, migration set, durable task database/queue, task history, or message retention.
- Only `discover_agents` and `send_message` are exposed as inbound MCP tools. Delegation, task retrieval/wait/cancel, list connections, rate/budget service, and owner console remain future work.
- No real AI provider or consumer chat UI is connected.
- No Cloudflare resource, DNS, TLS, or production deployment has been changed.

## Next engineering gates

1. Define provider-neutral persistence contracts and migrations for tenants, principals, agents, connections, approved tool snapshots, grants, credential references, tasks, task events, audit events, and idempotency keys.
2. Select one authoritative relational database and key-management provider, then implement durable registry and vault adapters with transaction/compare-and-swap semantics.
3. Add a public owner API/console around the internal connection manager, durable audit history, and owner-driven schema reapproval workflow.
4. Select the production OAuth issuer, client registration/PKCE flow, trusted JWKS source, signing-key rotation, and revocation owner.
5. Implement durable asynchronous task records/events, idempotency, deadlines, bounded retries, cancellation, and recovery after restart.
6. Add a real TLS/socket integration test against an independently operated remote MCP server and validate network egress controls in the selected hosting runtime.
7. Verify the first actual requesting MCP client and target remote agent before introducing live credentials or claiming provider support.

See [BUILD_PLAN.md](BUILD_PLAN.md), [API_SPEC.md](API_SPEC.md), [TEST_STRATEGY.md](TEST_STRATEGY.md), and [STATE.md](STATE.md).
