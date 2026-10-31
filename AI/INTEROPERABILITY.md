# MeepSheep AI Interoperability Strategy

**Status:** Product-defining direction.  
**Primary interface:** MCP.  
**Primary job:** Let independently connected AI agents communicate and coordinate.

## 1. Mission

MeepSheep is the relay and coordination layer between AI agents. A requesting AI calls MeepSheep through MCP. MeepSheep discovers or resolves a separately configured target agent, checks authorization, sends a message or task through that agent's supported interface, tracks the result, and returns it to the caller.

MeepSheep does not replace an agent's model, reasoning, memory, tools, or specialized skills. Agents perform their own work. Research is one possible agent-side capability, not the MeepSheep product itself.

## 2. MCP-first communication model

MCP is a client/server protocol. MeepSheep uses it in two directions:

1. **Inbound MCP server:** compatible AI clients connect to MeepSheep and call its tools.
2. **Outbound MCP client:** MeepSheep connects to remote MCP servers and invokes owner-approved tools on behalf of an authorized caller.

This is the core relay pattern. The requesting agent does not need to know the target's vendor-specific interface. It calls MeepSheep's stable tools; MeepSheep handles the configured connection and normalization.

MCP alone does not create endpoints for closed chat products. A target must expose a callable MCP server or another authorized interface.

## 3. Optional connection adapters

- **MCP:** default first-class connection type and first implementation target.
- **A2A:** optional adapter for agents that expose the A2A protocol and where interoperability adds value.
- **Vendor APIs:** explicit adapters for documented agent APIs.
- **Webhooks/custom endpoints:** only with owner-configured destinations, authentication, and a defined request/response contract.

Do not implement protocols just to accumulate logos. Add an adapter when a real target connection requires it and the security/compatibility case is documented.

## 4. Agent registry

An agent record should include:
- Stable MeepSheep agent ID and owner/tenant.
- Display name and description.
- Connection type and protocol/version.
- Endpoint reference and credential reference, never raw secrets.
- Owner-approved tool/capability allowlist.
- Declared skills and modalities.
- Authentication method and required scopes.
- Payload, timeout, concurrency, and rate limits.
- Health state, last connection test, and last verified time.
- Trust and lifecycle state: pending, active, disabled, revoked.

Declared capabilities are not verified quality and do not grant authorization. Tool allowlists are explicit and enforced server-side.

## 5. Communication patterns

- One-shot message/request-response.
- Delegated task with durable task ID.
- Asynchronous progress and result retrieval.
- Sequential handoff between agents.
- Bounded parallel delegation.
- Human input or approval pauses.
- Structured response aggregation with source-agent provenance.

Unrestricted recursive delegation is prohibited. Child tasks inherit or narrow the parent's permission, deadline, and budget.

## 6. Context exchange

The caller explicitly selects what to share:
- Task instruction and required input.
- Selected summary or conversation excerpt.
- Selected attachment/artifact references.
- Explicitly shared memory references where supported.

Do not assume access to private conversation history, system prompts, memory, hidden reasoning, or tools. Never transmit hidden chain-of-thought. Apply data minimization and payload limits.

## 7. Trust and permissions

- Every remote connection is explicitly configured and owned.
- Authenticate the caller and target connection independently.
- Separate discovery, message-send, task-dispatch, status-read, cancellation, and admin scopes.
- Require owner approval for exposed remote tools.
- Keep secrets server-side, encrypted, redacted, rotatable, and revocable.
- Treat remote agent output as untrusted data, not policy.
- Require approval for consequential side effects.
- Record trace, caller, target, tool invoked, authorization decision, status, and provenance.

## 8. First demonstration

A compatible MCP client invokes a MeepSheep tool. MeepSheep checks the caller's grant, selects a separately configured remote MCP agent, invokes its approved tool, receives an actual response, and returns a structured result. The test must prove the remote endpoint was called and the result came from that endpoint, not a local mock or fabricated response.

## 9. Compatibility truth

Record compatibility by exact product, interface, plan, platform, protocol version, auth mode, and tested operation. An MCP server does not automatically connect to every ChatGPT or Grok consumer surface. Developer APIs, desktop clients, command-line tools, and consumer chat UIs are distinct integration targets.
