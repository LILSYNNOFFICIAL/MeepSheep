# MeepSheep Decision Log

This file records accepted decisions, proposals, and open questions. Do not silently overwrite historical reasoning.

## Status vocabulary

- **Accepted:** current product decision.
- **Proposed:** recommended, not yet approved or implemented.
- **Open:** requires evidence, test, or owner decision.
- **Superseded:** replaced by a later decision.

## Accepted decisions

### D-001: Product identity
- **Status:** Accepted
- **Decision:** Product name is MeepSheep; intended domain is `meepsheep.com`.
- **Repository:** `LILSYNNOFFICIAL/MeepSheep`, default branch `main`.

### D-002: Project documentation
- **Status:** Accepted
- **Decision:** Maintain operating documentation under `AI/`, with `AI/WF.md` as the master workflow.

### D-003: MCP-first relay
- **Status:** Accepted
- **Decision:** MeepSheep is an MCP-first AI-to-AI communication and coordination service. Its inbound MCP server is the primary interface for compatible AI clients. MeepSheep also implements outbound MCP client connections to separately configured remote MCP servers.
- **Reason:** The owner's clarified goal is for AI agents to talk to other AI agents.
- **Consequence:** The relay, registry, permissions, routing, task lifecycle, and result delivery are the core product. MCP is the front door; MeepSheep provides the shared coordination layer.

### D-004: Agent-side capabilities
- **Status:** Accepted
- **Decision:** Agents perform research, coding, browsing, and other work using their own existing models, tools, and capabilities. MeepSheep transports and coordinates tasks; it does not build a research engine or replace agent intelligence.
- **Consequence:** Research-first plans and research-provider pipelines are deferred. Research remains a possible task performed by a connected agent.

### D-005: Optional protocol adapters
- **Status:** Accepted
- **Decision:** MCP is the first-class connection type for the MVP. A2A, documented vendor APIs, and authorized webhooks are optional adapters added only when a concrete target requires them.
- **Reason:** Avoid making multiple protocols a prerequisite before the first useful relay works.
- **Consequence:** Every adapter shares the same registry, grants, canonical envelopes, task service, and audit model. A2A is not the primary product interface.

### D-006: Canonical message/task model
- **Status:** Accepted
- **Decision:** Normalize inbound MCP calls and outbound agent interactions into versioned message, task, event, and response envelopes.
- **Consequence:** Protocol adapters cannot create parallel identity, authorization, or task systems.

### D-007: Async-capable execution
- **Status:** Accepted
- **Decision:** Support durable asynchronous tasks from the beginning, with a synchronous fast path for short interactions.
- **Consequence:** Task IDs, status transitions, deadlines, idempotency, bounded retries, and cancellation semantics are defined before implementation.

### D-008: Explicit context sharing
- **Status:** Accepted
- **Decision:** Share only context explicitly authorized by the caller. Never assume access to private chats, memory, system prompts, tools, or hidden reasoning.

### D-009: Real integration proof
- **Status:** Accepted
- **Decision:** The first meaningful acceptance target is a real MCP caller -> MeepSheep -> separately configured remote agent -> MeepSheep -> caller round trip.
- **Consequence:** A mock is required for tests but does not prove a live integration.

### D-010: Security and cost boundaries
- **Status:** Accepted
- **Decision:** Enforce least privilege, tenant isolation, credential isolation, endpoint validation, idempotency, bounded delegation, budgets, and audit provenance before enabling live external agents.

### D-011: No local model hosting requirement
- **Status:** Accepted
- **Decision:** MeepSheep does not require a local GPU or host a foundation model. Connected agents/providers perform inference; MeepSheep handles networking and coordination.

## Superseded history

### Historical research-first framing
- **Status:** Superseded by D-003 and D-004.
- **Decision at the time:** The original concept emphasized evidence-first research and source synthesis.
- **Reason for change:** The owner clarified that MeepSheep's main purpose is AI agents communicating with other AI agents.
- **Disposition:** Keep research as an optional agent-side task, not the core MVP.

### Historical A2A-primary framing
- **Status:** Superseded by D-003 and D-005.
- **Decision at the time:** A2A was described as the primary agent-to-agent protocol.
- **Correction:** MCP is the first implementation target and primary interface. MeepSheep can relay between MCP-connected agents. A2A is optional when needed for a specific endpoint.

## Open decisions

- **O-001:** Which exact requesting MCP client and target remote MCP agent will be the first live integration pair?
- **O-002:** Which MCP transport, protocol revision, SDK, and authentication mechanism will be pinned?
- **O-003:** Which Cloudflare account contains the intended domain zone, and is it accessible?
- **O-004:** Which single system owns primary relational data and authentication: D1/Cloudflare or Supabase?
- **O-005:** Which durable execution primitive best fits the verified hosting plan and workload?
- **O-006:** What default message/task retention and deletion policy will be published?
- **O-007:** Which optional adapters are justified by actual target demand?

## Decision change procedure

1. Identify the affected decision.
2. Record new evidence or owner clarification.
3. Mark replaced decisions superseded.
4. Add the new decision, rationale, and consequences.
5. Update all affected product, architecture, API, security, and workflow documents.
6. Verify implementation matches the decision before claiming it is live.


### D-012: Local MCP lab SDK baseline
- **Status:** Accepted for the local laboratory only.
- **Decision:** Use Node.js 26.13.0, `@modelcontextprotocol/client@2.4.0`, `@modelcontextprotocol/server@2.4.0`, and `zod@4.6.7` for the first executable TypeScript MCP lab.
- **Reason:** The official TypeScript SDK v2 is the current stable line for the 2026-07-28 MCP protocol revision. The lab needs both the MCP server and client roles.
- **Boundary:** This does not decide the production hosting runtime, identity provider, database, or client-facing authentication profile. Revalidate package versions before production release.


### D-013: Local inbound bearer-token verification
- **Status:** Accepted for the local security boundary only.
- **Decision:** Verify inbound JWT access tokens with RS256 against a configured JWKS resolver. Require exact issuer and audience, `typ: at+jwt`, and validated subject, tenant, client ID, scope, JTI, issue time, expiry, bounded clock skew, and maximum token lifetime. Derive caller identity exclusively from the verified claims.
- **Reason:** The relay must not trust tool arguments or transport context fields as a caller identity source.
- **Boundary:** This is a resource-server verifier and middleware, not an OAuth authorization server, client registration service, token issuer, production identity-provider integration, key lifecycle, or revocation store. A deployed runtime must configure the verifier and must not expose the test principal resolver as public authentication.

### D-014: Local outbound endpoint policy
- **Status:** Accepted for the local security boundary only.
- **Decision:** Require exact host allowlisting, HTTPS on port 443, validation of every DNS answer, rejection of any non-public address, and a fetch adapter that pins DNS lookups to the validated address set while retaining TLS hostname verification and refusing redirects.
- **Reason:** A hostname allowlist alone does not prevent private-address resolution or DNS rebinding.
- **Boundary:** The validator and fetch adapter are local primitives. They are not yet connected to the owner endpoint-registration flow, in-memory registry, or production remote MCP client bootstrap. Real TLS/socket and runtime egress tests remain required.
