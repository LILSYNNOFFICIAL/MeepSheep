# MeepSheep

**Evidence-first research. Clear sources. Better answers.**

## 🩺 Automated repository health

<!-- MEEPSHEEP_HEALTH_START -->

## 🩺 MeepSheep Wellness Doctor

**Overall health: 🟢 Healthy** · `OK`

| Inspection | Status |
|---|---:|
| Repository files | 🟢 |
| Documentation and links | 🟢 |
| GitHub workflows | 🟢 |
| README health contract | 🟢 |

**Checks:** 84 passed · 🟡 0 warnings · 🔵 0 errors · 🔴 0 critical

[Latest inspection and diagnostic logs](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/workflows/wellness-doctor.yml)

<sub>Scheduled inspections run every 15 minutes on a best-effort basis. The latest workflow run contains the exact inspection time. This summary covers configured repository checks, not unconfigured production services.</sub>

<!-- MEEPSHEEP_HEALTH_END -->

The generated health section is maintained by GitHub Actions. The status mapping is defined in [AI/STATUS_ICONS.md](AI/STATUS_ICONS.md). Scheduled inspections run every 15 minutes on a best-effort basis; the latest workflow execution contains the exact inspection timestamp and diagnostic logs.


MeepSheep is being designed as an **AI interoperability and coordination layer**. Its primary purpose is to let independently operated AI assistants and agents communicate, delegate tasks, exchange structured results, and collaborate through explicitly authorized interfaces.

The goal is to let one connected AI ask another connected AI to do work, track the task, receive its response, and coordinate further agents through a common routing layer. MeepSheep does not host or train a foundation model and cannot magically access closed consumer chat interfaces. It connects systems through the official interfaces they expose.

> **Project status:** Foundation and planning stage. The repository is being initialized. The architecture and feature set described below are product direction and proposals unless explicitly labeled implemented and verified.

## Product vision

MeepSheep is the bridge between independently operated AI assistants and agents.

- **Remote MCP server:** Give compatible AI clients tools to discover agents, delegate tasks, inspect progress, and retrieve results.
- **A2A endpoint:** Communicate with agents that implement the Agent2Agent protocol.
- **Provider adapters:** Bridge documented vendor APIs and webhooks where official interfaces permit.
- **Web console/PWA:** Configure connections, credentials, permissions, agent capabilities, tasks, and audit history.
- **Shared coordination core:** Normalize messages and tasks, enforce authorization, route work, track asynchronous execution, and preserve provenance.

MCP is the AI-to-tool entry point. A2A is the agent-to-agent task protocol. Vendor APIs and webhooks are explicit adapters. These protocols are complementary, not interchangeable.

The intended domain is [meepsheep.com](https://meepsheep.com). Domain routing and production availability have not yet been verified.

## What MeepSheep is intended to do

- Register and discover connected agents and their declared capabilities.
- Send structured tasks to explicitly authorized agents.
- Support short request/response and multi-minute asynchronous work.
- Coordinate sequential delegation and bounded parallel agent workflows.
- Track progress, deadlines, cancellation, errors, and completion.
- Pass only user-authorized context between agents.
- Return structured results with caller, target, task, and response provenance.
- Manage per-agent credentials, scopes, quotas, and revocation.
- Expose the same coordination capabilities through MCP, A2A, and the web console.

A protocol being open does not mean every AI chat interface exposes an endpoint. Each connection must be configured and tested against the actual product, plan, platform, and supported interface.

## First-release proof

The first meaningful release must demonstrate one real end-to-end round trip: a supported AI client delegates a task through MeepSheep to a separately configured target agent and receives a structured result with correct identity, status, provenance, and permission enforcement.

Research and evidence gathering may later be capabilities that agents can perform. They are not the primary first-release product.

## Proposed technology direction

The current candidate is a Cloudflare-first deployment, subject to current account, domain, pricing, runtime, and compatibility verification.

| Area | Candidate direction | Status |
|---|---|---|
| Hosting and API | Cloudflare Workers | Proposed |
| Web delivery | Workers Static Assets or compatible frontend deployment | Proposed |
| Frontend | Responsive web app / installable PWA | Proposed |
| Relational data | Cloudflare D1 or Supabase after comparison | Open |
| Cache | Cloudflare KV where appropriate | Optional proposal |
| File/artifact storage | Cloudflare R2 if required | Optional proposal |
| AI client interface | Remote MCP | Proposed |
| Agent-to-agent protocol | A2A | Proposed |
| Vendor connectivity | Documented APIs and webhooks | Adapter candidates |
| Task execution | Async-first durable orchestration | Proposed |
| Agent connectivity | MCP, A2A, documented vendor APIs/webhooks | Proposed |
| Repository | GitHub | Confirmed |

No local GPU is required for the relay architecture. Connected AI providers perform model inference; MeepSheep handles routing, authentication, task coordination, and result delivery on hosted infrastructure. Free tiers can help start the project, but they do not mean unlimited usage or zero marginal cost.

See [AI/ARCHITECTURE.md](AI/ARCHITECTURE.md) and [AI/DECISIONS.md](AI/DECISIONS.md) for the current reasoning and unresolved choices.

## Initial MCP tool candidates

The planned MCP surface is intentionally narrow:

- `list_agents`: discover agents visible to the authenticated caller.
- `get_agent`: inspect a permitted agent's capabilities and connection health.
- `send_task`: delegate a bounded task to an authorized agent.
- `get_task` and `wait_task`: inspect asynchronous task progress and results.
- `cancel_task`: request cancellation where the target supports it.
- `list_connections`: inspect the caller's configured connections without exposing credentials.

These are planned contracts, not currently deployed tools. Administrative credential and permission changes remain in a separately authenticated owner interface.

## Repository layout

```text
MeepSheep/
├── README.md
└── AI/
    ├── WF.md
    ├── PROJECT.md
    ├── INTEROPERABILITY.md
    ├── API_SPEC.md
    ├── DATA_MODEL.md
    ├── BUILD_PLAN.md
    ├── COST_MODEL.md
    ├── TEST_STRATEGY.md
    ├── QUALITY_BENCHMARKS.md
    ├── DEPLOYMENT.md
    ├── ENVIRONMENT.md
    ├── CHANGELOG.md
    ├── ARCHITECTURE.md
    ├── DECISIONS.md
    ├── SECURITY.md
    ├── RESEARCH.md
    ├── INTEGRATIONS.md
    ├── STATE.md
    ├── CONTRIBUTING.md
    ├── GITHUB_RULES.md
    ├── ACTIONS.md
    ├── WELLNESS_DOCTOR.md
    ├── STATUS_ICONS.md
    ├── INCIDENTS.md
    ├── AUTOMATION_LOG.md
    └── WELLNESS_IMPLEMENTATION_PLAN.md

.github/
└── workflows/
    ├── quality.yml
    └── wellness-doctor.yml

scripts/
└── wellness_doctor.py

tests/
└── test_wellness_doctor.py
```

### Project memory and operating documents

| Document | Purpose |
|---|---|
| [AI/WF.md](AI/WF.md) | Master workflow, phases, acceptance criteria, and live checklists |
| [AI/PROJECT.md](AI/PROJECT.md) | Product vision, scope, principles, and success criteria |
| [AI/INTEROPERABILITY.md](AI/INTEROPERABILITY.md) | Primary AI-to-AI interoperability strategy and protocol boundaries |
| [AI/API_SPEC.md](AI/API_SPEC.md) | Canonical task contract, MCP tools, A2A mapping, and errors |
| [AI/DATA_MODEL.md](AI/DATA_MODEL.md) | Logical entities for agents, connections, grants, tasks, messages, and audit |
| [AI/BUILD_PLAN.md](AI/BUILD_PLAN.md) | Phased implementation and first end-to-end acceptance target |
| [AI/COST_MODEL.md](AI/COST_MODEL.md) | Per-task budgets, usage accounting, and abuse limits |
| [AI/TEST_STRATEGY.md](AI/TEST_STRATEGY.md) | Unit, contract, integration, end-to-end, and security tests |
| [AI/QUALITY_BENCHMARKS.md](AI/QUALITY_BENCHMARKS.md) | Interoperability reliability, quality, latency, and cost metrics |
| [AI/DEPLOYMENT.md](AI/DEPLOYMENT.md) | Environment separation, deployment, monitoring, and rollback |
| [AI/ENVIRONMENT.md](AI/ENVIRONMENT.md) | Runtime configuration and secret lifecycle |
| [AI/CHANGELOG.md](AI/CHANGELOG.md) | Significant project and architecture changes |
| [AI/ARCHITECTURE.md](AI/ARCHITECTURE.md) | Proposed system boundaries, data flow, and technology choices |
| [AI/DECISIONS.md](AI/DECISIONS.md) | Accepted decisions, proposals, and open questions |
| [AI/SECURITY.md](AI/SECURITY.md) | Threat model and required security controls |
| [AI/RESEARCH.md](AI/RESEARCH.md) | Evidence methodology and provider benchmark plan |
| [AI/INTEGRATIONS.md](AI/INTEGRATIONS.md) | Product integrations and connected development-tool strategy |
| [AI/STATE.md](AI/STATE.md) | Verified project state and session handoff record |
| [AI/CONTRIBUTING.md](AI/CONTRIBUTING.md) | Human and AI contributor operating rules |
| [AI/GITHUB_RULES.md](AI/GITHUB_RULES.md) | Branch, commit, permissions, and repository policy |
| [AI/ACTIONS.md](AI/ACTIONS.md) | GitHub Actions triggers, permissions, and execution rules |
| [AI/WELLNESS_DOCTOR.md](AI/WELLNESS_DOCTOR.md) | Automated repository and workflow health inspector |
| [AI/STATUS_ICONS.md](AI/STATUS_ICONS.md) | Authoritative four-level health icon mapping |
| [AI/INCIDENTS.md](AI/INCIDENTS.md) | Failure response, recovery, and incident reporting |
| [AI/AUTOMATION_LOG.md](AI/AUTOMATION_LOG.md) | Significant automation changes and health transitions |
| [AI/WELLNESS_IMPLEMENTATION_PLAN.md](AI/WELLNESS_IMPLEMENTATION_PLAN.md) | Detailed implementation plan and verification checklist |

## Development workflow

The project workflow is maintained in [AI/WF.md](AI/WF.md). It is the primary execution checklist.

For every substantial task:

1. Read the README and relevant AI documents.
2. Inspect the actual repository, runtime, and dependencies.
3. Define scope and acceptance criteria.
4. Make focused changes.
5. Run relevant tests, builds, and security checks.
6. Inspect the resulting diff and actual downstream behavior.
7. Try to disprove the result with negative and edge-case tests.
8. Update the workflow and state ledger only with verified outcomes.

A checkbox is not completed because code was written or a tool returned success. It is completed when the intended result has been checked.

## Current status

- [x] Repository identity and `main` branch confirmed.
- [x] Initial project documentation structure created.
- [x] All documentation files fetched back from GitHub and verified to exist with substantial content.
- [x] README links point to the created AI documents.
- [ ] AI interoperability MVP requirements finalized.
- [ ] Hosting, domain, and account state re-inspected.
- [ ] Architecture decisions finalized.
- [ ] Agent protocol and provider compatibility benchmark completed.
- [ ] Application implementation started.
- [ ] Web application deployed and tested.
- [ ] MCP endpoint deployed and tested.
- [ ] External AI clients individually connected and tested.

See [AI/STATE.md](AI/STATE.md) for the verified state and [AI/WF.md](AI/WF.md) for the full roadmap.

## Security and responsible use

Security is a design requirement, not a later polish task. In particular, server-side URL fetching must defend against SSRF, redirects must be revalidated, retrieved content must be treated as untrusted data, credentials must remain server-side, and research/provider usage must be bounded.

Read [AI/SECURITY.md](AI/SECURITY.md) before implementing fetch, authentication, persistence, or external integrations.

## Contributing

Before making substantial changes, read [AI/CONTRIBUTING.md](AI/CONTRIBUTING.md) and the master workflow. Do not commit secrets or claim support for an integration that has not been tested.

## License

No license has been selected yet. Until a license is added, do not assume this repository grants permission to reuse, redistribute, or modify its contents beyond rights provided by applicable law.
