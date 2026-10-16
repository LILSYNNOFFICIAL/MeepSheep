# Pairing and Authenticated Session Protocol

**Status: proposed design only. Not implemented or security-reviewed.**

This document defines the minimum protocol contract that must be reviewed before MeepSheep accepts remote tasks. It does not imply that a server, device registry, pairing flow, or authenticated transport exists.

## Security goals

- Pair a specific signed-in user, AI client, and Windows device through explicit user action.
- Prevent an untrusted AI client, browser tab, or network peer from creating a pairing or widening an existing grant.
- Bind every task authorization to one device, one capability, one target, a short expiry, and a unique request identifier.
- Prevent replay across requests, devices, process restarts, and concurrent agent instances.
- Let users revoke a client or device and make stale or offline authorization fail closed.
- Keep long-lived secrets out of browser storage, URLs, logs, and task payloads.

## Trust boundaries

1. **Web dashboard:** untrusted for local execution. It may request pairing, but cannot mint agent authorization.
2. **Control API:** responsible for account authentication, device/client registry, pairing state, authorization decisions, revocation, and audit metadata.
3. **AI client/MCP adapter:** an untrusted request source. A valid MCP call is not itself permission to perform an operating-system action.
4. **Windows agent:** independently enforces local policy, authorization expiry, replay protection, approval, cancellation, and target constraints immediately before an operation.
5. **Operating system:** executes only narrowly defined operations under the signed-in user's permissions.

## Proposed pairing flow

1. The agent starts unpaired, with deny-all policy, and displays a short-lived, high-entropy pairing code or QR payload locally.
2. The user signs in to the dashboard separately and enters or scans the pairing material. Pairing secrets must not appear in URL query strings or referrers.
3. The control API validates the user's session, enforces rate limits, and presents device identity and requested scopes for explicit confirmation.
4. The agent independently displays the requesting account/client and requested scopes. The user confirms locally. Pairing is rejected unless local confirmation matches the server-side request.
5. The agent and control API establish device identity using a reviewed key-provisioning flow. The private device key is generated and retained in OS-protected storage, never returned to the browser or AI client.
6. The server records the paired device and initial deny-by-default scopes. The agent remains unable to perform capabilities that were not explicitly granted.
7. Pairing codes are single-use, short-lived, rate-limited, and invalidated after success, expiry, cancellation, or repeated failed attempts.

The concrete key exchange, device attestation requirements, code entropy, cryptographic algorithms, and recovery flow must be selected and independently reviewed before implementation. Do not invent a custom cryptographic protocol.

## Proposed task authorization

Every task request must carry or resolve to:

- A globally unique request ID and a cryptographically random one-time nonce.
- Stable device identity and authenticated client identity.
- A known capability identifier and normalized, constrained target.
- Issued-at and expiry timestamps with a short maximum lifetime.
- A policy or grant version so stale permissions can be rejected.
- A unique approval reference for operations requiring confirmation.
- A server-authenticated integrity mechanism over the complete canonical request.

The agent must authenticate the session and verify integrity before trusting any field. It then checks device/client binding, grant version, expiry and clock-skew limits, capability and target policy, fresh approval, cancellation/stop state, and replay protection. These checks must occur immediately before dispatching the operation. A client-supplied approval boolean, unsigned envelope, or natural-language instruction cannot satisfy an approval requirement.

Canonical serialization and signature or MAC details must be defined by a reviewed protocol specification. Avoid signing ambiguous JSON or relying on a client-generated identifier as proof of authenticity.

The current prototype's target digest hashes the exact UTF-8 target string as supplied. This only detects a changed string; it does not canonicalize paths, resolve symbolic links/reparse points, prove filesystem identity, or prevent path traversal. Before file operations are implemented, define capability-specific target normalization and perform path/root/reparse-point checks at the operating-system boundary immediately before execution. Do not treat a matching digest as proof that a target is safe.

## Transport and reconnection

- Prefer an outbound, mutually authenticated encrypted session from the agent. Do not require public inbound RDP, PowerShell, or arbitrary control ports.
- Authenticate both ends and bind task messages to the established session and device identity.
- Reconnect with bounded exponential backoff and jitter; do not queue sensitive work indefinitely while offline.
- On disconnect, stop accepting new tasks. Any task whose authorization expires before execution is rejected.
- Never treat a reconnect as proof that previous tasks completed. Use explicit task states and idempotency rules.
- Revocation must invalidate sessions and grants at the service and be checked on reconnection. Short-lived authorization bounds risk while an agent is offline.

## Replay protection requirements

The existing in-memory ReplayProtectionStore is a unit-testable prototype only. It resets on process restart and does not protect multiple agent instances.

Before real task execution, replay protection must be durable or cryptographically/session-bound in a way that remains correct across restart and concurrency. It must fail closed on storage errors, use atomic uniqueness constraints, expire records safely, and distinguish a retried transport delivery from a newly authorized task. A duplicate request must never cause the underlying operation to run twice unless a separately reviewed idempotency contract explicitly allows it.

## Approval and stop behavior

- Approval is scoped to one operation, normalized target, capability, and short time window.
- Changes to target, arguments, capability, or grant version invalidate the approval.
- The local stop control takes precedence over queued work and new authorization.
- Cancellation is checked before dispatch and at safe interruption points during long-running operations.
- If an operation cannot be interrupted, report that honestly and do not claim it stopped before termination is confirmed.
- No blanket approval for all future tasks in the initial release.

## Required tests and release gates

Before a remote operation is enabled, tests must demonstrate:

- Unpaired devices and unauthenticated clients cannot submit executable tasks.
- Pairing codes expire, are single-use, and resist brute-force attempts.
- A client cannot pair a different device or grant itself additional capabilities.
- Tampered messages, wrong-device bindings, stale grant versions, and expired tasks fail closed.
- Duplicate nonce/request combinations fail under concurrent delivery, after restart, and across multiple instances.
- Revoked devices and expired offline grants cannot continue executing tasks.
- Approval cannot be reused with changed targets or arguments.
- Stop/cancellation blocks queued tasks and produces truthful terminal task states.
- Secrets and sensitive screen/clipboard content are absent from logs and error messages.

Independent protocol and threat-model review is required before production use. Until then, keep the agent local-only and deny all operations.
