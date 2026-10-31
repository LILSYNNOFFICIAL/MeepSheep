# MeepSheep Deployment and Operations

**Status:** Proposed deployment guide. No production environment or domain routing is verified.

## 1. Environments

Maintain isolated development, staging, and production environments. Each uses distinct credentials, data namespaces, signing keys, and provider quotas. Never let test workflows mutate production data.

## 2. Candidate Cloudflare responsibilities

Subject to account and capability verification:

- Workers: public API, MCP endpoint, A2A endpoint, routing, and policy enforcement.
- Durable Objects or another validated durable coordination primitive: task coordination, locking, or streaming state where justified.
- Queues: asynchronous dispatch and retry where appropriate.
- D1: relational metadata if selected as the primary database.
- R2: artifacts and attachments when needed.
- KV: non-authoritative cache only where consistency permits.
- Workers Static Assets: web console delivery if compatible with the selected frontend.

Do not deploy every service by default. Select the smallest topology that meets task lifecycle and reliability requirements.

## 3. Deployment pipeline

1. Pull request runs formatting, type checking, unit/contract tests, security checks, and build.
2. Merge to main produces an immutable build artifact.
3. Deploy to staging with staging-only secrets.
4. Run smoke tests for web, API, MCP initialize/tools/list, A2A Agent Card, task round trip, authentication, and health.
5. Require explicit release approval before production deployment.
6. Deploy with a rollback path.
7. Run production smoke tests without sending sensitive tasks.
8. Record deployment version and verification evidence.

## 4. Operations

Monitor web/API availability, MCP handshake and tool-call failures, A2A discovery and task failures, queue depth and oldest task age, tasks by state and duration, agent connection health, rate limits, budget exhaustion, circuit breakers, authentication failures, suspicious dispatch, storage, and provider usage/cost.

Alert on sustained failure, stuck tasks, queue growth, anomalous fan-out, and budget thresholds.

## 5. Rollback and incidents

Keep the last known-good deployment artifact. Roll back application code independently from database migrations where possible. Use forward-compatible migrations and tested restore procedures. Revoke compromised agent credentials immediately. Disable a misbehaving connection or adapter without taking down unrelated agents. Follow AI/INCIDENTS.md and AI/SECURITY.md.

## 6. Candidate endpoints

- Web: https://meepsheep.com
- MCP: https://mcp.meepsheep.com/mcp
- A2A: https://agents.meepsheep.com (candidate only; exact path follows selected A2A SDK/spec)

These are proposed addresses. DNS, TLS, routes, and service health must be verified before use.
