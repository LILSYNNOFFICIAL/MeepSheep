# MeepSheep Data Model

**Status:** Conceptual logical model. Physical database schema is not selected or implemented.

## 1. Design principles

- Every record belongs to an explicit tenant or owner boundary.
- Provider credentials are stored separately from agent metadata and encrypted at rest.
- Remote identifiers are namespaced by provider/protocol.
- Tasks are durable, idempotent, traceable, and bounded by deadlines.
- Message and task history is retained only according to an explicit retention policy.
- Large artifacts are stored separately from relational metadata.
- Never store model hidden reasoning or private chain-of-thought. Store user-visible messages, structured outputs, status events, and provenance only.

## 2. Logical entities

### Tenant / Principal
Represents an account, workspace, or authenticated owner.

Fields: `tenant_id`, `principal_id`, `display_name`, `status`, `created_at`, `policy_id`.

### Agent
A registered remote or MeepSheep-hosted agent.

Fields: `agent_id`, `tenant_id`, `name`, `description`, `owner_principal_id`, `trust_state`, `visibility`, `created_at`, `updated_at`.

### AgentCapability
A declared capability or skill.

Fields: `capability_id`, `agent_id`, `description`, `input_schema_ref`, `output_schema_ref`, `risk_level`, `enabled`.

### Connection
A configured protocol endpoint and adapter relationship.

Fields: `connection_id`, `tenant_id`, `agent_id`, `protocol`, `protocol_version`, `endpoint_ref`, `auth_method`, `credential_ref`, `health_state`, `last_verified_at`.

Credentials are never stored in plaintext fields or returned by APIs.

### Grant
Defines which principal or agent may perform which action against a target.

Fields: `grant_id`, `tenant_id`, `subject_id`, `resource_id`, `scopes[]`, `constraints`, `expires_at`, `created_by`, `revoked_at`.

### Task
The durable unit of delegated work.

Fields: `task_id`, `tenant_id`, `trace_id`, `caller_id`, `target_agent_id`, `connection_id`, `state`, `intent`, `input_ref`, `output_ref`, `idempotency_key_hash`, `deadline_at`, `created_at`, `started_at`, `completed_at`, `error_code`.

### Message
A user-visible or agent-visible communication turn.

Fields: `message_id`, `task_id`, `sender_agent_id`, `recipient_agent_id`, `role`, `content_ref`, `mime_type`, `created_at`, `sequence_number`.

### TaskEvent
Append-only state transition and operational event.

Fields: `event_id`, `task_id`, `event_type`, `from_state`, `to_state`, `safe_metadata`, `created_at`.

### Artifact
A file or structured result associated with a task.

Fields: `artifact_id`, `task_id`, `storage_ref`, `mime_type`, `size_bytes`, `checksum`, `created_at`, `expires_at`.

### AuditEvent
Security-relevant action history.

Fields: `audit_id`, `tenant_id`, `actor_id`, `action`, `resource_id`, `decision`, `reason_code`, `trace_id`, `created_at`.

### UsageRecord
Measured usage for quotas, budgets, and cost reporting.

Fields: `usage_id`, `tenant_id`, `task_id`, `provider_id`, `metric`, `quantity`, `unit`, `estimated_cost`, `measured_at`.

## 3. Relationships

- A tenant owns principals, agents, connections, grants, tasks, and audit records.
- An agent has many capabilities and may have one or more protocol connections.
- A connection has one credential reference, which points to a dedicated secret store.
- A task has one caller, one target, many messages, events, artifacts, and usage records.
- Grants authorize actions across tenant-owned resources or explicitly shared external agents.
- Cross-tenant agent access requires an explicit invitation or grant. Public discovery never implies permission to send a task.

## 4. Data retention

Before launch, define retention separately for:
- Task metadata and state.
- Message payloads and outputs.
- Attachments and artifacts.
- Audit events.
- Usage records.
- Debug logs and traces.

Default to minimal retention. Provide deletion and export paths. Keep security audit metadata only as long as justified and disclosed. Do not log full task content by default.

## 5. Storage placement

Candidate mapping, subject to architecture validation:

- Relational metadata: one selected primary relational database.
- Short-lived coordination state: a durable task runtime or database-backed state machine.
- Large artifacts: object storage with expiring, authorized references.
- Secrets: platform secret manager or dedicated encrypted credential vault.
- Cache: only non-sensitive, explicitly cacheable metadata.

Do not duplicate authoritative records across D1 and Supabase.
