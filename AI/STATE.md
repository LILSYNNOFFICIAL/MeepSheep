# MeepSheep Project State Ledger

**Last updated:** 2026-11-01  
**Repository:** `LILSYNNOFFICIAL/MeepSheep`  
**Default branch:** `main`  
**Active implementation branch:** `feat/secure-connection-boundary` (draft PR #5, stacked on PR #4)  
**Latest documentation checkpoint:** PR #5 head `58f6ee0c73ad1e2836d9aba472d07bdab7c2a034` passed run [41289621348](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289621348); CI checked out merge revision `e60e52c301f3a98c3cf9dc64c0ddc2ca031b5941`. The tested branch includes task-contract implementation commit `b5904db4fdaf1d608e5264f86038a45380116fb5`, which passed run 41289499297. All eight shared repository-contract cases pass.

This ledger distinguishes verified local behavior from production capabilities that remain unimplemented or unverified.

## Product direction

- [x] MeepSheep is an MCP-first AI-to-AI communication and coordination service.
- [x] The inbound MCP server is the primary interface for compatible requesting clients.
- [x] The outbound MCP client connects to separately configured remote MCP servers.
- [x] MeepSheep owns the relay, registry, authorization boundary, routing, task coordination, and provenance.
- [x] Remote agents perform their own work with their own models, tools, and capabilities.
- [x] A2A, provider APIs, and webhooks remain optional adapters.
- [x] MeepSheep-owned research-engine functionality is outside the MVP.

## Documentation foundation

- [x] PR #2 merged to main: https://github.com/LILSYNNOFFICIAL/MeepSheep/pull/2
- [x] MCP-first README and AI documentation foundation exists.
- [x] Automated test suite exists.
- [x] CI workflow exists.
- [x] Repository Wellness Doctor and scheduled README health workflow exist.

## Open pull-request stack

All three PRs were rechecked on 2026-11-01. They remain open and mergeable. The review API returned no submitted reviews for PRs #3, #4, or #5 at that inspection.

| PR | Title | Head | Base | State |
|---|---|---|---|---|
| [#3](https://github.com/LILSYNNOFFICIAL/MeepSheep/pull/3) | Build MCP relay laboratory | `feat/mcp-relay-lab` at `ca56cbfcb82d0c19fcbf6b904c43ae1dc1579049` | `main` | Open, ready for review |
| [#4](https://github.com/LILSYNNOFFICIAL/MeepSheep/pull/4) | Require owner-approved MCP tool schema fingerprints | `feat/mcp-tool-schema-approval` at `1d76b9708d7102bbce7e18af3c3541cbc011755d` | `feat/mcp-relay-lab` | Open, stacked on #3 |
| [#5](https://github.com/LILSYNNOFFICIAL/MeepSheep/pull/5) | Secure MCP connections and add async task orchestration | `feat/secure-connection-boundary` at `58f6ee0c73ad1e2836d9aba472d07bdab7c2a034` | `feat/mcp-tool-schema-approval` | Open, draft, stacked on #4 |

Required integration order is **#3 → #4 → #5**. PR #5 must not be merged directly to `main` while its base is PR #4's branch. After a parent merges, retarget/rebase its child as required, inspect the changed diff, rerun CI on the new exact head, and obtain review before proceeding. No PR was merged, retargeted, or closed in this work.

## Verified local MCP relay

- [x] Node.js 26.13.0 local-lab runtime and npm lockfile.
- [x] Official MCP TypeScript SDK v2.4.0 client/server packages and Zod 4.6.7 pinned.
- [x] Inbound `discover_agents` and `send_message` tools.
- [x] Outbound MCP client connected to a deterministic mock agent.
- [x] Separate-process mock MCP agent exercised over loopback TCP.
- [x] Tenant-aware in-memory registry with explicit owner grants and approved remote tool allowlists.
- [x] Canonical SHA-256 remote tool fingerprints include tool name, description, input schema, and output schema.
- [x] Tool schema drift fails closed before invocation.
- [x] Structured message/trace identity and remote provenance; remote errors are sanitized.

**Boundary:** The local test harness uses deterministic MCP fetch bridges plus one separate-process loopback TCP case. It does not prove public-network deployment, a separately operated third-party AI agent, or production egress controls.

## Verified local security and owner connection lifecycle

- [x] RS256 JWT access-token resource-server verifier using a configured trusted JWKS resolver.
- [x] Issuer/audience, access-token type, subject, tenant, client, scope grammar, JTI, issue/expiry times, bounded skew, and maximum lifetime checks.
- [x] Bearer middleware replaces caller-provided authentication context; forged identity fields cannot override verified token claims.
- [x] Exact-host HTTPS/443 endpoint policy and validation of every IPv4/IPv6 DNS answer.
- [x] Rejection of private, loopback, reserved, link-local, mixed DNS, IP-literal, credential-bearing, query, fragment, and redirect cases.
- [x] Pinned fetch preserves hostname/SNI TLS checks, restricts origin/path/method, strips unsafe headers, forces identity encoding, bounds bytes/time, and supports cancellation.
- [x] AES-256-GCM credential-vault logic binds authenticated metadata to tenant, credential, key, schema, and record version; supports scoped decryption, key rotation, revocation, tamper rejection, and optimistic concurrency.
- [x] Registry accepts only safe fields and canonical opaque references, rejects raw credentials/authorization/endpoint URL fields, and hides secret references from discovery.
- [x] Internal owner connection manager previews without registration, binds previews to owner/tenant, expires abandoned previews, requires explicit selection of discovered tools, registers approved schema snapshots, and disconnects/revokes/cleans up safely.

**Still local-only:** Registry, owner previews, active connections, vault storage, and key provider use in-memory/test adapters. No OAuth issuer, production JWKS trust lifecycle, persistent endpoint approvals, public owner API/console, production KMS, or durable audit trail is implemented.

## Verified local asynchronous task orchestration

- [x] Provider-neutral task coordinator with server-generated task/trace IDs, tenant/caller scope, request fingerprint, scoped idempotency hash, bounded JSON payload, deadlines, and optimistic-concurrency version.
- [x] Repository contract defines atomic task + initial event + dispatch outbox creation, version-checked transition + event append, leased outbox claim, and fenced completion requiring worker ID, claim attempt, exact lease deadline, and an unexpired lease.
- [x] Reusable eight-case repository behavioral contract is registered by the in-memory adapter test suite; future adapters can run it against their own repository factory, including tenant-and-caller idempotency uniqueness.
- [x] In-memory reference repository implements the contract for local tests only; it is not durable or safe for multi-process deployment.
- [x] Registry-backed dispatcher rechecks tenant, caller grant, approved tool name, current remote schema fingerprint, and cancellation before remote call.
- [x] Worker state transitions, expiry, task event history, bounded cancellation/wait, output-size limits, and sanitized error mapping.
- [x] Ambiguous post-dispatch lease expiry becomes `REMOTE_OUTCOME_UNKNOWN`; the worker does not blindly repeat a potentially delivered non-idempotent remote call.
- [x] Optional inbound `delegate_task`, `get_task`, `wait_task`, and `cancel_task` tools register only when the host injects a compatible coordinator and bind to the trusted request principal.

**Still unimplemented:** Production SQL adapter/migrations, durable queue/outbox, worker service and restart recovery, retention/deletion policy, dead-letter/reconciliation controls, cross-process transaction/CAS tests, the suspended-worker-to-dispatch boundary, and live remote idempotency/cancellation.

## Latest exact-head quality verification

The current PR #5 documentation checkpoint and its task-contract implementation passed the complete GitHub Actions quality workflow:
- **PR:** [#5](https://github.com/LILSYNNOFFICIAL/MeepSheep/pull/5)
- **Documentation checkpoint commit:** `58f6ee0c73ad1e2836d9aba472d07bdab7c2a034`
- **Task-contract implementation commit:** `b5904db4fdaf1d608e5264f86038a45380116fb5`
- **CI run:** [41289621348](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289621348) — completed successfully.
- **PR merge revision checked out:** `e60e52c301f3a98c3cf9dc64c0ddc2ca031b5941`.
- Authentication boundary: 8/8.
- Endpoint security: 11/11.
- Credential vault: 11/11.
- Agent registry isolation: 7/7.
- Secure remote MCP connection: 5/5.
- Owner connection lifecycle: 10/10.
- Task coordinator: 15/15.
- Task dispatcher: 8/8.
- Reusable task repository contract suite: 8/8.
- Full Node suite: **98 passed, 0 failed**.
- Python Wellness Doctor unit tests: **10 passed**.
- Repository Doctor: **117 passed, 0 warnings, 0 errors, 0 critical**.
- Both GitHub Actions workflow YAML files parsed successfully.
- Every focused gate and the final complete quality gate passed on the tested PR merge revision.

The reusable suite in `tests/support/task-repository-contract.mjs` covers concurrent idempotent creation and initial records, uniqueness scoped to both tenant and caller, tenant-scoped reads, version-checked transition races, exclusive outbox claims and reclaim, exact lease-completion predicates, expired-lease rejection, and claim-generation fencing when worker IDs are reused. The in-memory adapter is its first implementation; no durable adapter exists yet.

**TDD evidence:** Run [41288627434](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41288627434) failed the two initial lease-fencing assertions against the pre-fix implementation. The current exact-head run above passed all eight shared repository-contract cases.

The task-contract implementation commit `b5904db4fdaf1d608e5264f86038a45380116fb5` also passed run [41289499297](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289499297). The current documentation checkpoint was independently retested by run 41289621348.


## Current account and infrastructure inventory (read-only, 2026-10-31)

### Cloudflare
- One Cloudflare account is accessible through the current connection.
- Read-only API inventory returned zero Zones, Worker scripts, D1 databases, Queues, and Durable Object namespaces.
- No MeepSheep deployment, domain zone, database, queue, or Worker has been created or changed.
- This inventory is account-scoped; it does not rule out a different Cloudflare account or domain registrar.

### Supabase
- The accessible organization is on the Free plan.
- An existing project named `meepsheep-storage` exists in `us-west-1`, but Supabase reports status `INACTIVE`.
- Project metadata reports PostgreSQL 17.6.1.166. Read-only table/extension inspection failed because the database was inaccessible; migration listing timed out.
- Security/performance advisors returned no lint records, which is not proof that the inactive database is healthy.
- A separate active project named `BlueNote` exists in the same organization and is unrelated. Do not repurpose it for MeepSheep.
- No project was resumed, no migration was applied, and no database schema or data was changed.

## Not implemented or not verified

- [ ] Persistent agent/connection/grant registry and migrations.
- [ ] Persistent credential-vault store and production KMS/platform secret-manager key provider.
- [ ] Production OAuth issuer, client registration/PKCE, signing-key rotation, token revocation, and verified identity-provider configuration.
- [ ] Durable task tables, atomic SQL transactions, outbox delivery, queue/worker, restart recovery, and dead-letter/reconciliation.
- [ ] Public owner API/console, persistent schema approvals, durable audit, schema reapproval workflow.
- [ ] Retention, export, deletion, and artifact authorization policies.
- [ ] Real external TLS/socket verification and runtime-level egress enforcement.
- [ ] First real requesting MCP client and independently operated target AI agent round trip.
- [ ] Production hosting, domain/TLS/DNS configuration, monitoring, backups, restore, cost controls, and launch approval.
- [ ] Formatting/lint/typecheck, secret scanning, dependency auditing, and repository branch-protection verification.

No production credentials, project resources, DNS, deployments, or external AI connections were changed.

## Next decision gate

The local asynchronous task layer is implemented and verified. The next independent implementation gate is durable persistence and worker architecture. The repository's platform and hosting decisions remain open:

1. Confirm whether the existing inactive `meepsheep-storage` Supabase project is the intended authoritative database and whether it should be restored for read-only inspection.
2. Compare that Postgres project with Cloudflare D1 under the actual hosting/account constraints. The accessible Cloudflare account currently has no configured Workers, D1, Queues, or zone.
3. Choose one authoritative database, key-management owner, and durable execution primitive before writing provider-specific schema or provisioning resources.

Do not restore, create, migrate, deploy, or alter DNS until the owner confirms the platform and account.

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
