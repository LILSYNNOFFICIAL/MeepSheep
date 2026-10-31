# MeepSheep Test Strategy

**Status:** Required test plan. Application test infrastructure is not yet implemented.

## 1. Test layers

- Unit: schema validation, state transitions, authorization, idempotency, adapter mapping, budget calculations.
- Contract: MCP tools, A2A messages/tasks/Agent Cards, normalized task envelopes, version compatibility.
- Integration: router plus mock agents, credential resolution, durable task state, retries and cancellation.
- End-to-end: a real supported client connects to MeepSheep and delegates to a separately running test agent.
- Security: cross-tenant access, token leakage, SSRF, replay, prompt injection, malicious Agent Cards, oversized payloads.
- Reliability: timeout, provider outage, duplicate delivery, worker restart, queue redelivery, partial completion.
- Performance/cost: concurrency, task duration, payload sizes, fan-out, storage, and provider cost.

## 2. Mandatory acceptance scenarios

1. Authenticated caller discovers only agents visible under its policy.
2. Caller delegates a task to a permitted agent and receives the structured result.
3. Unauthorized caller cannot address another tenant's agent by guessing its ID.
4. Repeated idempotency key does not create duplicate remote side effects.
5. Deadline expiration prevents further dispatch or marks the task expired.
6. Cancellation propagates where the remote protocol supports it.
7. Remote timeout produces a stable error and no false completion.
8. Duplicate or out-of-order remote events do not corrupt task state.
9. Invalid schemas and oversized payloads are rejected before dispatch.
10. Prompt injection in remote content cannot alter authorization or invoke tools.
11. Remote Agent Card resolution cannot reach private or metadata IPs.
12. Revoked credentials stop subsequent dispatch.
13. Logs and traces do not expose tokens or sensitive payloads.
14. One unavailable agent does not silently corrupt other results.
15. A full round trip works from each supported client configuration.

## 3. Mock-agent laboratory

Maintain deterministic mock agents for immediate success, multi-minute completion, streaming updates, input-required/human approval, slow response/timeout, rate limit, authentication failure, malformed response, duplicate callback, prompt injection, oversized artifact, and cancellation supported/unsupported.

## 4. Benchmark suite

For fixed delegation scenarios, record dispatch latency, time to first progress, completion latency, success/failure rate, retries, duplicate executions, response schema validity, context bytes, estimated/measured cost, approval frequency, and human-rated output quality.

Compare direct provider calls with routed calls where practical. Do not compare unlike tasks or infer model quality from latency alone.

## 5. Release gates

A release candidate must pass critical unit, contract, integration, and security tests. End-to-end support is reported per client, plan, platform, and tested capability. A mock-agent test is not proof that a consumer chat UI can connect.

Use synthetic accounts, secrets, and prompts. Never use production credentials in CI or record private conversations in fixtures.
