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

- [~] Confirm repository identity, default branch, and initial state.
- [ ] Create and verify detailed root README.
- [ ] Create and verify this master workflow.
- [ ] Create and verify project brief.
- [ ] Create and verify architecture document.
- [ ] Create and verify decision log.
- [ ] Create and verify security baseline.
- [ ] Create and verify research methodology.
- [ ] Create and verify integrations/tool strategy.
- [ ] Create and verify project state ledger.
- [ ] Review all documents for contradictions, stale assumptions, and invented implementation claims.
- [ ] Confirm every AI document is linked from README.
- [ ] Fetch all committed files from GitHub and compare with intended content.
- [ ] Record resulting commit SHA and verification date in STATE.md.

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

Finish Phase 0 documentation, fetch every created file from GitHub, inspect the content, repair any discrepancy, then mark Phase 0 documentation tasks complete and record the commit evidence in STATE.md.
