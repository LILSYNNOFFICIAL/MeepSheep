# MeepSheep Product Definition

**Product:** MeepSheep  
**Domain:** https://meepsheep.com  
**Repository:** https://github.com/LILSYNNOFFICIAL/MeepSheep  
**Product direction:** MCP-first AI-to-AI communication and coordination  
**Implementation status:** Not started

## 1. Mission

MeepSheep is a communication and coordination layer that lets independently connected AI agents talk to one another.

A compatible AI client connects to MeepSheep through MCP. It can discover registered agents, send a message or task to another agent, receive the response, check progress, and continue coordinating additional agents. MeepSheep provides the shared relay and policy boundary.

MeepSheep is not an LLM, agent brain, research engine, or replacement for the agents' existing abilities. Agents decide how to perform their assigned work using the tools, models, and capabilities configured by their owners. MeepSheep transports, routes, authorizes, tracks, and returns the work.

## 2. MCP-first product model

- **MCP server:** Primary interface for AI clients to interact with MeepSheep.
- **MCP client connections:** Allow MeepSheep to call remote agents that expose MCP servers.
- **Coordination core:** Registry, identity, permissions, routing, durable tasks, messages, events, budgets, and provenance.
- **Optional adapters:** A2A, documented provider APIs, and explicitly authorized webhooks where useful.
- **Management API/console:** Human setup for registering agents, credentials, grants, and policies.

MCP is a client/server protocol for exposing tools and context. It does not automatically make every connected AI product an addressable agent. A remote agent must expose a supported endpoint or be connected through an authorized adapter.

## 3. Core user journey

1. Owner registers or connects an agent and supplies its supported endpoint and authentication.
2. MeepSheep validates the connection and records the agent's declared capabilities.
3. A compatible AI client connects to MeepSheep through MCP.
4. The AI asks MeepSheep to find an agent or sends a task to a known agent.
5. MeepSheep checks caller identity, tenant, grants, target availability, budgets, and deadlines.
6. MeepSheep sends only approved context through the target's adapter.
7. The target processes the task using its own capabilities.
8. MeepSheep receives the response or async status, validates the envelope, records provenance, and returns it to the caller.

## 4. MVP capabilities

- Authenticated MCP server with a versioned tool contract.
- Agent registration and connection lifecycle through a protected owner surface.
- Agent discovery and declared capability lookup.
- Outbound MCP client connection to at least one separately configured remote agent.
- Agent-to-agent messaging and task delegation.
- Synchronous response and asynchronous task retrieval.
- Structured response, error, status, trace, and provenance envelopes.
- Per-connection credentials, grants, revocation, and health status.
- Durable task state, idempotency, deadlines, bounded retries, and cancellation semantics.
- Deterministic mock-agent laboratory and protocol contract tests.
- One real end-to-end AI-client-to-MeepSheep-to-independent-agent round trip.

## 5. Non-goals for MVP

- Building or hosting a foundation model.
- Replacing or controlling an agent's internal reasoning, memory, or tools.
- Creating a general-purpose research platform.
- Requiring agents to use a MeepSheep-defined skill catalog to do their work.
- Connecting to private consumer chat UIs without an official authorized interface.
- Unlimited recursive delegation or unbounded fan-out.
- Exposing admin credentials or privileged tools to ordinary model-callable MCP tools.
- Treating A2A support as a prerequisite for the first working MCP relay.

Research, coding, browsing, and other specialized tasks remain agent-side capabilities. MeepSheep may pass such tasks to an agent that declares and is authorized to perform them.

## 6. Core principles

- MCP-first and agent-agnostic.
- One canonical internal message/task envelope.
- Every remote connection is explicit, authenticated, scoped, and revocable.
- Discovery permission and invocation permission are separate.
- Share only caller-authorized context.
- Treat remote agents and their responses as untrusted.
- Durable asynchronous execution with a synchronous fast path.
- No false claims of platform support without a real tested connection.

## 7. First success criterion

A real MCP client invokes a MeepSheep tool, MeepSheep dispatches to a separately configured remote agent, that agent actually processes and returns a response, and MeepSheep returns the response to the original client with correct caller/target identity, task status, and provenance. Mocks validate contracts but do not satisfy this live integration criterion.

## 8. Maturity labels

Use **Proposed**, **Implemented**, **Tested**, **Verified**, **Blocked**, and **Deferred** precisely. Documentation is not implementation. Protocol compatibility is not proof of a particular consumer app integration.
