# MeepSheep AI Interoperability Strategy

**Status:** Product-defining design document.

## 1. Mission

MeepSheep is an interoperability and coordination layer that helps independently operated AI assistants and agents communicate, delegate work, exchange structured results, and collaborate through explicitly authorized interfaces.

It is not a foundation model and does not magically connect to closed consumer chat interfaces. It connects to the interfaces those systems officially expose.

## 2. Protocol strategy

### MCP: AI-to-tool access
MCP allows a compatible AI client to discover and invoke tools exposed by MeepSheep. MeepSheep's MCP server is the entry point through which a client can discover agents, submit tasks, inspect progress, and retrieve results, subject to scopes and user approval.

### A2A: agent-to-agent tasks
A2A provides an agent discovery and task interaction model for independent agents. MeepSheep should implement an A2A client adapter for calling external A2A agents and may expose its own A2A server/Agent Card for agents that want to delegate to MeepSheep.

### Vendor APIs and webhooks
Some providers expose model APIs, agent APIs, callbacks, or webhooks but not A2A. Implement explicit adapters only where official APIs and terms permit. A vendor adapter is not equivalent to connecting to its consumer chat product.

## 3. Capability registry

An agent profile should publish:
- Stable MeepSheep agent ID.
- Human-readable name and description.
- Owner and trust state.
- Protocols and versions.
- Declared capabilities/skills.
- Input and output formats.
- Authentication requirements.
- Supported interaction modes.
- Limits and availability metadata.
- Last verified health time.

Capability declarations are descriptive, not proof of quality or permission. Test and reputation signals must be separate from self-declared claims.

## 4. Communication patterns

- Request/response for short tasks.
- Durable asynchronous tasks for long-running work.
- Streaming progress where supported.
- Sequential delegation.
- Bounded parallel fan-out.
- Human approval and input-required states.
- Explicit result aggregation with source-agent provenance.

Do not enable unrestricted recursive delegation. Every child task inherits or narrows the parent deadline, budget, and permissions.

## 5. Context exchange

The caller chooses what context may be shared. MeepSheep should support:
- Task-only context.
- Selected conversation summary.
- Selected attachments/artifacts.
- Explicitly shared memory references where supported.

Never assume one AI's private conversation history, hidden reasoning, system prompt, tools, or memory are accessible to another. Do not transmit hidden chain-of-thought. Send only user-authorized content and structured task data.

## 6. Trust and permissions

- Each connection is explicitly configured and owned.
- Use OAuth or provider-supported credentials where available.
- Scope each connection to the minimum required capabilities.
- Separate discovery permission from task invocation permission.
- Require approval for sensitive or consequential actions.
- Record caller, target, scopes, task, result provenance, and decision.
- Provide revoke, disconnect, and delete controls.
- Treat every remote agent as potentially compromised or mistaken.

## 7. Product surfaces

- Remote MCP server for compatible AI clients.
- A2A endpoint and Agent Card for A2A-compatible agents.
- Web console for managing connections, permissions, tasks, and audit history.
- Public developer documentation and test agent.
- Optional API/webhook adapters for supported providers.

## 8. Compatibility truth

Compatibility must be recorded per product, interface, account plan, platform, and tested operation. A protocol being open does not mean a specific consumer chat UI exposes it. For example, current official documentation describes remote MCP integrations for the OpenAI API and custom MCP connections in specific ChatGPT workspace plans; xAI documents remote MCP support for its API and Grok tooling. These are distinct paths and must be tested separately.

## 9. First demonstration

A compatible caller asks MeepSheep to send a task to a separately configured agent. MeepSheep authenticates both sides, applies the grant, dispatches through a documented protocol, tracks the remote task, validates the response, and returns a result with target identity and provenance.

This single round trip is the first meaningful proof of product value.
