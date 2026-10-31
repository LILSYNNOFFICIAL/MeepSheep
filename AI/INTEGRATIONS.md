# MeepSheep Integration Strategy

**Primary integration:** MCP.  
**Product goal:** Let independently operated AI agents communicate through one secure relay.

## 1. Core connection pattern

MeepSheep needs both MCP roles:

- **Inbound MCP server:** requesting AI clients connect to MeepSheep and call its agent discovery, messaging, delegation, and task tools.
- **Outbound MCP client:** MeepSheep connects to separately configured remote MCP servers and invokes only owner-approved tools.

A remote MCP server may expose an AI agent, a tool service, or both. MeepSheep must not assume that every MCP server is an autonomous AI agent. The owner explicitly classifies the connection and approves the tools/capabilities that may be called.

## 2. Optional adapters

- **A2A:** Add when a concrete remote agent exposes A2A and the integration is useful.
- **Provider APIs:** Add only for documented agent APIs with permitted authentication and use.
- **Webhooks/custom endpoints:** Add only when the owner controls or explicitly authorizes the endpoint and a secure request/response contract exists.

Do not build an adapter simply to claim support for a vendor. Every adapter uses the same identity, authorization, canonical message/task model, task state, budget, and audit core.

## 3. Compatibility matrix

For every target record:
- Vendor and exact product.
- Surface: consumer UI, developer API, CLI, desktop app, or agent runtime.
- Account plan and platform/OS.
- Protocol and exact version.
- Transport and authentication.
- Whether the endpoint accepts inbound calls or only makes outbound tool calls.
- Available operations and tool scopes.
- Async, streaming, timeout, and cancellation behavior.
- Payload and rate limits.
- Test date, exact scenario, result, and evidence.

Never label an entire vendor brand as supported based on one API or CLI. A working remote MCP server does not mean every ChatGPT or Grok consumer interface can connect to it.

## 4. First integration sequence

1. Build a local MeepSheep MCP server.
2. Build a local outbound MCP client connection.
3. Connect a deterministic mock remote MCP server.
4. Prove discovery, approved tool invocation, response normalization, and error handling.
5. Connect one real independently operated MCP agent.
6. Connect one real requesting MCP client.
7. Prove a live round trip and record the exact tested surfaces.

## 5. Official documentation references

- MCP specification: https://modelcontextprotocol.io/specification
- Cloudflare Agents SDK MCP: https://developers.cloudflare.com/agents/model-context-protocol/
- OpenAI remote MCP: https://developers.openai.com/api/docs/guides/tools-connectors-mcp
- xAI MCP: https://docs.x.ai/build/features/mcp-servers
- A2A specification, for optional future adapter: https://a2a-protocol.org/latest/specification/

Recheck specifications, SDK versions, pricing, plans, and terms immediately before implementation. These links do not prove MeepSheep has connected to any provider.

## 6. Infrastructure candidates

Cloudflare Workers/Agents SDK, Workflows, Durable Objects, D1, Queues, KV, R2, and Static Assets are candidates only. The accessible Cloudflare account inspected on 2026-10-31 returned no zones, Workers, D1 databases, Durable Object namespaces, or Queues. Confirm the correct account and domain before deployment.

Supabase remains an alternative candidate for selected identity/data responsibilities. Avoid two competing authoritative databases.

## 7. Development tools

Use tools actually available and authorized in the current session. GitHub is the source of truth for repository state. Cloudflare tools are used for Cloudflare account/deployment work. Supabase tools are used only if that architecture is selected. Security and code-review tools supplement, but do not replace, automated tests and live behavior verification.


## 8. Current local MCP lab evidence

The first local integration uses the official TypeScript SDK v2.4.0. The caller connects to the MeepSheep inbound MCP handler; MeepSheep's outbound MCP client connects to a separately instantiated mock-agent handler. Tests use the SDK Streamable HTTP transport with a custom in-process fetch bridge. Seven tests pass for discovery, authorized dispatch, tenant isolation, allowlisting, remote tool presence, permission denial, and sanitized remote failures.

This is not socket-level/network-separated operation and does not establish compatibility with ChatGPT, Grok, Claude, or any other live product surface. See [MCP_LAB.md](MCP_LAB.md) and PR #3. The official SDK references and pinned versions must be rechecked before production implementation.
