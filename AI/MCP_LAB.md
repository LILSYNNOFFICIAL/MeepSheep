# Local MCP Relay Laboratory

**Status:** Local relay, inbound resource-server authentication, pinned outbound MCP connection factory, encrypted credential-vault abstraction, and registry secret-isolation rules are CI-tested. Not deployed.  
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

The suite includes `tests/mcp-relay.integration.test.mjs`, `tests/tool-schema.test.mjs`, `tests/security-boundary.test.mjs`, `tests/endpoint-security.test.mjs`, `tests/credential-vault.test.mjs`, `tests/agent-registry.test.mjs`, and `tests/remote-mcp-connection.test.mjs`.

Latest verified run for draft PR #5 tested exact head `d1aa272bfc98e2f767aa389ea7f6b00859e6a71d`: [GitHub Actions run 41269374223](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41269374223).

- Authentication boundary: **8 passed, 0 failed**.
- Endpoint security and pinned-fetch policy: **11 passed, 0 failed**.
- Credential vault: **11 passed, 0 failed**.
- Registry secret isolation: **4 passed, 0 failed**.
- Secure outbound MCP connector: **5 passed, 0 failed**.
- Full Node suite: **53 passed, 0 failed**.
- Python Wellness Doctor: **10 passed**.
- Repository Doctor: **113 passed, 0 warnings, 0 errors, 0 critical**.
- Both GitHub Actions workflow YAML files parsed successfully.
- Clean CI dependency installation via `npm ci --ignore-scripts --no-audit --no-fund` passed.

The tests challenge signed-token claim validation and forged auth context; DNS answer sets and special IP ranges; pinned addresses and TLS hostname/SNI options; request/response header restrictions; request upload deadline and cancellation; vault ciphertext tampering and metadata binding; key rotation/revocation/stale-write behavior; tenant isolation; raw secret/URL retention; credential revocation before later outbound requests; and prototype-like remote tool names such as `__proto__`.

**TDD evidence:** Authentication and endpoint tests were first added before their modules and failed with missing-module errors. The registry test-first revision exposed that arbitrary registration fields were retained by object spread. The later adversarial CI revision independently exposed invalid-clock acceptance, missing identity-encoding enforcement, unbound key-ID metadata, noncanonical reference IDs, and unsafe prototype-key storage. The final run 41269374223 passes all focused suites and the full regression suite on the exact head listed above.

## Important limitations

This remains a local security implementation, not a production identity or hosting system:

- The bearer middleware is an RS256 JWT access-token resource-server verifier. It does not issue tokens, implement the OAuth authorization-code/PKCE flow, register clients, manage production signing keys, rotate signing keys, maintain a token revocation list, or establish a real identity-provider trust relationship.
- The relay still retains the original injected principal resolver as a test seam. A deployed runtime must configure the verified bearer middleware and must never expose that resolver as a public auth path.
- The credential vault's storage and key-provider contracts are implemented, but only in-memory test adapters exist. No persistent database adapter, KMS, platform secret manager, or production master-key lifecycle is connected.
- The secure outbound connection factory now combines the endpoint validator, pinned HTTPS fetch, and vault-backed bearer credential loading. There is not yet an owner-facing registration/approval/reapproval workflow that stores the endpoint and credential references and registers only the specific tools an owner approves.
- Tests use injected DNS, request, MCP client, and transport seams. They verify pinning decisions and configuration passed to Node HTTPS, but do not yet perform a real external TLS handshake, prove the selected runtime's DNS behavior under attack, or enforce network-level egress controls.
- The registry remains in-memory. There is no persistent agent/connection registry, migration set, durable task database/queue, task history, or message retention.
- Only `discover_agents` and `send_message` are implemented. Delegation, task retrieval/wait/cancel, connection management API, rate/budget service, and owner console remain future work.
- No real AI provider or consumer chat UI is connected.
- No Cloudflare resource, DNS, TLS, or production deployment has been changed.

## Next engineering gates

1. Add an owner-controlled connection manager that previews discovered tools, requires explicit per-tool approval, records immutable schema approvals, and supports disconnect/revocation without exposing secrets.
2. Select the production OAuth issuer/client registration/PKCE flow, trusted JWKS source, signing-key rotation, and token revocation owner.
3. Select the authoritative relational database and key-management provider. Implement persistent agent/connection/credential-reference repositories and migrations.
4. Implement durable asynchronous task records/events, idempotency, deadlines, bounded retries, and cancellation semantics behind repository/queue interfaces.
5. Add a real TLS/socket integration test against an independently operated remote MCP server and validate network egress controls in the selected hosting runtime.
6. Verify the first actual requesting MCP client and target remote agent before introducing live credentials or claiming provider support.

See [BUILD_PLAN.md](BUILD_PLAN.md), [API_SPEC.md](API_SPEC.md), [TEST_STRATEGY.md](TEST_STRATEGY.md), and [STATE.md](STATE.md).
