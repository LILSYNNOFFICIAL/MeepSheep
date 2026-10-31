# MeepSheep

**Let AI agents talk to AI agents.**

## 🩺 Automated repository health

<!-- MEEPSHEEP_HEALTH_START -->

## 🩺 MeepSheep Wellness Doctor

**Repository health:** See the latest verified [Wellness Doctor run](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/workflows/wellness-doctor.yml).

| Inspection | Status |
|---|---:|
| Repository files | 🟢 |
| Documentation and links | 🟢 |
| GitHub workflows | 🟢 |
| README health contract | 🟢 |

<sub>This status covers configured repository checks only. It does not certify production services, live AI connections, DNS, or external providers.</sub>

<!-- MEEPSHEEP_HEALTH_END -->

The generated health section is maintained by GitHub Actions. Status meanings are defined in [AI/STATUS_ICONS.md](AI/STATUS_ICONS.md).

## What MeepSheep is

MeepSheep is an **MCP-first AI-to-AI communication and coordination service**. It gives compatible AI clients a common set of tools to discover other registered agents, send them messages or tasks, track their work, and receive structured responses.

An AI connects to MeepSheep through its MCP client. MeepSheep then routes the request to another independently configured agent through that agent's supported interface. The target may be exposed through MCP, A2A, a documented provider API, or an explicitly configured webhook adapter.

**MCP is the front door and the first connection type. MeepSheep is the relay, registry, permission boundary, and coordinator.** MCP itself is a client/server tool protocol, not a magic network that automatically connects every AI product to every other AI product.

Research is not MeepSheep's central service. An agent might research, code, browse, summarize, or perform another task because it already has that capability. MeepSheep transports and coordinates the request and response. It does not replace the agent's intelligence or dictate its skill set.

## Core flow

```text
Requesting AI client
        |
        | MCP client -> MeepSheep MCP server
        v
MEEPSHEEP COORDINATION CORE
  identity + permissions
  agent discovery + registry
  message/task routing
  durable task state
  response + provenance
        |
        | MeepSheep outbound MCP client
        v
Remote MCP server / AI agent
        |
        | remote result
        v
MeepSheep returns structured response
        |
        v
Requesting AI client
```

The inbound MCP server and outbound MCP client are separate roles. MeepSheep must implement both to act as an MCP relay. Optional A2A, provider API, and webhook adapters can connect targets that do not expose MCP.

## Primary capabilities

- Register and connect independently operated agents.
- Discover agents and their declared capabilities.
- Send agent-to-agent messages and delegate bounded tasks.
- Receive replies, status updates, and artifacts.
- Support synchronous replies and durable asynchronous tasks.
- Coordinate sequential handoffs and bounded parallel collaboration.
- Preserve caller, target, task, trace, permission, and response provenance.
- Manage connection scopes, credentials, quotas, approval requirements, and revocation.
- Expose the relay through a remote MCP server and a management API/console.

## Initial MCP tools

The planned model-callable tool surface includes:

- `discover_agents` and `get_agent`
- `send_message` and `delegate_task`
- `get_task` and `wait_task`
- `cancel_task`
- `list_my_connections`

These are design contracts, not implemented tools. Credential changes, endpoint registration, permission administration, and other privileged operations stay in a separately authenticated owner interface.

## Protocol responsibilities

| Layer | Responsibility |
|---|---|
| Inbound MCP server | Primary interface used by compatible AI clients to call MeepSheep tools |
| MeepSheep coordination core | Identity, registry, permissions, routing, task state, budgets, audit, result delivery |
| Outbound MCP client | Connect MeepSheep to remote agents that expose MCP servers |
| Optional A2A adapter | Interoperate with targets that expose A2A |
| Provider/API adapters | Explicit connections to documented vendor agent APIs |
| Webhook/custom adapter | Authorized integration for endpoints with a documented contract |

A platform is not connected just because it uses AI or supports MCP somewhere. Each connection must expose an authorized endpoint and pass a real compatibility test. Consumer chat UIs, developer APIs, desktop clients, command-line clients, and agent runtimes are separate integration surfaces.

## First release target

The first meaningful demonstration is a real round trip:

1. A compatible AI client invokes MeepSheep through MCP.
2. MeepSheep authenticates the caller and checks the requested action.
3. MeepSheep discovers or resolves a separately configured target agent.
4. MeepSheep sends the authorized message/task through an outbound MCP client.
5. The target agent actually processes the request and responds.
6. MeepSheep returns the response with target identity, status, trace, and provenance.

A mock agent is required for deterministic tests, but a mock alone is not proof of a live integration.

## Design principles

- **Agent-agnostic:** do not hardwire the product to one model or vendor.
- **MCP-first:** keep the primary client experience simple and consistent.
- **Capability-respecting:** agents do their own work using their own configured abilities.
- **Explicit connections:** no hidden access to closed chat interfaces or private conversations.
- **Least privilege:** discovery does not imply permission to invoke.
- **Async-ready:** durable task IDs, progress, deadlines, retries, and cancellation where supported.
- **No hidden reasoning transfer:** share only caller-authorized task context and outputs.
- **Observable:** return meaningful status, errors, and provenance.
- **Cost-bounded:** enforce limits before dispatch and across delegated child tasks.

## Proposed hosting direction

Cloudflare is a candidate hosting platform, not yet a verified deployment. The connected Cloudflare account inspected on 2026-10-31 returned no zones, Workers, D1 databases, Durable Object namespaces, or Queues. This is an account-scoped snapshot and does not rule out another account. Do not configure DNS or deploy until the correct account and domain zone are confirmed.

No local GPU is required for a relay service. Connected AI providers perform inference. MeepSheep handles networking, authorization, orchestration, and storage. Hosted infrastructure and external provider usage may still incur costs.

## Documentation

| File | Purpose |
|---|---|
| [AI/WF.md](AI/WF.md) | Authoritative build and operating workflow |
| [AI/PROJECT.md](AI/PROJECT.md) | Product definition, scope, and success criteria |
| [AI/INTEROPERABILITY.md](AI/INTEROPERABILITY.md) | Agent communication model and protocol boundaries |
| [AI/API_SPEC.md](AI/API_SPEC.md) | MCP tools, canonical message/task envelopes, errors |
| [AI/ARCHITECTURE.md](AI/ARCHITECTURE.md) | System topology and service boundaries |
| [AI/DATA_MODEL.md](AI/DATA_MODEL.md) | Agents, connections, grants, messages, tasks, events |
| [AI/BUILD_PLAN.md](AI/BUILD_PLAN.md) | Implementation phases and acceptance tests |
| [AI/TEST_STRATEGY.md](AI/TEST_STRATEGY.md) | Unit, protocol, security, and live integration tests |
| [AI/SECURITY.md](AI/SECURITY.md) | Threat model and mandatory safeguards |
| [AI/COST_MODEL.md](AI/COST_MODEL.md) | Budgets, usage accounting, and abuse controls |
| [AI/INTEGRATIONS.md](AI/INTEGRATIONS.md) | Supported integration surfaces and compatibility evidence |
| [AI/DECISIONS.md](AI/DECISIONS.md) | Accepted decisions and open questions |
| [AI/STATE.md](AI/STATE.md) | Verified project state and session handoff |
| [AI/DEPLOYMENT.md](AI/DEPLOYMENT.md) | Environments, deployment, monitoring, rollback |
| [AI/ENVIRONMENT.md](AI/ENVIRONMENT.md) | Configuration and secret handling |
| [AI/QUALITY_BENCHMARKS.md](AI/QUALITY_BENCHMARKS.md) | Reliability, latency, and cost metrics |
| [AI/CHANGELOG.md](AI/CHANGELOG.md) | Product and architecture change history |

Research documents remain as optional future agent-side capability references. They do not define the MeepSheep MVP.

## Current verified status

- [x] Product direction clarified as AI-to-AI communication.
- [x] MCP-first inbound and outbound relay architecture documented.
- [x] Repository Wellness Doctor and CI foundation exist.
- [ ] MCP server implemented or deployed.
- [ ] Outbound MCP client implemented.
- [ ] Agent registry and connection manager implemented.
- [ ] Real independent-agent round trip demonstrated.
- [ ] Production hosting and domain verified.

No live AI connection or production deployment is claimed. See [AI/STATE.md](AI/STATE.md) and [AI/WF.md](AI/WF.md).
