export class RelayError extends Error {
  constructor(code) {
    super(code);
    this.name = "RelayError";
    this.code = code;
  }
}

function requirePrincipal(principal) {
  if (!principal?.principalId || !principal?.tenantId || !Array.isArray(principal.permissions)) {
    throw new RelayError("AUTH_REQUIRED");
  }
}

const RAW_CREDENTIAL_FIELDS = new Set([
  "credential", "credentials", "secret", "secretRef", "token", "accessToken",
  "access_token", "refresh_token", "password", "apiKey", "privateKey",
  "authorization", "authorizationHeader", "authHeaders", "headers", "endpoint"
]);

function isOpaqueReference(value, prefix) {
  if (typeof value !== "string" || !value.startsWith(prefix)) return false;
  const identifier = value.slice(prefix.length);
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(identifier);
}

export class AgentRegistry {
  #agents = new Map();

  register(agent) {
    if (
      !agent?.id ||
      !agent?.tenantId ||
      !agent?.ownerPrincipalId ||
      !agent?.client ||
      !Array.isArray(agent.approvedTools) ||
      !agent.approvedToolSchemas ||
      typeof agent.approvedToolSchemas !== "object"
    ) {
      throw new TypeError("Agent registration requires id, tenantId, ownerPrincipalId, client, approvedTools, and approvedToolSchemas.");
    }
    for (const field of RAW_CREDENTIAL_FIELDS) {
      if (Object.hasOwn(agent, field)) {
        throw new TypeError("Agent registration must use credentialRef and endpointRef, never raw credentials or endpoint URLs.");
      }
    }
    if (agent.credentialRef !== undefined && !isOpaqueReference(agent.credentialRef, "credential://")) {
      throw new TypeError("credentialRef must be an opaque credential:// reference.");
    }
    if (agent.endpointRef !== undefined && !isOpaqueReference(agent.endpointRef, "endpoint://")) {
      throw new TypeError("endpointRef must be an opaque endpoint:// reference.");
    }
    if (this.#agents.has(agent.id)) {
      throw new RelayError("AGENT_ALREADY_REGISTERED");
    }
    for (const toolName of agent.approvedTools) {
      if (typeof agent.approvedToolSchemas[toolName] !== "string" || !/^[a-f0-9]{64}$/.test(agent.approvedToolSchemas[toolName])) {
        throw new TypeError("Every approved tool requires an owner-approved SHA-256 schema fingerprint.");
      }
    }
    this.#agents.set(agent.id, {
      id: agent.id,
      tenantId: agent.tenantId,
      ownerPrincipalId: agent.ownerPrincipalId,
      allowedPrincipalIds: new Set([agent.ownerPrincipalId]),
      name: agent.name ?? agent.id,
      description: agent.description ?? "",
      discoverable: agent.discoverable !== false,
      capabilities: [...(agent.capabilities ?? [])],
      endpointRef: agent.endpointRef ?? null,
      credentialRef: agent.credentialRef ?? null,
      ownerPrincipalId: agent.ownerPrincipalId ?? null,
      client: agent.client,
      approvedTools: new Set(agent.approvedTools),
      approvedToolSchemas: new Map(Object.entries(agent.approvedToolSchemas)),
      status: agent.status ?? "active"
    });
  }

  discover(principal) {
    requirePrincipal(principal);
    if (!principal.permissions.includes("agent:discover")) {
      throw new RelayError("PERMISSION_DENIED");
    }
    return [...this.#agents.values()]
      .filter((agent) => agent.tenantId === principal.tenantId && agent.allowedPrincipalIds.has(principal.principalId) && agent.discoverable !== false && agent.status === "active")
      .map((agent) => ({
        id: agent.id,
        name: agent.name ?? agent.id,
        description: agent.description ?? "",
        capabilities: [...(agent.capabilities ?? [])],
        status: agent.status
      }));
  }

  getAuthorized(principal, agentId, toolName) {
    requirePrincipal(principal);
    if (
      !principal.permissions.includes("agent:message") &&
      !principal.permissions.includes("task:dispatch")
    ) {
      throw new RelayError("PERMISSION_DENIED");
    }
    const agent = this.#agents.get(agentId);
    if (
      !agent ||
      agent.tenantId !== principal.tenantId ||
      !agent.allowedPrincipalIds.has(principal.principalId) ||
      agent.status !== "active"
    ) {
      throw new RelayError("AGENT_NOT_FOUND");
    }
    if (!agent.approvedTools.has(toolName)) {
      throw new RelayError("TOOL_NOT_ALLOWED");
    }
    return { ...agent, approvedSchemaFingerprint: agent.approvedToolSchemas.get(toolName) };
  }

  grantAccess(principal, agentId, targetPrincipal) {
    requirePrincipal(principal);
    if (!principal.permissions.includes("connection:manage")) {
      throw new RelayError("PERMISSION_DENIED");
    }
    const targetPrincipalId = targetPrincipal?.principalId;
    if (
      typeof targetPrincipalId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(targetPrincipalId) ||
      targetPrincipal?.tenantId !== principal.tenantId
    ) {
      throw new RelayError("TENANT_MISMATCH");
    }
    const agent = this.#agents.get(agentId);
    if (
      !agent ||
      agent.tenantId !== principal.tenantId ||
      agent.ownerPrincipalId !== principal.principalId
    ) {
      throw new RelayError("AGENT_NOT_FOUND");
    }
    agent.allowedPrincipalIds.add(targetPrincipalId);
    return { agentId, targetPrincipalId, granted: true };
  }

  revokeAccess(principal, agentId, targetPrincipalId) {
    requirePrincipal(principal);
    if (!principal.permissions.includes("connection:manage")) {
      throw new RelayError("PERMISSION_DENIED");
    }
    const agent = this.#agents.get(agentId);
    if (
      !agent ||
      agent.tenantId !== principal.tenantId ||
      agent.ownerPrincipalId !== principal.principalId
    ) {
      throw new RelayError("AGENT_NOT_FOUND");
    }
    if (targetPrincipalId === agent.ownerPrincipalId) {
      throw new RelayError("OWNER_GRANT_IMMUTABLE");
    }
    agent.allowedPrincipalIds.delete(targetPrincipalId);
    return { agentId, targetPrincipalId, revoked: true };
  }

  unregister(principal, agentId) {
    requirePrincipal(principal);
    if (!principal.permissions.includes("connection:manage")) {
      throw new RelayError("PERMISSION_DENIED");
    }
    const agent = this.#agents.get(agentId);
    if (
      !agent ||
      agent.tenantId !== principal.tenantId ||
      agent.ownerPrincipalId !== principal.principalId
    ) {
      throw new RelayError("AGENT_NOT_FOUND");
    }
    this.#agents.delete(agentId);
    return agent;
  }
}
