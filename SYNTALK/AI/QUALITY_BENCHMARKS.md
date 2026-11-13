# MeepSheep Interoperability Quality Benchmarks

**Status:** Benchmark design. No measured product performance is claimed.

## 1. Purpose

Measure whether MeepSheep can securely connect independent AI clients and agents, route messages correctly, preserve provenance, handle failures, and control cost.

## 2. Initial benchmark matrix

- Inbound MCP client -> MeepSheep -> outbound MCP agent.
- Immediate request/response.
- Durable asynchronous task and later result retrieval.
- Multiple agents discovered with different grants.
- Owner-approved versus unapproved remote tools.
- Sequential handoff between agents.
- Bounded parallel fan-out.
- One unavailable agent during a multi-agent task.
- Conflicting or incomplete remote outputs.
- Human approval/input-required state.
- Credential revoked before or during a task.
- Duplicate dispatch and duplicate/out-of-order event.
- Malformed, oversized, and malicious remote responses.
- Connection loss and remote server restart.

Optional A2A/API adapter benchmarks are added only when those adapters are implemented.

## 3. Operational metrics

- Inbound MCP initialization and tool-call success.
- Outbound MCP connection and authentication success.
- Remote tool discovery and allowlist correctness.
- Agent discovery correctness under tenant/grant policies.
- Dispatch and completion success rate.
- Median and tail dispatch/completion latency.
- Time to first progress update.
- Task state consistency and recovery after restart.
- Duplicate remote side effects.
- Cancellation support and outcome.
- Payload/context bytes transferred.
- Cost per completed task and per failed task.
- Unauthorized invocation rejection rate.
- Schema validity and provenance completeness.

## 4. Response quality

Evaluate:
- Relevance to the delegated task.
- Faithfulness to the actual remote response.
- Correct source-agent attribution.
- Preservation of uncertainty, caveats, and conflicting outputs.
- No fabricated tool execution or completion claims.
- No secret or unauthorized context leakage.

MeepSheep transports results. It must not claim that an agent's answer is independently verified unless a separate verification step actually occurred.

## 5. Acceptance philosophy

Set numeric service-level targets after collecting a baseline from real test endpoints. Security invariants are hard gates, not averages. A high success rate cannot compensate for cross-tenant access, unapproved tool invocation, or credential leakage.
