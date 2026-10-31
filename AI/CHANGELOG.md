# MeepSheep Change Log

Meaningful project, architecture, security, and release changes are recorded here. Dates use YYYY-MM-DD. This log does not replace Git history.

## 2026-10-31

### Product direction clarified

- Reframed MeepSheep as an AI interoperability and coordination layer.
- Established MCP as the AI-client tool interface, A2A as the agent-to-agent task protocol, and vendor APIs/webhooks as explicit adapters.
- Chose async-first task orchestration with a synchronous fast path.
- Defined the first meaningful acceptance target as a real AI-to-AI delegation round trip.
- Added build, API, data model, test, benchmark, deployment, environment, and interoperability documents.
- Expanded the security baseline for agent connections, task routing, credential isolation, callback validation, replay protection, and delegation limits.

All entries above describe documentation and product decisions, not implemented runtime capabilities.
