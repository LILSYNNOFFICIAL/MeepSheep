# MeepSheep Master Workflow (WF)

**Purpose:** The persistent, detailed operating workflow for planning, building, testing, securing, deploying, and maintaining MeepSheep.

**Source of truth:** This file plus the related documents in `AI/`.  
**Rule:** Read this workflow and the relevant AI documents before substantial work. Update this workflow and `AI/STATE.md` after verified progress.  
**Branch policy:** `main` is the confirmed default branch. Use feature branches for substantial code changes unless the owner explicitly directs otherwise.  
**Completion standard:** A checkbox is checked only after the stated outcome is actually verified. A successful tool response alone is not enough when downstream behavior can be tested.

## How to use this workflow

- `[x]` means completed and verified.
- `[ ]` means not completed.
- `[~]` means in progress or partially complete.
- `[!]` means blocked by a known issue or missing decision.

When work is performed:
1. Read the current repository and relevant documents.
2. Identify the exact scope and acceptance criteria.
3. Inspect dependencies and live account state before changing anything.
4. Make the smallest coherent change.
5. Run appropriate automated checks.
6. Independently inspect the resulting files, state, and behavior.
7. Try to disprove the result by checking likely failure modes.
8. Update this file and the state ledger with evidence.
9. Never check off a parent task while required child tasks remain incomplete.

## Phase 0: Project foundation and documentation

- [x] Confirm repository identity, default branch, and initial state.
- [x] Create and verify detailed root README.
- [x] Create and verify this master workflow.
- [x] Create and verify project brief.
- [x] Create and verify architecture document.
- [x] Create and verify decision log.
- [x] Create and verify security baseline.
- [x] Create and verify research methodology.
- [x] Create and verify integrations/tool strategy.
- [x] Create and verify project state ledger.
- [x] Review all documents for contradictions, stale assumptions, and invented implementation claims.
- [x] Confirm every AI document is linked from README.
- [x] Fetch all committed files from GitHub and confirm they exist with substantial content.
- [x] Confirm fetched GitHub copies have the expected structure and substantial content; byte-for-byte comparison was unavailable because local source drafts were not retained.
- [x] Record the verified automation checkpoint SHA and date in STATE.md.

**Exit criteria:** The documentation is committed on `main`, all links resolve, and a fresh reader can understand product scope, proposed architecture, security posture, decisions, and next actions without relying on chat history.

## Phase 1: Requirements and product definition

- [ ] Confirm the primary first-release user journey.
- [ ] Define supported research input types.
- [ ] Define report output and evidence schema.
- [ ] Define whether user accounts are required for first public test.
- [ ] Define saved research and retention behavior.
- [ ] Define initial usage limits and cost guardrails.
- [ ] Define first-release accessibility and mobile acceptance criteria.
- [ ] Define explicit exclusions for the first release.
- [ ] Review product scope for unnecessary features.
- [ ] Update PROJECT.md and DECISIONS.md with accepted decisions.

**Exit criteria:** A testable MVP scope exists, with acceptance criteria and no unresolved decisions that would invalidate the architecture.

## Phase 2: Current-state and vendor research

- [ ] Inspect the active GitHub repository, branches, settings, and workflows.
- [ ] Inspect the active Cloudflare account and identify the actual MeepSheep domain zone.
- [ ] Verify domain ownership and DNS control without changing records.
- [ ] Inspect existing Workers, Pages/Static Assets, D1, KV, R2, Queues, and relevant account limits.
- [ ] Inspect Supabase projects only if a Supabase architecture remains under consideration.
- [ ] Compare Cloudflare-native and Supabase-backed data/auth approaches.
- [ ] Verify current Cloudflare runtime/framework compatibility from official documentation.
- [ ] Benchmark frontend stack candidates against PWA, accessibility, build, and deployment needs.
- [ ] Identify candidate search providers and read current official API documentation.
- [ ] Verify current provider pricing, free quotas, rate limits, data use, attribution, and commercial terms.
- [ ] Verify extraction and source-access restrictions.
- [ ] Verify current MCP transport and authentication requirements.
- [ ] Verify current ChatGPT, Grok, Claude, and other target-client integration requirements separately.
- [ ] Record sources, dates, findings, and unresolved questions in RESEARCH.md / DECISIONS.md.

**Exit criteria:** Critical technology and provider choices are supported by current evidence, not assumptions or stale pricing.

## Phase 3: Architecture and interface contracts

- [ ] Select frontend framework and build/deploy path.
- [ ] Select primary backend runtime.
- [ ] Select primary authentication and relational data owner.
- [ ] Define provider adapter interface.
- [ ] Define normalized source/result schema.
- [ ] Define claim/evidence/report schema and versioning.
- [ ] Define research orchestration limits and cancellation behavior.
- [ ] Define API contract shared by web and MCP.
- [ ] Define MCP tool names, descriptions, input schemas, and output schemas.
- [ ] Define caching, retention, and deletion behavior.
- [ ] Define observability and privacy-safe logging.
- [ ] Draw and review data-flow and trust-boundary diagrams.
- [ ] Update ARCHITECTURE.md and DECISIONS.md.

**Exit criteria:** Interfaces, data ownership, trust boundaries, and failure behavior are explicit enough to implement and test independently.

## Phase 4: Repository and engineering foundation

- [ ] Establish project structure and package manager.
- [ ] Add pinned runtime/tool versions where practical.
- [ ] Add formatting and lint rules.
- [ ] Add type checking.
- [ ] Add unit and integration test frameworks.
- [ ] Add environment variable schema and safe example file.
- [ ] Ensure secrets are excluded from Git.
- [ ] Add local development instructions.
- [ ] Add CI for install, lint, typecheck, tests, and build.
- [ ] Add dependency/security scanning appropriate to the stack.
- [ ] Add contribution and pull-request guidance.
- [ ] Verify a clean checkout can install and run the project.

**Exit criteria:** A new contributor can reproduce the development environment and CI rejects basic regressions.

## Phase 5: Core research engine

- [ ] Define canonical internal research request schema.
- [ ] Define normalized provider result schema.
- [ ] Implement provider adapter contract.
- [ ] Implement first provider adapter only after benchmark selection.
- [ ] Add bounded query planning and provider fan-out.
- [ ] Add timeout, retry, backoff, and rate-limit handling.
- [ ] Add canonical URL normalization.
- [ ] Add exact and near-duplicate detection.
- [ ] Preserve publisher, title, author, dates, URL, and retrieval metadata.
- [ ] Implement permitted source fetching with SSRF protections.
- [ ] Implement bounded content extraction.
- [ ] Preserve excerpts and source locators.
- [ ] Implement claim decomposition.
- [ ] Implement support/contradiction/context/insufficient evidence categories.
- [ ] Add source-independence and syndication signals.
- [ ] Implement report assembly and schema validation.
- [ ] Add partial-result and provider-failure states.
- [ ] Add fixtures for stale, contradictory, duplicate, missing-date, and malicious sources.
- [ ] Benchmark result quality and cost against a fixed query set.

**Exit criteria:** Research runs are bounded, reproducible, traceable, and useful even when sources disagree or providers fail.

## Phase 6: Standalone web application

- [ ] Establish responsive application shell.
- [ ] Implement accessible research input.
- [ ] Implement research settings and scope controls.
- [ ] Implement progress and partial-result states.
- [ ] Implement findings summary.
- [ ] Implement evidence and contradiction views.
- [ ] Implement source cards with original-source links.
- [ ] Implement methodology, limitations, and timestamps.
- [ ] Implement report export if included in MVP.
- [ ] Implement saved research only after persistence and privacy decisions.
- [ ] Implement empty, loading, error, rate-limit, and offline states.
- [ ] Test keyboard navigation and screen-reader semantics.
- [ ] Test narrow mobile viewport and touch interactions.
- [ ] Test desktop layouts and supported browsers.
- [ ] Verify no privileged key or internal endpoint leaks to the client.

**Exit criteria:** A user can complete the defined research journey through the website on desktop and mobile browsers.

## Phase 7: MCP service

- [ ] Implement remote MCP transport supported by target clients.
- [ ] Add authentication and authorization appropriate to the deployment.
- [ ] Implement `research` tool.
- [ ] Implement `verify_claim` tool.
- [ ] Implement `fetch_source` tool with strict URL controls.
- [ ] Validate all tool inputs and enforce output limits.
- [ ] Return structured, citation-rich outputs.
- [ ] Keep tool descriptions concise and behavior-specific.
- [ ] Ensure retrieved content is treated as untrusted data.
- [ ] Add protocol-level and application-level tests.
- [ ] Test with an independent MCP client.
- [ ] Test cancellation, timeout, provider outage, and malformed input.
- [ ] Document endpoint and client setup without claiming directory approval.

**Exit criteria:** An independent compatible client can authenticate, invoke tools, receive useful structured results, and cannot bypass security or usage limits.

## Phase 8: Identity, persistence, and user data

- [ ] Implement selected identity provider.
- [ ] Verify OAuth/session handling and logout.
- [ ] Implement per-user authorization.
- [ ] Implement database migrations and rollback strategy.
- [ ] Implement saved report ownership.
- [ ] Implement retention policy.
- [ ] Implement export and deletion behavior.
- [ ] Test cross-user isolation.
- [ ] Test backup/restore strategy where applicable.
- [ ] Document data flows and third-party processing.
- [ ] Publish privacy and terms documents before public launch.

**Exit criteria:** User data is protected, lifecycle behavior is tested, and privacy disclosures match actual processing.

## Phase 9: Security and abuse resistance

- [ ] Complete threat model review.
- [ ] Test SSRF including redirects and IPv6.
- [ ] Test prompt-injection resistance.
- [ ] Test XSS and untrusted HTML handling.
- [ ] Test authentication and authorization boundaries.
- [ ] Test rate limits and provider spend limits.
- [ ] Test maximum input, response, file, and execution sizes.
- [ ] Review CORS, CSRF, CSP, and security headers.
- [ ] Scan dependencies and review high-severity findings.
- [ ] Check repository history and build artifacts for secrets.
- [ ] Review logs for sensitive-data leakage.
- [ ] Verify abuse reporting and operational response procedures.
- [ ] Update SECURITY.md with actual controls and test evidence.

**Exit criteria:** No unresolved critical/high security issue remains without an explicit owner-approved mitigation and documented risk acceptance.

## Phase 10: Quality, performance, and cost validation

- [ ] Create a representative research benchmark set.
- [ ] Measure relevance, freshness, diversity, independence, and extraction success.
- [ ] Measure latency and provider failure rates.
- [ ] Measure cost per completed and useful research run.
- [ ] Test concurrent requests and provider throttling.
- [ ] Test cache correctness and freshness behavior.
- [ ] Test graceful degradation.
- [ ] Run end-to-end tests on web and MCP surfaces.
- [ ] Run mobile and desktop acceptance checks.
- [ ] Verify accessibility baseline.
- [ ] Validate usage limits against measured costs.
- [ ] Record benchmark results and known limitations.

**Exit criteria:** Performance and cost behavior are measured, bounded, and acceptable for the intended release.

## Phase 11: Deployment and domain

- [ ] Confirm the active Cloudflare account and domain zone.
- [ ] Confirm domain DNS ownership and current records.
- [ ] Configure development/staging environment.
- [ ] Configure production environment.
- [ ] Configure secrets through platform secret storage.
- [ ] Deploy web assets and backend.
- [ ] Configure custom domain and TLS.
- [ ] Configure MCP hostname/path if selected.
- [ ] Verify health endpoints and real user journeys.
- [ ] Verify logs, metrics, alerts, and rollback procedure.
- [ ] Verify database migrations and backups.
- [ ] Verify deployment from a clean commit.
- [ ] Record deployment identifiers and tested URLs in STATE.md.

**Exit criteria:** The actual deployed product works over its intended public URLs. A successful deployment command alone does not satisfy this phase.

## Phase 12: External AI client integrations

For each client independently:
- [ ] Read current official integration documentation.
- [ ] Verify protocol and authentication compatibility.
- [ ] Configure endpoint and OAuth metadata as required.
- [ ] Test connection on supported web clients.
- [ ] Test desktop support.
- [ ] Test mobile support separately.
- [ ] Verify account/plan eligibility and restrictions.
- [ ] Verify public listing or review requirements if pursuing a directory.
- [ ] Test real research and error scenarios.
- [ ] Document exact setup instructions and limitations.

**Exit criteria:** Only clients actually tested are listed as supported. Protocol compatibility is not misrepresented as app-store or directory approval.

## Phase 13: Release readiness

- [ ] All MVP acceptance criteria pass.
- [ ] Critical automated tests pass on the release commit.
- [ ] Security acceptance gates pass or have documented risk acceptance.
- [ ] Privacy and terms reflect actual behavior.
- [ ] README and setup instructions match the code.
- [ ] Known limitations are documented.
- [ ] Provider quotas and cost controls are enabled.
- [ ] Monitoring and incident response are ready.
- [ ] Rollback path is tested.
- [ ] Production smoke tests pass.
- [ ] Release notes identify exact version and commit.
- [ ] Owner explicitly approves public launch.

**Exit criteria:** A release candidate has verified behavior, known limitations, operational safeguards, and explicit approval.

## Phase 14: Ongoing maintenance

- [ ] Recheck provider terms, quotas, and pricing periodically.
- [ ] Recheck MCP client compatibility as platforms change.
- [ ] Update dependencies and review breaking changes.
- [ ] Monitor provider quality and outages.
- [ ] Monitor spend, abuse, latency, and error rates.
- [ ] Review security findings and incidents.
- [ ] Retest backups and deletion behavior.
- [ ] Update decision log when architecture changes.
- [ ] Update workflow and state ledger after each meaningful milestone.
- [ ] Remove obsolete documentation and code only after checking dependencies.

## Mandatory per-task workflow

For every non-trivial task:

1. **Read:** README, WF.md, STATE.md, and relevant architecture/security/decision docs.
2. **Inspect:** actual files, Git state, runtime, account configuration, and dependencies relevant to the task.
3. **Scope:** write acceptance criteria and identify risks.
4. **Plan:** choose the smallest safe implementation path.
5. **Implement:** make focused changes; do not mix unrelated refactors.
6. **Test:** run relevant unit, integration, build, security, and end-to-end checks.
7. **Verify independently:** inspect resulting files and actual downstream behavior.
8. **Disprove:** deliberately test likely failure cases and unintended side effects.
9. **Document:** update decisions, state, and checkboxes with evidence.
10. **Report:** separate completed, partially completed, blocked, and unverified work.

## Session handoff record

Append a dated entry to STATE.md for every substantial session. Include exact commit SHA, files changed, commands/checks, actual results, known risks, and next step. Never store secrets in handoff notes.

## Current next action

Begin Phase 1 by finalizing the first-release user journey and MVP acceptance criteria. Before implementation, complete the current-state research in Phase 2.


## Phase 0B: GitHub automation and Wellness Doctor

- [x] Approve the four-level health icon model and automation design.
- [x] Create the GitHub rules, Actions, Wellness Doctor, status icon, incident, and automation-log specifications.
- [x] Add the README health marker region and links to the automation documents.
- [x] Implement the deterministic Python Wellness Doctor.
- [x] Add unit tests for status precedence, file inventory, Markdown links/fences, malformed markers, and safe idempotent README updates.
- [x] Add read-only pull-request/push quality workflow.
- [x] Add trusted-branch scheduled/manual wellness workflow definitions.
- [x] Validate workflow YAML and run unit tests.
- [x] Inspect actual GitHub Actions runs and job logs.
- [x] Verify README status transitions from warning to healthy after repairing missing links, and remains unchanged when health output is unchanged.
- [x] Verify a no-change Wellness Doctor run creates no commit (push-triggered no-op verified; scheduled no-op event not yet observed).
- [x] Record workflow run URLs, commit SHAs, and final limitations in STATE.md and AUTOMATION_LOG.md.

**Exit criteria:** The doctor runs in GitHub Actions, detects configured repository/documentation/workflow defects, publishes the correct icon without overwriting README content outside its markers, and has passing tests plus observed successful push-triggered workflow runs. Scheduled and manual event execution remain to be observed.

## Permanent GitHub operating rules

- Treat `AI/GITHUB_RULES.md`, `AI/ACTIONS.md`, and `AI/STATUS_ICONS.md` as normative.
- Read-only pull-request checks and write-enabled trusted-branch automation must remain separate.
- Never execute untrusted pull-request content with a token that can write repository contents.
- Do not enable branch protection or rulesets by assumption. Record them only after inspecting actual GitHub settings.
- The Wellness Doctor must fail closed if it cannot produce a trustworthy report.
- Update `AI/STATE.md` and `AI/AUTOMATION_LOG.md` after meaningful verified automation changes.


## Owner-approved scope correction: AI interoperability first (2026-10-31)

The owner clarified that MeepSheep is primarily intended to let AI systems communicate with other AI systems. This product direction supersedes the research-first emphasis in the earlier phases below. Research functionality is deferred as an optional agent capability.

### Updated execution order

1. **Product and protocol contracts:** AI/PROJECT.md, AI/INTEROPERABILITY.md, AI/API_SPEC.md, AI/DATA_MODEL.md, AI/DECISIONS.md.
2. **Current compatibility and infrastructure research:** verify MCP and A2A releases, target client interfaces, account-plan restrictions, Cloudflare runtime and account state, and provider APIs.
3. **Security and environment foundation:** AI/SECURITY.md, AI/ENVIRONMENT.md, AI/TEST_STRATEGY.md, and AI/DEPLOYMENT.md.
4. **Minimal interoperability core:** agent registry, per-connection credentials, capability discovery, task router, durable async state, one MCP interface, one outbound agent adapter, and a deterministic mock agent.
5. **Real integration proof:** one supported caller delegates to a separately configured agent and receives a structured, attributable result.
6. **Reliability and observability:** cancellation, idempotency, retries, deadlines, quotas, cost accounting, audit history, health monitoring, and incident drills.
7. **Multi-agent orchestration:** bounded sequential and parallel delegation, aggregation, human approval, and context controls.
8. **Web console and onboarding:** connections, agents, permissions, task timelines, audit history, and client-specific setup instructions.
9. **Release readiness:** staging, end-to-end compatibility tests, security review, rollback, production deployment, and honest support matrix.

### Required new build documents

- [ ] AI/BUILD_PLAN.md reviewed and accepted as execution sequence.
- [ ] AI/API_SPEC.md reviewed and converted into validated schemas.
- [ ] AI/DATA_MODEL.md reviewed and mapped to one selected primary datastore.
- [ ] AI/TEST_STRATEGY.md implemented in the test suite.
- [ ] AI/QUALITY_BENCHMARKS.md populated with baseline measurements.
- [ ] AI/DEPLOYMENT.md converted into verified environment-specific procedures.
- [ ] AI/ENVIRONMENT.md converted into a validated configuration schema and safe example.
- [ ] AI/INTEROPERABILITY.md kept current with verified client support.

### Async-first completion criteria

- [ ] Durable task IDs and validated state transitions.
- [ ] Server-enforced deadlines and bounded retries.
- [ ] Idempotent dispatch and duplicate-event handling.
- [ ] Cancellation behavior documented per adapter.
- [ ] Durable progress and result retrieval.
- [ ] Per-task and per-tenant budgets and concurrency limits.
- [ ] Trace and provenance across protocol boundaries.

Do not mark the old research-engine, research-report UI, or research-provider benchmark phases as MVP blockers unless the owner explicitly restores that scope. The previous detailed research requirements remain useful as a future capability backlog.
