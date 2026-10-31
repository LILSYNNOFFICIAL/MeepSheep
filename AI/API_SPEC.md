# MeepSheep API and Protocol Contract

**Status:** Initial design contract. Schemas must be implemented and validated before production use.

## 1. Protocol roles

- **MCP:** Lets a compatible AI client discover and invoke tools exposed by MeepSheep. This is the main integration surface for assistants that can connect to remote MCP servers.
- **A2A:** Lets independent agents discover capabilities and exchange messages and long-running tasks using a standard agent-to-agent model.
- **Provider adapters:** Bridge supported vendor APIs, webhooks, and other documented interfaces into MeepSheep's internal contract.
- **Internal API:** Owns identity, authorization, routing, task state, budgets, audit events, and normalized results.

MCP is not a universal agent registry or a guarantee that one consumer chat UI can directly call another. A2A does not grant access to closed assistants that expose no authorized endpoint.

## 2. Core interaction model

A caller submits a task to MeepSheep. MeepSheep authenticates the caller, resolves an explicitly connected target, checks policy, creates a durable task, dispatches through the target's supported adapter, tracks progress, validates the response, and returns the result.

Short requests may complete in one request/response cycle. Longer requests use a task ID and status/result retrieval. Streaming is an optional transport optimization, not a requirement for correctness.

## 3. Canonical task envelope

Required fields:
- `schema_version`: contract version.
- `task_id`: MeepSheep-generated opaque identifier.
- `trace_id`: correlation identifier across agents and adapters.
- `caller_id`: authenticated principal, never trusted from user-supplied body text.
- `target_agent_id`: registered target identity.
- `created_at`: server timestamp.
- `deadline_at`: server-enforced deadline.
- `intent`: bounded task description.
- `input`: structured payload or text content.
- `input_mime_type`: declared payload type.
- `context_policy`: explicit context-sharing mode and limits.
- `requested_capabilities`: capability IDs required for the task.
- `authorization_context`: server-derived grants and scopes, not caller assertions.
- `idempotency_key`: retry key.

Secrets and raw provider credentials are never included in task envelopes.

## 4. Task lifecycle

Canonical internal states: `queued`, `dispatching`, `working`, `input_required`, `completed`, `failed`, `canceled`, `rejected`, and `expired`.

Terminal states are completed, failed, canceled, rejected, and expired. State transitions are validated and recorded as append-only events. Provider-specific states are mapped into this lifecycle without losing raw provider status in diagnostic metadata.

## 5. Canonical response envelope

Fields: `schema_version`, `task_id`, `trace_id`, `target_agent_id`, `status`, `started_at`, `completed_at`, `output`, `output_mime_type`, `artifacts[]`, `warnings[]`, sanitized `error`, `provenance`, and `usage`.

Responses distinguish an agent's assertion from independently verified facts. Do not imply that an answer has been validated merely because it came from another model.

## 6. Initial MCP tool surface

- `list_agents`: list only agents visible to the authenticated caller.
- `get_agent`: inspect a visible agent's profile, supported protocols, declared skills, and connection health.
- `send_task`: create and dispatch a bounded task to an authorized target.
- `get_task`: retrieve status and permitted result fields for a task owned by or shared with the caller.
- `wait_task`: wait for a bounded period for a task state change; polling `get_task` remains available.
- `cancel_task`: request cancellation where supported and authorized.
- `list_connections`: show the caller's own configured connections and status, with credentials redacted.

Administrative registration, credential management, policy changes, and connection deletion are not ordinary model-callable tools by default. They belong in an authenticated owner console or separately scoped administrative API.

Every tool needs explicit input/output JSON Schemas, size limits, scope requirements, and safe error codes.

## 7. A2A interoperability

- Support A2A Agent Cards for agents that expose the protocol.
- Validate advertised endpoints and authentication requirements before connection.
- Implement the released A2A version selected in the decision record.
- Map A2A messages, tasks, artifacts, and state updates to the canonical internal envelope.
- Preserve remote task IDs and protocol version in provenance.
- Treat Agent Cards and remote responses as untrusted metadata.
- Do not fetch arbitrary URLs embedded in cards without SSRF validation.
- Do not assume an A2A endpoint is trustworthy because it is discoverable.

MeepSheep may expose its own A2A Agent Card and endpoint when the server implementation and security model are ready. This is separate from its MCP server.

## 8. Adapter contract

Each adapter declares protocol/version, authentication, supported capabilities/modalities, sync/async/streaming support, payload limits, timeout/cancellation support, idempotency semantics, rate/concurrency limits, and data-handling constraints.

Adapters normalize outputs, map errors, enforce deadlines, redact credentials, and never broaden caller authorization.

## 9. Stable error codes

`AUTH_REQUIRED`, `AUTH_INVALID`, `PERMISSION_DENIED`, `AGENT_NOT_FOUND`, `AGENT_UNAVAILABLE`, `CAPABILITY_UNSUPPORTED`, `INVALID_REQUEST`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `BUDGET_EXCEEDED`, `DEADLINE_EXCEEDED`, `REMOTE_REJECTED`, `REMOTE_FAILED`, `REMOTE_TIMEOUT`, `CANCELED`, and `INTERNAL_ERROR`.

Errors must not disclose secrets, internal addresses, stack traces, or another tenant's data.

## 10. Versioning and references

Pin protocol versions in implementation and fixtures. Keep public schema changes backward-compatible within a major version. Record client and adapter versions for diagnostics, subject to privacy policy.

- MCP: https://modelcontextprotocol.io/specification
- A2A: https://a2a-protocol.org/latest/specification/
- OpenAI remote MCP: https://developers.openai.com/api/docs/guides/tools-connectors-mcp
- xAI MCP: https://docs.x.ai/build/features/mcp-servers

Recheck released versions and target-client compatibility before implementation. This contract does not replace the protocol specifications.
