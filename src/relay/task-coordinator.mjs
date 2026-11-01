import { createHash, randomUUID } from "node:crypto";

const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_REMOTE_ERRORS = new Set([
  "REMOTE_TIMEOUT",
  "REMOTE_UNAVAILABLE",
  "REMOTE_FAILED",
  "AGENT_NOT_FOUND",
  "TOOL_NOT_ALLOWED",
  "SCHEMA_CHANGED",
  "PERMISSION_DENIED"
]);
const ACTIVE_STATES = new Set(["queued", "dispatching", "working"]);
const TERMINAL_STATES = new Set(["completed", "failed", "canceled", "expired", "rejected"]);

export class TaskCoordinatorError extends Error {
  constructor(code) {
    super(code);
    this.name = "TaskCoordinatorError";
    this.code = code;
  }
}

function fail(code) {
  return new TaskCoordinatorError(code);
}

function requirePermission(principal, permission) {
  if (
    !principal ||
    typeof principal.principalId !== "string" ||
    principal.principalId.length === 0 ||
    typeof principal.tenantId !== "string" ||
    principal.tenantId.length === 0 ||
    !Array.isArray(principal.permissions)
  ) {
    throw fail("AUTH_REQUIRED");
  }
  if (!principal.permissions.includes(permission)) throw fail("PERMISSION_DENIED");
}

function normalizeJson(value, ancestors = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw fail("TASK_INPUT_INVALID");
    return value;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw fail("TASK_INPUT_INVALID");
    ancestors.add(value);
    const normalized = value.map((item) => normalizeJson(item, ancestors));
    ancestors.delete(value);
    return normalized;
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw fail("TASK_INPUT_INVALID");
    if (ancestors.has(value)) throw fail("TASK_INPUT_INVALID");
    ancestors.add(value);
    const normalized = Object.create(null);
    for (const key of Object.keys(value).sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) throw fail("TASK_INPUT_INVALID");
      normalized[key] = normalizeJson(descriptor.value, ancestors);
    }
    ancestors.delete(value);
    return normalized;
  }
  throw fail("TASK_INPUT_INVALID");
}

function serializeJson(value, maximumBytes, tooLargeCode, invalidCode = "TASK_INPUT_INVALID") {
  let serialized;
  try {
    serialized = JSON.stringify(normalizeJson(value));
  } catch (error) {
    if (error instanceof TaskCoordinatorError) {
      if (error.code === "TASK_INPUT_INVALID" && invalidCode !== "TASK_INPUT_INVALID") {
        throw fail(invalidCode);
      }
      throw error;
    }
    throw fail(invalidCode);
  }
  if (typeof serialized !== "string") throw fail(invalidCode);
  const bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes > maximumBytes) throw fail(tooLargeCode);
  return { serialized, bytes, value: JSON.parse(serialized) };
}

function digest(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeTargetError(error) {
  const code = error?.code;
  if (
    code === "AGENT_NOT_FOUND" ||
    code === "TOOL_NOT_ALLOWED" ||
    code === "PERMISSION_DENIED" ||
    code === "SCHEMA_CHANGED"
  ) return fail(code);
  return fail("TARGET_NOT_AUTHORIZED");
}

function safeRemoteError(error, signal, task, timestamp) {
  if (timestamp >= task.deadlineAt || (signal?.aborted && timestamp >= task.deadlineAt)) {
    return "REMOTE_TIMEOUT";
  }
  if (error?.code === "TASK_OUTPUT_TOO_LARGE" || error?.code === "TASK_OUTPUT_INVALID") {
    return error.code;
  }
  if (SAFE_REMOTE_ERRORS.has(error?.code)) return error.code;
  return "REMOTE_FAILED";
}

function cloneTask(task) {
  return task ? structuredClone(task) : null;
}

function createEvent(task, {
  eventType,
  fromState = null,
  toState,
  at,
  actorPrincipalId = null,
  errorCode = null
}) {
  return {
    eventId: randomUUID(),
    taskId: task.taskId,
    tenantId: task.tenantId,
    eventType,
    fromState,
    toState,
    at,
    actorPrincipalId,
    errorCode
  };
}

function createOutboxRecord(task, timestamp) {
  return {
    outboxId: randomUUID(),
    taskId: task.taskId,
    tenantId: task.tenantId,
    eventType: "task.dispatch",
    status: "pending",
    attempts: 0,
    availableAt: timestamp,
    createdAt: timestamp,
    leaseUntil: null,
    workerId: null,
    completedAt: null
  };
}

function validateRepository(repository) {
  const required = [
    "createTask",
    "getTask",
    "listEvents",
    "transitionTask",
    "claimNextOutbox",
    "completeOutbox"
  ];
  if (!repository || required.some((name) => typeof repository[name] !== "function")) {
    throw new TypeError("Task repository must implement the atomic task and outbox contract.");
  }
}

function awaitWithSignal(promise, signal) {
  let abortHandler;
  const aborted = new Promise((_, reject) => {
    abortHandler = () => reject(signal.reason ?? new Error("Aborted"));
    if (signal.aborted) abortHandler();
    else signal.addEventListener("abort", abortHandler, { once: true });
  });
  return Promise.race([promise, aborted]).finally(() => {
    if (abortHandler) signal.removeEventListener("abort", abortHandler);
  });
}

export function createTaskCoordinator({
  repository,
  authorizeTarget,
  dispatch,
  clock = () => Date.now(),
  defaultTimeoutMs = 300000,
  maxTaskDurationMs = 600000,
  maxInputBytes = 64 * 1024,
  maxOutputBytes = 256 * 1024,
  outboxLeaseMs
} = {}) {
  validateRepository(repository);
  if (typeof authorizeTarget !== "function") throw new TypeError("authorizeTarget must be a function.");
  if (typeof dispatch !== "function") throw new TypeError("dispatch must be a function.");
  if (typeof clock !== "function") throw new TypeError("clock must be a function.");
  if (!Number.isSafeInteger(maxTaskDurationMs) || maxTaskDurationMs < 1000) {
    throw new TypeError("maxTaskDurationMs must be at least 1000 milliseconds.");
  }
  if (!Number.isSafeInteger(defaultTimeoutMs) || defaultTimeoutMs < 1 || defaultTimeoutMs > maxTaskDurationMs) {
    throw new TypeError("defaultTimeoutMs must be positive and no greater than maxTaskDurationMs.");
  }
  if (!Number.isSafeInteger(maxInputBytes) || maxInputBytes < 1) throw new TypeError("maxInputBytes must be positive.");
  if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1) throw new TypeError("maxOutputBytes must be positive.");
  const leaseMs = outboxLeaseMs ?? maxTaskDurationMs + 30000;
  if (!Number.isSafeInteger(leaseMs) || leaseMs <= maxTaskDurationMs) {
    throw new TypeError("outboxLeaseMs must be greater than maxTaskDurationMs.");
  }

  const activeControllers = new Map();

  function now() {
    const timestamp = clock();
    if (!Number.isFinite(timestamp) || timestamp < 0) throw fail("TASK_COORDINATOR_UNAVAILABLE");
    return Math.floor(timestamp);
  }

  async function readTask(taskId, tenantId) {
    try {
      return await repository.getTask({ taskId, tenantId });
    } catch {
      throw fail("TASK_STORE_UNAVAILABLE");
    }
  }

  async function getOwnedTask(principal, taskId, permission = "task:read") {
    requirePermission(principal, permission);
    if (typeof taskId !== "string" || !IDENTIFIER_PATTERN.test(taskId)) throw fail("TASK_NOT_FOUND");
    const task = await readTask(taskId, principal.tenantId);
    if (!task || task.callerPrincipalId !== principal.principalId) throw fail("TASK_NOT_FOUND");
    return task;
  }

  async function transition(task, toState, {
    eventType,
    patch = {},
    actorPrincipalId = null,
    errorCode = null
  }) {
    const timestamp = now();
    try {
      return await repository.transitionTask({
        taskId: task.taskId,
        tenantId: task.tenantId,
        expectedVersion: task.version,
        fromStates: [task.state],
        toState,
        patch: { ...patch, updatedAt: timestamp },
        event: createEvent(task, {
          eventType,
          fromState: task.state,
          toState,
          at: timestamp,
          actorPrincipalId,
          errorCode
        })
      }) ?? null;
    } catch {
      throw fail("TASK_STORE_UNAVAILABLE");
    }
  }

  async function createTask(principal, input = {}) {
    requirePermission(principal, "task:dispatch");
    const {
      targetAgentId,
      toolName,
      arguments: rawArguments,
      idempotencyKey,
      timeoutMs = defaultTimeoutMs
    } = input;

    if (
      typeof targetAgentId !== "string" ||
      !IDENTIFIER_PATTERN.test(targetAgentId) ||
      typeof toolName !== "string" ||
      !IDENTIFIER_PATTERN.test(toolName) ||
      typeof idempotencyKey !== "string" ||
      !IDEMPOTENCY_PATTERN.test(idempotencyKey)
    ) {
      throw fail("TASK_INPUT_INVALID");
    }
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > maxTaskDurationMs) {
      throw fail("TASK_TIMEOUT_INVALID");
    }
    if (!rawArguments || Array.isArray(rawArguments) || typeof rawArguments !== "object") {
      throw fail("TASK_INPUT_INVALID");
    }

    const normalizedInput = serializeJson(rawArguments, maxInputBytes, "TASK_PAYLOAD_TOO_LARGE");
    let target;
    try {
      target = await authorizeTarget(principal, { targetAgentId, toolName });
    } catch (error) {
      throw safeTargetError(error);
    }
    if (!target || typeof target.connectionId !== "string" || target.connectionId.length === 0) {
      throw fail("TARGET_NOT_AUTHORIZED");
    }

    const timestamp = now();
    const idempotencyKeyHash = digest(
      principal.tenantId + "\u0000" + principal.principalId + "\u0000" + idempotencyKey
    );
    const requestFingerprint = digest(JSON.stringify({
      targetAgentId,
      toolName,
      connectionId: target.connectionId,
      arguments: normalizedInput.value,
      timeoutMs
    }));
    const task = {
      taskId: randomUUID(),
      traceId: randomUUID(),
      tenantId: principal.tenantId,
      callerPrincipalId: principal.principalId,
      targetAgentId,
      connectionId: target.connectionId,
      toolName,
      input: normalizedInput.value,
      idempotencyKeyHash,
      requestFingerprint,
      state: "queued",
      attemptCount: 0,
      version: 1,
      deadlineAt: timestamp + timeoutMs,
      createdAt: timestamp,
      updatedAt: timestamp,
      startedAt: null,
      completedAt: null,
      output: null,
      errorCode: null,
      cancelRequestedAt: null
    };
    const event = createEvent(task, {
      eventType: "task.created",
      toState: "queued",
      at: timestamp,
      actorPrincipalId: principal.principalId
    });
    const outbox = createOutboxRecord(task, timestamp);

    let created;
    try {
      created = await repository.createTask({ task, event, outbox });
    } catch {
      throw fail("TASK_STORE_UNAVAILABLE");
    }
    if (!created || typeof created.created !== "boolean" || !created.task) {
      throw fail("TASK_STORE_UNAVAILABLE");
    }
    if (!created.created && created.task.requestFingerprint !== requestFingerprint) {
      throw fail("IDEMPOTENCY_CONFLICT");
    }
    return Object.freeze({ created: created.created, task: cloneTask(created.task) });
  }

  async function getTask(principal, taskId) {
    return cloneTask(await getOwnedTask(principal, taskId));
  }

  async function listTaskEvents(principal, taskId) {
    const task = await getOwnedTask(principal, taskId);
    try {
      return await repository.listEvents({ taskId: task.taskId, tenantId: task.tenantId });
    } catch {
      throw fail("TASK_STORE_UNAVAILABLE");
    }
  }

  async function waitTask(principal, taskId, { waitMs = 5000 } = {}) {
    if (!Number.isSafeInteger(waitMs) || waitMs < 0 || waitMs > 30000) {
      throw fail("TASK_WAIT_INVALID");
    }
    let current = await getOwnedTask(principal, taskId);
    const endAt = Date.now() + waitMs;
    while (ACTIVE_STATES.has(current.state) && Date.now() < endAt) {
      const remaining = endAt - Date.now();
      await new Promise((resolve) => setTimeout(resolve, Math.min(100, Math.max(1, remaining))));
      current = await getOwnedTask(principal, taskId);
    }
    return cloneTask(current);
  }

  async function cancelTask(principal, taskId) {
    requirePermission(principal, "task:cancel");
    if (typeof taskId !== "string" || !IDENTIFIER_PATTERN.test(taskId)) throw fail("TASK_NOT_FOUND");

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const task = await readTask(taskId, principal.tenantId);
      if (!task || task.callerPrincipalId !== principal.principalId) throw fail("TASK_NOT_FOUND");
      if (!ACTIVE_STATES.has(task.state)) throw fail("TASK_NOT_CANCELLABLE");
      const updated = await transition(task, "canceled", {
        eventType: "task.canceled",
        patch: { cancelRequestedAt: now(), completedAt: now() },
        actorPrincipalId: principal.principalId
      });
      if (updated) {
        const controller = activeControllers.get(taskId);
        if (controller && !controller.signal.aborted) controller.abort(fail("TASK_CANCELED"));
        return cloneTask(updated);
      }
    }
    throw fail("TASK_CONFLICT");
  }

  async function completeOutbox(outbox, workerId) {
    try {
      const completed = await repository.completeOutbox({
        outboxId: outbox.outboxId,
        workerId,
        completedAt: now()
      });
      if (completed !== true) throw fail("TASK_OUTBOX_LEASE_LOST");
    } catch (error) {
      if (error instanceof TaskCoordinatorError) throw error;
      throw fail("TASK_STORE_UNAVAILABLE");
    }
  }

  async function processNext({ workerId } = {}) {
    if (typeof workerId !== "string" || !IDENTIFIER_PATTERN.test(workerId)) {
      throw fail("TASK_WORKER_INVALID");
    }
    let outbox;
    try {
      outbox = await repository.claimNextOutbox({ workerId, now: now(), leaseMs });
    } catch {
      throw fail("TASK_STORE_UNAVAILABLE");
    }
    if (!outbox) return null;

    let task = await readTask(outbox.taskId, outbox.tenantId);
    if (!task) {
      await completeOutbox(outbox, workerId);
      return Object.freeze({ status: "skipped", task: null });
    }

    if (task.state !== "queued") {
      if (task.state === "dispatching" || task.state === "working") {
        const failed = await transition(task, "failed", {
          eventType: "task.remote_outcome_unknown",
          patch: { errorCode: "REMOTE_OUTCOME_UNKNOWN", completedAt: now() },
          errorCode: "REMOTE_OUTCOME_UNKNOWN"
        });
        const current = failed ?? await readTask(task.taskId, task.tenantId);
        await completeOutbox(outbox, workerId);
        return Object.freeze({ status: current?.state ?? "skipped", task: cloneTask(current) });
      }
      await completeOutbox(outbox, workerId);
      return Object.freeze({ status: "skipped", task: cloneTask(task) });
    }

    const timestamp = now();
    if (task.deadlineAt <= timestamp) {
      const expired = await transition(task, "expired", {
        eventType: "task.expired",
        patch: { errorCode: "TASK_DEADLINE_EXCEEDED", completedAt: timestamp },
        errorCode: "TASK_DEADLINE_EXCEEDED"
      });
      const current = expired ?? await readTask(task.taskId, task.tenantId);
      await completeOutbox(outbox, workerId);
      return Object.freeze({ status: current?.state ?? "skipped", task: cloneTask(current) });
    }

    const controller = new AbortController();
    activeControllers.set(task.taskId, controller);
    const remainingMs = Math.max(1, task.deadlineAt - timestamp);
    const timeoutSignal = AbortSignal.timeout(remainingMs);
    const signal = AbortSignal.any([controller.signal, timeoutSignal]);

    try {
      const dispatching = await transition(task, "dispatching", {
        eventType: "task.dispatch_started",
        patch: { attemptCount: task.attemptCount + 1, startedAt: timestamp }
      });
      if (!dispatching) {
        const current = await readTask(task.taskId, task.tenantId);
        await completeOutbox(outbox, workerId);
        return Object.freeze({ status: current?.state ?? "skipped", task: cloneTask(current) });
      }

      const working = await transition(dispatching, "working", {
        eventType: "task.remote_work_started"
      });
      if (!working) {
        const current = await readTask(task.taskId, task.tenantId);
        await completeOutbox(outbox, workerId);
        return Object.freeze({ status: current?.state ?? "skipped", task: cloneTask(current) });
      }

      // Cancellation may commit while the working transition promise is still resolving.
      // The controller is already registered, and the stored state is re-read before dispatch.
      const currentBeforeDispatch = await readTask(task.taskId, task.tenantId);
      if (signal.aborted || !currentBeforeDispatch || currentBeforeDispatch.state !== "working") {
        await completeOutbox(outbox, workerId);
        return Object.freeze({
          status: currentBeforeDispatch?.state ?? "skipped",
          task: cloneTask(currentBeforeDispatch)
        });
      }

      const dispatchPromise = Promise.resolve().then(() => {
        if (signal.aborted) throw signal.reason ?? fail("TASK_CANCELED");
        return dispatch(cloneTask(currentBeforeDispatch), { signal });
      });
      const rawOutput = await awaitWithSignal(dispatchPromise, signal);
      const normalizedOutput = serializeJson(
        rawOutput,
        maxOutputBytes,
        "TASK_OUTPUT_TOO_LARGE",
        "TASK_OUTPUT_INVALID"
      );

      const current = await readTask(task.taskId, task.tenantId);
      if (!current || current.state !== "working") {
        await completeOutbox(outbox, workerId);
        return Object.freeze({ status: current?.state ?? "skipped", task: cloneTask(current) });
      }

      const completedAt = now();
      if (current.deadlineAt <= completedAt) {
        const expired = await transition(current, "expired", {
          eventType: "task.expired",
          patch: { errorCode: "TASK_DEADLINE_EXCEEDED", completedAt },
          errorCode: "TASK_DEADLINE_EXCEEDED"
        });
        const finalTask = expired ?? await readTask(task.taskId, task.tenantId);
        await completeOutbox(outbox, workerId);
        return Object.freeze({ status: finalTask?.state ?? "expired", task: cloneTask(finalTask) });
      }

      const completed = await transition(current, "completed", {
        eventType: "task.completed",
        patch: { output: normalizedOutput.value, completedAt, errorCode: null }
      });
      const finalTask = completed ?? await readTask(task.taskId, task.tenantId);
      await completeOutbox(outbox, workerId);
      return Object.freeze({ status: finalTask?.state ?? "skipped", task: cloneTask(finalTask) });
    } catch (error) {
      const current = await readTask(task.taskId, task.tenantId);
      if (!current || TERMINAL_STATES.has(current.state)) {
        await completeOutbox(outbox, workerId);
        return Object.freeze({ status: current?.state ?? "skipped", task: cloneTask(current) });
      }

      const errorCode = error?.code === "TASK_CANCELED"
        ? "TASK_CANCELED"
        : safeRemoteError(error, signal, current, now());
      const toState = errorCode === "TASK_CANCELED" ? "canceled" : "failed";
      const failedAt = now();
      const updated = await transition(current, toState, {
        eventType: toState === "canceled" ? "task.canceled" : "task.failed",
        patch: { errorCode, completedAt: failedAt },
        errorCode
      });
      const finalTask = updated ?? await readTask(task.taskId, task.tenantId);
      await completeOutbox(outbox, workerId);
      return Object.freeze({ status: finalTask?.state ?? "skipped", task: cloneTask(finalTask) });
    } finally {
      if (activeControllers.get(task.taskId) === controller) {
        activeControllers.delete(task.taskId);
      }
    }
  }

  async function close() {
    for (const controller of activeControllers.values()) {
      if (!controller.signal.aborted) controller.abort(fail("TASK_COORDINATOR_CLOSED"));
    }
    activeControllers.clear();
  }

  return Object.freeze({
    createTask,
    getTask,
    listTaskEvents,
    waitTask,
    cancelTask,
    processNext,
    close
  });
}
