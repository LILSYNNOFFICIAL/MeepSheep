import assert from "node:assert/strict";
import { test } from "node:test";
import { createTaskCoordinator } from "../src/relay/task-coordinator.mjs";
import { createInMemoryTaskRepository } from "../src/relay/task-store-memory.mjs";

const caller = {
  principalId: "caller-a",
  tenantId: "tenant-a",
  permissions: ["task:dispatch", "task:read", "task:cancel"]
};
const otherCaller = {
  principalId: "caller-b",
  tenantId: "tenant-b",
  permissions: ["task:dispatch", "task:read", "task:cancel"]
};
const noDispatch = {
  principalId: "reader-a",
  tenantId: "tenant-a",
  permissions: ["task:read"]
};
const taskInput = {
  targetAgentId: "agent-a",
  toolName: "review_message",
  arguments: { message: "Review this." },
  idempotencyKey: "review-request-0001",
  timeoutMs: 10000
};

function setup({
  clock = () => 1000,
  authorizeTarget = async () => ({ connectionId: "connection-a" }),
  dispatch = async () => ({ accepted: true }),
  maxInputBytes = 4096,
  maxTaskDurationMs = 60000,
  defaultTimeoutMs = 30000
} = {}) {
  const repository = createInMemoryTaskRepository();
  const coordinator = createTaskCoordinator({
    repository,
    authorizeTarget,
    dispatch,
    clock,
    maxInputBytes,
    maxTaskDurationMs,
    defaultTimeoutMs
  });
  return { repository, coordinator };
}

test("createTask stores a server-identified queued task and a dispatch outbox entry", async () => {
  const { repository, coordinator } = setup();
  const result = await coordinator.createTask(caller, taskInput);
  assert.equal(result.created, true);
  assert.equal(result.task.state, "queued");
  assert.equal(result.task.tenantId, "tenant-a");
  assert.equal(result.task.callerPrincipalId, "caller-a");
  assert.equal(result.task.targetAgentId, "agent-a");
  assert.equal(result.task.connectionId, "connection-a");
  assert.equal(result.task.toolName, "review_message");
  assert.equal(result.task.deadlineAt, 11000);
  assert.equal(result.task.attemptCount, 0);
  assert.equal(result.task.version, 1);
  assert.ok(result.task.taskId);
  assert.ok(result.task.traceId);
  assert.equal(result.task.idempotencyKeyHash.includes(taskInput.idempotencyKey), false);
  assert.equal(JSON.stringify(result.task).includes("credential://"), false);
  assert.equal((await repository.listEvents({
    taskId: result.task.taskId,
    tenantId: "tenant-a"
  })).map((event) => event.eventType).join(","), "task.created");
  assert.equal(repository.getOutboxSnapshot().length, 1);
});

test("idempotent creation returns the original task and rejects key reuse with a different request", async () => {
  const { repository, coordinator } = setup();
  const first = await coordinator.createTask(caller, taskInput);
  const duplicate = await coordinator.createTask(caller, taskInput);
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.task.taskId, first.task.taskId);
  assert.equal(repository.getOutboxSnapshot().length, 1);
  await assert.rejects(
    coordinator.createTask(caller, {
      ...taskInput,
      arguments: { message: "A different payload." }
    }),
    (error) => error.code === "IDEMPOTENCY_CONFLICT"
  );
  assert.equal(repository.getOutboxSnapshot().length, 1);
});

test("idempotency scope is tenant and caller specific", async () => {
  const { coordinator } = setup();
  const first = await coordinator.createTask(caller, taskInput);
  const second = await coordinator.createTask(otherCaller, taskInput);
  assert.notEqual(first.task.taskId, second.task.taskId);
  assert.equal(second.task.tenantId, "tenant-b");
  assert.equal(second.task.callerPrincipalId, "caller-b");
});

test("dispatch creation requires authenticated caller and task:dispatch permission", async () => {
  const { coordinator, repository } = setup();
  await assert.rejects(
    coordinator.createTask(null, taskInput),
    (error) => error.code === "AUTH_REQUIRED"
  );
  await assert.rejects(
    coordinator.createTask(noDispatch, taskInput),
    (error) => error.code === "PERMISSION_DENIED"
  );
  assert.equal(repository.getOutboxSnapshot().length, 0);
});

test("target authorization happens before task or outbox creation", async () => {
  const { coordinator, repository } = setup({
    authorizeTarget: async () => { throw Object.assign(new Error("private detail"), { code: "AGENT_NOT_FOUND" }); }
  });
  await assert.rejects(
    coordinator.createTask(caller, taskInput),
    (error) => error.code === "AGENT_NOT_FOUND" && !error.message.includes("private detail")
  );
  assert.equal(repository.getOutboxSnapshot().length, 0);
});

test("payload and task deadlines are bounded before persistence", async () => {
  const { coordinator, repository } = setup({
    maxInputBytes: 16,
    maxTaskDurationMs: 5000,
    defaultTimeoutMs: 5000
  });
  await assert.rejects(
    coordinator.createTask(caller, {
      ...taskInput,
      arguments: { message: "This payload is too large." },
      timeoutMs: 5000
    }),
    (error) => error.code === "TASK_PAYLOAD_TOO_LARGE"
  );
  await assert.rejects(
    coordinator.createTask(caller, { ...taskInput, timeoutMs: 6000 }),
    (error) => error.code === "TASK_TIMEOUT_INVALID"
  );
  assert.equal(repository.getOutboxSnapshot().length, 0);
});

test("worker executes an outbox item and records queued, dispatching, working, and completed states", async () => {
  const dispatched = [];
  const { coordinator } = setup({
    dispatch: async (task, { signal }) => {
      dispatched.push({ taskId: task.taskId, signalAborted: signal.aborted });
      return { reply: "The remote agent completed the review." };
    }
  });
  const created = await coordinator.createTask(caller, taskInput);
  const result = await coordinator.processNext({ workerId: "worker-a" });
  assert.equal(result.status, "completed");
  assert.deepEqual(result.task.output, { reply: "The remote agent completed the review." });
  assert.equal(result.task.attemptCount, 1);
  assert.deepEqual(dispatched, [{ taskId: created.task.taskId, signalAborted: false }]);
  const events = await coordinator.listTaskEvents(caller, created.task.taskId);
  assert.deepEqual(events.map((event) => event.toState), [
    "queued", "dispatching", "working", "completed"
  ]);
  assert.equal((await coordinator.getTask(caller, created.task.taskId)).state, "completed");
});

test("expired tasks transition to expired without invoking the remote dispatcher", async () => {
  let now = 1000;
  let dispatchCalls = 0;
  const { coordinator } = setup({
    clock: () => now,
    dispatch: async () => { dispatchCalls += 1; return { ok: true }; }
  });
  const created = await coordinator.createTask(caller, { ...taskInput, timeoutMs: 100 });
  now = 1200;
  const result = await coordinator.processNext({ workerId: "worker-a" });
  assert.equal(result.status, "expired");
  assert.equal(result.task.state, "expired");
  assert.equal(dispatchCalls, 0);
});

test("remote failures are stored as sanitized error codes and do not expose provider details", async () => {
  const { coordinator } = setup({
    dispatch: async () => {
      throw Object.assign(new Error("REMOTE SECRET /internal/secret/path"), { code: "REMOTE_TIMEOUT" });
    }
  });
  const created = await coordinator.createTask(caller, taskInput);
  const result = await coordinator.processNext({ workerId: "worker-a" });
  assert.equal(result.task.state, "failed");
  assert.equal(result.task.errorCode, "REMOTE_TIMEOUT");
  assert.equal(JSON.stringify(await coordinator.listTaskEvents(caller, created.task.taskId))
    .includes("REMOTE SECRET"), false);
});

test("task and event reads are scoped to the creating caller and tenant", async () => {
  const { coordinator } = setup();
  const created = await coordinator.createTask(caller, taskInput);
  await assert.rejects(
    coordinator.getTask(otherCaller, created.task.taskId),
    (error) => error.code === "TASK_NOT_FOUND"
  );
  await assert.rejects(
    coordinator.listTaskEvents(otherCaller, created.task.taskId),
    (error) => error.code === "TASK_NOT_FOUND"
  );
  await assert.rejects(
    coordinator.getTask({
      ...caller,
      permissions: ["task:dispatch", "task:cancel"]
    }, created.task.taskId),
    (error) => error.code === "PERMISSION_DENIED"
  );
});

test("queued task cancellation prevents a later worker from dispatching it", async () => {
  let calls = 0;
  const { coordinator } = setup({
    dispatch: async () => { calls += 1; return { ok: true }; }
  });
  const created = await coordinator.createTask(caller, taskInput);
  const canceled = await coordinator.cancelTask(caller, created.task.taskId);
  assert.equal(canceled.state, "canceled");
  const result = await coordinator.processNext({ workerId: "worker-a" });
  assert.equal(result.status, "skipped");
  assert.equal(result.task.state, "canceled");
  assert.equal(calls, 0);
});


test("cancelTask retries a transient compare-and-swap conflict", async () => {
  const baseRepository = createInMemoryTaskRepository();
  let conflictsRemaining = 1;
  const repository = {
    createTask: (...args) => baseRepository.createTask(...args),
    getTask: (...args) => baseRepository.getTask(...args),
    listEvents: (...args) => baseRepository.listEvents(...args),
    claimNextOutbox: (...args) => baseRepository.claimNextOutbox(...args),
    completeOutbox: (...args) => baseRepository.completeOutbox(...args),
    transitionTask: async (input) => {
      if (input.toState === "canceled" && conflictsRemaining > 0) {
        conflictsRemaining -= 1;
        return null;
      }
      return baseRepository.transitionTask(input);
    }
  };
  const coordinator = createTaskCoordinator({
    repository,
    authorizeTarget: async () => ({ connectionId: "connection-a" }),
    dispatch: async () => ({ shouldNotRun: true }),
    clock: () => 1000,
    defaultTimeoutMs: 30000,
    maxTaskDurationMs: 60000
  });
  const created = await coordinator.createTask(caller, taskInput);
  const canceled = await coordinator.cancelTask(caller, created.task.taskId);
  assert.equal(canceled.state, "canceled");
  assert.equal(canceled.version, created.task.version + 1);
  const events = await coordinator.listTaskEvents(caller, created.task.taskId);
  assert.equal(events.filter((event) => event.eventType === "task.canceled").length, 1);
});

test("cancellation aborts an active dispatcher and prevents a late result from completing the task", async () => {
  let started;
  const startedPromise = new Promise((resolve) => { started = resolve; });
  const { coordinator } = setup({
    dispatch: async (_task, { signal }) => {
      started();
      await new Promise((resolve, reject) => {
        if (signal.aborted) return reject(signal.reason);
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
      return { shouldNotComplete: true };
    }
  });
  const created = await coordinator.createTask(caller, taskInput);
  const processing = coordinator.processNext({ workerId: "worker-a" });
  await startedPromise;
  const canceled = await coordinator.cancelTask(caller, created.task.taskId);
  assert.equal(canceled.state, "canceled");
  const result = await processing;
  assert.equal(result.task.state, "canceled");
  assert.equal(result.task.output, null);
});


test("cancellation after the working-state commit aborts before remote dispatch begins", async () => {
  const baseRepository = createInMemoryTaskRepository();
  let announceWorking;
  let releaseWorking;
  const workingCommitted = new Promise((resolve) => { announceWorking = resolve; });
  const holdTransition = new Promise((resolve) => { releaseWorking = resolve; });
  const repository = {
    createTask: (...args) => baseRepository.createTask(...args),
    getTask: (...args) => baseRepository.getTask(...args),
    listEvents: (...args) => baseRepository.listEvents(...args),
    claimNextOutbox: (...args) => baseRepository.claimNextOutbox(...args),
    completeOutbox: (...args) => baseRepository.completeOutbox(...args),
    transitionTask: async (input) => {
      const updated = await baseRepository.transitionTask(input);
      if (input.toState === "working") {
        announceWorking();
        await holdTransition;
      }
      return updated;
    }
  };
  let dispatchCalls = 0;
  const controlledCoordinator = createTaskCoordinator({
    repository,
    authorizeTarget: async () => ({ connectionId: "connection-a" }),
    dispatch: async () => { dispatchCalls += 1; return { shouldNotRun: true }; },
    clock: () => 1000,
    defaultTimeoutMs: 30000,
    maxTaskDurationMs: 60000
  });
  const created = await controlledCoordinator.createTask(caller, taskInput);
  const processing = controlledCoordinator.processNext({ workerId: "worker-a" });
  await workingCommitted;
  const canceled = await controlledCoordinator.cancelTask(caller, created.task.taskId);
  assert.equal(canceled.state, "canceled");
  releaseWorking();
  const result = await processing;
  assert.equal(result.task.state, "canceled");
  assert.equal(dispatchCalls, 0);
});

test("outbox claims are leased and may be reclaimed after an abandoned worker lease expires", async () => {
  const { repository, coordinator } = setup();
  const created = await coordinator.createTask(caller, taskInput);
  const first = await repository.claimNextOutbox({
    workerId: "worker-a",
    now: 1000,
    leaseMs: 100
  });
  assert.equal(first.taskId, created.task.taskId);
  assert.equal(await repository.claimNextOutbox({
    workerId: "worker-b",
    now: 1050,
    leaseMs: 100
  }), null);
  const reclaimed = await repository.claimNextOutbox({
    workerId: "worker-b",
    now: 1101,
    leaseMs: 100
  });
  assert.equal(reclaimed.taskId, created.task.taskId);
  assert.equal(reclaimed.workerId, "worker-b");
});
