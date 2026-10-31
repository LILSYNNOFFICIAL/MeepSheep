# MeepSheep MCP API and Relay Contract

**Status:** Design contract with a verified local-lab subset. Not deployed; production authentication, persistence, and task lifecycle remain unimplemented.  
**Primary interface:** Remote MCP server.  
**Core behavior:** Route authorized messages and tasks between independently connected agents.

## Lab implementation status

The local laboratory currently implements two inbound tools: `discover_agents` and `send_message`. The outbound MCP client verifies that the requested remote tool is currently listed and that its name is present in the owner-configured allowlist before invocation. The caller identity and tenant are resolved from trusted `authInfo` supplied by the hosting layer; they are not accepted in tool arguments. Successful responses include message ID, trace ID, source principal, target agent, status, remote output, and MCP tool provenance. Remote failures are mapped to `REMOTE_FAILED` without returning remote stack traces or raw error text.

This is a test harness, not production auth. The registry is in-memory, the caller principal is injected by the test adapter, and the remote MCP handler is exercised through an in-process fetch bridge. The lab does not yet implement persistent tasks, a full schema fingerprint, credential onboarding, OAuth, production endpoint validation, or a live external agent. See [MCP_LAB.md](MCP_LAB.md).

## 1. Protocol model

MeepSheep exposes an MCP server to requesting AI clients and uses outbound MCP clients to connect to remote MCP servers. The coordination core provides identity, agent discovery, grants, routing, task state, budgets, audit, and provenance.

Optional A2A, provider API, and webhook adapters may be added for specific targets. They are not required for the first MCP relay.

MCP standardizes client/server tool communication. It does not create endpoints for closed consumer assistants or automatically grant access to their chats, memory, tools, or hidden prompts.

## 2. Initial MCP tool surface

The first public model-callable tool set should be narrow:

- `discover_agents`: list agents the caller is allowed to discover, optionally filtered by capability.
- `get_agent`: inspect a visible agent's profile, connection type, declared capabilities, and health.
- `send_message`: send a bounded one-shot message to an authorized target agent and return its response when completed synchronously.
- `delegate_task`: create a task for an authorized target agent; return a result or durable task ID.
- `get_task`: retrieve status and result fields for a task visible to the caller.
- `wait_task`: wait for a bounded interval for a task state change.
- `cancel_task`: request cancellation when authorized and supported by the target.
- `list_my_connections`: show the caller's permitted connection metadata and health, never credentials.

Tool names and JSON Schemas must be versioned and validated. Do not expose credential writes, arbitrary endpoint registration, policy edits, tenant administration, or destructive actions to ordinary model-callable tools. Those operations belong in a separately authenticated owner console/API.

## 3. Canonical message envelope

Required logical fields:

- `schema_version`
- `message_id`
- `trace_id`
- `caller_principal_id` (derived from authentication, never trusted from body input)
- `tenant_id` (derived server-side)
- `source_agent_id` (when a registered source agent is acting)
- `target_agent_id`
- `created_at` (server timestamp)
- `message_type` (`message`, `task`, `task_update`, `task_result`, `cancel`)
- `content` (bounded text or structured payload)
- `content_type`
- `context_policy` (explicitly authorized context and size limits)
- `idempotency_key`

The caller identity, tenant, grants, and connection credentials are server-derived. Never accept a caller's assertion of authorization as proof.

## 4. Canonical task envelope

Required fields:

- `schema_version`
- `task_id`
- `trace_id`
- `caller_principal_id`
- `tenant_id`
- `target_agent_id`
- `connection_id`
- `created_at`
- `deadline_at`
- `intent`
- `input`
- `input_mime_type`
- `context_policy`
- `requested_capabilities`
- `idempotency_key`

No raw credentials, access tokens, hidden reasoning, or unapproved conversation history may appear in the envelope.

## 5. Response envelope

- `schema_version`
- `message_id` or `task_id`
- `trace_id`
- `source_agent_id` and `target_agent_id`
- `status`
- `created_at`, `started_at`, `completed_at`
- `output` and `output_mime_type`
- `artifacts[]` using scoped references
- `warnings[]`
- sanitized `error`
- `provenance` (connection, adapter, remote request/task ID, and timestamps)
- `usage` where reported by the remote provider

An agent's response is an assertion from that agent, not independently verified fact. Preserve the distinction.

## 6. Task lifecycle

Internal states: `queued`, `dispatching`, `working`, `input_required`, `completed`, `failed`, `canceled`, `rejected`, `expired`.

Terminal states: completed, failed, canceled, rejected, expired. Validate every state transition and append an event. Remote protocol states map into this lifecycle while retaining sanitized raw status metadata.

## 7. Outbound MCP connection contract

Each remote connection records:
- Owner and tenant.
- Endpoint URL and transport.
- Authentication method and secret reference.
- Protocol/SDK version.
- Owner-approved tool allowlist.
- Declared capabilities and limits.
- Timeout, concurrency, and payload limits.
- Health state and last successful connection test.
- Created, rotated, revoked, and last-used timestamps.

On connection setup:
1. Validate the endpoint and transport.
2. Validate authentication and TLS requirements.
3. Initialize an MCP client session.
4. Discover remote tools.
5. Present discovered tools for owner approval.
6. Store only approved tool names/schema snapshots and a secret reference.
7. Revalidate tool schema changes before invoking newly changed behavior.

Never expose all remote tools to every caller by default. MeepSheep authorizes a specific remote tool for a specific tenant/caller/agent.

## 8. Authorization rules

- Authenticate the inbound MCP caller.
- Resolve tenant and principal from trusted credentials.
- Check discovery and invocation as separate permissions.
- Check target connection ownership, active status, tool allowlist, and grant on every dispatch.
- Check task ownership on status, wait, cancel, and artifact retrieval.
- Propagate or narrow parent grants, deadlines, and budgets to child tasks.
- Keep owner/admin operations outside the ordinary model-callable tool surface.

## 9. Error codes

`AUTH_REQUIRED`, `AUTH_INVALID`, `PERMISSION_DENIED`, `AGENT_NOT_FOUND`, `AGENT_UNAVAILABLE`, `TOOL_NOT_ALLOWED`, `CAPABILITY_UNSUPPORTED`, `INVALID_REQUEST`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `BUDGET_EXCEEDED`, `DEADLINE_EXCEEDED`, `REMOTE_REJECTED`, `REMOTE_FAILED`, `REMOTE_TIMEOUT`, `CANCELED`, `CONNECTION_REVOKED`, `SCHEMA_CHANGED`, `INTERNAL_ERROR`.

Errors must not reveal credentials, internal addresses, stack traces, or other tenants' data.

## 10. Adapter interface

Every adapter must declare:
- Protocol and version.
- Authentication and credential reference.
- Supported request/response modes.
- Tool/capability mapping.
- Payload and artifact limits.
- Timeout, cancellation, and idempotency behavior.
- Rate and concurrency limits.
- Data retention/handling constraints.
- Error mapping and provenance fields.

All adapters use the same canonical envelope and shared authorization service. No adapter may broaden caller permissions.

## 11. Versioning and implementation baseline

Pin exact MCP protocol revision, SDK version, transport, and auth behavior in implementation dependencies and contract fixtures. Verify against the selected client and remote server before production.

References:
- https://modelcontextprotocol.io/specification
- https://developers.cloudflare.com/agents/model-context-protocol/
- https://developers.openai.com/api/docs/guides/tools-connectors-mcp
- https://docs.x.ai/build/features/mcp-servers

These references describe external capabilities, not a claim that MeepSheep is implemented or connected.
