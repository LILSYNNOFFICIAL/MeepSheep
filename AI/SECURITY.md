# MeepSheep Security and Privacy Baseline

**Status:** Required design controls. Draft PR #5 contains CI-tested RS256 resource-server verification, pinned HTTPS outbound MCP connection factory, AES-256-GCM credential-vault logic, registry secret isolation, and internal owner-controlled connection preview/approval/disconnect. Production identity issuance, persistent store/KMS adapters, public owner API/console, durable audit, and deployment egress remain unimplemented.  
**Primary risk boundary:** Untrusted agents and tools communicating through an authorized relay.

## Verified local security primitives (draft PR #5)

The following behavior is implemented and CI-tested on `feat/secure-connection-boundary`:

- Inbound bearer middleware verifies RS256 JWT access tokens through an injected trusted JWKS resolver. It checks exact issuer/audience, `typ: at+jwt`, subject, tenant ID, client ID, unique OAuth scope tokens, JTI, issue/expiry times, bounded clock skew, and maximum lifetime.
- The middleware replaces preexisting request auth context. The relay resolves principal and tenant from a private verified auth-context association, not caller-controlled `extra` fields. Invalid clocks and invalid credentials fail closed.
- Endpoint validation requires exact approved hostnames, HTTPS/443, and validation of every IPv4/IPv6 DNS answer. It rejects IP literals, credentials, query/fragment components, unapproved hosts, DNS errors, empty answers, and any non-public or mixed address set.
- The pinned fetch helper restricts origin/path/method, pins lookup to the approved DNS snapshot, preserves the original hostname for TLS SNI/certificate validation, removes unsafe request headers, forces `Accept-Encoding: identity`, strips response hop-by-hop/connection-nominated/cookie headers, rejects compressed responses, bounds request upload and streamed response bytes, applies deadlines/cancellation, and does not follow redirects.
- `createSecureRemoteMcpClient` combines the endpoint validator, pinned fetch adapter, MCP Streamable HTTP client, and vault-backed per-request bearer credential. Caller-supplied Authorization headers are removed before the connection credential is injected. The factory discovers tools and returns schema fingerprints for owner review; it does not auto-approve tools.
- The credential vault encrypts with AES-256-GCM. Authenticated data binds schema version, tenant ID, credential ID, key ID, and record version. The module enforces credential size and canonical opaque IDs; it supports callback-scoped decryption, key rotation, ciphertext destruction on revocation, tamper detection, and optimistic concurrency.
- The in-memory registry uses an explicit allowlist, accepts canonical `credentialRef` and `endpointRef` references, rejects raw credential/authorization/endpoint fields, and does not reveal references through discovery.
- The internal owner connection manager requires `connection:manage`, binds preview tokens to the creator and tenant, expires and closes abandoned previews, and presents discovered schemas/fingerprints without registering or approving them. Approval accepts only unique discovered tool names and derives the approved fingerprint map from the server-side preview snapshot. Disconnect verifies owner/tenant, unregisters the agent before revocation, and closes the MCP client even when revocation fails. Any credential-backed connection must provide both vault retrieval and revocation operations.

**Latest evidence:** CI run [41276417903](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41276417903) passed on exact PR #5 code head `c9a94b50fd77f82b36e8454cfdc117bb90b2e8f5`: authentication 8/8, endpoint 11/11, credential vault 11/11, agent registry isolation 7/7, secure remote MCP connector 5/5, owner connection lifecycle 10/10, task coordinator 15/15, task dispatcher 8/8, full Node suite 90/90, Python Wellness Doctor 10/10, Repository Doctor 117 passed with zero warnings/errors/critical, and both workflow YAML files parsed. Earlier run 41269980816 verifies the preceding security/connection-only checkpoint.

**Not established by these tests:** production OAuth token issuance, client registration/PKCE, production signing-key rotation or revocation, persistent credential store, KMS/platform secret-manager adapter, public owner API/console, persistent connection approvals, durable audit events, real external TLS handshake through the default Node HTTPS transport, deployed DNS/egress policy, persistent task/outbox storage, cross-process worker recovery, queue redelivery, durable task retention, or live AI-provider connectivity. The test connector uses deterministic request/client/transport seams. The connection manager stores previews and active connections in memory and loses them on process restart. The original injected principal resolver remains for local tests; a deployed runtime must configure verified bearer middleware and never expose that resolver as a public auth path.

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
- New connections default to owner-only principal access. Require an explicit same-tenant grant from the connection owner before another principal can discover or invoke the connection. Check grants on every operation and revoke future access immediately.
- Default each connection to owner-only access. Require explicit owner approval to grant another principal access, and check the grant on both discovery and every invocation. Revoke grants immediately for future operations.
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
- Limit response bytes and execution time; the current local pinned transport requests identity encoding and rejects non-identity content encoding rather than attempting decompression.
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
- [x] Local unit tests cover IPv4/IPv6 non-public ranges, all-answer DNS rejection, mixed DNS sets, exact endpoint origin/path, pinned lookup contents, request/response header policy, request upload timeouts, and no redirect following.
- [ ] Real socket/TLS, metadata-service, DNS-rebinding, and deployed egress-policy tests pass in the selected hosting runtime.
- [ ] Replay, duplicate, forged callback, and out-of-order event tests pass.
- [x] Local AES-256-GCM vault tests verify rotation, ciphertext revocation, tamper rejection, tenant/key/version binding, and stale-write rejection.
- [x] The outbound MCP fetch wrapper reloads credentials for each HTTP request and fails before outbound network I/O after revocation.
- [ ] Production store/KMS adapters and in-flight request/revocation semantics are verified in the selected hosting runtime.
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
