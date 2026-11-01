import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { createInterface } from "node:readline";
import { afterEach, test } from "node:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import * as z from "zod/v4";
import { createLocalJWKSet, SignJWT } from "jose";
import { createBearerAuthenticator } from "../src/relay/auth.mjs";
import { AgentRegistry } from "../src/relay/agent-registry.mjs";
import { createRelayHandler } from "../src/relay/mcp-handler.mjs";
import { fingerprintToolSchema } from "../src/relay/tool-schema.mjs";
import { createMockAgent } from "./fixtures/mock-agent.mjs";

const openHandlers = [];
const openClients = [];
const openProcesses = [];

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

async function connectClient(handler, name, authInfo, bearerToken) {
  const transport = new StreamableHTTPClientTransport(new URL("http://" + name + ".test/mcp"), {
    fetch: (url, init) => {
      const headers = new Headers(init?.headers);
      if (bearerToken) headers.set("authorization", "Bearer " + bearerToken);
      return handler.fetch(new Request(url, { ...init, headers }), authInfo ? { authInfo } : undefined);
    }
  });
  const client = new Client({ name: name, version: "0.1.0" });
  await client.connect(transport);
  openClients.push(client);
  return client;
}

async function setup({ agents = [], principalValue = principal, authenticator, bearerToken, callerAuthInfo } = {}) {
  const registry = new AgentRegistry();
  const remoteHandlers = [];
  for (const agent of agents) {
    const mock = agent.mock ?? createMockAgent({ id: agent.id, toolName: agent.remoteToolName ?? "review_message" });
    remoteHandlers.push(mock.handler);
    const remoteClient = await connectClient(mock.handler, agent.id);
    const discoveredTools = (await remoteClient.listTools()).tools;
    const approvedToolNames = agent.approvedTools ?? [agent.remoteToolName ?? "review_message"];
    const approvedToolSchemas = agent.approvedToolSchemas ?? Object.fromEntries(approvedToolNames.map((name) => {
      const discovered = discoveredTools.find((tool) => tool.name === name) ?? { ...discoveredTools[0], name };
      return [name, fingerprintToolSchema(discovered)];
    }));
    registry.register({
      id: agent.id,
      name: agent.name ?? agent.id,
      description: agent.description ?? "Test agent",
      tenantId: agent.tenantId ?? "tenant-1",
      discoverable: agent.discoverable ?? true,
      capabilities: agent.capabilities ?? ["message-review"],
      approvedTools: agent.approvedTools ?? [agent.remoteToolName ?? "review_message"],
      approvedToolSchemas,
      secretRef: "secret://must-never-be-exposed",
      endpoint: "https://remote.invalid/mcp",
      client: remoteClient
    });
  }
  const relayHandler = createRelayHandler({
    registry,
    resolvePrincipal: (authInfo) => authInfo?.extra?.principal ?? null,
    ...(authenticator ? { authenticator } : {})
  });
  openHandlers.push(...remoteHandlers, relayHandler);
  const caller = await connectClient(
    relayHandler,
    "relay",
    callerAuthInfo ?? makeAuthInfo(principalValue),
    bearerToken
  );
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
  while (openProcesses.length) {
    const child = openProcesses.pop();
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => {
        child.once("exit", resolve);
        child.kill("SIGTERM");
        setTimeout(resolve, 2000).unref();
      });
    }
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
      arguments: { message: "Analyze this request." },
      callerPrincipalId: "attacker-controlled",
      tenantId: "tenant-2"
    }
  });
  assert.equal(result.isError, undefined);
  assert.equal(received.message, "Analyze this request.");
  assert.equal(result.structuredContent.status, "completed");
  assert.equal(result.structuredContent.targetAgentId, "agent-alpha");
  assert.equal(result.structuredContent.sourceAgentId, "caller-1");
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

test("same-name remote tool schema changes are rejected before invocation", async () => {
  const approvedMock = createMockAgent({ id: "agent-alpha" });
  openHandlers.push(approvedMock.handler);
  const approvedClient = await connectClient(approvedMock.handler, "approval-baseline");
  const approvedTool = (await approvedClient.listTools()).tools.find((tool) => tool.name === "review_message");
  assert.ok(approvedTool);
  const approvedFingerprint = fingerprintToolSchema(approvedTool);

  const changedMock = createMockAgent({
    id: "agent-alpha",
    inputSchema: z.object({ message: z.string(), priority: z.string() })
  });
  const { caller } = await setup({
    agents: [{
      id: "agent-alpha",
      mock: changedMock,
      approvedToolSchemas: { review_message: approvedFingerprint }
    }]
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
  assert.equal(changedMock.calls, 0);
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

test("send_message crosses a separately spawned remote MCP server over TCP", async () => {
  const scriptPath = new URL("./fixtures/mock-agent-process.mjs", import.meta.url);
  const child = spawn(process.execPath, [scriptPath.pathname], { stdio: ["ignore", "pipe", "pipe"] });
  openProcesses.push(child);
  const lines = createInterface({ input: child.stdout });
  const remoteUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Mock MCP process startup timed out.")), 5000);
    lines.once("line", (line) => {
      clearTimeout(timer);
      if (line.startsWith("READY ")) resolve(line.slice(6));
      else reject(new Error("Mock MCP process did not report a ready URL."));
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error("Mock MCP process exited before ready with code " + code));
    });
  });

  const remoteClient = new Client({ name: "meepsheep-outbound-test", version: "0.1.0" });
  await remoteClient.connect(new StreamableHTTPClientTransport(new URL(remoteUrl)));
  openClients.push(remoteClient);

  const registry = new AgentRegistry();
  const processTool = (await remoteClient.listTools()).tools.find((tool) => tool.name === "review_message");
  assert.ok(processTool, "separate process must expose the approved tool before registration");
  registry.register({
    id: "agent-process",
    name: "Separate process agent",
    tenantId: "tenant-1",
    discoverable: true,
    capabilities: ["message-review"],
    approvedTools: ["review_message"],
    approvedToolSchemas: { review_message: fingerprintToolSchema(processTool) },
    client: remoteClient
  });
  const relayHandler = createRelayHandler({
    registry,
    resolvePrincipal: (authInfo) => authInfo?.extra?.principal ?? null
  });
  openHandlers.push(relayHandler);
  const caller = await connectClient(relayHandler, "relay-process", makeAuthInfo());
  const uniqueMessage = "tcp-proof-" + Date.now();
  const result = await caller.callTool({
    name: "send_message",
    arguments: {
      targetAgentId: "agent-process",
      toolName: "review_message",
      arguments: { message: uniqueMessage }
    }
  });

  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.output.reply, "REMOTE RECEIVED: " + uniqueMessage);
  assert.equal(result.structuredContent.targetAgentId, "agent-process");
});


test("authenticated MCP requests use verified bearer-token identity instead of forged authInfo extras", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwks = createLocalJWKSet({
    keys: [{ ...publicKey.export({ format: "jwk" }), use: "sig", alg: "RS256", kid: "integration-key" }]
  });
  const issuer = "https://identity.example.test/";
  const audience = "https://meepsheep.example.test";
  const authenticator = createBearerAuthenticator({ issuer, audience, jwks });
  const now = Math.floor(Date.now() / 1000);
  const bearerToken = await new SignJWT({
    tenant_id: "tenant-1",
    client_id: "external-mcp-client",
    scope: "agent:discover agent:message",
    jti: randomUUID()
  })
    .setProtectedHeader({ alg: "RS256", typ: "at+jwt", kid: "integration-key" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject("trusted-caller")
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(privateKey);
  const forged = {
    principalId: "attacker-controlled",
    tenantId: "tenant-2",
    permissions: ["*"]
  };
  const { caller } = await setup({
    agents: [{ id: "agent-alpha" }],
    authenticator,
    bearerToken,
    callerAuthInfo: { clientId: "forged-client", extra: { principal: forged } }
  });
  const result = await caller.callTool({ name: "discover_agents", arguments: {} });
  assert.equal(result.isError, undefined);
  assert.deepEqual(result.structuredContent.agents.map((agent) => agent.id), ["agent-alpha"]);
});

test("requests without validated authentication context are rejected", async () => {
  const registry = new AgentRegistry();
  const relayHandler = createRelayHandler({
    registry,
    resolvePrincipal: (authInfo) => authInfo?.extra?.principal ?? null
  });
  openHandlers.push(relayHandler);
  const caller = await connectClient(relayHandler, "unauthenticated-relay");
  const result = await caller.callTool({ name: "discover_agents", arguments: {} });
  assert.match(errorText(result), /AUTH_REQUIRED/);
});
