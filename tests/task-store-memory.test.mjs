import assert from "node:assert/strict";
import { test } from "node:test";
import { createInMemoryTaskRepository } from "../src/relay/task-store-memory.mjs";

async function seededRepository() {
  const repository = createInMemoryTaskRepository();
  const task = {
    taskId: "task-a",
    tenantId: "tenant-a",
    callerPrincipalId: "caller-a",
    idempotencyKeyHash: "idempotency-hash-a",
    version: 1,
    state: "queued"
  };
  const event = {
    eventId: "event-a",
    taskId: task.taskId,
    tenantId: task.tenantId,
    eventType: "task.created",
    toState: "queued",
    at: 1000
  };
  const outbox = {
    outboxId: "outbox-a",
    taskId: task.taskId,
    tenantId: task.tenantId,
    eventType: "task.dispatch",
    status: "pending",
    attempts: 0,
    availableAt: 1000,
    createdAt: 1000,
    leaseUntil: null,
    workerId: null,
    completedAt: null
  };

  await repository.createTask({ task, event, outbox });
  return repository;
}

test("an expired outbox lease cannot be completed by its former worker", async () => {
  const repository = await seededRepository();
  const firstLease = await repository.claimNextOutbox({
    workerId: "worker-a",
    now: 1000,
    leaseMs: 100
  });

  assert.equal(firstLease.leaseUntil, 1100);
  const completed = await repository.completeOutbox({
    outboxId: firstLease.outboxId,
    workerId: "worker-a",
    leaseAttempt: firstLease.attempts,
    leaseUntil: firstLease.leaseUntil,
    completedAt: 1100
  });

  assert.equal(completed, false);
  const reclaimed = await repository.claimNextOutbox({
    workerId: "worker-b",
    now: 1100,
    leaseMs: 100
  });
  assert.equal(reclaimed.workerId, "worker-b");
  assert.equal(reclaimed.attempts, 2);
});

test("a stale lease generation cannot complete a reclaimed lease with the same worker ID", async () => {
  const repository = await seededRepository();
  const firstLease = await repository.claimNextOutbox({
    workerId: "worker-a",
    now: 1000,
    leaseMs: 100
  });
  const currentLease = await repository.claimNextOutbox({
    workerId: "worker-a",
    now: 1100,
    leaseMs: 100
  });

  assert.equal(firstLease.attempts, 1);
  assert.equal(currentLease.attempts, 2);
  assert.equal(currentLease.leaseUntil, 1200);

  const staleCompletion = await repository.completeOutbox({
    outboxId: firstLease.outboxId,
    workerId: "worker-a",
    leaseAttempt: firstLease.attempts,
    leaseUntil: firstLease.leaseUntil,
    completedAt: 1150
  });
  assert.equal(staleCompletion, false);

  const currentCompletion = await repository.completeOutbox({
    outboxId: currentLease.outboxId,
    workerId: "worker-a",
    leaseAttempt: currentLease.attempts,
    leaseUntil: currentLease.leaseUntil,
    completedAt: 1150
  });
  assert.equal(currentCompletion, true);
});
