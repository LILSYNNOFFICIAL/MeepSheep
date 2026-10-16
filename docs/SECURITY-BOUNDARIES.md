# MeepSheep security boundaries

Status: design contract for the prototype. These requirements are not yet enforced by a complete running product.

See [PAIRING-SESSION-PROTOCOL.md](PAIRING-SESSION-PROTOCOL.md) for the proposed pairing, authenticated session, task authorization, replay, and reconnection contract. That protocol is not implemented or security-reviewed.

## Assets to protect

- The user's desktop session, files, clipboard, applications, credentials, and network settings.
- Device pairing secrets and client credentials.
- Task requests, approval decisions, audit records, and usage records.
- The integrity of the local agent and its update channel.

## Trust boundaries

1. **AI client to MCP service:** treat every tool argument and natural-language instruction as untrusted input. Authenticate the client, validate the schema, enforce quotas, and check the client's scopes before forwarding a request.
2. **Control service to local agent:** accept requests only over an authenticated, integrity-protected, outbound-initiated session. Bind each request to a paired device, a short-lived authorization, and a unique request identifier. Reject stale, replayed, malformed, or wrong-device requests.
3. **Agent to Windows session:** the agent must run as the signed-in user with the minimum privileges required. Do not create an always-on administrator service as the default design.
4. **Agent to operating-system capability:** every operation must pass a local policy check immediately before execution. The policy evaluator is not sufficient by itself unless every real operation calls it and the decision cannot be bypassed.

## Authorization flow

1. Authenticate the account and the requesting client.
2. Verify the device is paired, online, and not revoked.
3. Validate the request against a versioned capability schema.
4. Check the client scope and device policy.
5. Require a fresh, explicit user approval for consequential or privacy-sensitive operations.
6. Issue a short-lived, single-use authorization bound to the exact operation and target.
7. On the agent, authenticate the envelope and validate its time bounds before atomically consuming the nonce and request identifier.
8. Re-check device authorization, local policy, approval freshness, and cancellation immediately before executing only the narrow operation.
9. Record the request, policy result, approval reference, operation outcome, and error category without storing secrets or unnecessary screen/file content.

**Current implementation gap:** the .NET replay guard is a bounded, in-memory prototype only. It is not persistent, resets on process restart, is not connected to an authenticated session, and is not called by any real operation. It must not be represented as end-to-end replay protection. A production implementation needs atomic durable consumption scoped to the authenticated device/session, safe multi-instance behavior, and tests covering restart and concurrency. The current envelope DTO and its shape/time validator do not authenticate the sender or prove authorization.

Approval for one operation must not become blanket approval for later operations. A tool call cannot grant itself new scopes or change the policy used to authorize that same call.

**Current approval behavior:** the policy core has no caller-supplied approval or administrator-privilege flags. The evaluator now enforces a baseline approval requirement for every capability except `LaunchApplication`, even if a policy omits that capability from its approval-required set. `RunCommand`, `InstallSoftware`, and `ChangeFirewall` are denied as not implemented even if mistakenly allowlisted. These checks are defense in depth only: no OS operation handler exists, and a future execution path must derive privilege needs from trusted operation metadata and enforce the decision immediately before dispatch. Do not work around this by adding caller-supplied flags to a request DTO. Implement and test a trusted approval record bound to the request ID, capability, exact target, and short expiry before enabling such capabilities. The new authorization-ticket validator checks ticket shape, lifetime, request/device/capability binding, exact-target SHA-256 digest, and presence of an approval reference when required. This is consistency validation only, not signature verification, issuer authentication, or proof that approval was actually granted.

## Initial capability posture

- Default: deny all capabilities.
- Screen capture and clipboard access: privacy-sensitive; explicit scope and visible session indicator required.
- Mouse and keyboard control: only in a user-authorized interactive session, with a reachable stop control.
- File reads/writes: narrow roots and explicit targets; reject path traversal and unsafe link/reparse-point escapes.
- File deletion, software installation, firewall/security changes, and account permission changes: separate confirmation and a narrowly scoped authorization required.
- Command execution: disabled until a separate design defines a constrained command model, argument handling, working-directory rules, timeout, output limits, and audit redaction. Do not expose an unrestricted administrator shell.
- Administrator privileges: not granted by default; elevation requests are denied by the initial policy core.

## Emergency stop and revocation

- Stop accepting new tasks immediately when the user activates the stop control.
- Cancel cancellable work and clearly report operations that cannot be safely interrupted.
- Revoke client and device credentials server-side and at the agent on the next authenticated contact.
- Do not claim an offline device has received a remote revocation. The agent must fail closed when its short-lived authorization expires.
- Keep a local stop path available even if the hosted service is unreachable.

## Data handling

- Keep screen captures and clipboard contents ephemeral by default; do not retain them in audit logs.
- Never log access tokens, pairing secrets, raw authentication headers, or full command output without an explicit data-minimization review.
- Define retention and deletion behavior for audit metadata before launch.
- Use authenticated encryption in transit, secure operating-system storage for local secrets, rotation, and revocation.

## Release gates

A working computer-control release must not ship until the team has:
- A documented threat model and reviewed pairing/session protocol.
- Tests proving default-deny behavior, scope enforcement, approval freshness, expiry, replay rejection, revocation, cancellation, and audit outcomes.
- Durable replay protection that remains correct across process restarts and concurrent agent instances.
- Windows integration tests covering the actual operation call paths.
- Signed build/update artifacts and a recovery path for a bad update.
- A security review of the end-to-end request path, not just the web UI or policy library.

Until those gates pass, the local agent remains an incomplete foundation and must not be advertised as safe for real desktop control.
