import assert from "node:assert/strict";
import { test } from "node:test";
import { AgentRegistry } from "../src/relay/agent-registry.mjs";
import { createAgentConnectionManager } from "../src/relay/agent-connection-manager.mjs";

const owner = {
  principalId: "owner-a",
  tenantId: "tenant-a",
  permissions: ["connection:manage", "agent:discover", "agent:message"]
};
const otherOwner = {
  principalId: "owner-b",
  tenantId: "tenant-b",
  permissions: ["connection:manage", "agent:discover", "agent:message"]
};
const noManage = {
  principalId: "reader-a",
  tenantId: "tenant-a",
  permissions: ["agent:discover", "agent:message"]
};

const tools = [
  {
    name: "review_message",
    description: "Review a user-supplied message.",
    inputSchema: { type: "object", properties: { message: { type: "string" } } },
    outputSchema: { type: "object", properties: { accepted: { type: "boolean" } } }
  },
  {
    name: "summarize_report",
    description: "Summarize a report.",
    inputSchema: { type: "object", properties: { report: { type: "string" } } },
    outputSchema: { type: "object", properties: { summary: { type: "string" } } }
  }
];

function makeConnection() {
  const client = {
    closeCalls: 0,
    async close() { this.closeCalls += 1; }
  };
  const fingerprints = Object.create(null);
  fingerprints.review_message = "a".repeat(64);
  fingerprints.summarize_report = "b".repeat(64);
  return {
    client,
    credentialRef: "credential://remote-agent-1",
    endpointMetadata: { hostname: "agent.example.test", pathname: "/mcp" },
    discoveredTools: structuredClone(tools),
    schemaFingerprints: Object.freeze(fingerprints)
  };
}

function setup({ clock = () => 1000, createRemoteClient = async () => makeConnection(), vault = null } = {}) {
  const registry = new AgentRegistry();
  const manager = createAgentConnectionManager({
    registry,
    credentialVault: vault,
    clock,
    previewTtlSeconds: 30,
    createRemoteClient
  });
  return { registry, manager };
}

const previewInput = {
  endpoint: "https://agent.example.test/mcp",
  endpointRef: "endpoint://remote-agent-1",
  credentialRef: "credential://remote-agent-1",
  allowedHosts: ["agent.example.test"]
};

test("preview discovers tools without registering an agent or approving tools", async () => {
  const connection = makeConnection();
  let factoryInput;
  const { registry, manager } = setup({
    createRemoteClient: async (input) => {
      factoryInput = input;
      return connection;
    }
  });
  const preview = await manager.preview(owner, previewInput);
  assert.equal(typeof preview.previewId, "string");
  assert.equal(preview.expiresAt, 31000);
  assert.deepEqual(preview.tools.map((tool) => tool.name), ["review_message", "summarize_report"]);
  assert.equal(preview.tools[0].fingerprint, "a".repeat(64));
  assert.deepEqual(registry.discover(owner), []);
  assert.equal(factoryInput.tenantId, "tenant-a");
  assert.equal(factoryInput.credentialRef, "credential://remote-agent-1");
  assert.equal(JSON.stringify(preview).includes("Bearer "), false);
  assert.equal(JSON.stringify(preview).includes("https://agent.example.test"), false);
});

test("preview requires connection:manage and rejects noncanonical endpoint/credential references", async () => {
  const { manager } = setup();
  await assert.rejects(
    manager.preview(noManage, previewInput),
    (error) => error.code === "PERMISSION_DENIED"
  );
  for (const fields of [
    { endpointRef: "endpoint://bad/path" },
    { credentialRef: "credential://bad/path" },
    { endpointRef: "https://agent.example.test/mcp" }
  ]) {
    await assert.rejects(
      manager.preview(owner, { ...previewInput, ...fields }),
      (error) => error.code === "CONNECTION_CONFIG_INVALID"
    );
  }
});

test("approval registers only owner-selected discovered tools with immutable matching fingerprints", async () => {
  const { registry, manager } = setup();
  const preview = await manager.preview(owner, previewInput);
  const result = await manager.approve(owner, {
    previewId: preview.previewId,
    agent: {
      id: "agent-a",
      name: "Remote review agent",
      description: "External review service",
      capabilities: ["review"]
    },
    approvedTools: ["review_message"]
  });
  assert.equal(result.agentId, "agent-a");
  assert.deepEqual(result.approvedTools, ["review_message"]);
  const authorized = registry.getAuthorized(owner, "agent-a", "review_message");
  assert.equal(authorized.approvedSchemaFingerprint, "a".repeat(64));
  assert.equal(authorized.ownerPrincipalId, owner.principalId);
  assert.throws(
    () => registry.getAuthorized(owner, "agent-a", "summarize_report"),
    (error) => error.code === "TOOL_NOT_ALLOWED"
  );
  assert.deepEqual(registry.discover(owner).map((agent) => agent.id), ["agent-a"]);
});

test("approval cannot cross owner or tenant boundaries", async () => {
  const { registry, manager } = setup();
  const preview = await manager.preview(owner, previewInput);
  await assert.rejects(
    manager.approve(otherOwner, {
      previewId: preview.previewId,
      agent: { id: "agent-stolen", name: "Stolen" },
      approvedTools: ["review_message"]
    }),
    (error) => error.code === "PREVIEW_NOT_FOUND"
  );
  await assert.rejects(
    manager.approve(noManage, {
      previewId: preview.previewId,
      agent: { id: "agent-stolen", name: "Stolen" },
      approvedTools: ["review_message"]
    }),
    (error) => error.code === "PERMISSION_DENIED"
  );
  assert.deepEqual(registry.discover(owner), []);
});

test("approval rejects unknown, duplicate, and empty tool selections", async () => {
  const { registry, manager } = setup();
  const preview = await manager.preview(owner, previewInput);
  for (const approvedTools of [
    ["not_discovered"],
    ["review_message", "review_message"],
    []
  ]) {
    await assert.rejects(
      manager.approve(owner, {
        previewId: preview.previewId,
        agent: { id: "agent-a", name: "Agent A" },
        approvedTools
      }),
      (error) => error.code === "TOOL_APPROVAL_INVALID"
    );
  }
  assert.deepEqual(registry.discover(owner), []);
});

test("expired previews are closed and cannot be approved", async () => {
  let now = 1000;
  const connection = makeConnection();
  const { registry, manager } = setup({ clock: () => now, createRemoteClient: async () => connection });
  const preview = await manager.preview(owner, previewInput);
  now = 32000;
  await assert.rejects(
    manager.approve(owner, {
      previewId: preview.previewId,
      agent: { id: "agent-a", name: "Agent A" },
      approvedTools: ["review_message"]
    }),
    (error) => error.code === "PREVIEW_EXPIRED"
  );
  assert.equal(connection.client.closeCalls, 1);
  assert.deepEqual(registry.discover(owner), []);
});

test("disconnect removes agent before closing client and revokes its credential", async () => {
  const connection = makeConnection();
  const revoked = [];
  const vault = {
    async revoke(input) {
      revoked.push(input);
      return { status: "revoked" };
    }
  };
  const { registry, manager } = setup({ vault, createRemoteClient: async () => connection });
  const preview = await manager.preview(owner, previewInput);
  await manager.approve(owner, {
    previewId: preview.previewId,
    agent: { id: "agent-a", name: "Agent A" },
    approvedTools: ["review_message"]
  });
  const result = await manager.disconnect(owner, { agentId: "agent-a" });
  assert.equal(result.status, "disconnected");
  assert.deepEqual(revoked, [{ credentialId: "remote-agent-1", tenantId: "tenant-a" }]);
  assert.equal(connection.client.closeCalls, 1);
  assert.deepEqual(registry.discover(owner), []);
});

test("disconnect is tenant/owner scoped and requires connection:manage", async () => {
  const connection = makeConnection();
  const { registry, manager } = setup({
    vault: { async revoke() { return { status: "revoked" }; } },
    createRemoteClient: async () => connection
  });
  const preview = await manager.preview(owner, previewInput);
  await manager.approve(owner, {
    previewId: preview.previewId,
    agent: { id: "agent-a", name: "Agent A" },
    approvedTools: ["review_message"]
  });
  await assert.rejects(
    manager.disconnect(otherOwner, { agentId: "agent-a" }),
    (error) => error.code === "AGENT_NOT_FOUND"
  );
  await assert.rejects(
    manager.disconnect(noManage, { agentId: "agent-a" }),
    (error) => error.code === "PERMISSION_DENIED"
  );
  assert.equal(registry.getAuthorized(owner, "agent-a", "review_message").id, "agent-a");
});

test("disconnect still closes and unregisters when credential revocation fails", async () => {
  const connection = makeConnection();
  const { registry, manager } = setup({
    vault: { async revoke() { throw new Error("secret store details must not leak"); } },
    createRemoteClient: async () => connection
  });
  const preview = await manager.preview(owner, previewInput);
  await manager.approve(owner, {
    previewId: preview.previewId,
    agent: { id: "agent-a", name: "Agent A" },
    approvedTools: ["review_message"]
  });
  await assert.rejects(
    manager.disconnect(owner, { agentId: "agent-a" }),
    (error) => error.code === "CONNECTION_REVOKE_FAILED" && !error.message.includes("secret store")
  );
  assert.equal(connection.client.closeCalls, 1);
  assert.deepEqual(registry.discover(owner), []);
});
