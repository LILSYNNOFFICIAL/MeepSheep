# MeepSheep Security and Privacy Baseline

**Status:** Required design baseline. Implementation and compliance are not yet verified.

## 1. Threat model

MeepSheep processes user questions, URLs, retrieved web pages, provider responses, account data, and potentially uploaded documents. Treat all external content as hostile until validated.

Primary risks:
- Server-side request forgery (SSRF) through user-supplied URLs and redirects.
- Prompt injection and malicious instructions embedded in retrieved content.
- API key or session-token leakage.
- Abuse of search and extraction providers, causing unexpected cost.
- Denial of service through large pages, fan-out, repeated requests, or expensive parsing.
- Cross-user data exposure.
- Unsafe HTML rendering and script injection.
- OAuth redirect, token, and session vulnerabilities.
- Misuse of stored research or personal information.
- Supply-chain and dependency compromise.

## 2. URL fetching controls

Any server-side URL fetcher must:
- Accept only explicitly supported schemes, normally HTTP and HTTPS.
- Reject localhost, loopback, private, link-local, multicast, reserved, and otherwise non-public destination addresses.
- Resolve DNS and validate every resolved address before connecting.
- Revalidate every redirect target; do not trust the initial URL alone.
- Limit redirect count, response bytes, decompressed bytes, content types, and total time.
- Prevent DNS rebinding and address-validation/connect-time gaps to the extent supported by the runtime.
- Block cloud metadata endpoints and internal service addresses.
- Avoid forwarding user cookies, authorization headers, or internal headers.
- Use explicit outbound network policies where available.
- Record a safe reason when a URL is blocked.

A hostname check alone is insufficient. IP validation must account for IPv4 and IPv6.

## 3. Retrieved content and prompt injection

- Treat web pages, PDFs, search snippets, and documents as untrusted data, never as instructions.
- Separate system/developer instructions from source content in every model prompt.
- Do not execute scripts, commands, links, or tool requests found in retrieved content.
- Do not allow a source to alter tool permissions, identity, quotas, or policy.
- Preserve source provenance and extraction boundaries.
- Escape output before rendering in the browser.
- Do not infer that a page is safe because a provider returned it.

## 4. Secrets and credentials

- Keep provider keys, OAuth client secrets, signing keys, and service credentials server-side.
- Use platform secret storage, not committed environment files.
- Never log full tokens, secrets, authorization headers, or sensitive query parameters.
- Rotate credentials after suspected exposure.
- Use separate credentials for development, staging, and production.
- Scope tokens to the minimum required permissions.
- Ensure build output and source maps do not expose secrets.

## 5. Authentication and authorization

Before launch:
- Select and document an authentication architecture.
- Validate OAuth state, redirect URIs, issuer, audience, expiry, and signature where applicable.
- Bind user-owned research and artifacts to a verified principal.
- Enforce authorization server-side on every read and write.
- Prevent insecure direct object references.
- Use secure, HttpOnly, appropriately SameSite cookies when cookie sessions are used.
- Implement logout, revocation, and session expiry.
- Require explicit authorization for MCP access to user-specific data.
- Do not assume a client identity based only on a supplied username or email string.

## 6. Abuse and cost controls

- Per-user and per-client quotas.
- Per-IP or other abuse controls where appropriate and privacy-conscious.
- Per-request provider budgets and maximum fan-out.
- Maximum query count, result count, page count, response size, and execution time.
- Bounded retries with exponential backoff and jitter.
- Circuit breakers or temporary provider disablement when appropriate.
- Idempotency for retryable jobs.
- Cancellation for long-running jobs.
- Usage metering and alert thresholds.
- Clear user-facing errors when a limit is reached.

Free-tier infrastructure is not an abuse-prevention system.

## 7. Data minimization and privacy

Define before collecting data:
- What user data is necessary.
- Which research queries and source URLs are retained.
- Whether raw page text is stored or only metadata/excerpts.
- Retention periods for reports, logs, and cached results.
- How users export and delete their data.
- Whether data is sent to external providers and which providers receive it.
- Whether any content is used for analytics or model improvement.

Avoid storing sensitive query content in routine logs. Publish a clear privacy notice before public launch.

## 8. Browser and API security

- Validate and size-limit all inputs.
- Use a strict Content Security Policy appropriate to the chosen frontend.
- Escape untrusted text and sanitize any intentionally supported rich HTML.
- Configure CORS narrowly; CORS is not authentication.
- Apply CSRF protections where cookie-based authentication requires them.
- Use security headers and HTTPS.
- Validate MIME types and file signatures for uploads.
- Keep dependency and lockfile updates reviewable.
- Do not expose internal stack traces or provider responses directly to end users.

## 9. Security acceptance gates

A release must not be called production-ready until:
- [ ] SSRF tests cover private IPv4, private IPv6, loopback, metadata IPs, redirects, DNS edge cases, and mixed DNS answers.
- [ ] Prompt-injection test fixtures cannot change system policy or trigger unauthorized actions.
- [ ] Authentication and cross-user authorization tests pass.
- [ ] Secrets are absent from repository history, browser bundles, and logs.
- [ ] Input, response, redirect, timeout, and concurrency limits are enforced.
- [ ] XSS and unsafe-rendering tests pass.
- [ ] Dependency and static security checks have been reviewed.
- [ ] Data retention and deletion behavior is tested.
- [ ] Rate limits and provider cost caps are tested.
- [ ] A documented incident and credential-rotation procedure exists.

## 10. Security rule

Convenience must never silently weaken the URL-fetching boundary, credential boundary, user-data boundary, or tool-permission boundary.


## 11. GitHub Actions and automation security

- Separate read-only PR validation from any workflow that has `contents: write`.
- Never expose write-enabled tokens to untrusted fork or pull-request code.
- Pin third-party actions to immutable commit SHAs where practical; review action updates deliberately.
- Declare explicit workflow permissions instead of relying on broad defaults.
- Do not pass secrets to the Wellness Doctor. It must operate on repository files only.
- Do not print environment variables, tokens, authorization headers, or secret values in logs.
- Restrict the README updater to the exact delimited health block. Missing, duplicate, or reversed markers must fail without modifying README.
- Use concurrency controls to prevent simultaneous health commits.
- Do not let bot-authored health commits recursively trigger another write cycle.
- Treat workflow logs and artifacts as potentially visible repository data. Never include private user queries or source contents.
- The doctor is not a security scanner or production monitor. Do not use a green repository status as proof that production infrastructure is secure or available.


## 12. Agent interoperability threat model

The primary product connects independently operated agents. Add these risks to the existing security baseline:

- **Confused deputy:** a caller tricks MeepSheep into using its own connection credentials for an action the caller is not authorized to perform.
- **Cross-tenant agent discovery or dispatch:** identifiers, registry filters, task IDs, or artifact references expose another tenant's agents or results.
- **Credential substitution and leakage:** credentials are attached to the wrong agent, exposed in traces, or reused across connections.
- **Malicious Agent Cards and callback URLs:** remote metadata points to internal/private addresses, metadata services, or unsafe redirects.
- **Replay and duplicate side effects:** retries or repeated callbacks cause an external action to run more than once.
- **Delegation amplification:** recursive or parallel agent calls create runaway cost, traffic, or authority.
- **Context exfiltration:** task payloads contain conversation history or attachments beyond the user's intended sharing scope.
- **Malicious or compromised agents:** remote responses contain prompt injection, false completion claims, hostile links, or requests for secrets and additional tools.
- **Task confusion:** out-of-order events, reused remote IDs, or forged callbacks alter the wrong task.

Required controls:
- Bind every task to an authenticated caller, tenant, target, connection, grant, deadline, and idempotency key.
- Resolve permissions server-side on every dispatch, status read, cancellation, and artifact fetch.
- Separate agent discovery from permission to invoke it.
- Treat agent capability declarations as untrusted metadata, not authorization grants.
- Validate every endpoint and redirect against SSRF policy; never fetch arbitrary Agent Card URLs without the same protections as user-supplied URLs.
- Verify callback signatures or use authenticated polling; reject stale, duplicate, and out-of-order events safely.
- Use per-connection credentials, least privilege, encryption at rest, rotation, and immediate revocation.
- Apply hard caps to depth, fan-out, concurrency, retries, task duration, payload size, and total budget. Child tasks may narrow but never expand parent permissions or budget.
- Require explicit approval for sensitive actions and do not expose administrative tools to ordinary model-callable scopes.
- Treat remote content as data, never as instructions that can modify MeepSheep policy or tool permissions.
- Share only explicitly selected context. Never transmit hidden reasoning or private system prompts.
- Keep audit provenance without logging full private payloads or credentials.

### Additional release gates

- [ ] Cross-tenant agent, task, message, and artifact isolation tests pass.
- [ ] Confused-deputy and privilege-escalation tests pass.
- [ ] Replay, duplicate delivery, forged callback, and out-of-order event tests pass.
- [ ] Malicious Agent Card and callback SSRF tests pass for IPv4 and IPv6.
- [ ] Recursive delegation and parallel fan-out limits are enforced.
- [ ] Credential rotation and revocation are verified against a live test adapter.
- [ ] Context-sharing controls are tested with adversarial prompts and sensitive fixtures.
- [ ] A compromised remote agent cannot change MeepSheep authorization or invoke unrelated tools.
