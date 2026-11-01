# MeepSheep Task Execution Contract

**Status:** Local task coordinator, in-memory reference repository, registry-backed dispatcher, and optional MCP task tools are implemented. Outbox completion now fences stale claims by worker ID, monotonically increasing claim attempt, exact lease deadline, and lease expiry. Task-contract implementation commit `b5904db4fdaf1d608e5264f86038a45380116fb5` passed run [41289499297](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289499297). The subsequent documentation checkpoint `58f6ee0c73ad1e2836d9aba472d07bdab7c2a034` passed run [41289621348](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289621348) (PR merge revision `e60e52c301f3a98c3cf9dc64c0ddc2ca031b5941`). The reusable repository contract suite defines eight shared tests for any future adapter, including tenant-and-caller-scoped idempotency. This remains an in-memory local implementation, not a durable production task system.

## Purpose

The task subsystem turns a caller-authorized request into a server-identified task, schedules one outbound MCP dispatch, records state changes, and gives the original caller a bounded way to inspect, wait for, or cancel that task.

The task coordinator does not expose credentials, endpoint URLs, registry internals, or remote MCP client handles. Agent connections default to owner-only access; a task dispatch requires the caller's explicit principal grant in addition to `task:dispatch` and an approved tool. Owner connection operations remain separate and privileged.

## Optional inbound MCP tools

The relay registers these tools only when a host injects a compatible task coordinator:

| Tool | Permission | Behavior |
|---|---|---|
| \`delegate_task\` | \`task:dispatch\` | Authorize a target agent/tool, create an idempotent task, and return its task ID and state |
| \`get_task\` | \`task:read\` | Return the caller's own task summary |
| \`wait_task\` | \`task:read\` | Wait up to 30 seconds for a task to reach a terminal state, then return the latest summary |
| \`cancel_task\` | \`task:cancel\` | Cancel a queued or active task owned by the caller |

Identity, tenant, and permissions are obtained from the trusted principal resolved for the current MCP request. Caller-supplied identity fields are not part of these tool schemas. Owner connection management is not exposed through these tools.

## Task record

The local coordinator creates:

- Server-generated \`taskId\` and \`traceId\`.
- \`tenantId\`, \`callerPrincipalId\`, \`targetAgentId\`, and the authorized \`connectionId\`.
- Approved \`toolName\`, JSON input, request fingerprint, and a scoped idempotency-key hash.
- \`state\`, \`attemptCount\`, optimistic-concurrency \`version\`, and \`deadlineAt\`.
- Creation/update/start/completion timestamps, JSON output, and a sanitized error code.

Raw idempotency keys, credentials, authorization headers, endpoint URLs, and MCP client handles do not belong in a persisted task record. The local in-memory store retains the request JSON and output JSON so that the original caller can inspect the task; a production retention/deletion policy remains an explicit release requirement.

## State model

\`\`\`text
queued -> dispatching -> working -> completed
   |          |             |
   |          |             +----> failed
   |          +------------------> failed
   +-----------------------------> expired

queued / dispatching / working -> canceled
\`\`\`

Terminal states are \`completed\`, \`failed\`, \`canceled\`, \`expired\`, and \`rejected\`. Each accepted transition uses a version-checked compare-and-swap and appends a task event as part of the repository operation.

## Idempotency and limits

- Idempotency keys are 8 to 128 characters and use the restricted identifier alphabet enforced by the service.
- The stored key hash is scoped to tenant and caller. Repeating the same key and same request returns the original task. Reusing the key for a different request returns \`IDEMPOTENCY_CONFLICT\`.
- Target authorization runs before task/outbox creation.
- Input JSON is limited to 64 KiB by default; output JSON is limited to 256 KiB.
- Default task timeout is 5 minutes; maximum task timeout is 10 minutes.
- \`wait_task\` defaults to 5 seconds and accepts 0 to 30 seconds.
- An outbox lease must exceed the configured maximum task duration.

Limits are constructor defaults for the local coordinator, not a production cost or quota policy. A deployment must configure them from the actual service capacity and provider terms.

## Repository interface

A task repository must implement these operations:

- \`createTask({ task, event, outbox })\`: atomically enforce the tenant/caller/idempotency uniqueness rule and write the task, initial event, and dispatch outbox record in one transaction. It returns the existing task for a duplicate key or the newly created task.
- \`getTask({ taskId, tenantId })\`: return a task only within its tenant.
- \`listEvents({ taskId, tenantId })\`: return ordered task events only within the tenant.
- \`transitionTask({ taskId, tenantId, expectedVersion, fromStates, toState, patch, event })\`: compare-and-swap the state/version and append the event atomically.
- \`claimNextOutbox({ workerId, now, leaseMs })\`: atomically lease one ready outbox record or reclaim an expired lease.
- \`completeOutbox({ outboxId, workerId, leaseAttempt, leaseUntil, completedAt })\`: complete only if the stored row is still leased to that worker, the monotonically increasing \`attempts\` value matches the claim, the stored lease deadline exactly matches the claimed deadline, and completion is strictly before lease expiry. A stale or expired claim returns \`false\`.

The committed \`src/relay/task-store-memory.mjs\` is a reference/test adapter. Its synchronous in-process map operations are not durable, do not provide cross-process locks, and are lost on restart. The shared behavioral suite in \`tests/support/task-repository-contract.mjs\` is registered by \`tests/task-store-memory.test.mjs\`; it covers eight shared invariants, including uniqueness scoped by both tenant and caller. A future D1 or PostgreSQL adapter should register the same contract with its own \`createRepository\` factory. Passing this shared suite will be necessary but not sufficient: each durable adapter must additionally prove transactional rollback, provider-specific uniqueness and compare-and-swap semantics, database-authoritative lease expiry, cross-process contention, and restart recovery. No production SQL migrations, D1/Postgres/Supabase adapter, queue, durable outbox, or worker deployment is included.

## Dispatch and remote outcome safety

\`createRegistryTaskCoordinator\` wires the repository-backed coordinator to the in-memory agent registry. Authorization checks that the target is visible to the tenant/caller and the requested tool is approved. Before dispatch, the registry-backed dispatcher discovers the current remote tool schema and recomputes the canonical fingerprint. A missing or changed schema fails with \`SCHEMA_CHANGED\` before invocation.

The dispatcher passes the task's abort signal to the MCP client call. Cancellation and timeout are best-effort: a remote server may already have received or started a request before the relay aborts its local wait.

The worker does not automatically retry a remote invocation. If an outbox lease expires and the task is already \`dispatching\` or \`working\`, the recovered worker marks the task \`REMOTE_OUTCOME_UNKNOWN\` and does not dispatch it again. This avoids duplicating non-idempotent remote side effects when the first worker may have reached the target but failed before saving the result. Completion fencing prevents a stale worker from overwriting the outbox after expiry or reclaim. It does not by itself eliminate the narrow race in which a suspended worker resumes between its final task-state check and the external MCP call; a durable worker design must test this boundary and establish an end-to-end idempotency/fencing contract before retrying.

## Local worker contract

A host calls \`processNext({ workerId })\` to claim and process one outbox item. It may run this from a controlled worker process or queue consumer. No scheduler, polling daemon, durable queue consumer, or production task runtime is currently configured.

## Release blockers

- Implement a durable repository that satisfies the atomic transaction/CAS/lease contract.
- Select and configure one authoritative database and a durable queue/outbox delivery mechanism.
- Define task and artifact retention, export, deletion, encryption, and privacy policy.
- Implement recovery/monitoring, worker lifecycle, lease renewal if required, and operational dead-letter/reconciliation procedures.
- Add a durable dispatch-start/lease-ownership boundary and adversarial pause/resume tests for the interval between the final state check and the external MCP call.
- Verify request cancellation and idempotency against an independently operated MCP target.
- Add integration tests for cross-process races, worker termination at every state boundary, transaction rollback, redelivery, and lost remote responses.
- Prove the complete flow through a live requesting MCP client and a separately operated remote agent.

No production credentials, database, queue, Cloudflare resources, DNS, or deployment have been changed by this local implementation.

## Verification status

The current task-contract implementation and its documentation checkpoint passed the complete GitHub Actions quality workflow. The implementation commit is `b5904db4fdaf1d608e5264f86038a45380116fb5`; the CI-tested documentation checkpoint is `58f6ee0c73ad1e2836d9aba472d07bdab7c2a034`.

- Task-contract implementation commit: `b5904db4fdaf1d608e5264f86038a45380116fb5`
- Documentation checkpoint commit: `58f6ee0c73ad1e2836d9aba472d07bdab7c2a034`
- CI run: [41289621348](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41289621348)
- PR merge revision checked out by CI: `e60e52c301f3a98c3cf9dc64c0ddc2ca031b5941`
- Task coordinator: 15/15.
- Task dispatcher: 8/8.
- Reusable task repository contract suite: 8/8.
- Full Node suite: 98/98.
- Python Wellness Doctor: 10/10.
- Repository Doctor: 117 passed, zero warnings/errors/critical.
- Both workflow YAML files parsed successfully; every focused gate and the final complete quality gate passed.

TDD evidence: run [41288627434](https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/runs/41288627434) observed both original lease-fencing regressions fail with the expected `true !== false` assertions. The reusable contract harness expanded the coverage to eight adapter-neutral repository tests, including tenant-and-caller-scoped idempotency; run 41289499297 passed the full suite with 98/98 Node tests.

These checks verify the local in-memory implementation and integration seams. They do not verify production database transactions, authoritative database-clock expiry, cross-process CAS, restart recovery, queue redelivery, the suspended-worker dispatch race, production retention/deletion, or a real remote MCP target. Those remain release blockers.
