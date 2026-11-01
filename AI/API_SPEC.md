# MeepSheep MCP API and Relay Contract

**Status:** Design contract with CI-verified local relay, resource-server authentication, and outbound endpoint-security primitives. Not deployed; production identity issuance, endpoint onboarding, persistence, and task lifecycle remain unimplemented.  
**Primary interface:** Remote MCP server.  
**Core behavior:** Route authorized messages and tasks between independently connected agents.

## Lab implementation status

The local laboratory implements two inbound tools: `discover_agents` and `send_message`. The outbound MCP client verifies that the requested remote tool is currently listed, owner-approved, and has an unchanged canonical SHA-256 fingerprint covering its name, description, input schema, and output schema before invocation. Any drift fails closed with `SCHEMA_CHANGED`. The normal test seam still supports an injected trusted principal for legacy tests. A separate RS256 bearer-token resource-server middleware now verifies access tokens through a configured JWKS resolver, validates issuer, audience, client ID, subject, tenant, scope, token type, time claims, and maximum lifetime, and derives identity only from verified claims. The middleware replaces caller-supplied MCP auth context before the relay resolves the principal. Successful relay responses retain message ID, trace ID, source principal, target agent, status, remote output, and MCP tool provenance.

A local endpoint-security module now accepts only exact allowlisted HTTPS hosts on port 443, resolves and validates every DNS answer, rejects mixed or non-public address sets, and exposes a fetch adapter that restricts origin/path/method, pins lookup to the validated DNS snapshot, preserves hostname TLS verification and SNI, removes unsafe request headers, limits request/response bytes, applies a timeout, and does not follow redirects. This module is not yet wired into an owner-facing endpoint-registration flow or the current in-memory registry's remote-client construction.

This is still a local security implementation, not a production identity or hosting system. No OAuth authorization server/token issuer, production identity-provider configuration, key rotation/revocation service, persistent registry, credential vault, public egress policy, durable tasks, owner onboarding/reapproval UI, or live external agent is implemented. The focused security tests use deterministic local fixtures; the pinned transport's real external TLS/socket behavior still requires runtime integration testing. See [MCP_LAB.md](MCP_LAB.md).

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

### Local security helper contracts

- `createBearerAuthenticator({ issuer, audience, jwks, clock, maxLifetimeSeconds, clockSkewSeconds })` verifies RS256 JWT access tokens with `typ: at+jwt` and returns MCP-compatible auth context only after checking the token against a configured JWKS resolver.
- `withBearerAuthentication(handler, authenticator)` authenticates each inbound HTTP request and replaces any preexisting `authInfo`; invalid and missing credentials fail closed.
- `validateRemoteEndpoint(endpoint, { allowedHosts, lookupAll })` returns a frozen, module-branded endpoint only when the URL is HTTPS/443, its hostname exactly matches an approved hostname, and every DNS answer is globally routable.
- `createPinnedFetch({ validatedEndpoint, requestImpl, timeoutMs, maxRequestBytes, maxResponseBytes })` accepts only the validated endpoint's exact origin/path, uses the saved DNS addresses for connection lookup, keeps the original host for TLS validation, and does not follow redirects.

These are reusable local primitives, not a token issuer, persistent owner-approved endpoint registry, credential manager, or evidence of live outbound TLS connectivity.

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
