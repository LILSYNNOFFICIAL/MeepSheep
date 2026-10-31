# MeepSheep Cost Model and Abuse Budgets

**Status:** Cost-control design. No provider prices or measured costs are asserted.

## 1. Separate who pays

Track three cost domains independently:

1. **MeepSheep infrastructure:** Worker execution, durable orchestration, database/storage operations, logs, network transfer, and optional observability.
2. **Caller/provider inference:** Model/API usage charged to the owner of the connected model or provider credential.
3. **Remote agent execution:** Charges incurred by the target agent's operator or provider.

Do not represent a task as free merely because MeepSheep does not pay the remote model's inference bill. Clearly disclose which party's credentials and billing account are used.

## 2. Per-task cost model

For each task, estimate and later reconcile:

`task_cost = platform_compute + durable_execution + database + storage + transfer + provider_usage + retries`

Where provider usage is available, record the provider-reported units and cost. Where it is unavailable, mark it unknown rather than inventing a price.

A fan-out task aggregates the cost and budget reservation of every child task. Parent tasks cannot create child budgets larger than the remaining parent budget.

## 3. Budget enforcement

Before dispatch:
- Authenticate caller and target.
- Calculate the maximum permitted fan-out and payload.
- Estimate known costs and reserve the configured budget.
- Reject or request approval when the reservation exceeds the limit.
- Require a hard ceiling for unknown-cost providers or disable those integrations for constrained tiers.

After execution:
- Reconcile estimated and reported usage.
- Release unused reservations.
- Record unknown or delayed charges distinctly.
- Alert on unexpected deltas.

## 4. Mandatory limits

Apply configurable limits at tenant, caller, connection, agent, and task levels:

- Requests per time window.
- Concurrent tasks.
- Maximum task duration and deadline.
- Maximum payload and artifact size.
- Maximum number of target agents per task.
- Maximum delegation depth.
- Maximum child tasks and total fan-out.
- Maximum retries and callback attempts.
- Maximum stored messages and retention.
- Daily and monthly budget ceilings.

Limits must be enforced server-side. Client-side warnings are not controls.

## 5. Retry and idempotency policy

Retries are bounded and only occur when the adapter's semantics permit them. A retry must reuse the same idempotency identity where supported. Do not automatically retry non-idempotent external actions without a safe deduplication mechanism.

## 6. Free and paid tiers

Do not promise unlimited free usage. Define tiers only after measuring actual infrastructure and provider costs. A free tier needs hard limits, abuse controls, and a kill switch for expensive adapters. Provider inference may still be billed separately to the user's connected provider account.

## 7. Cost reporting

Expose to the owner:
- Tasks by tenant, caller, target, and provider.
- Estimated and measured platform cost.
- Provider-reported usage where available.
- Retry and fan-out overhead.
- Budget reservations, actuals, and unknown amounts.
- Alerts, rejections, and limit hits.

Never expose another tenant's usage or provider billing metadata.

## 8. Acceptance tests

- Budget reservation happens before external dispatch.
- Parallel child tasks cannot exceed the parent budget.
- Retries cannot bypass request or spend limits.
- Unknown provider costs are represented as unknown.
- Revoked or disabled adapters cannot continue spending.
- Usage records reconcile correctly after success, failure, timeout, and cancellation.
