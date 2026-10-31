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

The current suite in `tests/mcp-relay.integration.test.mjs` exercises eight cases through the MCP SDK's Streamable HTTP client/server interfaces: same-tenant discovery without secret leakage, successful outbound tool invocation with provenance, cross-tenant hiding/denial, unapproved-tool denial, missing remote tool rejection, caller permission denial, and sanitized remote failure. The mock target is implemented in `tests/fixtures/mock-agent.mjs`; `tests/fixtures/mock-agent-process.mjs` runs a separate socket-served target process.

Seven cases use a custom in-process `fetch` bridge; an eighth launches a separate Node process and calls its MCP endpoint over loopback TCP. It does not prove public network deployment, production authentication, persistence, real AI inference, async task recovery, OAuth, SSRF defenses, or actual provider compatibility. Do not mark those release gates complete based on these tests.

**Latest CI evidence:** PR #3 run 41253359267: 7 Node tests passed; 10 Python Wellness Doctor tests passed; Repository Doctor 103 passed, 0 warnings, 0 errors, 0 critical; both workflow YAML files parsed successfully.

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
