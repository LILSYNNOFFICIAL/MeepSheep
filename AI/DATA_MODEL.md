# MeepSheep Logical Data Model

**Status:** Conceptual model. No database or physical schema is selected or implemented.

## Design rules

- Every record is scoped to an owner/tenant.
- Identity and authorization are resolved server-side.
- Remote IDs are namespaced by connection and protocol.
- Credentials are stored in a secret manager; the database stores references only.
- Messages and tasks are durable, idempotent, traceable, and deadline-bounded.
- Store user-visible content and provenance, never hidden reasoning.
- Large artifacts use separately authorized storage references.
- Retention and deletion are explicit product policies.

## Core entities

### Tenant / Principal
Owner/workspace and authenticated human or service identity.

Fields: `tenant_id`, `principal_id`, `display_name`, `status`, `created_at`, `policy_id`.

### Agent
A registered remote endpoint or logical agent identity.

Fields: `agent_id`, `tenant_id`, `name`, `description`, `owner_principal_id`, `connection_id`, `trust_state`, `visibility`, `status`, `created_at`, `updated_at`.

An agent is a logical identity. Its actual endpoint and transport live in Connection.

### Connection
An explicitly configured remote endpoint and protocol client configuration.

Fields: `connection_id`, `tenant_id`, `agent_id`, `connection_type`, `protocol`, `protocol_version`, `transport`, `endpoint_ref`, `auth_method`, `credential_ref`, `health_state`, `last_verified_at`, `revoked_at`.

Initial connection type is outbound MCP. Optional adapters may use A2A, documented APIs, or webhooks. Never store raw credentials here.

### RemoteTool
A tool discovered from a remote MCP server.

Fields: `remote_tool_id`, `connection_id`, `tool_name`, `description_snapshot`, `input_schema_snapshot`, `schema_hash`, `owner_approved`, `enabled`, `last_discovered_at`.

Discovery does not imply approval. Schema changes require revalidation and may require renewed owner approval.

### AgentCapability
Owner-approved or declared capability metadata.

Fields: `capability_id`, `agent_id`, `name`, `description`, `input_schema_ref`, `output_schema_ref`, `source`, `verification_state`, `enabled`.

A declaration is not proof of quality or authorization.

### Grant
Defines which principal or agent may discover or invoke which target/tool.

Fields: `grant_id`, `tenant_id`, `subject_id`, `resource_id`, `scopes[]`, `constraints`, `expires_at`, `created_by`, `revoked_at`.

### Message
A communication exchanged between the caller, MeepSheep, and remote agent.

Fields: `message_id`, `tenant_id`, `task_id`, `trace_id`, `sender_id`, `recipient_id`, `direction`, `content_ref`, `mime_type`, `sequence_number`, `created_at`.

### Task
The durable unit of delegated work.

Fields: `task_id`, `tenant_id`, `trace_id`, `caller_principal_id`, `source_agent_id`, `target_agent_id`, `connection_id`, `remote_task_id`, `state`, `intent`, `input_ref`, `output_ref`, `idempotency_key_hash`, `deadline_at`, `budget_reserved`, `created_at`, `started_at`, `completed_at`, `error_code`.

### TaskEvent
Append-only task state and progress history.

Fields: `event_id`, `task_id`, `event_type`, `from_state`, `to_state`, `safe_metadata`, `created_at`.

### Artifact
A file or structured result associated with a task.

Fields: `artifact_id`, `tenant_id`, `task_id`, `storage_ref`, `mime_type`, `size_bytes`, `checksum`, `created_at`, `expires_at`.

### AuditEvent
Security-relevant action history.

Fields: `audit_id`, `tenant_id`, `actor_id`, `action`, `resource_id`, `decision`, `reason_code`, `trace_id`, `created_at`.

### UsageRecord
Measured platform and provider usage.

Fields: `usage_id`, `tenant_id`, `task_id`, `connection_id`, `provider_id`, `metric`, `quantity`, `unit`, `estimated_cost`, `reported_cost`, `measured_at`.

## Relationships

- A tenant owns principals, agents, connections, grants, tasks, and audit records.
- An agent may have one or more connections and many capabilities.
- A connection exposes zero or more discovered RemoteTools.
- A Grant authorizes a principal to discover or invoke an agent/tool.
- A Task has one caller, one target, one connection, and many messages, events, artifacts, and usage records.
- Cross-tenant communication requires an explicit invitation and grant.
- Public or shared discovery never implies permission to invoke.

## Storage and retention

Select one authoritative relational database. D1 versus Supabase remains open. Durable orchestration may own execution state, but the canonical ownership and consistency boundary must be explicit.

Define retention separately for connection metadata, message payloads, task state, artifacts, audit events, usage, and diagnostic logs. Default to minimal retention and provide deletion/export behavior before public launch.
