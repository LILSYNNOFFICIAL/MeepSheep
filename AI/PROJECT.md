# MeepSheep Project Brief

**Product:** MeepSheep  
**Canonical domain:** https://meepsheep.com  
**Repository:** https://github.com/LILSYNNOFFICIAL/MeepSheep  
**Default branch:** `main`  
**Status:** Owner-confirmed product direction, 2026-10-31. Application implementation has not started.

## 1. Mission

MeepSheep is an **AI interoperability and coordination layer**. Its primary purpose is to let independently operated AI assistants and agents communicate, delegate work, exchange structured results, and collaborate through explicitly authorized interfaces.

A user should be able to ask one connected AI to consult another connected AI, assign it a task, receive its response, and coordinate further work without manually copying every message.

MeepSheep is not a foundation model and does not need to host or train an LLM. It cannot magically access closed consumer chat interfaces. It connects systems through the official interfaces they expose.

## 2. Core interaction

1. An AI client or user submits a task through a supported MeepSheep interface.
2. MeepSheep authenticates the caller and checks permissions.
3. The caller discovers or selects a registered target agent.
4. MeepSheep checks capability, availability, authorization, budget, and deadline.
5. MeepSheep dispatches through MCP, A2A, or a supported vendor API adapter.
6. MeepSheep tracks progress, handles asynchronous completion, and validates the response.
7. The caller receives the result with target identity, task status, warnings, and provenance.

## 3. Product surfaces

- **Remote MCP server:** Tools for compatible AI clients to discover agents, delegate tasks, inspect progress, and retrieve results.
- **A2A endpoint:** Agent discovery and task exchange with A2A-compatible agents.
- **Provider adapters:** Documented vendor APIs and webhooks where official interfaces permit.
- **Web console/PWA:** Manage connections, credentials, permissions, agents, tasks, and audit history.
- **Shared coordination core:** One canonical task model, authorization layer, router, durable execution system, and provenance trail.

MCP is the AI-client-to-tool interface. A2A is the agent-to-agent task protocol. Vendor APIs and webhooks are explicit adapters. These interfaces are complementary, not interchangeable.

## 4. MVP capabilities

- Register and configure at least one remote agent through a supported interface.
- Discover agents and declared capabilities.
- Send a structured task to a selected, authorized target.
- Support short request/response and durable asynchronous tasks.
- Track task status and retrieve results.
- Preserve caller, target, task, trace, and response provenance.
- Enforce per-connection credentials, scopes, permissions, budgets, and limits.
- Support cancellation where the target protocol permits it.
- Expose core operations through a remote MCP server.
- Demonstrate one real AI-to-AI round trip with a separately configured target agent.
- Provide a minimal web console for connection and task management.

## 5. Protocol strategy

- MCP is the primary client-facing tool interface.
- A2A is the primary agent-to-agent task protocol.
- Vendor APIs and webhooks are explicit adapters for systems that expose documented interfaces.
- All protocols map to a versioned internal task/message envelope.

No protocol grants access to a closed assistant that does not expose an authorized endpoint. Compatibility is verified per product, surface, plan, platform, and operation.

## 6. Async-first execution

Design durable asynchronous tasks from day one because agent collaboration may take seconds or minutes, require additional input, or involve multiple stages. Provide a synchronous fast path for short tasks. Each task has a deadline, budget, state, trace ID, idempotency behavior, and cancellation policy.

## 7. Privacy and trust

Share only context the caller explicitly authorizes. Never assume access to another AI's private chat history, memory, system prompt, tools, or hidden reasoning. Do not transmit hidden chain-of-thought. Keep credentials server-side and scoped to individual connections. Treat remote agents and their responses as untrusted.

## 8. Non-goals for the first release

- Hosting or training foundation models.
- Bypassing platform restrictions or private interfaces.
- Unofficial browser automation as the default integration method.
- Unrestricted access to another agent's memory, tools, or credentials.
- Unlimited recursive delegation or unbounded fan-out.
- Sensitive external actions without explicit policy and approval.
- A full standalone research platform as the primary MVP. Research may later be an agent capability.

## 9. Success criteria

The first meaningful success is a real, secure, observable round trip: one supported AI client delegates through MeepSheep to a separately configured agent and receives its response with correct identity, provenance, status, and permission enforcement.

Numeric targets for reliability, latency, and cost are set after baseline measurements. A mock-agent test or protocol specification alone is not proof of a live integration.

## 10. Maturity labels

Use Implemented, Tested, Verified, Proposed, Blocked, and Deferred precisely. Never describe a proposed integration as live.
