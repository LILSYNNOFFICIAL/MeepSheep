# MeepSheep Integrations and Tool Strategy

This document tracks candidate external services and development tools. Availability in the owner's ChatGPT workspace does not mean every integration is connected, authorized, or appropriate for every task.

## 1. Product integrations

### Search and retrieval
Candidate categories:
- Web search providers.
- URL fetching and readable-content extraction.
- Specialized academic, technical, public-record, and community sources where lawful and useful.

Provider names, current prices, quotas, capabilities, and terms must be rechecked before selection. Do not commit to a vendor based on stale pricing.

### AI assistant interoperability
Primary protocol candidate: remote MCP.

Potential client families include:
- ChatGPT.
- Grok.
- Claude.
- Other clients that support the selected MCP transport and authentication model.

Support is client-, plan-, platform-, and policy-dependent. Verify current official documentation for each target before promising availability. A working MCP server does not automatically mean an integration is listed in an app directory or available on every mobile client.

### Infrastructure candidates
- Cloudflare Workers, Static Assets, D1, KV, R2, Queues, and related services.
- Supabase for authentication, database, storage, or related capabilities if justified.
- GitHub as the canonical source repository.
- GitLab as an optional mirror or CI environment only if a specific workflow needs it.

Avoid duplicating infrastructure roles without a clear reason.

## 2. Owner's connected development toolbox

The owner has identified a broad set of connected or available tools, including:
- Cloudflare
- Supabase
- GitLab (Beta)
- Codex and Codex-related workflow/engineering tools
- Superpowers and Skillquiver
- Codelit
- CodeRabbit and Qodo
- Vercel
- HTML/CSS to Image API
- Figma and design/code conversion tools
- Browser automation and web research tools
- Website and mobile app builders
- Security review and code analysis tools
- Other plugins and integrations

The exact list and connection state can change. Before a task:
1. Inspect the tools actually available in the current session.
2. Read required tool skills and usage instructions.
3. Check whether the integration is connected and authorized.
4. Prefer a tool when it materially improves the work.
5. Do not invoke tools merely because they exist.
6. Report which tools were actually used, if that matters to the task.

## 3. Tool selection principles

- GitHub is the source of truth for repository state unless explicitly changed.
- Use Cloudflare tools for Cloudflare account and deployment work.
- Use Supabase tools only when Supabase is part of the selected architecture.
- Use Figma for editable design artifacts when required.
- Use browser automation for real user-directed website workflows, not as a substitute for testing APIs.
- Use code review/security tools as independent checks, not as proof by themselves.
- Use automated tests and actual runtime checks for behavior verification.
- Keep provider credentials in secret stores.

## 4. Integration acceptance checklist

- [ ] Official documentation reviewed for each launch integration.
- [ ] Authentication and scopes documented.
- [ ] User consent and revocation behavior understood.
- [ ] Rate limits, pricing, and terms checked.
- [ ] Failure and timeout behavior tested.
- [ ] Sensitive data exposure reviewed.
- [ ] Mobile and desktop support verified separately.
- [ ] Public directory/app submission requirements verified separately from protocol compatibility.

## 5. No false integration claims

Do not claim MeepSheep is connected to, approved by, listed in, or available through an AI platform until the actual integration has been configured and its real behavior verified.


## 6. GitHub automation integrations

GitHub Actions is the first automation host for repository integrity checks.

- `quality.yml`: read-only validation on pull requests and pushes to main.
- `wellness-doctor.yml`: trusted main-branch, scheduled, and manual health inspection with conditional README update.
- `scripts/wellness_doctor.py`: deterministic repository inspector.
- `tests/test_wellness_doctor.py`: unit tests for status mapping, inspection findings, and safe README updates.

The connected GitHub integration can inspect and modify repository files, but available tool permissions do not automatically include repository settings administration or workflow dispatch. Use the actual Actions UI/API or a specifically authorized tool to verify execution and settings. Never infer that a workflow ran because its YAML exists.

GitLab, CodeRabbit, Qodo, Codex, Superpowers, Skillquiver, security reviewers, and other tools remain optional supporting tools. Select them per task, inspect actual availability, and do not duplicate CI responsibilities without a documented reason.


## 7. AI-to-AI interoperability is the primary integration strategy

The product's primary job is to connect independently operated AI clients and agents. Use MCP for clients that can call MeepSheep tools, A2A for compatible agent-to-agent task exchange, and explicit provider adapters for documented APIs and webhooks. See AI/INTEROPERABILITY.md and AI/API_SPEC.md.

### Current official documentation checked 2026-10-31

- **OpenAI API:** The official remote MCP guide documents connecting Responses API applications to remote MCP servers. This is a developer/API integration path, not proof that every ChatGPT consumer UI can be connected as an autonomous agent. Reference: https://developers.openai.com/api/docs/guides/tools-connectors-mcp
- **ChatGPT custom MCP:** The current Help Center describes custom MCP server connections for ChatGPT Business and Enterprise/Edu on web, with plan and workspace permission constraints. It separately describes limited Pro access. Verify current availability and write permissions for the actual account before promising a ChatGPT user-interface integration. Reference: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt
- **xAI / Grok:** Official xAI docs describe remote MCP servers in its API and Grok tooling. This does not establish that every Grok consumer chat surface can be configured as an autonomous endpoint. Reference: https://docs.x.ai/build/features/mcp-servers
- **A2A:** The official project specification describes agent discovery, Agent Cards, task lifecycles, messages, artifacts, and asynchronous interactions. Pin a released version and SDK before implementation. Reference: https://a2a-protocol.org/latest/specification/
- **MCP:** The protocol specification defines tools, resources, prompts, transports, and authorization. Pin a released protocol revision and test compatibility with target clients. Reference: https://modelcontextprotocol.io/specification

These references establish documented protocol/API paths only. No MeepSheep connection has been configured or tested with these services.

### Compatibility matrix to maintain

For each target, record product name, exact surface (consumer UI, developer API, CLI, or agent runtime), account plan, OS/platform, supported protocol, authentication, read/write/delegation scope, streaming/async support, setup steps, test date, and actual end-to-end result.

Never label an entire brand as supported when only one API, CLI, or plan has been tested. Do not promise ChatGPT-to-Grok consumer-chat bridging unless both endpoints expose supported, authorized interfaces and the round trip has been demonstrated.


## 8. Cloudflare platform research checkpoint (2026-10-31)

The connected Cloudflare documentation search was used to inspect the current developer platform.

- Cloudflare Workflows are documented as durable multi-step execution with persisted state, automatic retries, and the ability to wait for external events or approvals for minutes, hours, or weeks. This is a strong candidate for MeepSheep's async task lifecycle.
- Durable Objects provide globally unique coordination and strongly consistent transactional storage, making them a candidate for per-agent coordination or live connections rather than the sole general-purpose workflow engine.
- The Cloudflare Agents SDK documents MCP server and MCP client support. This may reduce custom transport work for the MCP surface.
- No A2A support in the Agents SDK was established by this documentation search. Treat A2A as a separately implemented adapter unless further official evidence changes that conclusion.

References: https://developers.cloudflare.com/workflows/ ; https://developers.cloudflare.com/durable-objects/ ; https://developers.cloudflare.com/agents/model-context-protocol/ ; https://developers.cloudflare.com/agents/tools/mcp/ .

The active connected Cloudflare account was inspected read-only on 2026-10-31. The account list returned one accessible account; its zones, Worker scripts, D1 databases, Durable Object namespaces, and Queues lists were all empty. This does not prove the domain is not owned elsewhere or that another account cannot contain resources. Do not deploy or change DNS until the correct zone/account is confirmed.
