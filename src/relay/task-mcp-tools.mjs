import * as z from "zod/v4";
import { TaskCoordinatorError } from "./task-coordinator.mjs";

const taskSummarySchema = z.object({
  taskId: z.string(),
  traceId: z.string(),
  targetAgentId: z.string(),
  toolName: z.string(),
  state: z.string(),
  attemptCount: z.number().int().nonnegative(),
  deadlineAt: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  startedAt: z.number().nullable(),
  completedAt: z.number().nullable(),
  output: z.json().nullable(),
  errorCode: z.string().nullable()
});

const delegateOutputSchema = z.object({
  created: z.boolean(),
  task: taskSummarySchema
});
const taskOutputSchema = z.object({ task: taskSummarySchema });

function taskError(code) {
  return {
    isError: true,
    content: [{ type: "text", text: code }]
  };
}

function safeTaskError(error) {
  if (error instanceof TaskCoordinatorError) return error.code;
  return "TASK_FAILED";
}

function taskSummary(task) {
  return {
    taskId: task.taskId,
    traceId: task.traceId,
    targetAgentId: task.targetAgentId,
    toolName: task.toolName,
    state: task.state,
    attemptCount: task.attemptCount,
    deadlineAt: task.deadlineAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    startedAt: task.startedAt ?? null,
    completedAt: task.completedAt ?? null,
    output: task.output ?? null,
    errorCode: task.errorCode ?? null
  };
}

export function registerTaskTools(server, taskCoordinator) {
  if (
    !server ||
    typeof server.registerTool !== "function" ||
    !taskCoordinator ||
    typeof taskCoordinator.createTask !== "function" ||
    typeof taskCoordinator.getTask !== "function" ||
    typeof taskCoordinator.cancelTask !== "function"
  ) {
    throw new TypeError("A compatible MCP server and task coordinator are required.");
  }

  server.registerTool("delegate_task", {
    description: "Create an asynchronous task for an approved remote agent tool. Returns a task ID and queued status.",
    inputSchema: z.object({
      targetAgentId: z.string().min(1),
      toolName: z.string().min(1),
      arguments: z.record(z.string(), z.unknown()),
      idempotencyKey: z.string().min(8).max(128),
      timeoutMs: z.number().int().positive().optional()
    }).strict(),
    outputSchema: delegateOutputSchema
  }, async ({ targetAgentId, toolName, arguments: toolArguments, idempotencyKey, timeoutMs }, extra) => {
    try {
      const result = await taskCoordinator.createTask(extra?.authInfo
        ? extra.authInfo.extra?.principal
        : null, {
        targetAgentId,
        toolName,
        arguments: toolArguments,
        idempotencyKey,
        ...(timeoutMs === undefined ? {} : { timeoutMs })
      });
      return {
        content: [{ type: "text", text: result.created ? "Task queued." : "Existing task returned." }],
        structuredContent: {
          created: result.created,
          task: taskSummary(result.task)
        }
      };
    } catch (error) {
      return taskError(safeTaskError(error));
    }
  });

  server.registerTool("get_task", {
    description: "Get the status and result of a task created by the authenticated caller.",
    inputSchema: z.object({ taskId: z.string().min(1) }).strict(),
    outputSchema: taskOutputSchema
  }, async ({ taskId }, extra) => {
    try {
      const principal = extra?.authInfo?.extra?.principal ?? null;
      const task = await taskCoordinator.getTask(principal, taskId);
      return {
        content: [{ type: "text", text: "Task status: " + task.state }],
        structuredContent: { task: taskSummary(task) }
      };
    } catch (error) {
      return taskError(safeTaskError(error));
    }
  });

  server.registerTool("cancel_task", {
    description: "Cancel a queued or active task owned by the authenticated caller.",
    inputSchema: z.object({ taskId: z.string().min(1) }).strict(),
    outputSchema: taskOutputSchema
  }, async ({ taskId }, extra) => {
    try {
      const principal = extra?.authInfo?.extra?.principal ?? null;
      const task = await taskCoordinator.cancelTask(principal, taskId);
      return {
        content: [{ type: "text", text: "Task state: " + task.state }],
        structuredContent: { task: taskSummary(task) }
      };
    } catch (error) {
      return taskError(safeTaskError(error));
    }
  });
}
