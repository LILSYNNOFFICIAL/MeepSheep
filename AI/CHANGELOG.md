# MeepSheep Change Log

Meaningful product, architecture, security, and release changes are recorded here. Dates use YYYY-MM-DD. This log does not replace Git history.

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
