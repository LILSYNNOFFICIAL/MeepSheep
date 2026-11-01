# MeepSheep Change Log

Meaningful product, architecture, security, and release changes are recorded here. Dates use YYYY-MM-DD. This log does not replace Git history.

## 2026-11-01: Secure connection and owner lifecycle (draft PR #5)

- Added an RS256 JWT access-token resource-server verifier with trusted JWKS validation and an inbound bearer middleware that overwrites caller-controlled authentication context.
- Added strict HTTPS/443 endpoint validation, complete DNS answer checks, and a pinned Node HTTPS fetch adapter with TLS hostname preservation, redirect refusal, request/response restrictions, byte limits, timeouts, and cancellation.
- Added an encrypted AES-256-GCM credential vault with tenant/credential/key/version authenticated data, scoped reads, key rotation, revocation, tamper detection, and optimistic concurrency.
- Hardened the in-memory agent registry to retain only explicit safe fields and opaque credential/endpoint references.
- Added a secure outbound MCP connection factory that combines endpoint validation, pinned transport, per-request vault-backed bearer injection, and remote tool schema discovery.
- Added an internal owner connection manager for preview, explicit per-tool schema approval, owner/tenant isolation, expiry, registration, disconnect, credential revocation, and cleanup on failure. Privileged lifecycle methods are not exposed as ordinary inbound MCP tools.
- Added focused CI gates for each security subsystem and owner connection lifecycle.
- CI run 41269980816 on head `59b38b6e3b3329c983b696bd01da7ded667bb2e2` passed 63 Node tests, 10 Python Wellness Doctor tests, 113 Repository Doctor checks with zero warnings/errors/critical, and both workflow YAML validations.
- The connection manager and credential vault still use in-memory test/reference adapters. Production OAuth issuance, persistent DB/KMS adapters, public owner API/console, durable audit, schema reapproval UI, task queue, live external TLS/egress verification, and real AI integrations remain unimplemented.

## 2026-10-31

### Initial product direction correction
- Replaced the research-first product framing with AI-to-AI interoperability and coordination.
- Added MCP, A2A, and provider API planning documents.
- Added task lifecycle, security, cost, and deployment design guidance.

### Owner clarification: MCP-first agent relay
- Clarified that MeepSheep's primary purpose is for AI agents to communicate with other AI agents.
- Established MeepSheep as the relay, registry, permission boundary, and coordinator.
- Made the inbound MCP server the primary interface for requesting AI clients.
- Added the outbound MCP client as the first remote-agent connection type.
- Clarified that agents perform their own research, coding, browsing, and other work using their existing capabilities.
- Deferred MeepSheep-owned research-engine functionality from the MVP.
- Reclassified A2A, provider APIs, and webhooks as optional adapters, not first-release prerequisites.
- Rewrote the master workflow to remove research-first phases and define an MCP relay implementation path.
- Updated product, architecture, interoperability, API, data model, build, security, testing, integration, decision, and benchmark documents.

All entries describe product/documentation direction only. No application code, live MCP endpoint, remote AI connection, DNS, or production deployment is claimed.


## 2026-10-31: First local MCP relay laboratory

- Added a Node.js 26.13.0 local test harness with the official MCP TypeScript SDK v2.4.0.
- Added inbound `discover_agents` and `send_message` tools, an in-memory tenant-aware registry, outbound MCP tool allowlisting, response provenance, and sanitized remote errors.
- Added a deterministic mock MCP agent and seven CI integration tests.
- CI now runs Node MCP tests alongside the existing Python Wellness Doctor checks.
- This is a local protocol/relay proof only. It is not a live external AI connection or production deployment.
