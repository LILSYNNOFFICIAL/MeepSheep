# MeepSheep Project State Ledger

**Last updated:** 2026-10-31  
**Repository:** `LILSYNNOFFICIAL/MeepSheep`  
**Default branch:** `main`  
**Active implementation branch:** `feat/mcp-relay-lab`

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

## Latest verification

- Stacked PR #4: https://github.com/LILSYNNOFFICIAL/MeepSheep/pull/4
- Branch: `feat/mcp-tool-schema-approval`
- Current head: `f8a04d6151dc6030a14afcf5286d8983c35d8a6d`
- PR #4 targets `feat/mcp-relay-lab` and depends on PR #3. New schema-fingerprint tests are awaiting CI evidence; no pass claim is made.

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
- [ ] Production authentication/OAuth and a trusted real caller identity provider.
- [ ] Owner console for registering endpoints and approving tools.
- [x] Local full tool-schema fingerprint drift detection and fail-closed invocation check implemented on stacked PR #4; CI verification pending.
- [ ] Production owner onboarding/reapproval workflow for schema changes.
- [ ] Network-separated remote MCP process and socket-level round trip.
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

1. Extend the lab to a network-separated remote MCP process and socket-level HTTP test.
2. Generate and commit a dependency lockfile, then change CI to `npm ci`.
3. Add full tool-schema fingerprint verification and tests.
4. Confirm the first real requesting MCP client and target remote agent.
5. Verify the correct Cloudflare account/domain and decide the single authoritative database/auth owner.
6. Design production authentication, endpoint validation, persistence, async tasks, and budgets before adding live credentials.
7. Prove a genuine independent-agent round trip before claiming provider support.

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
