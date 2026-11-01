import assert from "node:assert/strict";

function records(suffix, {
  tenantId = "tenant-a",
  callerPrincipalId = "caller-a",
  idempotencyKeyHash = "idempotency-hash-a"
} = {}) {
  const task = {
    taskId: `task-${suffix}`,
    tenantId,
    callerPrincipalId,
    idempotencyKeyHash,
    requestFingerprint: `fingerprint-${suffix}`,
    version: 1,
    state: "queued"
  };
  const event = {
    eventId: `event-${suffix}`,
    taskId: task.taskId,
    tenantId,
    eventType: "task.created",
    fromState: null,
    toState: "queued",
    at: 1000,
    actorPrincipalId: callerPrincipalId
  };
  const outbox = {
    outboxId: `outbox-${suffix}`,
    taskId: task.taskId,
    tenantId,
    eventType: "task.dispatch",
    status: "pending",
    attempts: 0,
    availableAt: 1000,
    createdAt: 1000,
    leaseUntil: null,
    workerId: null,
    completedAt: null
  };
  return { task, event, outbox };
}

async function seed(repository, suffix = "seed", options = {}) {
  const fixture = records(suffix, options);
  const created = await repository.createTask(fixture);
  assert.equal(created.created, true);
  return fixture;
}

/**
 * Register the shared behavioral contract for any task repository adapter.
 * Future durable adapters can call this with their own repository factory.
 */
export function registerTaskRepositoryContract({ test, createRepository, name = "task repository" }) {
  if (typeof test !== "function" || typeof createRepository !== "function") {
    throw new TypeError("Task repository contract requires test and createRepository functions.");
  }
  const named = (description) => `${name}: ${description}`;

  test(named("concurrent idempotent creation stores one task, event, and outbox item"), async () => {
    const repository = await createRepository();
    const first = records("first");
    const second = records("second");
    const results = await Promise.all([
      repository.createTask(first),
      repository.createTask(second)
    ]);

    assert.equal(results.filter((result) => result.created).length, 1);
    assert.equal(results[0].task.taskId, results[1].task.taskId);
    const storedTask = results[0].task;
    assert.deepEqual(
      await repository.getTask({ taskId: storedTask.taskId, tenantId: storedTask.tenantId }),
      storedTask
    );
    assert.equal(
      (await repository.listEvents({ taskId: storedTask.taskId, tenantId: storedTask.tenantId })).length,
      1
    );

    const claimed = await repository.claimNextOutbox({
      workerId: "worker-a",
      now: 1000,
      leaseMs: 100
    });
    assert.equal(claimed.taskId, storedTask.taskId);
    assert.equal(await repository.claimNextOutbox({
      workerId: "worker-b",
      now: 1000,
      leaseMs: 100
    }), null);
  });

  test(named("task and event reads never cross tenant boundaries"), async () => {
    const repository = await createRepository();
    const { task, event } = await seed(repository, "tenant-scope");

    assert.deepEqual(
      await repository.getTask({ taskId: task.taskId, tenantId: task.tenantId }),
      task
    );
    assert.equal(await repository.getTask({ taskId: task.taskId, tenantId: "tenant-other" }), null);
    assert.deepEqual(
      await repository.listEvents({ taskId: task.taskId, tenantId: task.tenantId }),
      [event]
    );
    assert.deepEqual(
      await repository.listEvents({ taskId: task.taskId, tenantId: "tenant-other" }),
      []
    );
  });

  test(named("concurrent version-checked transitions append exactly one winning event"), async () => {
    const repository = await createRepository();
    const { task } = await seed(repository, "transition");
    const makeTransition = (toState, eventId) => repository.transitionTask({
      taskId: task.taskId,
      tenantId: task.tenantId,
      expectedVersion: 1,
      fromStates: ["queued"],
      toState,
      patch: { updatedAt: 1100 },
      event: {
        eventId,
        taskId: task.taskId,
        tenantId: task.tenantId,
        eventType: `task.${toState}`,
        fromState: "queued",
        toState,
        at: 1100,
        actorPrincipalId: task.callerPrincipalId
      }
    });

    const results = await Promise.all([
      makeTransition("working", "event-working"),
      makeTransition("failed", "event-failed")
    ]);
    assert.equal(results.filter(Boolean).length, 1);

    const storedTask = await repository.getTask({ taskId: task.taskId, tenantId: task.tenantId });
    assert.equal(storedTask.version, 2);
    assert.ok(["working", "failed"].includes(storedTask.state));
    const events = await repository.listEvents({ taskId: task.taskId, tenantId: task.tenantId });
    assert.equal(events.length, 2);
    assert.equal(events[1].toState, storedTask.state);
  });

  test(named("outbox claims are exclusive until expiry and reclaim increments the attempt"), async () => {
    const repository = await createRepository();
    const { outbox } = await seed(repository, "reclaim");
    const first = await repository.claimNextOutbox({
      workerId: "worker-a",
      now: 1000,
      leaseMs: 100
    });

    assert.equal(first.outboxId, outbox.outboxId);
    assert.equal(first.attempts, 1);
    assert.equal(first.leaseUntil, 1100);
    assert.equal(await repository.claimNextOutbox({
      workerId: "worker-b",
      now: 1099,
      leaseMs: 100
    }), null);

    const reclaimed = await repository.claimNextOutbox({
      workerId: "worker-b",
      now: 1100,
      leaseMs: 100
    });
    assert.equal(reclaimed.workerId, "worker-b");
    assert.equal(reclaimed.attempts, 2);
    assert.equal(reclaimed.leaseUntil, 1200);
  });

  test(named("only the current worker and exact unexpired lease can complete an outbox item"), async () => {
    const repository = await createRepository();
    const { outbox } = await seed(repository, "complete");
    const lease = await repository.claimNextOutbox({
      workerId: "worker-a",
      now: 1000,
      leaseMs: 100
    });
    const base = {
      outboxId: outbox.outboxId,
      leaseAttempt: lease.attempts,
      leaseUntil: lease.leaseUntil,
      completedAt: 1050
    };

    assert.equal(await repository.completeOutbox({ ...base, workerId: "worker-b" }), false);
    assert.equal(await repository.completeOutbox({ ...base, workerId: "worker-a", leaseAttempt: 2 }), false);
    assert.equal(await repository.completeOutbox({ ...base, workerId: "worker-a", leaseUntil: 1101 }), false);
    assert.equal(await repository.completeOutbox({ ...base, workerId: "worker-a" }), true);
    assert.equal(await repository.completeOutbox({ ...base, workerId: "worker-a" }), false);
  });

  test(named("an expired outbox lease cannot be completed by its former worker"), async () => {
    const repository = await createRepository();
    const { outbox } = await seed(repository, "expired");
    const lease = await repository.claimNextOutbox({
      workerId: "worker-a",
      now: 1000,
      leaseMs: 100
    });

    const completed = await repository.completeOutbox({
      outboxId: outbox.outboxId,
      workerId: "worker-a",
      leaseAttempt: lease.attempts,
      leaseUntil: lease.leaseUntil,
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

  test(named("a stale lease generation cannot complete a reclaimed lease with the same worker ID"), async () => {
    const repository = await createRepository();
    const { outbox } = await seed(repository, "generation");
    const first = await repository.claimNextOutbox({
      workerId: "worker-a",
      now: 1000,
      leaseMs: 100
    });
    const current = await repository.claimNextOutbox({
      workerId: "worker-a",
      now: 1100,
      leaseMs: 100
    });

    assert.equal(first.attempts, 1);
    assert.equal(current.attempts, 2);

    const staleCompletion = await repository.completeOutbox({
      outboxId: outbox.outboxId,
      workerId: "worker-a",
      leaseAttempt: first.attempts,
      leaseUntil: first.leaseUntil,
      completedAt: 1150
    });
    assert.equal(staleCompletion, false);

    const currentCompletion = await repository.completeOutbox({
      outboxId: outbox.outboxId,
      workerId: "worker-a",
      leaseAttempt: current.attempts,
      leaseUntil: current.leaseUntil,
      completedAt: 1150
    });
    assert.equal(currentCompletion, true);
  });
}
