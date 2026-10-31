# Local MCP Relay Laboratory

**Status:** Implemented and CI-tested local prototype. Not deployed.  
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
- Owner-approved remote tool-name allowlist.
- Remote tool presence check before invocation.
- Structured response provenance and sanitized remote failure mapping.
- Deterministic mock MCP agent fixture.
- GitHub Actions integration tests.

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

The suite is `tests/mcp-relay.integration.test.mjs`, with mock agent fixture `tests/fixtures/mock-agent.mjs`.

Seven verified cases:
1. Same-tenant discovery excludes other tenants and does not expose endpoint/secret references.
2. Authorized `send_message` reaches the mock remote MCP tool and returns structured output and provenance.
3. Cross-tenant agents are hidden and cannot be invoked by guessed ID.
4. Unapproved remote tools are rejected before invocation.
5. A remote tool missing from the server's current tool list is rejected.
6. A caller without `agent:message` cannot dispatch.
7. Remote tool failure is sanitized before returning to the caller.

**Red/green evidence:**
- Initial test-first run 41253274558 failed because the relay implementation modules did not yet exist.
- After implementing the registry and MCP handler, run 41253320195 passed the initial six tests.
- After adding remote failure sanitization coverage, run 41253359267 passed all seven tests.

Latest CI also passed the existing 10 Python Wellness Doctor unit tests, reported 103 repository checks with zero warnings/errors/critical findings, and parsed both GitHub Actions workflow YAML files.

## Important limitations

This is intentionally a local lab, not production:
- The caller, relay, and mock target are separate MCP client/server handler instances, but tests use the SDK Streamable HTTP transport with an in-process `fetch` bridge. Socket-level HTTP and separate-process networking are not yet proven.
- The principal resolver is injected by test setup. No production OAuth/token verification or identity provider is implemented.
- The registry is in-memory. No database, migrations, durable task history, or message retention exists.
- Only `discover_agents` and `send_message` are implemented. Task delegation, task retrieval, wait, cancellation, and connection management remain planned.
- The tool check confirms that the approved tool name is still present. Full remote JSON Schema fingerprinting and change approval are not implemented.
- No owner console, credential onboarding, production secret store, SSRF policy, rate/budget service, or multi-tenant persistence exists.
- No real AI provider or consumer chat UI is connected.
- No Cloudflare resource, DNS, TLS, or production deployment has been changed.

## Next engineering gates

1. Add a socket-level HTTP test with the mock agent running as a separate process.
2. Generate and commit a dependency lockfile, then switch CI to `npm ci`.
3. Add full remote tool-schema fingerprint checks and owner reapproval on schema changes.
4. Add production authentication and endpoint onboarding design.
5. Select one authoritative database and durable task execution model.
6. Verify the first actual caller/target integration surfaces before introducing live credentials.

See [BUILD_PLAN.md](BUILD_PLAN.md), [API_SPEC.md](API_SPEC.md), [TEST_STRATEGY.md](TEST_STRATEGY.md), and [STATE.md](STATE.md).
