import assert from "node:assert/strict";
import { test } from "node:test";
import { AgentRegistry } from "../src/relay/agent-registry.mjs";
import { fingerprintToolSchema } from "../src/relay/tool-schema.mjs";
import { createRegistryTaskCoordinator, createRegistryTaskDispatcher } from "../src/relay/task-dispatcher.mjs";
import { createInMemoryTaskRepository } from "../src/relay/task-store-memory.mjs";

const principal = {
  principalId: "caller-a",
  tenantId: "tenant-a",
  permissions: ["agent:message", "task:dispatch", "task:read", "task:cancel"]
};
const tool = {
  name: "review_message",
  description: "Review a message.",
  inputSchema: {
    type: "object",
    properties: { message: { type: "string" } },
    required: ["message"]
  },
  outputSchema: {
    type: "object",
    properties: { accepted: { type: "boolean" } },
    required: ["accepted"]
  }
};

function setup({ discoveredTool = tool, remoteResult = { structuredContent: { accepted: true } } } = {}) {
  const calls = [];
  const client = {
    async listTools() {
      return { tools: [discoveredTool] };
    },
    async callTool(input, resultSchema, options) {
      calls.push({ input, resultSchema, options });
      return remoteResult;
    }
  };
  const registry = new AgentRegistry();
  registry.register({
    id: "agent-a",
    tenantId: "tenant-a",
    name: "Agent A",
    endpointRef: "endpoint://agent-a",
    credentialRef: null,
    ownerPrincipalId: "caller-a",
    approvedTools: ["review_message"],
    approvedToolSchemas: {
      review_message: fingerprintToolSchema(tool)
    },
    client
  });
  return {
    calls,
    client,
    registry,
    dispatcher: createRegistryTaskDispatcher({ registry })
  };
}

const task = {
  taskId: "task-a",
  callerPrincipalId: "caller-a",
  tenantId: "tenant-a",
  targetAgentId: "agent-a",
  connectionId: "agent-a",
  toolName: "review_message",
  input: { message: "Review this." }
};


test("registry coordinator completes a task through the approved remote MCP client", async () => {
  const { calls, registry } = setup();
  const coordinator = createRegistryTaskCoordinator({
    registry,
    repository: createInMemoryTaskRepository(),
    clock: () => 1000,
    defaultTimeoutMs: 5000,
    maxTaskDurationMs: 10000
  });
  const created = await coordinator.createTask(principal, {
    targetAgentId: "agent-a",
    toolName: "review_message",
    arguments: { message: "Run this as a task." },
    idempotencyKey: "dispatcher-task-0001"
  });
  const processed = await coordinator.processNext({ workerId: "worker-a" });
  assert.equal(processed.task.taskId, created.task.taskId);
  assert.equal(processed.task.state, "completed");
  assert.deepEqual(processed.task.output, { accepted: true });
  assert.equal(calls.length, 1);
});


test("registry-wired coordinator reports schema drift as SCHEMA_CHANGED without a tool call", async () => {
  const changed = {
    ...tool,
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string" },
        admin: { type: "boolean" }
      }
    }
  };
  const { calls, registry } = setup({ discoveredTool: changed });
  const coordinator = createRegistryTaskCoordinator({
    registry,
    repository: createInMemoryTaskRepository(),
    clock: () => 1000,
    defaultTimeoutMs: 5000,
    maxTaskDurationMs: 10000
  });
  const created = await coordinator.createTask(principal, {
    targetAgentId: "agent-a",
    toolName: "review_message",
    arguments: { message: "Must fail before call." },
    idempotencyKey: "schema-drift-task-0001"
  });
  const result = await coordinator.processNext({ workerId: "worker-schema" });
  assert.equal(result.task.taskId, created.task.taskId);
  assert.equal(result.task.state, "failed");
  assert.equal(result.task.errorCode, "SCHEMA_CHANGED");
  assert.equal(calls.length, 0);
});

test("registry dispatcher rechecks the approved schema and dispatches with the worker signal", async () => {
  const { dispatcher, calls } = setup();
  const controller = new AbortController();
  const output = await dispatcher.dispatch(task, { signal: controller.signal });
  assert.deepEqual(output, { accepted: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.name, "review_message");
  assert.deepEqual(calls[0].input.arguments, { message: "Review this." });
  assert.strictEqual(calls[0].options.signal, controller.signal);
});


test("task dispatcher permits task:dispatch without granting synchronous agent:message", async () => {
  const { dispatcher, calls } = setup();
  const taskOnlyPrincipal = {
    ...task,
    callerPrincipalId: "caller-a",
    tenantId: "tenant-a"
  };
  const result = await dispatcher.dispatch(taskOnlyPrincipal, {
    signal: new AbortController().signal
  });
  assert.deepEqual(result, { accepted: true });
  assert.equal(calls.length, 1);
});

test("registry dispatcher rejects schema drift before remote invocation", async () => {
  const changed = {
    ...tool,
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string" },
        priority: { type: "number" }
      }
    }
  };
  const { dispatcher, calls } = setup({ discoveredTool: changed });
  await assert.rejects(
    dispatcher.dispatch(task, { signal: new AbortController().signal }),
    (error) => error.code === "SCHEMA_CHANGED"
  );
  assert.equal(calls.length, 0);
});

test("registry dispatcher cannot cross tenant boundaries or invoke unapproved tools", async () => {
  const { dispatcher, calls } = setup();
  await assert.rejects(
    dispatcher.dispatch({ ...task, tenantId: "tenant-b" }, { signal: new AbortController().signal }),
    (error) => error.code === "AGENT_NOT_FOUND"
  );
  await assert.rejects(
    dispatcher.dispatch({ ...task, toolName: "admin_tool" }, { signal: new AbortController().signal }),
    (error) => error.code === "TOOL_NOT_ALLOWED"
  );
  assert.equal(calls.length, 0);
});

test("registry dispatcher honors cancellation before lookup and before remote invocation", async () => {
  const controller = new AbortController();
  controller.abort(new Error("cancel"));
  const { dispatcher, calls } = setup();
  await assert.rejects(
    dispatcher.dispatch(task, { signal: controller.signal }),
    (error) => error.message === "cancel"
  );
  assert.equal(calls.length, 0);
});

test("registry dispatcher maps remote tool failures to a safe code", async () => {
  const { dispatcher, calls } = setup({
    remoteResult: { isError: true, content: [{ type: "text", text: "REMOTE SECRET /private" }] }
  });
  await assert.rejects(
    dispatcher.dispatch(task, { signal: new AbortController().signal }),
    (error) => error.code === "REMOTE_FAILED" && !error.message.includes("REMOTE SECRET")
  );
  assert.equal(calls.length, 1);
});
