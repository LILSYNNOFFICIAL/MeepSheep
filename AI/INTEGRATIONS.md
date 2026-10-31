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
