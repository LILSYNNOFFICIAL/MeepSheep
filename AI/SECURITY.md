# MeepSheep Security and Privacy Baseline

**Status:** Required design controls. Implementation is not yet verified.  
**Primary risk boundary:** Untrusted agents and tools communicating through an authorized relay.

## 1. Threat model

MeepSheep accepts requests from AI clients and routes them to independently operated remote agents. Treat inbound callers, remote tool metadata, tool outputs, callbacks, artifacts, and provider responses as potentially malicious or compromised.

Primary risks:
- Unauthorized agent discovery, invocation, or cross-tenant access.
- Confused-deputy use of a connection credential beyond the caller's grant.
- Remote tool-description or response prompt injection.
- Credential substitution, leakage, or reuse across connections.
- SSRF through remote endpoint registration, redirects, Agent Cards, or callbacks.
- Replay, duplicate dispatch, forged callbacks, and out-of-order task events.
- Delegation amplification, unbounded fan-out, runaway cost, and denial of service.
- Context exfiltration through oversized or overbroad task payloads.
- Malicious artifacts, unsafe rendering, and supply-chain compromise.

## 2. Identity and authorization

- Authenticate every inbound MCP client using the selected supported auth mechanism.
- Derive principal and tenant identity from trusted credentials, never caller-supplied body fields.
- Bind each agent connection to an owner and tenant.
- Separate discovery, message-send, task-dispatch, status-read, cancellation, artifact-read, and administration scopes.
- Check authorization server-side on every operation, not only at connection setup.
- Treat discovered capabilities and remote tool names as metadata, not grants.
- Require owner approval before remote tools become callable through MeepSheep.
- Keep credential management, endpoint registration, grant changes, and tenant administration outside ordinary model-callable tools.
- Prevent cross-tenant IDOR by checking ownership for every agent, task, message, and artifact.

## 3. Remote endpoint and SSRF controls

For every configured remote endpoint, tool URL, redirect, Agent Card, or callback:
- Allow only supported secure schemes and transports.
- Reject loopback, private, link-local, multicast, reserved, and metadata-service destinations.
- Resolve and validate every DNS answer, including IPv4 and IPv6.
- Revalidate every redirect target.
- Defend against DNS rebinding and connect-time address changes where runtime permits.
- Limit redirects, response bytes, decompressed bytes, content types, and time.
- Do not forward inbound cookies, auth headers, or internal headers.
- Prefer explicit owner-configured endpoints over arbitrary URLs supplied by model tool arguments.

A hostname-only allowlist is insufficient.

## 4. Remote tool and prompt-injection boundary

- Treat tool descriptions, schemas, outputs, artifacts, and agent messages as untrusted data.
- Never let remote content change MeepSheep policy, grants, routing, budgets, or tool permissions.
- Do not automatically execute instructions or invoke additional tools suggested by a remote agent.
- A remote agent may request more context or another action, but MeepSheep must re-authorize it as a new operation.
- Escape untrusted output before rendering.
- Do not send hidden chain-of-thought, private system prompts, or unapproved chat history.
- Share only caller-selected task context and explicitly authorized artifacts.

## 5. Credentials and connection lifecycle

- Store raw credentials only in platform secret storage or a dedicated secret manager.
- Store references and metadata in the database, not raw secrets.
- Use per-connection credentials and least privilege.
- Encrypt secrets at rest and in transit.
- Redact tokens, authorization headers, and secret-bearing query parameters from logs.
- Support rotation, revocation, disable, and disconnect.
- Use separate development, staging, and production credentials.
- Never expose credentials to browser bundles or ordinary MCP tool outputs.

## 6. Task integrity and reliability

- Generate task IDs, trace IDs, timestamps, tenant IDs, and idempotency identities server-side.
- Bind every task to caller, target, connection, grant, deadline, and budget.
- Enforce idempotency and deduplicate remote events.
- Authenticate callbacks or use authenticated polling.
- Reject forged, stale, replayed, or out-of-order events.
- Bound retries, task duration, payload size, concurrency, fan-out, and delegation depth.
- Child tasks may narrow but never expand parent permissions, deadlines, or budgets.
- Treat cancellation as best-effort when the remote protocol cannot guarantee it.
- Never mark a task completed solely because a remote agent claims success if required result validation failed.

## 7. Cost and abuse controls

- Reserve budget before external dispatch.
- Enforce limits by tenant, caller, connection, agent, and task.
- Bound target count, retries, delegation depth, and parallel child tasks.
- Apply rate limits and circuit breakers.
- Require approval or reject when cost is unknown and cannot be bounded.
- Reconcile provider-reported usage and flag unknown costs honestly.
- Provide a kill switch for each connection and globally.

## 8. Privacy and retention

Before public launch, define:
- What message/task content is stored and for how long.
- Whether remote outputs/artifacts are retained or only referenced.
- Which external providers receive user content.
- User export, deletion, and revocation behavior.
- Privacy-safe audit retention.
- Whether any data is used for analytics or model improvement.

Do not store complete private conversations by default. Do not log full task payloads unless explicitly required and protected.

## 9. Security acceptance gates

- [ ] Cross-tenant discovery, task, message, and artifact isolation tests pass.
- [ ] Confused-deputy and privilege-escalation tests pass.
- [ ] Remote tool prompt injection cannot alter MeepSheep policy or invoke unapproved tools.
- [ ] SSRF tests cover IPv4, IPv6, DNS answers, redirects, and metadata destinations.
- [ ] Replay, duplicate, forged callback, and out-of-order event tests pass.
- [ ] Credential rotation and revocation stop future dispatch.
- [ ] Fan-out, depth, retries, concurrency, duration, and budgets are enforced.
- [ ] Secrets are absent from Git, browser bundles, logs, and task outputs.
- [ ] Retention, deletion, and artifact authorization are tested.
- [ ] Incident response and kill-switch procedures are documented.

## 10. GitHub automation security

- Keep PR quality checks read-only.
- Never expose write-enabled tokens to untrusted PR code.
- Pin third-party Actions to immutable SHAs where practical.
- Declare minimal workflow permissions.
- Keep Wellness Doctor free of production credentials.
- Restrict README updates to the exact marker region.
- Do not treat repository health as proof of production or agent health.

## 11. Rule

No agent, tool output, or remote endpoint may grant itself new permissions. Every capability invocation must be authorized by MeepSheep's trusted policy layer.
