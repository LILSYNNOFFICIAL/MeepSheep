import { randomUUID } from "node:crypto";
import { RelayError } from "./agent-registry.mjs";
import { createSecureRemoteMcpClient } from "./remote-mcp-connection.mjs";

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;

export class AgentConnectionManagerError extends Error {
  constructor(code) {
    super(code);
    this.name = "AgentConnectionManagerError";
    this.code = code;
  }
}

function fail(code) {
  return new AgentConnectionManagerError(code);
}

function requireOwner(principal) {
  if (
    !principal ||
    typeof principal.principalId !== "string" ||
    !principal.principalId ||
    typeof principal.tenantId !== "string" ||
    !principal.tenantId ||
    !Array.isArray(principal.permissions)
  ) {
    throw fail("AUTH_REQUIRED");
  }
  if (!principal.permissions.includes("connection:manage")) {
    throw fail("PERMISSION_DENIED");
  }
}

function validReference(value, prefix) {
  return typeof value === "string" &&
    value.startsWith(prefix) &&
    IDENTIFIER_PATTERN.test(value.slice(prefix.length));
}

function cloneJson(value) {
  if (value === undefined) return null;
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== "string") throw new Error("not-json");
    return JSON.parse(serialized);
  } catch {
    throw fail("REMOTE_TOOL_DISCOVERY_INVALID");
  }
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

async function closeClient(client) {
  try {
    if (client && typeof client.close === "function") await client.close();
  } catch {
    // Cleanup is best effort and must not expose remote endpoint details.
  }
}

function sanitizeFactoryError(error) {
  const code = error?.code;
  if (
    typeof code === "string" &&
    (
      code === "ENDPOINT_REJECTED" ||
      code === "REMOTE_AUTH_CONFIG_INVALID" ||
      code === "REMOTE_CONNECT_FAILED" ||
      code === "REMOTE_TOOL_DISCOVERY_FAILED" ||
      code === "REMOTE_TOOL_DISCOVERY_INVALID" ||
      code.startsWith("CREDENTIAL_")
    )
  ) {
    return fail(code);
  }
  return fail("CONNECTION_PREVIEW_FAILED");
}

export function createAgentConnectionManager({
  registry,
  credentialVault,
  createRemoteClient = createSecureRemoteMcpClient,
  clock = () => Date.now(),
  previewTtlSeconds = 300
} = {}) {
  if (
    !registry ||
    typeof registry.register !== "function" ||
    typeof registry.unregister !== "function"
  ) {
    throw new TypeError("A registry with register and unregister operations is required.");
  }
  if (typeof createRemoteClient !== "function") {
    throw new TypeError("createRemoteClient must be a function.");
  }
  if (typeof clock !== "function") throw new TypeError("clock must be a function.");
  if (!Number.isInteger(previewTtlSeconds) || previewTtlSeconds < 1 || previewTtlSeconds > 3600) {
    throw new TypeError("previewTtlSeconds must be an integer between 1 and 3600.");
  }

  const pending = new Map();
  const active = new Map();

  function now() {
    const value = clock();
    if (!Number.isFinite(value) || value < 0) {
      throw fail("CONNECTION_MANAGER_UNAVAILABLE");
    }
    return Math.floor(value);
  }

  async function expirePreviews(exceptPreviewId = null) {
    const timestamp = now();
    const expiredClients = [];
    for (const [previewId, preview] of pending) {
      if (previewId !== exceptPreviewId && timestamp >= preview.expiresAt) {
        pending.delete(previewId);
        expiredClients.push(preview.connection.client);
      }
    }
    await Promise.all(expiredClients.map(closeClient));
  }

  async function preview(principal, input = {}) {
    requireOwner(principal);
    await expirePreviews();

    const {
      endpoint,
      endpointRef,
      credentialRef,
      allowedHosts
    } = input;

    if (
      typeof endpoint !== "string" ||
      endpoint.length === 0 ||
      !validReference(endpointRef, "endpoint://") ||
      (
        credentialRef !== undefined &&
        credentialRef !== null &&
        !validReference(credentialRef, "credential://")
      ) ||
      !Array.isArray(allowedHosts) ||
      allowedHosts.length === 0 ||
      allowedHosts.some((host) => typeof host !== "string" || host.length === 0) ||
      (
        credentialRef &&
        createRemoteClient === createSecureRemoteMcpClient &&
        (!credentialVault || typeof credentialVault.withCredential !== "function")
      )
    ) {
      throw fail("CONNECTION_CONFIG_INVALID");
    }

    let connection;
    try {
      connection = await createRemoteClient({
        endpoint,
        allowedHosts: [...allowedHosts],
        credentialVault,
        credentialRef: credentialRef ?? undefined,
        tenantId: principal.tenantId
      });

      if (
        !connection ||
        !connection.client ||
        typeof connection.client.close !== "function" ||
        !Array.isArray(connection.discoveredTools) ||
        !connection.schemaFingerprints ||
        typeof connection.schemaFingerprints !== "object" ||
        !connection.endpointMetadata ||
        typeof connection.endpointMetadata.hostname !== "string" ||
        typeof connection.endpointMetadata.pathname !== "string"
      ) {
        throw fail("REMOTE_TOOL_DISCOVERY_INVALID");
      }

      const toolFingerprints = new Map();
      const toolPreviews = [];
      for (const tool of connection.discoveredTools) {
        if (
          !tool ||
          typeof tool.name !== "string" ||
          tool.name.length === 0 ||
          toolFingerprints.has(tool.name) ||
          !Object.hasOwn(connection.schemaFingerprints, tool.name) ||
          typeof connection.schemaFingerprints[tool.name] !== "string" ||
          !FINGERPRINT_PATTERN.test(connection.schemaFingerprints[tool.name])
        ) {
          throw fail("REMOTE_TOOL_DISCOVERY_INVALID");
        }

        const fingerprint = connection.schemaFingerprints[tool.name];
        toolFingerprints.set(tool.name, fingerprint);
        toolPreviews.push(freezeDeep({
          name: tool.name,
          description: typeof tool.description === "string" ? tool.description : "",
          inputSchema: cloneJson(tool.inputSchema),
          outputSchema: cloneJson(tool.outputSchema),
          fingerprint
        }));
      }

      const previewId = randomUUID();
      const expiresAt = now() + previewTtlSeconds * 1000;
      const safeEndpointMetadata = Object.freeze({
        hostname: connection.endpointMetadata.hostname,
        pathname: connection.endpointMetadata.pathname
      });

      pending.set(previewId, {
        previewId,
        ownerPrincipalId: principal.principalId,
        tenantId: principal.tenantId,
        endpointRef,
        credentialRef: credentialRef ?? null,
        credentialId: credentialRef
          ? credentialRef.slice("credential://".length)
          : null,
        endpointMetadata: safeEndpointMetadata,
        connection,
        toolFingerprints,
        expiresAt
      });

      return Object.freeze({
        previewId,
        expiresAt,
        endpoint: safeEndpointMetadata,
        tools: Object.freeze(toolPreviews)
      });
    } catch (error) {
      if (connection?.client) await closeClient(connection.client);
      if (error instanceof AgentConnectionManagerError) throw error;
      throw sanitizeFactoryError(error);
    }
  }

  async function approve(principal, { previewId, agent, approvedTools } = {}) {
    requireOwner(principal);
    await expirePreviews(previewId);

    const previewRecord = pending.get(previewId);
    if (
      !previewRecord ||
      previewRecord.ownerPrincipalId !== principal.principalId ||
      previewRecord.tenantId !== principal.tenantId
    ) {
      throw fail("PREVIEW_NOT_FOUND");
    }

    if (now() >= previewRecord.expiresAt) {
      pending.delete(previewId);
      await closeClient(previewRecord.connection.client);
      throw fail("PREVIEW_EXPIRED");
    }

    if (
      !agent ||
      typeof agent.id !== "string" ||
      !IDENTIFIER_PATTERN.test(agent.id) ||
      typeof agent.name !== "string" ||
      agent.name.trim().length === 0 ||
      (
        agent.description !== undefined &&
        typeof agent.description !== "string"
      ) ||
      (
        agent.capabilities !== undefined &&
        (
          !Array.isArray(agent.capabilities) ||
          agent.capabilities.some((capability) => typeof capability !== "string")
        )
      ) ||
      !Array.isArray(approvedTools) ||
      approvedTools.length === 0 ||
      approvedTools.some((name) => typeof name !== "string" || name.length === 0) ||
      new Set(approvedTools).size !== approvedTools.length ||
      approvedTools.some((name) => !previewRecord.toolFingerprints.has(name))
    ) {
      throw fail("TOOL_APPROVAL_INVALID");
    }

    const approvedToolSchemas = Object.fromEntries(
      approvedTools.map((name) => [
        name,
        previewRecord.toolFingerprints.get(name)
      ])
    );

    try {
      registry.register({
        id: agent.id,
        tenantId: principal.tenantId,
        ownerPrincipalId: principal.principalId,
        name: agent.name,
        description: agent.description ?? "",
        capabilities: agent.capabilities ?? [],
        discoverable: agent.discoverable !== false,
        endpointRef: previewRecord.endpointRef,
        credentialRef: previewRecord.credentialRef,
        client: previewRecord.connection.client,
        approvedTools: [...approvedTools],
        approvedToolSchemas,
        status: "active"
      });
    } catch (error) {
      if (error instanceof RelayError) throw fail(error.code);
      if (error instanceof TypeError) throw fail("CONNECTION_REGISTRATION_INVALID");
      throw fail("CONNECTION_REGISTRATION_FAILED");
    }

    pending.delete(previewId);
    active.set(agent.id, {
      ownerPrincipalId: principal.principalId,
      tenantId: principal.tenantId,
      credentialRef: previewRecord.credentialRef,
      credentialId: previewRecord.credentialId,
      client: previewRecord.connection.client
    });

    return Object.freeze({
      agentId: agent.id,
      name: agent.name,
      status: "active",
      approvedTools: Object.freeze([...approvedTools])
    });
  }

  async function disconnect(principal, { agentId } = {}) {
    requireOwner(principal);

    const connection = active.get(agentId);
    if (
      !connection ||
      connection.ownerPrincipalId !== principal.principalId ||
      connection.tenantId !== principal.tenantId
    ) {
      throw fail("AGENT_NOT_FOUND");
    }

    let removed;
    try {
      removed = registry.unregister(principal, agentId);
    } catch (error) {
      if (error instanceof RelayError) throw fail(error.code);
      throw fail("CONNECTION_DISCONNECT_FAILED");
    }

    active.delete(agentId);
    let revocationFailed = false;
    if (connection.credentialId) {
      try {
        if (!credentialVault || typeof credentialVault.revoke !== "function") {
          throw new Error("Credential vault unavailable.");
        }
        await credentialVault.revoke({
          credentialId: connection.credentialId,
          tenantId: connection.tenantId
        });
      } catch {
        revocationFailed = true;
      }
    }

    await closeClient(removed?.client ?? connection.client);
    if (revocationFailed) throw fail("CONNECTION_REVOKE_FAILED");

    return Object.freeze({ agentId, status: "disconnected" });
  }

  async function close() {
    const clients = [
      ...[...pending.values()].map((previewRecord) => previewRecord.connection.client),
      ...[...active.values()].map((connection) => connection.client)
    ];
    pending.clear();
    active.clear();
    await Promise.all(clients.map(closeClient));
  }

  return Object.freeze({ preview, approve, disconnect, close });
}
