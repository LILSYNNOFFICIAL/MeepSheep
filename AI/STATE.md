# MeepSheep Project State Ledger

**Last updated:** 2026-11-01  
**Repository:** `LILSYNNOFFICIAL/MeepSheep`  
**Default branch:** `main`  
**Active implementation branch:** `feat/secure-connection-boundary` (draft PR #5, stacked on PR #4)  
**Latest verified PR #5 code checkpoint before this documentation update:** Branch head `cc36b11208e91942288bdf69c283258db2ddc7f4` passed complete quality run [41289984859](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289984859); CI checked out merge revision `89215fc5d8e2197dfc531d2a6c9ff997c0b2b09f`. The run reported 98/98 Node tests, 10/10 Python Wellness Doctor tests, 117 Repository Doctor checks with zero warnings/errors/critical, and both workflow YAML files valid. The current documentation checkpoint is being recorded separately from that tested code checkpoint.

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
| [#5](https://github.com/LILSYNNOFFICIAL/MeepSheep/pull/5) | Secure MCP connections and add async task orchestration | `feat/secure-connection-boundary` (documentation updates follow tested code checkpoint `cc36b11208e91942288bdf69c283258db2ddc7f4`) | `feat/mcp-tool-schema-approval` | Open, draft, stacked on #4 |

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

The current PR #5 task-contract implementation and documentation checkpoint passed the complete GitHub Actions quality workflow:
- **PR:** [#5](https://github.com/LILSYNNOFFICIAL/MeepSheep/pull/5)
- **Latest verified branch checkpoint:** `2e192a220cc1182fa5f0bca92fd1a934eddd13f6`
- **Task-contract implementation commit:** `b5904db4fdaf1d608e5264f86038a45380116fb5`
- **CI run:** [41289860243](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289860243) — completed successfully.
- **PR merge revision checked out:** `2e539222cc3d8c0e833148132915dcd22de1a49f`.
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

The task-contract implementation commit `b5904db4fdaf1d608e5264f86038a45380116fb5` also passed run [41289499297](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289499297). Documentation checkpoint `58f6ee0c73ad1e2836d9aba472d07bdab7c2a034` passed run [41289621348](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289621348).


## Current account and database inspection (read-only, 2026-11-01)

### Cloudflare
- One Cloudflare account is accessible through the current connection.
- Read-only API inventory returned zero Zones, Worker scripts, D1 databases, Queues, and Durable Object namespaces.
- No Cloudflare resources, DNS, or deployments were created or changed.
- This inventory is account-scoped and does not rule out another Cloudflare account or registrar.

### Supabase
- The accessible organization `NeuroSyn DEV` is on the Free plan.
- The owner-authorized restore was requested for `meepsheep-storage` only. The project now reports `ACTIVE_HEALTHY` in `us-west-1`, PostgreSQL 17.6.1.166.
- The separate `BlueNote` project was rechecked and remains `ACTIVE_HEALTHY`; it was not modified.
- Read-only catalog inspection found 45 user tables across Supabase-managed schemas and five public application tables: `mcp_servers`, `mcp_tools`, `mcp_execution_logs`, `mcp_server_credentials`, and `media_assets`. All five have RLS enabled. Each reported zero rows, and `auth.users` reported zero rows.
- Eleven migration versions are recorded in `supabase_migrations.schema_migrations`, from `20260924232223` through `20260927014415`. The inspected PR #5 branch contains no SQL migration directory/files, so those applied migrations are not currently reproducible from this branch.
- Installed extensions include `supabase_vault` 0.3.1, `pgcrypto` 1.3, `pg_stat_statements` 1.11, `uuid-ossp` 1.1, and `plpgsql` 1.0. `pgmq` 1.5.1, `pg_cron`, and `pg_net` are available but not installed. No extension was installed.
- Existing public schema is owner-scoped MCP server/tool/credential/log/media groundwork. It has no task, task-event, outbox, tenant, principal, or grant tables. `mcp_tools.server_id` has no foreign-key constraint to `mcp_servers`.
- The Supabase security advisor returned zero lints. The performance advisor returned one RLS initialization-plan warning for `mcp_server_credentials_owner_all` and five informational unused-index findings. No index or policy was changed.
- Supabase documents that Free projects with low activity over a seven-day period may be paused; paid-plan projects are not subject to inactivity pausing. Production availability requires an explicit plan/budget decision. No plan change was made.
- No application data was read, no credential contents were read, no SQL writes or migrations were run, and no database schema or extension was changed. The only project mutation was the authorized restore of `meepsheep-storage`.

### Platform recommendation status
- Supabase Postgres with PGMQ is the preferred candidate for the next implementation design because the existing PostgreSQL project is healthy, has Vault/crypto support and existing MCP tables, and is materially closer to the current architecture than an empty Cloudflare account.
- This remains a **Proposed** recommendation, not an accepted production platform. The Free-plan pause policy, migration-source gap, current owner-only schema, tenant/auth mapping, and missing durable task/outbox schema must be resolved first.
- Cloudflare D1 + Queues + Workflows remains a viable alternative if Cloudflare hosting becomes the chosen runtime and its infrastructure is intentionally provisioned.

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

No production credentials, application data, database schema, migrations, extensions, Cloudflare resources, DNS, deployments, or external AI connections were changed. The only project lifecycle mutation was the owner-authorized restore of `meepsheep-storage`.

## Next decision gate

The read-only database inspection is complete. The next gate is an owner-approved platform and operating-plan decision, not an automatic migration:

1. Review proposed decision D-016 in `AI/DECISIONS.md`: Supabase Postgres is the preferred candidate; O-004 and O-005 remain open.
2. Decide whether the Free organization is acceptable for development/staging and what paid-plan budget is approved before an always-on production service is expected.
3. Recover the eleven exact applied SQL migration files or establish a reviewed, reproducible baseline before repository-driven schema changes.
4. Design tenant/principal/auth mapping, RLS, connection/grant persistence, task/event/idempotency/outbox tables, and database-clock lease fencing against the shared repository contract.
5. Only after the platform and plan are approved, implement the Postgres repository adapter and queue integration; then run the shared contract plus provider-specific rollback, concurrency, restart, lease-expiry, and redelivery tests.

No database migrations, extension installation, infrastructure provisioning, plan upgrade, DNS change, or deployment is authorized or has been performed in this inspection step.

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
