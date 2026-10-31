# MeepSheep

**Evidence-first research. Clear sources. Better answers.**

MeepSheep is being designed as a source-grounded research and evidence platform with two complementary interfaces: a standalone web application and a remote Model Context Protocol (MCP) service for compatible AI assistants.

The goal is not to produce confident-sounding answers. The goal is to help people investigate questions, inspect original sources, compare supporting and contradictory evidence, understand uncertainty, and create research reports that can be checked.

> **Project status:** Foundation and planning stage. The repository is being initialized. The architecture and feature set described below are product direction and proposals unless explicitly labeled implemented and verified.

## Product vision

MeepSheep should work directly in a browser on desktop and mobile, while also making its research capabilities available to compatible AI assistants through a shared backend.

- **Standalone web app:** Research, inspect evidence, compare sources, and revisit reports.
- **MCP service:** Allow compatible AI clients to invoke the same research capabilities.
- **Shared research engine:** One consistent source of truth for retrieval, evidence handling, citations, and report generation.

The intended domain is [meepsheep.com](https://meepsheep.com). Domain routing and production availability have not yet been verified.

## What MeepSheep is intended to do

- Research questions using selected web search and retrieval providers.
- Verify specific claims against retrieved evidence.
- Fetch and extract permitted public sources.
- Preserve source URLs, publishers, titles, dates, and retrieval metadata.
- Identify duplicate and syndicated reporting.
- Separate evidence that supports, contradicts, or contextualizes a claim.
- Highlight missing information, uncertainty, and research limitations.
- Produce transparent, citation-rich reports.
- Make core capabilities available through a standalone interface and MCP tools.

MeepSheep is not an oracle, a universal truth detector, or a replacement for careful judgment. Search results alone do not establish truth, and missing search results do not prove a claim false.

## Design principles

1. **Evidence before confidence.** Findings must be traceable to sources.
2. **Transparency.** Show where information came from and when it was retrieved.
3. **Independent corroboration.** Repeated copies of one source do not count as independent confirmation.
4. **Contradictions matter.** Do not hide evidence that challenges a conclusion.
5. **Provider independence.** Search vendors are replaceable adapters, not the product.
6. **Secure by default.** Retrieved content and user-supplied URLs are untrusted.
7. **Privacy by design.** Collect and retain only what the product needs.
8. **Cross-client consistency.** Web and MCP interfaces share the same research logic.
9. **Honest status.** Proposed, implemented, tested, and verified are different states.

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
| AI integration | Remote MCP | Proposed |
| Source retrieval | Provider-independent adapters | Proposed |
| Repository | GitHub | Confirmed |

No local GPU is required for the proposed cloud-hosted architecture. The browser is the user interface; research processing and provider requests run on hosted infrastructure. Free tiers can help start the project, but they do not mean unlimited usage or zero marginal cost.

See [AI/ARCHITECTURE.md](AI/ARCHITECTURE.md) and [AI/DECISIONS.md](AI/DECISIONS.md) for the current reasoning and unresolved choices.

## Initial MCP tool candidates

The initial MCP surface is intentionally narrow:

- `research`: investigate a question and return a structured, cited report.
- `verify_claim`: assess a specific claim against retrieved sources.
- `fetch_source`: safely retrieve and extract a permitted public source.

These are planned tool contracts, not currently deployed tools. Tool schemas, authentication, quotas, and transport will be finalized after compatibility and security research.

## Repository layout

```text
MeepSheep/
├── README.md
└── AI/
    ├── WF.md
    ├── PROJECT.md
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

**Checks:** 82 passed · 🟡 0 warnings · 🔵 0 errors · 🔴 0 critical

[Latest inspection and diagnostic logs](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/workflows/wellness-doctor.yml)

<sub>Scheduled inspections run every 15 minutes on a best-effort basis. The latest workflow run contains the exact inspection time. This summary covers configured repository checks, not unconfigured production services.</sub>

<!-- MEEPSHEEP_HEALTH_END -->

The generated health section is maintained by GitHub Actions. The status mapping is defined in [AI/STATUS_ICONS.md](AI/STATUS_ICONS.md). Scheduled inspections run every 15 minutes on a best-effort basis; the latest workflow execution contains the exact inspection timestamp and diagnostic logs.

## Current status

- [x] Repository identity and `main` branch confirmed.
- [x] Initial project documentation structure created.
- [x] All documentation files fetched back from GitHub and verified to exist with substantial content.
- [x] README links point to the created AI documents.
- [ ] MVP requirements finalized.
- [ ] Hosting, domain, and account state re-inspected.
- [ ] Architecture decisions finalized.
- [ ] Research provider benchmark completed.
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
