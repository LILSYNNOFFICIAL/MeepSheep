import { RelayError } from "./agent-registry.mjs";
import { createTaskCoordinator } from "./task-coordinator.mjs";
import { fingerprintToolSchema } from "./tool-schema.mjs";

function requireRegistry(registry) {
  if (!registry || typeof registry.getAuthorized !== "function") {
    throw new TypeError("A compatible agent registry is required.");
  }
}

export function createRegistryTaskDispatcher({ registry } = {}) {
  requireRegistry(registry);

  async function authorizeTarget(principal, { targetAgentId, toolName }) {
    const agent = registry.getAuthorized(principal, targetAgentId, toolName);
    return { connectionId: agent.id };
  }

  async function dispatch(task, { signal } = {}) {
    if (!task || typeof task.taskId !== "string" || !task.callerPrincipalId || !task.tenantId) {
      throw new RelayError("TASK_NOT_AUTHORIZED");
    }
    if (!signal || typeof signal.aborted !== "boolean") {
      throw new TypeError("Task dispatch requires an AbortSignal.");
    }
    if (signal.aborted) throw signal.reason ?? new RelayError("TASK_CANCELED");

    const principal = {
      principalId: task.callerPrincipalId,
      tenantId: task.tenantId,
      permissions: ["agent:message"]
    };
    const agent = registry.getAuthorized(principal, task.targetAgentId, task.toolName);
    if (task.connectionId !== agent.id) throw new RelayError("AGENT_NOT_FOUND");

    const discovery = await agent.client.listTools();
    if (signal.aborted) throw signal.reason ?? new RelayError("TASK_CANCELED");
    const remoteTool = discovery?.tools?.find((tool) => tool.name === task.toolName);
    if (
      !remoteTool ||
      fingerprintToolSchema(remoteTool) !== agent.approvedSchemaFingerprint
    ) {
      throw new RelayError("SCHEMA_CHANGED");
    }

    const result = await agent.client.callTool(
      { name: task.toolName, arguments: task.input },
      { signal }
    );
    if (signal.aborted) throw signal.reason ?? new RelayError("TASK_CANCELED");
    if (result?.isError) throw new RelayError("REMOTE_FAILED");
    return result?.structuredContent ?? result?.content ?? null;
  }

  return Object.freeze({ authorizeTarget, dispatch });
}


export function createRegistryTaskCoordinator({
  registry,
  repository,
  clock,
  defaultTimeoutMs,
  maxTaskDurationMs,
  maxInputBytes,
  maxOutputBytes,
  outboxLeaseMs
} = {}) {
  const adapters = createRegistryTaskDispatcher({ registry });
  return createTaskCoordinator({
    repository,
    authorizeTarget: adapters.authorizeTarget,
    dispatch: adapters.dispatch,
    ...(clock === undefined ? {} : { clock }),
    ...(defaultTimeoutMs === undefined ? {} : { defaultTimeoutMs }),
    ...(maxTaskDurationMs === undefined ? {} : { maxTaskDurationMs }),
    ...(maxInputBytes === undefined ? {} : { maxInputBytes }),
    ...(maxOutputBytes === undefined ? {} : { maxOutputBytes }),
    ...(outboxLeaseMs === undefined ? {} : { outboxLeaseMs })
  });
}
