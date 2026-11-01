# Secure Connection Boundary Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-side bearer-token authentication boundary and a DNS-validated, connect-time-pinned HTTPS transport for explicitly approved outbound MCP endpoints.

**Architecture:** Keep authentication and endpoint security as small Node.js modules that are independently testable and do not depend on a production database or secret manager. The inbound MCP hosting layer authenticates the Authorization bearer token and supplies trusted MCP `authInfo`; the relay resolves the principal by verifying that signed token again, never by trusting `authInfo.extra`. Outbound endpoint onboarding resolves all DNS answers, rejects any non-public destination, and creates an HTTPS fetch adapter that pins every request to the validated address set, preserves TLS hostname verification, and never follows redirects.

**Tech Stack:** Node.js 26.13.0, built-in `node:test`, `node:crypto`, `node:dns/promises`, `node:https`, `node:net`, MCP TypeScript SDK 2.4.0.

## Global Constraints

- No production credentials, Cloudflare resources, DNS, or deployments are created or modified.
- No raw credentials are stored in source control, logs, endpoint metadata, or tool outputs.
- Authentication derives principal, tenant, and permissions only from a verified signed token.
- Only HTTPS on port 443 is accepted for remote MCP endpoints in this phase.
- Exact hostname allowlisting is required; wildcard host patterns are not accepted.
- Every DNS answer must be globally routable; mixed public/private answer sets are rejected.
- The HTTPS transport pins requests to the validated IP set, retains the original hostname for TLS SNI and certificate verification, rejects origin/path changes, and does not follow redirects.
- Existing MCP lab behavior and schema fingerprint approvals must remain intact.
- This is a secure local boundary, not a claim of production credential issuance, persistence, secret management, or live provider connectivity.

---

### Task 1: Signed bearer-token authentication

**Files:**
- Create: `src/relay/auth.mjs`
- Modify: `src/relay/mcp-handler.mjs` only if required to wire a verified resolver without changing the MCP tool surface.
- Test: `tests/security-boundary.test.mjs`
- Test: `tests/mcp-relay.integration.test.mjs`

**Interfaces:**
- `signAccessToken(claims, { issuer, audience, secret }) -> string`
- `createBearerAuthenticator({ issuer, audience, secret, clock, maxLifetimeSeconds, clockSkewSeconds }) -> { authenticate(request), resolvePrincipal(authInfo) }`
- Claims: `sub`, `tenant_id`, `scope` (array of permission strings), `iat`, `exp`, `jti`.
- `authenticate(request)` reads one `Authorization: Bearer <token>` header and returns MCP-compatible trusted authInfo containing the original token, client ID, scopes, and expiry.
- `resolvePrincipal(authInfo)` verifies the signed token again and returns `{ principalId, tenantId, permissions }`; it ignores untrusted `authInfo.extra` fields.

- [ ] **Step 1: Add focused failing tests**

Assert valid signature/issuer/audience/time/scope claims succeed; missing bearer token returns `AUTH_REQUIRED`; malformed token, wrong signature, wrong issuer/audience, expired token, future-issued token, excessive lifetime, malformed claims, and token/client-ID mismatch return `AUTH_INVALID`. Add an integration test proving forged `authInfo.extra.principal` cannot override the token's principal or tenant.

- [ ] **Step 2: Verify the relevant failure**

Run: `node --test tests/security-boundary.test.mjs tests/mcp-relay.integration.test.mjs`

Expected: tests fail because `src/relay/auth.mjs` does not exist.

- [ ] **Step 3: Implement the minimum behavior**

Use HMAC-SHA-256 with a minimum 32-byte server secret and constant-time signature comparison. Enforce exact issuer and audience, non-empty subject and tenant, a non-empty unique string scope array, valid `iat`/`exp`/JTI, maximum token lifetime, expiry, and bounded clock skew. Never log or return the token. Keep token signing server-side; no public token-issuance endpoint is added.

- [ ] **Step 4: Verify the focused pass**

Run: `node --test tests/security-boundary.test.mjs tests/mcp-relay.integration.test.mjs`

Expected: all auth and relay integration tests pass, including the forged-extra-principal test.

- [ ] **Step 5: Run the affected integration check**

Run: `npm test`

Expected: all existing relay/schema tests and new security tests pass.

- [ ] **Step 6: Commit the passing deliverable**

`feat: add signed bearer authentication boundary`

### Task 2: SSRF-resistant outbound MCP endpoint validation and transport

**Files:**
- Create: `src/relay/endpoint-security.mjs`
- Modify: `AI/SECURITY.md`
- Modify: `AI/API_SPEC.md`
- Modify: `AI/MCP_LAB.md`
- Modify: `AI/STATE.md`
- Test: `tests/security-boundary.test.mjs`

**Interfaces:**
- `validateRemoteEndpoint(endpoint, { allowedHosts, lookupAll }) -> frozen validated endpoint`
- Validated endpoint contains normalized HTTPS URL, exact hostname, port 443, and the complete validated address set.
- `createPinnedFetch({ validatedEndpoint, requestImpl, timeoutMs }) -> fetch-compatible function`
- The fetch adapter accepts requests only for the approved endpoint origin and path, pins DNS lookup to the validated address set, preserves original hostname TLS verification, strips hop-by-hop/cookie/proxy headers, and returns redirects without following them.

- [ ] **Step 1: Add focused failing tests**

Cover HTTPS-only and port-443 policy; reject URL credentials, query/fragment, IP literals, localhost, unapproved hostnames, empty DNS results, DNS failures, IPv4 loopback/private/link-local/shared/reserved/multicast/broadcast ranges, IPv6 loopback/ULA/link-local/multicast/mapped/NAT64 and non-global ranges, and mixed public/private DNS answers. Verify all public DNS answers are pinned at request time, TLS SNI remains the original hostname, wrong origin/path is rejected before network I/O, sensitive hop-by-hop/cookie/proxy headers are removed, request timeout is bounded, and 3xx responses are not followed.

- [ ] **Step 2: Verify the relevant failure**

Run: `node --test tests/security-boundary.test.mjs`

Expected: tests fail because `src/relay/endpoint-security.mjs` does not exist.

- [ ] **Step 3: Implement the minimum behavior**

Use Node's DNS resolver with all-answer mode and Node's IP parsing/block lists. Require an exact hostname allowlist. Reject an address set if any answer is non-global. Build the fetch adapter on `node:https` with a custom lookup callback that selects only the validated addresses; use the original hostname for SNI and certificate validation. Reject redirect following and any URL outside the exact approved origin/path. Do not add arbitrary URL input to MCP tools or claim that a hostname allowlist alone prevents SSRF.

- [ ] **Step 4: Verify the focused pass**

Run: `node --test tests/security-boundary.test.mjs`

Expected: all endpoint policy and pinned-fetch tests pass.

- [ ] **Step 5: Run the affected integration check**

Run: `npm test`

Expected: the full suite passes with no change to the existing mock relay behavior. Update security/API/lab/state docs to state exactly what is implemented and what still requires production onboarding, secret storage, and deployment.

- [ ] **Step 6: Commit the passing deliverable**

`feat: secure outbound MCP endpoint connections`

## Unresolved production decisions

- Select the production identity provider and token issuance/rotation owner; this phase verifies tokens but does not issue production credentials.
- Select the production secret manager and authoritative persistence layer for endpoint approvals and credentials.
- Define endpoint onboarding UX and owner approval/reapproval process.
- Select runtime deployment and egress controls; the local pinned HTTPS transport must be revalidated in the chosen hosting environment before public launch.
