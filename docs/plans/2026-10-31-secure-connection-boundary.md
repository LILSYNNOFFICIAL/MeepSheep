# Secure Connection Boundary Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-side bearer-token authentication boundary and a DNS-validated, connect-time-pinned HTTPS transport for explicitly approved outbound MCP endpoints.

**Architecture:** Keep authentication and endpoint security as small Node.js modules that are independently testable and do not depend on a production database or secret manager. The inbound wrapper verifies an RS256 JWT access token against a trusted JWKS resolver, then places an internally branded auth context on the request; the relay resolves the principal only from that verified context. Outbound endpoint validation resolves all DNS answers, rejects any non-public destination, and creates an HTTPS fetch adapter that pins requests to the validated address set, preserves TLS hostname verification, and never follows redirects. The local helpers do not implement token issuance, production key lifecycle, endpoint onboarding persistence, or a public hosting runtime.

**Tech Stack:** Node.js 26.13.0, `jose@6.2.14`, built-in `node:test`, `node:dns/promises`, `node:https`, `node:net`, MCP TypeScript SDK 2.4.0.

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
- Test: `tests/endpoint-security.test.mjs`
- Test: `tests/mcp-relay.integration.test.mjs`

**Interfaces:**
- `createBearerAuthenticator({ issuer, audience, jwks, clock, maxLifetimeSeconds, clockSkewSeconds }) -> { authenticate(request), resolvePrincipal(authInfo) }`
- `jwks` is a trusted JOSE-compatible JWKS resolver. The authentication module does not issue tokens or discover a JWKS URL from an inbound request.
- Claims: `sub`, `tenant_id`, `client_id`, `scope` (unique space-delimited OAuth scope-token string), `iat`, `exp`, and `jti`.
- `authenticate(request)` accepts one `Authorization: Bearer <token>` credential, verifies RS256 and `typ: at+jwt`, issuer, audience, required claims, expiry, future issue time, clock skew, and maximum lifetime. It returns an internally branded MCP auth context containing the original token, client ID, scopes, and expiry.
- `resolvePrincipal(authInfo)` accepts only the exact auth context object produced by this authenticator and returns `{ principalId, tenantId, permissions }`; copied objects or forged `authInfo.extra` fields are rejected.
- `withBearerAuthentication(handler, authenticator)` authenticates each HTTP request, overwrites pre-existing auth context, maps missing/invalid credentials to 401 and JWKS retrieval failures to 503, and forwards `close()`.

- [x] **Step 1: Add focused failing tests**

Assert valid signature/issuer/audience/time/scope claims succeed; missing bearer token returns `AUTH_REQUIRED`; malformed token, wrong signature, wrong issuer/audience, expired token, future-issued token, excessive lifetime, malformed claims, and token/client-ID mismatch return `AUTH_INVALID`. Add an integration test proving forged `authInfo.extra.principal` cannot override the token's principal or tenant.

- [x] **Step 2: Verify the relevant failure**

Run: GitHub Actions run `41267916343` on the test-first revision.

Observed: the authentication test file failed with `ERR_MODULE_NOT_FOUND` for `src/relay/auth.mjs`; the existing relay and schema tests passed. This was the expected missing-feature failure.

- [x] **Step 3: Implement the minimum behavior**

Use `jose` to verify RS256 with an injected JWKS resolver and exact issuer/audience. Require `typ: at+jwt`, non-empty subject, tenant ID, client ID, JTI, valid integer `iat`/`exp`, a unique scope-token string, maximum token lifetime, expiry, and bounded clock skew. Keep the verified principal in a private WeakMap associated with the exact auth context object so copied or caller-modified context cannot be trusted. Never log or return the token. No local token-issuance endpoint is added.

- [x] **Step 4: Verify the focused pass**

Run: `node --test tests/security-boundary.test.mjs` and full `npm test` in CI run `41268297674`.

Observed: authentication boundary 7/7 passed; the MCP integration test proved that a signed caller token overrides forged `authInfo.extra.principal` values.

- [x] **Step 5: Run the affected integration check**

Run: the quality workflow for exact head `05563436e7631024733bd82bd5f03c9612ce0bf4`.

Observed: full Node suite 30/30 passed; Python Wellness Doctor 10/10 passed; Repository Doctor 113 passed with zero warnings/errors/critical; both workflow YAML files parsed.

- [x] **Step 6: Commit the passing deliverable**

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

- [x] **Step 1: Add focused failing tests**

Cover HTTPS-only and port-443 policy; reject URL credentials, query/fragment, IP literals, localhost, unapproved hostnames, empty DNS results, DNS failures, IPv4 loopback/private/link-local/shared/reserved/multicast/broadcast ranges, IPv6 loopback/ULA/link-local/multicast/mapped/NAT64 and non-global ranges, and mixed public/private DNS answers. Verify all public DNS answers are pinned at request time, TLS SNI remains the original hostname, wrong origin/path is rejected before network I/O, sensitive hop-by-hop/cookie/proxy headers are removed, request timeout is bounded, and 3xx responses are not followed.

- [x] **Step 2: Verify the relevant failure**

Run: GitHub Actions run `41267912546` on the endpoint test-first revision.

Observed: the endpoint security test file failed with `ERR_MODULE_NOT_FOUND` for `src/relay/endpoint-security.mjs`; the existing relay/schema tests passed.

- [x] **Step 3: Implement the minimum behavior**

Use Node's DNS resolver with all-answer mode and explicit IPv4/IPv6 range classification. Require exact host allowlisting. Reject the endpoint if any DNS answer is non-global. Build the default fetch adapter on `node:https` with a custom lookup callback selecting only the validated addresses; preserve the original hostname for SNI and certificate validation. Reject redirect following and any URL outside the exact approved origin/path. Remove cookie, proxy, hop-by-hop, and Connection-nominated request headers. Enforce bounded time and request/response bytes. Do not add arbitrary URL input to MCP tools or claim that hostname allowlisting alone prevents SSRF.

- [x] **Step 4: Verify the focused pass**

Run: `node --test tests/endpoint-security.test.mjs` in CI run `41268297674`.

Observed: endpoint policy/pinned-fetch suite 9/9 passed, including IPv4/IPv6 special ranges, mixed DNS answers, pinned lookup, TLS host/SNI options, header stripping, byte limits, timeout, and redirect behavior.

- [x] **Step 5: Run the affected integration check**

Run: full quality workflow run `41268297674` on exact head `05563436e7631024733bd82bd5f03c9612ce0bf4`.

Observed: full Node suite 30/30 passed and all Python Doctor, Repository Doctor, and workflow syntax checks passed. Security/API/lab/state/environment/build-plan/decision/changelog documents record the implemented behavior and remaining production gates.

- [x] **Step 6: Commit the passing deliverable**

`feat: secure outbound MCP endpoint connections`

## Verification boundary and remaining integration

The current endpoint unit suite uses deterministic DNS results and an injected `requestImpl` seam to verify the fetch adapter's request policy, lookup callback, and TLS options. The default `node:https` transport is present, but no test in this plan performs a real external TLS handshake or proves deployed network egress controls. The validated endpoint helper is not yet connected to owner onboarding or the in-memory registry's outbound MCP client construction. Those are explicit follow-up tasks before the helper can be treated as the enforced production connection path.

## Unresolved production decisions

- Select the production identity provider and token issuance/rotation owner; this phase verifies tokens but does not issue production credentials.
- Select the production secret manager and authoritative persistence layer for endpoint approvals and credentials.
- Define endpoint onboarding UX and owner approval/reapproval process.
- Select runtime deployment and egress controls; the local pinned HTTPS transport must be revalidated in the chosen hosting environment before public launch.
