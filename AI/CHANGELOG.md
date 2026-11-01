# MeepSheep Change Log

Meaningful product, architecture, security, and release changes are recorded here. Dates use YYYY-MM-DD. This log does not replace Git history.

## 2026-11-01: Secure connection boundary primitives (draft PR #5)

- Added a resource-server authentication module for RS256 JWT access tokens verified against a configured JWKS resolver.
- Added an inbound bearer middleware that replaces caller-provided MCP auth context and derives principal/tenant only from verified claims.
- Added tests proving invalid issuer/audience/algorithm/time/claims are rejected and forged auth context cannot override signed identity.
- Added strict HTTPS/443 exact-host endpoint validation, complete IPv4/IPv6 DNS answer checks, and a pinned HTTPS fetch adapter with request restrictions, TLS hostname preservation, header stripping, byte limits, timeouts, and redirect non-following.
- Added focused security CI steps and a new draft PR #5 stacked on PR #4.
- CI run 41268297674 on head `05563436e7631024733bd82bd5f03c9612ce0bf4` passed 7 auth tests, 9 endpoint tests, 30 Node tests, 10 Python Wellness Doctor tests, 113 Repository Doctor checks, and both workflow YAML validations.
- Production OAuth issuance, JWKS/key lifecycle, endpoint onboarding wiring, credential vault, persistent registry, durable tasks, real external TLS/egress verification, and live AI integrations remain unimplemented.

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
