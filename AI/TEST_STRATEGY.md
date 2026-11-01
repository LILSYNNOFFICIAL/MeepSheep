# MeepSheep Test Strategy

**Status:** Required test plan. A first local MCP relay integration suite is implemented and runs in CI; production and live-provider scenarios remain planned.

## 1. Test layers

- **Unit:** schema validation, authorization, tenant isolation, state transitions, idempotency, budgets, redaction.
- **MCP contract:** server tool discovery, tool schemas, authentication, tool invocation, structured errors, transport lifecycle.
- **Outbound MCP contract:** client initialization, remote tool discovery, owner allowlist, schema drift, authenticated invocation, disconnect/revocation.
- **Integration:** router plus deterministic remote MCP mock servers, durable task state, retries, cancellation, and events.
- **End-to-end:** a real MCP client connects to MeepSheep and delegates to a separately operated remote agent.
- **Security:** confused deputy, cross-tenant access, prompt injection, malicious tool descriptions/results, SSRF, replay, credential leakage.
- **Reliability:** timeout, remote outage, duplicate delivery, worker restart, redelivery, partial failure, malformed response.
- **Performance/cost:** concurrency, latency, payload size, fan-out, task duration, storage, and measured provider usage.

## 2. Mandatory acceptance scenarios

1. Authenticated caller discovers only agents visible under its policy.
2. Discovery does not grant invocation permission.
3. Caller sends a message to a permitted remote MCP agent and receives its actual response.
4. Unauthorized caller cannot address another tenant's agent by guessing an ID.
5. A remote tool is not callable until explicitly approved by its owner.
6. Remote tool schema changes are detected and cannot silently broaden permissions.
7. Repeated idempotency key does not duplicate a remote side effect.
8. Deadline expiration prevents dispatch or moves the task to expired.
9. Cancellation is propagated when the remote endpoint supports it and reported honestly when it does not.
10. Remote timeout produces a stable error and no false completion.
11. Duplicate or out-of-order events do not corrupt task state.
12. Invalid schemas and oversized payloads are rejected before dispatch.
13. Prompt injection in tool metadata or remote output cannot alter policy or invoke unapproved tools.
14. Endpoint validation blocks private, loopback, metadata, and unsafe redirect destinations.
15. Revoked credentials stop subsequent dispatch.
16. Logs and traces do not expose tokens or unapproved private content.
17. A complete round trip succeeds from each specifically supported client configuration.

## 3. Mock MCP agent laboratory

Maintain deterministic mock servers for:
- Immediate success.
- Multi-step/long-running task.
- Progress notifications.
- Input-required response.
- Slow response and timeout.
- Rate limit.
- Authentication failure.
- Malformed result or invalid schema.
- Tool schema change.
- Duplicate invocation and duplicate callback.
- Prompt injection in tool description and result.
- Oversized artifact.
- Cancellation supported and unsupported.
- Connection loss and server restart.

Mocks prove contract behavior only. They do not establish that a real provider or consumer chat UI supports the integration.

## 3.1 Verified local lab coverage

The current exact-head quality run [41289284477](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289284477) on PR #5 feature head `9f8050d09e068e31b13e26ead4ef255e28fbf53b` passed all focused security, connection, and task gates plus the full Node suite (CI merge revision `ec6f3e5849496b4ee7f084b4f10c28e41e5bc1e8`).

| Suite | Passed |
|---|---:|
| Authentication boundary | 8 |
| Endpoint security | 11 |
| Credential vault | 11 |
| Agent registry isolation | 7 |
| Secure remote MCP connection | 5 |
| Owner connection lifecycle | 10 |
| Task coordinator | 15 |
| Task dispatcher | 8 |
| Reusable task repository contract suite | 7 |
| Outbox lease-fencing regressions | Included in the 7 contract cases |
| Full Node suite | 97 |
| Python Wellness Doctor | 10 |
| Repository Doctor | 117, 0 warnings/errors/critical |

Both GitHub Actions workflow YAML files parsed successfully. The read-only quality workflow installs from the lockfile, runs focused gates, executes the full Node suite, runs Python unit tests and the Repository Doctor, and fails the final gate if any required step fails or is skipped.

Task tests use the reusable `registerTaskRepositoryContract({ test, createRepository, name })` harness in `tests/support/task-repository-contract.mjs`. The in-memory adapter currently runs seven shared behavioral cases: concurrent idempotent creation and atomic initial records, tenant-scoped reads, compare-and-swap transition races with one event winner, exclusive lease claims and reclaim attempts, exact-claim completion fencing, expired-lease rejection, and stale-generation rejection when worker IDs are reused. Future durable adapters should register the same contract against their own repository factory, then add provider-specific rollback, database-clock, cross-process and restart tests. Coordinator tests separately cover caller/tenant idempotency, authorization-before-persistence, input/deadline bounds, task cancellation races, remote schema drift, sanitized errors, and optional MCP task-tool identity binding. The lease-fencing regressions were observed failing before the repair and passing afterward. These checks verify the local reference implementation only; they do not establish durable SQL transactions, database-clock expiry, cross-process locking, the suspended-worker dispatch race, queue redelivery, restart recovery, or production task guarantees.

The MCP integration suite exercises SDK handler/client instances through a deterministic fetch bridge, plus a separately spawned mock agent over loopback TCP. It does not prove public network deployment, production authentication, persistent registry/vault/task state, real AI inference, OAuth issuance, deployed SSRF protections, or actual provider compatibility.

## 4. Live round-trip evidence

For every supported client/agent pair, record exact product surface, account plan, platform, protocol/SDK version, auth method, date, task ID, trace ID, sanitized request/response evidence, and tested failure cases.

A successful test must establish that the remote endpoint actually received and processed the request. A local canned response or two model calls in one process is not sufficient.

## 5. Release gates

- All critical unit, MCP contract, integration, and security tests pass.
- Cross-tenant isolation and least-privilege tests pass.
- No secrets appear in logs, fixtures, artifacts, or browser bundles.
- Async tasks survive process/worker restart and duplicate delivery.
- Cost, payload, concurrency, and delegation limits are enforced.
- Live support claims are scoped to the exact tested client/plan/platform pair.

Use synthetic accounts, credentials, and prompts in CI. Never put production credentials or private conversations in fixtures.
