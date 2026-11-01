# MeepSheep Project State Ledger

**Last updated:** 2026-11-01  
**Repository:** `LILSYNNOFFICIAL/MeepSheep`  
**Default branch:** `main`  
**Active implementation branch:** `feat/secure-connection-boundary` (draft PR #5, stacked on PR #4)
**Current branch head:** `59b38b6e3b3329c983b696bd01da7ded667bb2e2`

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

**Important boundary:** Most in-process handler tests use the MCP SDK's Streamable HTTP transport with a custom fetch bridge for deterministic tests. A separate integration test starts the remote mock MCP server in a child Node process and sends the outbound MCP request over loopback TCP. This proves local separate-process/socket-level outbound transport, but not a public network connection, independently operated external agent, production authentication, or persistence.

## Secure connection boundary (draft PR #5)

- [x] RS256 JWT access-token verifier validates a configured JWKS resolver, exact issuer/audience, `typ: at+jwt`, subject, tenant, client ID, unique OAuth scope tokens, JTI, issue/expiry times, clock skew, and maximum lifetime.
- [x] Bearer middleware authenticates each inbound HTTP request, overwrites any caller-supplied MCP auth context, and fails closed on missing/invalid credentials or JWKS retrieval failure.
- [x] Relay integration test proves a forged `authInfo.extra.principal` cannot override signed-token caller identity or tenant.
- [x] Endpoint policy requires exact host allowlisting, HTTPS/443, validates every DNS result, and rejects IP literals, non-public/mixed DNS sets, credentials, query strings, and fragments.
- [x] Pinned HTTPS adapter restricts origin/path/method, pins DNS lookup to the approved snapshot, preserves host/SNI TLS checks, strips unsafe request headers, forces identity encoding, strips unsafe response headers, bounds upload and response bytes, applies request deadlines/cancellation, and does not follow redirects.
- [x] `createSecureRemoteMcpClient` combines endpoint validation, pinned transport, per-request vault-backed bearer injection, caller Authorization replacement, remote tool discovery, and schema fingerprint snapshots for owner review.
- [x] Credential vault encrypts with AES-256-GCM. Authenticated data binds tenant, credential ID, key ID, schema version, and record version. Supports scoped callbacks, key rotation, revocation/ciphertext destruction, size limits, and optimistic concurrency.
- [x] Agent registry stores an explicit safe field set, accepts only canonical opaque credential/endpoint references, rejects raw credentials/authorization headers and raw endpoint URLs, and does not expose references through discovery.
- [x] Internal owner connection manager previews remote tools without registration, binds previews to owner and tenant, enforces expiry, allows explicit selection of discovered tools, derives approved schema hashes from the preview snapshot, and registers only the selected tools.
- [x] Owner connection manager disconnect is owner/tenant scoped, unregisters the agent before cleanup, revokes its credential, and closes the MCP client even when credential revocation fails.
- [x] Any credential-backed connection requires both a vault load operation and a revocation operation.
- [x] Focused CI suites: authentication 8/8, endpoint 11/11, credential vault 11/11, registry isolation 4/4, secure remote MCP connection 5/5, owner connection lifecycle 10/10.
- [x] Full Node suite: **63 passed, 0 failed**.
- [x] CI exact head `59b38b6e3b3329c983b696bd01da7ded667bb2e2`: [run 41269980816](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41269980816).
- [x] Python Wellness Doctor: 10 passed.
- [x] Repository Doctor: 113 passed, 0 warnings, 0 errors, 0 critical.
- [x] Both GitHub Actions workflow YAML files parsed successfully.

**Still not production-ready:** The token verifier does not issue tokens or supply production OAuth client registration, PKCE, signing-key rotation, or revocation. The vault uses injected store/key-provider interfaces and has no persistent DB/KMS adapter. Registry, previews, and active connections are in-memory and are lost at process restart. The owner lifecycle module is an internal service, not a public owner API or console, and there is no persistent audit log. Tests use deterministic DNS/request/client/transport seams, so a real external TLS handshake and production egress enforcement remain unverified. No production credentials, Cloudflare resources, DNS, or deployment were changed.

## Latest verification

- PR #5: https://github.com/LILSYNNOFFICIAL/MeepSheep/pull/5
- Branch: `feat/secure-connection-boundary`
- CI-verified head: `59b38b6e3b3329c983b696bd01da7ded667bb2e2`
- Latest complete quality run: [41269980816](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41269980816)
- Focused suites: authentication 8, endpoint security 11, credential vault 11, registry isolation 4, secure outbound connector 5, owner connection lifecycle 10. All passed.
- Full Node suite: 63 passed, 0 failed.
- Python Wellness Doctor: 10 passed.
- Repository Doctor: 113 passed, 0 warnings, 0 errors, 0 critical.
- Both GitHub Actions workflow YAML files parsed successfully.
- PR #5 remains a draft stacked on PR #4; neither PR #3 nor PR #4 has been merged as part of this work.


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

- [ ] Persistent database adapter, migrations, durable tasks, message history, and retention/deletion behavior.
- [x] Local signed bearer-token resource-server verification and forged-context integration boundary.
- [ ] Production OAuth issuer/token issuance, client registration/PKCE, trusted identity-provider configuration, JWKS rotation, and token revocation.
- [x] Local encrypted AES-256-GCM credential-vault logic with rotation, revocation, tamper detection, and concurrency tests.
- [ ] Production credential-vault store and KMS/platform secret-manager key-provider adapters.
- [x] Local HTTPS endpoint policy, all-answer DNS validation, pinned fetch adapter, and request/response limits.
- [x] Local secure outbound MCP connection factory now combines endpoint validation, pinned fetch, and per-request vault-backed bearer auth.
- [x] Remote tool discovery returns schema fingerprints for owner review; the registry enforces explicit approved tool/schema snapshots.
- [x] Internal in-memory owner connection preview/approval/disconnect service with explicit per-tool schema approval and credential revocation.
- [ ] Public owner API/console, persistent endpoint approval records, schema reapproval workflow after tool drift, and durable audit trail.
- [x] Registry rejects raw credentials/authorization/endpoint fields and retains canonical opaque references.
- [ ] Persistent agent/connection registry and migrations.
- [ ] Durable asynchronous tasks, idempotency, deadlines, bounded retries, cancellation, task events, and recovery after restart.
- [x] Local separate-process mock MCP agent over loopback TCP.
- [ ] Real external TLS/socket integration against an independently operated remote MCP endpoint and deployed egress control.
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

1. Build an owner-controlled connection manager: endpoint preview, explicit per-tool approval, immutable schema approval snapshots, register/disconnect, revoke, and audit.
2. Select the authoritative relational database and production key-management provider, then implement persistent registry/vault adapters and migrations.
3. Select the production OAuth issuer/client registration/PKCE flow, trusted JWKS source, signing-key rotation, and revocation owner.
4. Build durable asynchronous task records/events, idempotency, deadlines, bounded retries, and cancellation semantics.
5. Verify real external TLS/socket behavior and runtime egress policy against the selected hosting platform.
6. Confirm the first requesting MCP client and independently operated target agent.
7. Prove an actual public-network AI-to-AI round trip before claiming provider support or deploying.

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
