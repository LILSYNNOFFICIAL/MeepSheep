# MeepSheep Environment and Secrets

**Status:** Setup contract. This document does not create production secrets or environment configuration.

## 1. Configuration principles

- Validate configuration at startup and fail closed when required security settings are missing.
- Keep secrets out of source control, browser bundles, logs, test fixtures, and generated documentation.
- Use separate values for development, staging, and production.
- Document each secret's purpose, access scope, and rotation process.
- Never put provider API keys into browser-side configuration.

## 2. Configuration groups

Names below are placeholders until implementation selects exact providers.

Runtime: `APP_ENV`, `APP_BASE_URL`, `API_BASE_URL`, `LOG_LEVEL`.

Authentication and signing: `AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_JWKS_URL`, `SESSION_SIGNING_KEY`, `TOKEN_ENCRYPTION_KEY`.

Persistence and coordination: `DATABASE_URL` or platform binding, `TASK_QUEUE` or platform binding, `ARTIFACT_BUCKET` or platform binding.

Protocol endpoints: `MCP_PUBLIC_URL`, `A2A_PUBLIC_URL`.

Limits: `DEFAULT_TASK_TIMEOUT_SECONDS`, `MAX_TASK_PAYLOAD_BYTES`, `MAX_AGENT_CONCURRENCY`, `MAX_FANOUT_PER_TASK`, `MAX_RETRIES`, `DEFAULT_DAILY_BUDGET`.

Store each target agent credential in a secret manager under an opaque credential reference. Do not create one shared credential for every connected agent. Actual limit values must be chosen through tests, provider terms, and cost modeling, not guessed.

## 2.1 Local resource-server authentication contract

The local relay can be wrapped with `createBearerAuthenticator({ issuer, audience, jwks, clock, maxLifetimeSeconds, clockSkewSeconds })` and `withBearerAuthentication(handler, authenticator)`.

- The `issuer` and `audience` values must be exact trusted identifiers configured by the deployment.
- `jwks` is a JOSE-compatible key resolver, normally created by the hosting application from its trusted JWKS URL. The authentication module does not fetch arbitrary JWKS URLs from requests.
- The verifier currently accepts RS256 JWT access tokens with `typ: at+jwt` and required `sub`, `tenant_id`, `client_id`, `scope`, `iat`, `exp`, and `jti` claims.
- This code verifies access tokens. It does not issue tokens, run an OAuth authorization server, register OAuth clients, implement the PKCE flow, or configure key rotation/revocation. Those functions must be supplied by the selected identity provider and production integration.
- Do not place private signing keys or bearer tokens in this repository. JWKS must contain public verification keys only.

The local endpoint-security helper accepts an exact `allowedHosts` list and validates all DNS answers before creating the pinned fetch function. The repository does not currently load an endpoint allowlist or wire that helper into an owner-facing registration service. The production host must supply a trusted allowlist through server-side configuration, not through model-callable tool arguments.

These names describe the intended configuration boundary. The current repository does not yet load these values at application startup.

## 3. Local setup

- Provide a safe `.env.example` with names and non-secret placeholders only.
- Add the actual environment file to `.gitignore`.
- Validate required variables with a schema.
- Provide mock-agent mode so core tests run without paid provider credentials.
- Document how to add, rotate, and revoke a single agent connection.

## 4. Secret lifecycle

Generate high-entropy credentials with a cryptographically secure mechanism. Encrypt stored connection credentials with managed keys. Restrict access by service identity and environment. Redact secrets in logs and errors. Support rotation and immediate revocation. Audit administrative changes without recording secret values. Scan repository history and build artifacts for accidental disclosure.
