import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { AgentRegistry } from "../src/relay/agent-registry.mjs";
import { createRelayHandler } from "../src/relay/mcp-handler.mjs";
import { createMockAgent } from "./fixtures/mock-agent.mjs";

const openHandlers = [];
const openClients = [];

const principal = {
  principalId: "caller-1",
  tenantId: "tenant-1",
  permissions: ["agent:discover", "agent:message"]
};

function makeAuthInfo(value = principal) {
  return {
    clientId: "test-client",
    scopes: ["relay"],
    extra: { principal: value }
  };
}

async function connectClient(handler, name, authInfo) {
  const transport = new StreamableHTTPClientTransport(new URL("http://" + name + ".test/mcp"), {
    fetch: (url, init) => handler.fetch(new Request(url, init), authInfo ? { authInfo } : undefined)
  });
  const client = new Client({ name: name, version: "0.1.0" });
  await client.connect(transport);
  openClients.push(client);
  return client;
}

async function setup({ agents = [], principalValue = principal } = {}) {
  const registry = new AgentRegistry();
  const remoteHandlers = [];
  for (const agent of agents) {
    const mock = agent.mock ?? createMockAgent({ id: agent.id, toolName: agent.remoteToolName ?? "review_message" });
    remoteHandlers.push(mock.handler);
    const remoteClient = await connectClient(mock.handler, agent.id);
    registry.register({
      id: agent.id,
      name: agent.name ?? agent.id,
      description: agent.description ?? "Test agent",
      tenantId: agent.tenantId ?? "tenant-1",
      discoverable: agent.discoverable ?? true,
      capabilities: agent.capabilities ?? ["message-review"],
      approvedTools: agent.approvedTools ?? [agent.remoteToolName ?? "review_message"],
      secretRef: "secret://must-never-be-exposed",
      endpoint: "https://remote.invalid/mcp",
      client: remoteClient
    });
  }
  const relayHandler = createRelayHandler({
    registry,
    resolvePrincipal: (authInfo) => authInfo?.extra?.principal ?? null
  });
  openHandlers.push(...remoteHandlers, relayHandler);
  const caller = await connectClient(relayHandler, "relay", makeAuthInfo(principalValue));
  return { caller, registry, relayHandler, remoteHandlers };
}

afterEach(async () => {
  while (openClients.length) {
    const client = openClients.pop();
    await client.close().catch(() => {});
  }
  while (openHandlers.length) {
    const handler = openHandlers.pop();
    await handler.close().catch(() => {});
  }
});

function errorText(result) {
  assert.equal(result.isError, true);
  return result.content.map((item) => item.text ?? "").join("\n");
}

test("discover_agents returns only same-tenant visible metadata without connection secrets", async () => {
  const { caller } = await setup({
    agents: [
      { id: "agent-alpha" },
      { id: "agent-secret", tenantId: "tenant-2" }
    ]
  });
  const result = await caller.callTool({ name: "discover_agents", arguments: {} });
  assert.equal(result.isError, undefined);
  const agents = result.structuredContent.agents;
  assert.deepEqual(agents.map((agent) => agent.id), ["agent-alpha"]);
  assert.equal(JSON.stringify(result).includes("secret://"), false);
  assert.equal(JSON.stringify(result).includes("remote.invalid"), false);
});

test("send_message forwards through an outbound MCP client and returns provenance", async () => {
  let received = null;
  const mock = createMockAgent({ id: "agent-alpha", onCall: (args) => { received = args; } });
  const { caller } = await setup({ agents: [{ id: "agent-alpha", mock }] });
  const result = await caller.callTool({
    name: "send_message",
    arguments: {
      targetAgentId: "agent-alpha",
      toolName: "review_message",
      arguments: { message: "Analyze this request." }
    }
  });
  assert.equal(result.isError, undefined);
  assert.equal(received.message, "Analyze this request.");
  assert.equal(result.structuredContent.status, "completed");
  assert.equal(result.structuredContent.targetAgentId, "agent-alpha");
  assert.equal(result.structuredContent.provenance.protocol, "mcp");
  assert.equal(result.structuredContent.provenance.remoteToolName, "review_message");
  assert.ok(result.structuredContent.traceId);
  assert.deepEqual(result.structuredContent.output, {
    reply: "Remote agent processed the request.",
    agentId: "agent-alpha"
  });
});

test("cross-tenant agents are hidden and cannot be invoked", async () => {
  const { caller } = await setup({ agents: [{ id: "agent-other", tenantId: "tenant-2" }] });
  const discovery = await caller.callTool({ name: "discover_agents", arguments: {} });
  assert.deepEqual(discovery.structuredContent.agents, []);
  const result = await caller.callTool({
    name: "send_message",
    arguments: {
      targetAgentId: "agent-other",
      toolName: "review_message",
      arguments: { message: "Do not route." }
    }
  });
  assert.match(errorText(result), /AGENT_NOT_FOUND|PERMISSION_DENIED/);
});

test("unapproved remote tools are rejected before invocation", async () => {
  const mock = createMockAgent({ id: "agent-alpha" });
  const { caller } = await setup({
    agents: [{ id: "agent-alpha", mock, approvedTools: [] }]
  });
  const result = await caller.callTool({
    name: "send_message",
    arguments: {
      targetAgentId: "agent-alpha",
      toolName: "review_message",
      arguments: { message: "Blocked." }
    }
  });
  assert.match(errorText(result), /TOOL_NOT_ALLOWED/);
  assert.equal(mock.calls, 0);
});

test("remote tools removed from the server are rejected as a schema mismatch", async () => {
  const mock = createMockAgent({ id: "agent-alpha", toolName: "different_tool" });
  const { caller } = await setup({
    agents: [{ id: "agent-alpha", mock, approvedTools: ["review_message"] }]
  });
  const result = await caller.callTool({
    name: "send_message",
    arguments: {
      targetAgentId: "agent-alpha",
      toolName: "review_message",
      arguments: { message: "Must not call." }
    }
  });
  assert.match(errorText(result), /SCHEMA_CHANGED/);
  assert.equal(mock.calls, 0);
});

test("callers without agent:message permission cannot dispatch", async () => {
  const restricted = { ...principal, permissions: ["agent:discover"] };
  const { caller } = await setup({ agents: [{ id: "agent-alpha" }], principalValue: restricted });
  const result = await caller.callTool({
    name: "send_message",
    arguments: {
      targetAgentId: "agent-alpha",
      toolName: "review_message",
      arguments: { message: "No permission." }
    }
  });
  assert.match(errorText(result), /PERMISSION_DENIED/);
});

test("remote tool failures are sanitized before returning to the caller", async () => {
  const mock = createMockAgent({ id: "agent-alpha", failure: true });
  const { caller } = await setup({ agents: [{ id: "agent-alpha", mock }] });
  const result = await caller.callTool({
    name: "send_message",
    arguments: {
      targetAgentId: "agent-alpha",
      toolName: "review_message",
      arguments: { message: "This will fail remotely." }
    }
  });
  const message = errorText(result);
  assert.match(message, /REMOTE_FAILED/);
  assert.equal(message.includes("REMOTE SECRET"), false);
  assert.equal(message.includes("/private/path"), false);
});
