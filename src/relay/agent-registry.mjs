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

export class AgentRegistry {
  #agents = new Map();

  register(agent) {
    if (!agent?.id || !agent?.tenantId || !agent?.client || !Array.isArray(agent.approvedTools) || !agent.approvedToolSchemas || typeof agent.approvedToolSchemas !== "object") {
      throw new TypeError("Agent registration requires id, tenantId, client, approvedTools, and approvedToolSchemas.");
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
      ...agent,
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
      .filter((agent) => agent.tenantId === principal.tenantId && agent.discoverable !== false && agent.status === "active")
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
    if (!principal.permissions.includes("agent:message")) {
      throw new RelayError("PERMISSION_DENIED");
    }
    const agent = this.#agents.get(agentId);
    if (!agent || agent.tenantId !== principal.tenantId || agent.status !== "active") {
      throw new RelayError("AGENT_NOT_FOUND");
    }
    if (!agent.approvedTools.has(toolName)) {
      throw new RelayError("TOOL_NOT_ALLOWED");
    }
    return { ...agent, approvedSchemaFingerprint: agent.approvedToolSchemas.get(toolName) };
  }
}
