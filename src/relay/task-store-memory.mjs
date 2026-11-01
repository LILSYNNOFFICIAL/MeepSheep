import { randomUUID } from "node:crypto";

function copy(value) {
  return value === null || value === undefined ? value : structuredClone(value);
}

export function createInMemoryTaskRepository() {
  const tasks = new Map();
  const events = new Map();
  const outbox = new Map();
  const idempotency = new Map();

  function idempotencyIndex(task) {
    return task.tenantId + "\u0000" + task.callerPrincipalId + "\u0000" + task.idempotencyKeyHash;
  }

  return Object.freeze({
    async createTask({ task, event, outbox: outboxRecord }) {
      const index = idempotencyIndex(task);
      const existingTaskId = idempotency.get(index);
      if (existingTaskId) {
        return { created: false, task: copy(tasks.get(existingTaskId)) };
      }
      if (tasks.has(task.taskId) || outbox.has(outboxRecord.outboxId)) {
        throw new Error("Duplicate internal identifier.");
      }
      tasks.set(task.taskId, copy(task));
      idempotency.set(index, task.taskId);
      events.set(task.taskId, [copy(event)]);
      outbox.set(outboxRecord.outboxId, copy(outboxRecord));
      return { created: true, task: copy(task) };
    },

    async getTask({ taskId, tenantId }) {
      const task = tasks.get(taskId);
      if (!task || task.tenantId !== tenantId) return null;
      return copy(task);
    },

    async listEvents({ taskId, tenantId }) {
      const task = tasks.get(taskId);
      if (!task || task.tenantId !== tenantId) return [];
      return copy(events.get(taskId) ?? []);
    },

    async transitionTask({
      taskId,
      tenantId,
      expectedVersion,
      fromStates,
      toState,
      patch,
      event
    }) {
      const current = tasks.get(taskId);
      if (
        !current ||
        current.tenantId !== tenantId ||
        current.version !== expectedVersion ||
        !fromStates.includes(current.state)
      ) {
        return null;
      }
      const updated = {
        ...current,
        ...copy(patch),
        state: toState,
        version: current.version + 1
      };
      tasks.set(taskId, updated);
      const history = events.get(taskId) ?? [];
      history.push(copy(event));
      events.set(taskId, history);
      return copy(updated);
    },

    async claimNextOutbox({ workerId, now, leaseMs }) {
      const candidates = [...outbox.values()].sort((left, right) =>
        left.availableAt - right.availableAt ||
        left.createdAt - right.createdAt ||
        left.outboxId.localeCompare(right.outboxId)
      );
      const candidate = candidates.find((record) =>
        (
          record.status === "pending" &&
          record.availableAt <= now
        ) ||
        (
          record.status === "leased" &&
          record.leaseUntil !== null &&
          record.leaseUntil <= now
        )
      );
      if (!candidate) return null;
      const claimed = {
        ...candidate,
        status: "leased",
        attempts: candidate.attempts + 1,
        workerId,
        leaseUntil: now + leaseMs
      };
      outbox.set(candidate.outboxId, claimed);
      return copy(claimed);
    },

    async completeOutbox({ outboxId, workerId, leaseAttempt, leaseUntil, completedAt }) {
      const record = outbox.get(outboxId);
      if (
        !record ||
        record.status !== "leased" ||
        record.workerId !== workerId ||
        !Number.isSafeInteger(leaseAttempt) ||
        record.attempts !== leaseAttempt ||
        !Number.isFinite(leaseUntil) ||
        record.leaseUntil !== leaseUntil ||
        !Number.isFinite(completedAt) ||
        completedAt >= record.leaseUntil
      ) {
        return false;
      }
      outbox.set(outboxId, {
        ...record,
        status: "completed",
        completedAt,
        leaseUntil: null
      });
      return true;
    },

    getOutboxSnapshot() {
      return copy([...outbox.values()]);
    },

    getTaskSnapshot(taskId) {
      return copy(tasks.get(taskId) ?? null);
    },

    getEventSnapshot(taskId) {
      return copy(events.get(taskId) ?? []);
    }
  });
}
