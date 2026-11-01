# Local MCP Relay Laboratory

**Status:** Local relay plus resource-server and endpoint-security primitives are CI-tested. Not deployed.  
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

## Request path

```text
Test MCP caller
   |
   | Streamable HTTP MCP client
   v
MeepSheep inbound MCP handler
   |
   | principal resolved from trusted authInfo test seam
   v
In-memory agent registry + policy checks
   |
   | outbound MCP Client
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

The suite includes `tests/mcp-relay.integration.test.mjs`, `tests/tool-schema.test.mjs`, `tests/security-boundary.test.mjs`, and `tests/endpoint-security.test.mjs`.

The latest verified run for PR #5 tested branch head `05563436e7631024733bd82bd5f03c9612ce0bf4`: [GitHub Actions run 41268297674](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41268297674).

- Authentication boundary: **7 passed, 0 failed**.
- Endpoint policy/fetch adapter: **9 passed, 0 failed**.
- Full Node suite: **30 passed, 0 failed**.
- Python Wellness Doctor unit tests: **10 passed**.
- Repository Doctor: **113 passed, 0 warnings, 0 errors, 0 critical**.
- Both GitHub Actions workflow YAML files parsed successfully.
- `npm ci --ignore-scripts --no-audit --no-fund` installed the lockfile dependency set successfully.

The tests cover valid and invalid signed tokens, issuer/audience/algorithm/claim/time checks, forged auth-context rejection, same-tenant MCP discovery through bearer middleware, IPv4/IPv6 non-public range rejection, mixed DNS answers, exact host/path restrictions, pinned lookup contents, TLS hostname/SNI options, request-header stripping, request/response bounds, timeout signal creation, and redirect non-following.

**TDD evidence:** The authentication suite first failed because `src/relay/auth.mjs` did not exist (run 41267916343). The endpoint suite first failed because `src/relay/endpoint-security.mjs` did not exist (run 41267912546). The current verified run 41268297674 passes both focused suites and the full suite.

## Important limitations

This remains a local security implementation, not production:

- The bearer middleware is an RS256 JWT access-token resource-server verifier. It does not issue tokens, implement the OAuth authorization-code/PKCE flow, register clients, manage signing keys, rotate production keys, maintain a revocation list, or establish a real identity-provider trust relationship.
- The relay still permits the original injected principal resolver for tests and local harness compatibility. A deployed runtime must configure the bearer authenticator and must not expose that test seam as a public authentication path.
- The registry is in-memory. No database, migrations, durable task history, or message retention exists.
- The endpoint validator and pinned fetch helper are not yet wired into an owner-facing endpoint-registration flow or the registry's outbound client creation. The outbound MCP tests still connect to local mock handlers through the test harness.
- The endpoint tests inspect the pinned lookup callback and TLS options through a deterministic request seam. They do not yet prove a real external TLS handshake, DNS-rebinding resistance in the selected production runtime, or network egress enforcement.
- Only `discover_agents` and `send_message` are implemented. Task delegation, task retrieval, wait, cancellation, and connection management remain planned.
- The local lab has owner-approved tool-schema fingerprint comparison before each invocation. Production owner onboarding and reapproval UI are not implemented.
- No encrypted credential vault, persistent registry, durable task queue, owner console, rate/budget service, or multi-tenant persistence exists.
- No real AI provider or consumer chat UI is connected.
- No Cloudflare resource, DNS, TLS, or production deployment has been changed.

## Next engineering gates

1. Wire the endpoint validator and pinned fetch into an owner-approved remote MCP connection factory, then test the actual transport integration.
2. Select the production OAuth identity provider, token issuer, client registration/PKCE flow, JWKS rotation, and revocation model.
3. Build the encrypted per-connection credential vault against a selected secret-manager/key-provider interface.
4. Select one authoritative database and implement persistent agent/connection registry and migrations.
5. Implement durable asynchronous tasks, idempotency, deadlines, cancellation, and bounded retries.
6. Verify the first actual caller/target integration surfaces before introducing live credentials.

See [BUILD_PLAN.md](BUILD_PLAN.md), [API_SPEC.md](API_SPEC.md), [TEST_STRATEGY.md](TEST_STRATEGY.md), and [STATE.md](STATE.md).
