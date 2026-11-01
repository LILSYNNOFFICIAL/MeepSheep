# MeepSheep Architecture

**Status:** Proposed target architecture. No application runtime or production infrastructure is verified as deployed.  
**Primary product:** MCP-first AI-to-AI relay and coordination service.

## 1. Architecture goals

- Give compatible AI clients one MCP endpoint for agent discovery, messaging, delegation, and task retrieval.
- Connect remote agents through their actual supported interfaces, beginning with outbound MCP connections.
- Normalize all inbound and outbound traffic through one canonical internal envelope.
- Centralize identity, grants, routing, task state, budgets, audit, and provenance.
- Keep each agent's own intelligence, tools, and research capabilities on the agent side.
- Support durable asynchronous tasks and a synchronous fast path.
- Add A2A or vendor-specific adapters only when a concrete connection requires them.

## 2. Target topology

```text
AI client / assistant
       |
       | MCP client
       v
MeepSheep MCP server
       |
       v
Authentication + tenant + grants
       |
       +---- Agent registry / capability directory
       |
       v
Canonical message + task router
       |
       +---- Outbound MCP client ------> Remote MCP agent/server
       |
       +---- Optional A2A adapter -----> A2A agent
       |
       +---- Optional provider adapter -> Documented agent API
       |
       +---- Optional webhook adapter --> Authorized endpoint
       |
       v
Durable task state / messages / events / audit / usage
       |
       v
Structured response to original MCP caller
```

The MCP server and outbound MCP client are separate roles. MeepSheep must implement both sides when it is acting as a relay: it accepts tool calls from the requesting AI client, then independently connects to the target agent's MCP server.

## 3. MCP is the primary interface, not magic connectivity

MCP provides a standardized client/server protocol. MeepSheep exposes tools to a compatible caller and uses an MCP client to invoke tools on remote MCP servers. This allows one agent to ask MeepSheep to interact with another agent, provided the target exposes a suitable MCP server and the connection is configured and authorized.

MCP does not:
- Make a closed consumer chat UI remotely callable.
- Automatically register every AI product.
- Grant access to private chats, hidden prompts, memory, or tools.
- Guarantee that two assistants can initiate messages to each other without an exposed endpoint.
- Define MeepSheep's tenant model, agent registry, routing policy, or durable orchestration.

MeepSheep supplies those product-level capabilities.

## 4. Shared coordination core

### Identity and policy
Authenticate the MCP caller and derive principal and tenant from trusted credentials. Resolve target grants server-side. Enforce separate permissions for discovery, message send, task dispatch, status read, cancellation, artifact read, and administration.

### Agent registry
Store stable agent ID, owner/tenant, connection type, endpoint reference, protocol/version, declared capabilities, supported tools, auth method, limits, health, trust state, and last verified time. Capability declarations are metadata, not authorization.

### Connection manager
Store encrypted credential references, scopes, owner, endpoint, health, connection test results, and revocation state. Never expose credentials to model-callable tools or browser code.

### MCP gateway
Expose a small, predictable set of tools. Validate every input and output against schemas, enforce caller scopes and payload limits, and return sanitized structured errors.

### Outbound MCP client
Create authenticated client sessions to registered remote MCP servers. Discover their tools, retain only owner-approved tool mappings, invoke permitted tools, enforce timeouts, and normalize results. A target MCP server may represent an AI agent, a tool service, or a mixed system. The owner must explicitly classify and approve the connection.

### Router and orchestrator
Resolve target and adapter, reserve budget, create durable task state, dispatch idempotently, process progress and results, and preserve provenance. Child tasks can only narrow parent permissions, deadline, and budget.

### Optional protocol adapters
A2A and vendor API adapters are plugins to the same core. They must not create a second registry, authorization system, or task model.

### Web console
A protected owner interface manages connections, credentials, capabilities, grants, task history, and audit. Model-callable MCP tools do not perform privileged administration by default.

## 5. Canonical task lifecycle

Internal states: `queued`, `dispatching`, `working`, `input_required`, `completed`, `failed`, `canceled`, `rejected`, and `expired`.

Every task binds task ID, trace ID, caller, tenant, target, connection, grant, deadline, budget, idempotency key, context policy, and provenance. State transitions are validated and append-only. Short tasks may return synchronously. Long tasks return a task ID and are retrieved through MCP tools. Streaming is optional; durable status/result retrieval is mandatory.

## 6. Data and storage boundaries

Use one authoritative relational data owner. D1 versus Supabase remains open until current account, auth, cost, and runtime needs are compared. Do not split authoritative task and grant state across stores. Keep secrets in platform secret storage or a dedicated secret manager. Store large artifacts separately with scoped expiring references. Define retention and deletion before public launch.

## 7. Hosting candidates

Cloudflare Workers/Agents SDK, Workflows, Durable Objects, D1, Queues, R2, and Static Assets remain candidates, not final selections. Verify account access, pricing, runtime support, and service limits before committing. No local GPU is required; remote agents/providers perform inference.

A read-only inventory on 2026-11-01 found zero zones, Worker scripts, D1 databases, Durable Object namespaces, or Queues in the one connected Cloudflare account. The existing Supabase project `meepsheep-storage` is `INACTIVE` and its database could not be inspected. This is account-scoped evidence; neither platform has been selected or provisioned for MeepSheep. Do not resume, provision, deploy, or change DNS until the owner confirms the intended account and data owner.

## 8. Security boundaries

Treat remote MCP tool descriptions, tool outputs, agent metadata, callbacks, and artifacts as untrusted. Enforce tenant isolation, least privilege, SSRF protections for remote endpoint validation, redirect revalidation, authenticated callbacks, replay protection, bounded delegation, budget ceilings, payload limits, and privacy-safe audit. Do not pass hidden reasoning, private prompts, or unapproved chat history.

See [SECURITY.md](SECURITY.md), [API_SPEC.md](API_SPEC.md), and [COST_MODEL.md](COST_MODEL.md).
