# MeepSheep Interoperability Quality Benchmarks

**Status:** Benchmark design. No measured product performance is claimed.

## 1. Purpose

Measure whether MeepSheep reliably connects authorized agents, routes tasks correctly, preserves context and provenance, handles failures safely, and controls cost.

## 2. Fixed test matrix

Include:
- Same-protocol A2A-to-A2A delegation.
- MCP caller to MeepSheep router to A2A target.
- MCP caller to a supported vendor API adapter.
- Immediate response and multi-minute task.
- Parallel fan-out to multiple agents.
- Sequential handoff between agents.
- One agent unavailable during fan-out.
- Conflicting agent outputs.
- Human approval required.
- Credential revoked mid-task.
- Duplicate dispatch and callback.
- Malformed and malicious agent responses.

## 3. Metrics

- Connection setup success.
- Discovery correctness.
- Dispatch success.
- Completion success.
- Median and tail latency.
- Time to first progress update.
- Task state consistency.
- Duplicate side effects.
- Cancellation effectiveness.
- Context/payload size.
- Cost per completed task.
- Unauthorized request rejection.
- Schema validity and provenance completeness.

## 4. Output quality

Evaluate user-visible output for:
- Relevance to requested task.
- Faithfulness to the remote response.
- Clear attribution to the responding agent.
- Preservation of uncertainty and conflicting outputs.
- No fabricated completion or capability claims.
- No hidden instructions or secret leakage.

## 5. Acceptance philosophy

Set numeric SLOs only after the first baseline is measured. Security invariants are hard gates, not averages. A high success rate cannot compensate for a cross-tenant authorization failure or a leaked credential.
