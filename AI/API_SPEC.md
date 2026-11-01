# MeepSheep MCP API and Relay Contract

**Status:** CI-verified local MCP relay, signed-token resource-server middleware, endpoint-pinned remote MCP connector, encrypted credential-vault abstraction, registry secret isolation, internal owner connection lifecycle manager, provider-neutral task coordinator, registry-backed task dispatcher, optional task tools, and stale-outbox lease fencing. Exact-head quality run [41289499297](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289499297) passed on PR #5 feature commit `b5904db4fdaf1d608e5264f86038a45380116fb5` (CI merge revision `6ebff4161b26a4f9e18f7fa759c68b9f94f3d89f`): 98/98 Node tests, including the eight-case reusable task repository contract suite, 10/10 Python Wellness Doctor tests, 117 Repository Doctor checks with zero warnings/errors/critical, and both workflow YAML validations. Not deployed; the task repository, registry, connection previews, and credential store still use in-memory reference adapters. Production identity issuance, persistent database/key-provider adapters, public owner API/console, durable queue/worker, and live external agent connections remain unimplemented.  
**Primary interface:** Remote MCP server.  
**Core behavior:** Route authorized messages and tasks between independently connected agents.

## Lab implementation status

The local laboratory always implements `discover_agents` and `send_message`. When the host injects a compatible task coordinator, it additionally registers `delegate_task`, `get_task`, `wait_task`, and `cancel_task`, binding every operation to the trusted principal resolved for that MCP request. These task tools use the local in-memory reference repository and are not durable across process restarts. Remote tool invocation checks the current remote contract against the owner-approved canonical SHA-256 fingerprint covering tool name, description, input schema, and output schema; schema drift fails closed with `SCHEMA_CHANGED`. The registry retains only explicit agent fields, nullable opaque `credentialRef`/`endpointRef` values, approved tool snapshots, and a runtime client handle; raw credential/authorization fields and raw endpoint URLs are rejected.

The inbound authentication boundary includes RS256 JWT access-token verification through a configured trusted JWKS resolver. It checks exact issuer/audience, access-token type, subject, tenant, client ID, scope grammar, JTI, issue/expiry times, maximum lifetime, and clock skew. The bearer middleware replaces preexisting auth context. The relay derives principal and tenant only from an internally branded verified auth context, not caller-supplied `extra` fields. This is a resource-server verifier, not an OAuth authorization server or token issuer.

The outbound security path is now combined in `createSecureRemoteMcpClient`: it validates an exact allowlisted HTTPS/443 endpoint, resolves and rejects any non-public or mixed DNS answer set, uses a pinned HTTPS fetch adapter, preserves the original host for TLS/SNI checks, limits request/response bytes and execution time, strips unsafe request and response headers, forces identity content encoding, and refuses redirects. It removes caller-supplied Authorization headers and can load a per-connection bearer token from the encrypted credential vault for each HTTP request. Tool discovery returns canonical schema fingerprints for owner review; the connector does not auto-approve discovered tools.

The local credential vault uses AES-256-GCM with authenticated metadata bound to the tenant, credential ID, key ID, schema version, and record version. It supports scoped callback decryption, key rotation, ciphertext destruction on revocation, maximum credential size, and optimistic concurrency. The backing store and key provider are injected interfaces; the repository has no production database or KMS/secret-manager adapter yet.

This remains a local security implementation, not a production identity or hosting system. No OAuth authorization server/token issuer, production identity-provider configuration, signing-key lifecycle/revocation, persistent vault/registry adapter, owner onboarding/reapproval UI, durable task queue, public egress policy, or live external agent is implemented. The default HTTPS transport is implemented, but CI uses deterministic request seams for connector tests and does not prove a real external TLS handshake or deployed egress policy. See [MCP_LAB.md](MCP_LAB.md).



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

### Optional asynchronous task tools

When the host injects a compatible task coordinator, the inbound relay may additionally register:

- `delegate_task`: requires `task:dispatch`; authorizes the target agent/tool before task creation; requires a caller-provided idempotency key; returns a task ID and queued state.
- `get_task`: requires `task:read`; returns only a task created by the authenticated caller in the same tenant.
- `wait_task`: requires `task:read`; waits for at most 30 seconds and returns the latest task state.
- `cancel_task`: requires `task:cancel`; cancels only the caller's own queued or active task.

The principal is captured from the relay's trusted per-request principal resolver. These tool schemas do not accept caller/tenant identity fields. Owner connection operations remain separate. Outbox completion is fenced by the claimed worker ID, monotonically increasing claim attempt, exact lease deadline, and expiry; stale or expired workers cannot mark a reclaimed item complete. A persistent adapter must enforce expiry using database time. This completion fence does not by itself eliminate a suspended-worker race immediately before an external call.

### Internal owner connection lifecycle (not an inbound MCP tool)

The local `createAgentConnectionManager({ registry, credentialVault, createRemoteClient, clock, previewTtlSeconds })` service exposes three privileged operations:

- `preview(principal, { endpoint, endpointRef, credentialRef?, allowedHosts })`: requires `connection:manage`, validates opaque references, establishes the secure remote MCP connection, discovers tools, and returns a short-lived preview ID, safe endpoint metadata, tool descriptions/schemas, and schema fingerprints. It does not register an agent or approve any tool.
- `approve(principal, { previewId, agent, approvedTools })`: requires the same owner and tenant that created the preview. It accepts only unique tool names present in the preview and derives the approved schema map from the server-side preview snapshot, never from caller-supplied fingerprints. It registers only the explicitly selected tools.
- `disconnect(principal, { agentId })`: requires the exact owner and tenant plus `connection:manage`. It unregisters the agent first, revokes its credential reference, closes the MCP client, and returns a sanitized revocation failure if the vault cannot complete revocation.

Previews expire and their client is closed on the next manager operation or explicit expiry handling. An active connection is process-local in this phase. The manager is an internal privileged service and is not registered as an ordinary model-callable MCP tool. It does not yet have a public owner API, UI, persistent preview/connection records, or durable audit log.

### Local security helper contracts

- `createBearerAuthenticator({ issuer, audience, jwks, clock, maxLifetimeSeconds, clockSkewSeconds })` verifies RS256 JWT access tokens with `typ: at+jwt` through a trusted JWKS resolver and binds principal resolution to the verified auth context.
- `withBearerAuthentication(handler, authenticator)` authenticates each inbound HTTP request, replaces preexisting `authInfo`, and fails closed on missing/invalid credentials.
- `validateRemoteEndpoint(endpoint, { allowedHosts, lookupAll })` returns a frozen, module-branded endpoint only when the URL is HTTPS/443, the hostname exactly matches an approved hostname, and every DNS answer is globally routable.
- `createPinnedFetch({ validatedEndpoint, requestImpl, timeoutMs, maxRequestBytes, maxResponseBytes })` accepts only the validated origin/path, uses only the saved DNS addresses for lookup, preserves the original host for TLS validation, bounds request upload and response streaming, strips unsafe headers, requires identity encoding, and does not follow redirects.
- `createCredentialVault({ store, keyProvider, clock, maxCredentialBytes })` exposes `put`, `withCredential`, `describe`, `rotate`, and `revoke`. It encrypts secrets with AES-256-GCM and uses tenant/credential/key/version-bound authenticated data. The store must provide atomic insert and compare-and-swap semantics.
- `createSecureRemoteMcpClient({ endpoint, allowedHosts, credentialVault, credentialRef, tenantId, ... })` combines endpoint validation, pinned fetch, vault-backed bearer auth, MCP transport/client setup, remote tool discovery, and schema-fingerprint snapshots. It returns discovered schemas for an owner to review; it never approves remote tools itself.

These are local security/connection primitives. They are not a production OAuth issuer, persistent registry/vault store, production key manager, public owner API/console, durable audit system, or evidence of a real external agent handshake.

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
