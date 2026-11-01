import assert from "node:assert/strict";
import { test } from "node:test";
import { AgentRegistry } from "../src/relay/agent-registry.mjs";

const principal = {
  principalId: "caller-1",
  tenantId: "tenant-a",
  permissions: ["agent:discover", "agent:message"]
};

function validAgent(overrides = {}) {
  return {
    id: "agent-a",
    tenantId: "tenant-a",
    ownerPrincipalId: principal.principalId,
    name: "Agent A",
    description: "Review requests",
    discoverable: true,
    capabilities: ["review"],
    approvedTools: ["review_message"],
    approvedToolSchemas: { review_message: "a".repeat(64) },
    endpointRef: "endpoint://endpoint-a",
    credentialRef: "credential://credential-a",
    client: { listTools() {}, callTool() {} },
    ...overrides
  };
}

test("registry stores only explicit safe metadata, opaque refs, approved schemas, and the client handle", () => {
  const registry = new AgentRegistry();
  const client = { listTools() {}, callTool() {} };
  registry.register(validAgent({ client, developerNote: "must-not-be-retained" }));
  const agent = registry.getAuthorized(principal, "agent-a", "review_message");
  assert.equal(agent.id, "agent-a");
  assert.equal(agent.tenantId, "tenant-a");
  assert.equal(agent.credentialRef, "credential://credential-a");
  assert.equal(agent.endpointRef, "endpoint://endpoint-a");
  assert.strictEqual(agent.client, client);
  assert.equal(agent.approvedSchemaFingerprint, "a".repeat(64));
  assert.equal("developerNote" in agent, false);
  assert.equal("endpoint" in agent, false);
  assert.equal("secretRef" in agent, false);
  assert.equal(JSON.stringify(agent).includes("must-not-be-retained"), false);
});

test("registry rejects raw secrets and authorization material in registration records", () => {
  const forbidden = [
    { credential: "raw-secret" },
    { credentials: { token: "raw-secret" } },
    { secret: "raw-secret" },
    { token: "raw-secret" },
    { accessToken: "raw-secret" },
    { authorization: "Bearer raw-secret" },
    { authorizationHeader: "Bearer raw-secret" },
    { authHeaders: { authorization: "Bearer raw-secret" } },
    { headers: { authorization: "Bearer raw-secret" } },
    { secretRef: "legacy-untyped-secret-reference" }
  ];
  for (const fields of forbidden) {
    const registry = new AgentRegistry();
    assert.throws(
      () => registry.register(validAgent(fields)),
      (error) => error instanceof TypeError && /credentialRef/.test(error.message)
    );
  }
});


test("registry rejects noncanonical or path-bearing credential references", () => {
  for (const credentialRef of ["credential://id/other", "credential:// id", "credential://", "secret://id"]) {
    const registry = new AgentRegistry();
    assert.throws(
      () => registry.register(validAgent({ credentialRef })),
      (error) => error instanceof TypeError && /opaque credential/.test(error.message)
    );
  }
});


test("agents are owner-only by default and can be shared only by explicit owner grant", () => {
  const registry = new AgentRegistry();
  registry.register(validAgent());
  const sameTenantMember = {
    principalId: "member-b",
    tenantId: "tenant-a",
    permissions: ["agent:discover", "agent:message", "connection:manage"]
  };
  assert.deepEqual(registry.discover(sameTenantMember), []);
  assert.throws(
    () => registry.getAuthorized(sameTenantMember, "agent-a", "review_message"),
    (error) => error.code === "AGENT_NOT_FOUND"
  );
  assert.throws(
    () => registry.grantAccess(sameTenantMember, "agent-a", "member-c"),
    (error) => error.code === "AGENT_NOT_FOUND"
  );
  registry.grantAccess({ ...principal, permissions: [...principal.permissions, "connection:manage"] }, "agent-a", "member-b");
  assert.deepEqual(registry.discover(sameTenantMember).map((agent) => agent.id), ["agent-a"]);
  assert.equal(registry.getAuthorized(sameTenantMember, "agent-a", "review_message").id, "agent-a");
  registry.revokeAccess({ ...principal, permissions: [...principal.permissions, "connection:manage"] }, "agent-a", "member-b");
  assert.deepEqual(registry.discover(sameTenantMember), []);
});

test("only the owner can manage grants and the owner grant cannot be revoked", () => {
  const registry = new AgentRegistry();
  registry.register(validAgent());
  const ownerWithManage = { ...principal, permissions: [...principal.permissions, "connection:manage"] };
  assert.throws(
    () => registry.revokeAccess(ownerWithManage, "agent-a", principal.principalId),
    (error) => error.code === "OWNER_GRANT_IMMUTABLE"
  );
  assert.throws(
    () => registry.grantAccess(principal, "agent-a", "member-b"),
    (error) => error.code === "PERMISSION_DENIED"
  );
});

test("model-facing discovery does not reveal credential or endpoint references", () => {
  const registry = new AgentRegistry();
  registry.register(validAgent());
  const result = registry.discover(principal);
  assert.equal(result.length, 1);
  assert.equal("credentialRef" in result[0], false);
  assert.equal("endpointRef" in result[0], false);
  assert.equal(JSON.stringify(result).includes("credential://"), false);
  assert.equal(JSON.stringify(result).includes("endpoint://"), false);
});
