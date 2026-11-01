# MeepSheep Project State Ledger

**Last updated:** 2026-11-01  
**Repository:** `LILSYNNOFFICIAL/MeepSheep`  
**Default branch:** `main`  
**Active implementation branch:** `feat/secure-connection-boundary` (draft PR #5, stacked on PR #4)

This ledger distinguishes verified implementation from planned or unverified capabilities.

## Product direction

- [x] Owner-confirmed primary purpose: AI agents communicate with other AI agents.
- [x] MCP-first product direction documented and merged to main.
- [x] Inbound MCP server and outbound MCP client roles documented.
- [x] Remote agents perform their own work using their own models, tools, and capabilities.
- [x] A2A, provider APIs, and webhooks remain optional adapters.
- [x] MeepSheep-owned research-engine functionality is deferred from the MVP.

## Documentation foundation

- [x] PR #2 merged to main: https://github.com/LILSYNNOFFICIAL/MeepSheep/pull/2
- [x] Merge commit: `d0bec625eb191d71781ab3e1d239245e54dd9594`
- [x] README, product, architecture, interoperability, security, API, build, and workflow docs aligned around the MCP relay.
- [x] Automated test suite exists.
- [x] CI workflow exists.

## Local MCP relay laboratory

- [x] Node.js 26.13.0 local-lab runtime pinned in `.nvmrc`.
- [x] Official MCP TypeScript SDK v2.4.0 client/server packages pinned.
- [x] Zod 4.6.7 pinned.
- [x] Inbound MCP handler exposes `discover_agents` and `send_message`.
- [x] Outbound MCP client initializes against a separately instantiated mock MCP handler.
- [x] In-memory registry enforces same-tenant discovery and message permission.
- [x] Remote tool invocation requires an owner-approved tool name and matching canonical SHA-256 fingerprint of name, description, input schema, and output schema.
- [x] Successful responses include message ID, trace ID, caller principal, target agent, output, and MCP provenance.
- [x] Remote tool errors are sanitized before returning to the caller.
- [x] Nine MCP integration tests pass in CI, including a separate-process loopback TCP test and trusted-auth boundary checks.

**Important boundary:** The test uses the MCP SDK's Streamable HTTP transport with a custom in-process fetch bridge. It exercises MCP protocol messages between separate handler/client instances, but it does not yet prove socket-level networking, separate-process operation, production authentication, persistence, or a live external AI system.

## Secure connection boundary (draft PR #5)

- [x] RS256 JWT access-token verifier checks a configured JWKS resolver, exact issuer/audience, `typ: at+jwt`, subject, tenant, client ID, unique OAuth scope tokens, token ID, issue/expiry times, clock skew, and maximum lifetime.
- [x] Bearer middleware authenticates each inbound HTTP request, replaces any caller-supplied MCP auth context, and returns fail-closed 401/503 responses.
- [x] Relay integration test proves a forged `authInfo.extra.principal` cannot override the signed-token principal or tenant.
- [x] Exact-host endpoint validator requires HTTPS/443, rejects URL credentials/query/fragment/IP literals, resolves all DNS answers, and rejects non-public or mixed address sets.
- [x] Pinned HTTPS fetch adapter restricts requests to the validated origin/path and allowed methods, supplies only snapshotted addresses to DNS lookup, preserves host/SNI TLS verification, strips unsafe request headers, bounds request/response bytes, applies a timeout, and does not follow redirects.
- [x] Focused security tests: 7 authentication tests and 9 endpoint security tests.
- [x] Full Node suite: 30 passed, 0 failed.
- [x] CI on exact head `05563436e7631024733bd82bd5f03c9612ce0bf4`: [run 41268297674](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41268297674).
- [x] Python Wellness Doctor: 10 passed.
- [x] Repository Doctor: 113 passed, 0 warnings, 0 errors, 0 critical.
- [x] Both GitHub Actions workflow YAML files parsed successfully.

**Security boundary:** The token verifier is a resource-server primitive, not a complete OAuth authorization server or production identity integration. The endpoint validator/fetch helper is implemented and unit-tested, but it is not yet wired into owner-controlled agent registration or the current registry's outbound MCP client construction. The fetch adapter's real external TLS/socket behavior and deployment egress policy remain unverified.

## Latest verification

- Stacked PR #4: https://github.com/LILSYNNOFFICIAL/MeepSheep/pull/4
- Branch: `feat/mcp-tool-schema-approval`
- CI-verified head: `2718da1a49404fcf270db09276bc96d94ed2354f`
- PR #4 targets `feat/mcp-relay-lab` and depends on PR #3. CI run 41263501830 passed: 13 Node tests, 10 Python Wellness Doctor tests, 112 Repository Doctor checks, zero warnings/errors/critical, and both workflow YAML files parsed.

- PR #3: https://github.com/LILSYNNOFFICIAL/MeepSheep/pull/3
- Active branch: `feat/mcp-relay-lab`
- Tested implementation head: `6a11d3aa40c8173b0dc996842d6cc0f9c615e99b`
- Quality run: https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41253769189
- Node MCP tests: 9 passed, 0 failed.
- Python Wellness Doctor unit tests: 10 passed.
- Repository Doctor: 112 passed, 0 warnings, 0 errors, 0 critical.
- Both GitHub Actions workflow YAML files parsed successfully.
- TDD red evidence: earlier run 41253274558 failed because `src/relay/agent-registry.mjs` did not yet exist. After implementation, run 41253320195 passed the first six MCP tests; run 41253359267 passed the expanded seven-test suite.

## Not implemented or not verified

- [ ] Persistent database, migrations, durable tasks, or message history.
- [x] Local signed bearer-token resource-server verification and forged-context integration boundary.
- [ ] Production OAuth authorization server/token issuance, registered clients/PKCE, trusted identity provider, JWKS lifecycle, and revocation.
- [ ] Owner console for registering endpoints and approving tools.
- [x] Local full tool-schema fingerprint drift detection and fail-closed invocation check implemented and CI-verified on PR #4.
- [ ] Production owner onboarding/reapproval workflow for schema changes.
- [x] Local HTTPS endpoint policy and pinned-fetch primitives with deterministic tests.
- [ ] Wire endpoint policy into owner-approved remote MCP registration/client construction and verify real socket/TLS behavior.
- [ ] Encrypted per-connection credential vault with production key-provider integration.
- [ ] Persistent agent/connection registry and migrations.
- [ ] Durable asynchronous tasks, idempotency, deadlines, cancellation, and retries.
- [x] Local separate-process mock MCP agent over loopback TCP.
- [ ] Public network-separated endpoint and live external remote MCP agent round trip.
- [ ] Real external AI agent and real requesting client round trip.
- [ ] A2A/provider/webhook adapters.
- [ ] Production Cloudflare deployment, DNS, TLS, or hosting.
- [x] Dependency lockfile committed and CI uses `npm ci`.
- [ ] Lint, typecheck, secret scanning, and supply-chain audit.
- [ ] Branch protection/rulesets verified.

No production credentials, Cloudflare resources, DNS, or deployment have been changed.

## Infrastructure

A read-only inspection on 2026-10-31 returned one accessible Cloudflare account with zero zones, Worker scripts, D1 databases, Durable Object namespaces, and Queues. This is account-scoped and does not rule out another account or registrar. Do not deploy or change DNS until the correct account and domain zone are confirmed.

## Next actions

1. Integrate the validated endpoint and pinned fetch into the remote MCP connection factory, then verify a real TLS/socket path.
2. Select and integrate the production OAuth issuer, client registration/PKCE flow, JWKS rotation, and token revocation owner.
3. Build the encrypted per-connection credential vault and key-provider integration.
4. Select the authoritative database and implement persistent agent/connection records and migrations.
5. Implement durable asynchronous tasks, idempotency, deadlines, cancellation, and bounded retries.
6. Confirm the first real requesting MCP client and target remote agent.
7. Verify the correct Cloudflare account/domain and selected hosting egress controls before deployment.
8. Prove a genuine independent-agent round trip before claiming provider support.

## Session handoff

- Date:
- Objective:
- Branch and exact commit SHA:
- Files/systems changed:
- Tests and verification performed:
- Exact results:
- Known failures and unverified items:
- Next action:

Never store secrets, access tokens, private keys, or unnecessary personal data here.
