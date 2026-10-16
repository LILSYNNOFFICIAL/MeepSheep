# Security audit and remaining build log

**Audit date:** 2026-10-16  
**Scope:** repository source on `rework/ai-computer-control-dashboard`, especially the Next.js dashboard, .NET policy/authorization primitives, replay guard, documentation, and GitHub Actions workflow.  
**Audit type:** source-level engineering review. This is not a penetration test, formal threat-model review, dependency inventory, or independent security certification.

## Executive result

MeepSheep is still a prototype and does not currently execute remote computer-control tasks. That is an important protective boundary. The highest risk would be adding real execution before authenticated identity, trusted approvals, replay prevention, revocation, target validation, and execution-time policy enforcement exist.

This audit made defense-in-depth changes to the current branch, listed below. Do not interpret successful CI as proof that the eventual end-to-end system is secure.

## Changes made during this audit

- [x] **Policy approval bypass hardening:** approval-required capabilities are now enforced by a built-in baseline, not only by a configurable policy set. A policy that allowlists screen capture, mouse/keyboard control, clipboard, file read/write, or file deletion cannot make those capabilities pass the current evaluator.
- [x] **High-impact capabilities fail closed:** `RunCommand`, `InstallSoftware`, and `ChangeFirewall` are denied as `capability_not_implemented`, even if mistakenly allowlisted.
- [x] **Removed caller-asserted privilege flag:** `PolicyRequest.RequiresAdminPrivileges` was removed. A request payload must not be trusted to declare whether its own operation requires elevation. Future handlers must derive this from trusted operation metadata.
- [x] **Regression tests added/updated:** tests cover omitted approval configuration and allowlisted high-impact operations.
- [x] **HTTP response security headers added:** CSP, frame restrictions, MIME sniffing protection, referrer policy, permissions policy, same-origin isolation headers, and HSTS are configured in Next.js. Verify these at the actual hosting edge before launch because proxies/platforms may override headers.
- [x] **Third-party font request removed:** the Google Fonts CSS import was removed to avoid a third-party request on every page view. The browser now uses local/system fallbacks.
- [x] **Dependency audit added to CI:** `npm audit --audit-level=high` now runs after dependency installation and will fail the build on high/critical advisories.
- [x] **CI token permissions reduced:** workflow token permissions are explicitly limited to `contents: read`.
- [x] **Documentation updated:** README and security boundaries link to this log and describe the new policy gates.

## Findings and current status

| ID | Severity before fix | Finding | Status |
|---|---|---|---|
| AUD-01 | High | Approval requirements could be weakened by constructing a policy that allowlisted a sensitive capability but omitted it from the approval-required set. | **Mitigated in policy evaluator.** Still requires execution-path tests once handlers exist. |
| AUD-02 | High | `PolicyRequest.RequiresAdminPrivileges` was caller-controlled, so it was not trustworthy evidence about an operation's privilege requirements. | **Removed from request DTO.** Real operation handlers and OS-level tests remain unbuilt. |
| AUD-03 | High | High-impact capabilities such as shell execution, software installation, and firewall changes had no implementation, but their enum values could be allowlisted by a future caller. | **Hard-denied in policy evaluator.** They must remain disabled until dedicated designs and tests pass. |
| AUD-04 | Medium | The dashboard lacked explicit application-level security response headers. | **Headers configured in Next.js.** Actual production/edge response headers are not yet verified because deployment is not configured. |
| AUD-05 | Low | The dashboard fetched fonts from Google Fonts, disclosing a browser request to a third party and weakening a self-contained asset policy. | **Removed external font import.** Visual typography may use system fallbacks. |
| AUD-06 | Medium | CI did not run an npm vulnerability audit. | **Audit step added.** Latest workflow result must be checked; there is no committed npm lockfile in the reviewed branch, so dependency resolution is not yet reproducible. |
| AUD-07 | Critical blocker before remote execution | Authorization tickets are consistency-validated but have no issuer authentication or signature verification. An approval reference does not prove approval. | **Open by design.** No remote execution path may trust these DTOs yet. |
| AUD-08 | Critical blocker before remote execution | Replay protection is in-memory, process-local, and not wired into execution. It resets after restart and does not coordinate multiple instances. | **Open by design.** Keep execution disabled until durable/session-bound atomic replay prevention exists. |
| AUD-09 | Critical blocker before remote execution | No account authentication, device pairing, authenticated transport, control API, credential lifecycle, or server-side revocation exists. | **Not implemented.** |
| AUD-10 | Critical blocker before remote execution | No Windows operation handlers exist to enforce policy immediately before dispatch, safely normalize targets, constrain file roots, or handle Windows reparse points. | **Not implemented.** |
| AUD-11 | High | No end-to-end approval issuer/verifier, stop/cancellation enforcement, or operation-bound audit trail exists. | **Not implemented.** |
| AUD-12 | Medium | Dependency versions use semver ranges and there is no committed `package-lock.json`. CI currently resolves dependencies afresh. | **Open.** Generate, review, commit, and enforce a lockfile with `npm ci`. |
| AUD-13 | Medium | Workflow actions use version tags rather than immutable commit SHAs, and there is no evidenced CodeQL/SAST, secret scan, SBOM, or artifact provenance gate. | **Open.** Harden supply-chain controls before release. |
| AUD-14 | High | The configured CSP allows inline scripts/styles to support the current Next.js app; it is not a nonce-based strict CSP. | **Partial mitigation.** Evaluate a nonce-based policy and validate production behavior once hosting/runtime are fixed. |
| AUD-15 | High | No independent protocol review, Windows integration testing, signed installer/update chain, recovery/rollback process, or incident response process exists. | **Open release blockers.** |

## Remaining work log, ordered by release priority

### P0: Must be completed before any real computer-control capability is enabled

- [ ] **Threat model and security review:** enumerate attackers, assets, trust boundaries, abuse cases, privilege boundaries, and failure modes. Have the protocol reviewed independently before implementation.
- [ ] **Identity and authentication:** implement account/session authentication, client identity, device identity, secure credential storage, rotation, expiry, and revocation. Do not trust a browser UI state or AI-client identity claim.
- [ ] **Pairing protocol:** implement short-lived, high-entropy, single-use pairing material; rate limits and lockouts; confirmation on both dashboard and local device; anti-cross-account/device binding; secure recovery and re-pairing.
- [ ] **Authenticated transport:** use a reviewed protocol and maintained cryptographic libraries. Authenticate both sides, bind each message to the established session/device, and do not expose public inbound RDP, PowerShell, or arbitrary control ports.
- [ ] **Ticket integrity and canonicalization:** define a canonical request representation and reviewed signature/MAC mechanism. Verify issuer authenticity and integrity before trusting ticket fields. A digest of a target string is not authorization or path safety.
- [ ] **Grant version and revocation:** bind tasks to the requesting client, paired device, policy/grant version, capability, exact arguments/target, expiry, and request ID. Reject stale grants and fail closed when revocation cannot be confirmed before authorization expiry.
- [ ] **Durable replay protection:** atomically consume nonce/request ID in durable storage or a reviewed session-bound design that remains correct across process restart, concurrent instances, retries, and storage failure. Fail closed on storage errors.
- [ ] **Trusted operation-bound approval:** implement local confirmation that shows the actual operation and normalized target. Bind approval to exact arguments, capability, device, grant version, and a short expiry. Verify it inside the trusted agent immediately before dispatch. Do not accept an approval ID alone as proof.
- [ ] **Real operation execution boundary:** all handlers must require an authenticated principal, validated envelope/ticket, current policy, fresh approval where required, replay consumption, stop/cancellation state, timeout, and target validation immediately before dispatch. No alternate path may bypass this gate.
- [ ] **Least privilege and high-risk capability isolation:** run as the signed-in user, not an always-on administrator service. Keep arbitrary shell, software installation, firewall changes, account changes, and other elevation-sensitive operations disabled until individually designed and reviewed.
- [ ] **Filesystem safety before file features:** use allowlisted roots, canonicalize paths, reject traversal, inspect Windows symlinks/junctions/reparse points, and defend against time-of-check/time-of-use races. Enforce checks at the OS boundary.
- [ ] **Emergency stop and cancellation:** local stop must work offline, reject new work immediately, cancel queued tasks, interrupt cancellable operations, and report non-interruptible operations truthfully.
- [ ] **Security regression suite:** test tampered tickets, spoofed identities, replay across restart/instances, expired/revoked grants, stale policy, approval substitution/reuse, path traversal/reparse-point escapes, stop races, concurrent dispatch, and secret redaction.
- [ ] **Windows integration tests:** test the real user-session agent and every actual operation call path on supported Windows versions. Unit tests of pure policy functions are insufficient.

### P1: Required before external beta

- [ ] **Control API and persistence:** device/client registry, policy/grant store, task state store, bounded queue, revocation state, and durable audit metadata with transactional semantics.
- [ ] **MCP adapter:** implement only a small, explicit tool set; authenticate each client; enforce per-client scopes, request schema, rate limits, quotas, and maximum input/output sizes.
- [ ] **Task lifecycle integration:** connect the existing lifecycle helper to durable state transitions, idempotency rules, timeouts, retry semantics, and cancellation. Prevent terminal-state reopening and duplicate side effects.
- [ ] **Privacy and data handling:** define screen/clipboard/file-output retention, user visibility, consent, redaction, export/deletion, encryption, and access controls. Do not persist screen/clipboard contents by default.
- [ ] **Audit events:** record requester/client/device, request and policy decision, approval metadata, timestamps, and outcome. Never log credentials, pairing secrets, raw auth headers, or unrestricted command output.
- [ ] **Dependency reproducibility:** generate and commit `package-lock.json`; change CI to `npm ci`; pin and regularly update dependencies; audit transitive npm and NuGet packages.
- [ ] **CI supply-chain hardening:** pin GitHub Actions to immutable commit SHAs, add CodeQL/SAST and secret scanning, produce an SBOM, and restrict CI permissions to least privilege.
- [ ] **Header verification:** test the deployed app's actual CSP, HSTS, frame, referrer, and permissions headers through the final host/CDN. Consider nonce-based CSP instead of `unsafe-inline`.
- [ ] **Abuse protection and monitoring:** rate-limit login, pairing, task creation, and failed authorization; alert on suspicious activity without collecting sensitive payloads.
- [ ] **Operational controls:** define service health, incident response, credential compromise handling, data retention, backup/recovery, and security contact/reporting process.

### P2: Required before general availability

- [ ] **Signed installer and updates:** sign Windows binaries and installers; verify update signatures; protect update metadata; support rollback/recovery from a bad release.
- [ ] **Release provenance:** reproducible or attestable builds, protected release workflow, artifact checksums/SBOM, and documented release approvals.
- [ ] **Compatibility and resilience:** test reconnects, offline expiry, sleep/resume, network changes, clock skew, partial failures, and graceful shutdown.
- [ ] **Independent end-to-end security assessment:** review the deployed system and retest remediations; publish a clear scope and limitations statement.
- [ ] **Billing and usage controls:** only after actual service costs are measured, implement server-authoritative metering, quotas, abuse limits, billing security, and user-visible usage records.
- [ ] **Deployment and data governance:** choose hosting, configure TLS and edge rules, secrets management, backups, data residency/retention, and disaster recovery. These are intentionally not configured yet.

## Current safe operating boundary

Until P0 work is complete, keep the agent local-only, deny all computer-control operations, and do not publish the prototype as a working remote-control product. The web security headers and policy changes in this audit reduce specific risks but do not create authentication, trusted approval, or an execution security boundary.

## Verification record

- Source review and hardening changes were made on branch `rework/ai-computer-control-dashboard`.
- Changes made: policy evaluator hardening, removal of caller-asserted privilege flag, regression tests, Next.js response headers, removal of third-party font import, npm audit step, least-privilege CI token permissions, and documentation updates.
- **Verification pending:** CI must run against the final audit commit. Do not mark the changes as passing until the exact branch head and all job steps have been checked.
- No merge or deployment is authorized by this audit.
