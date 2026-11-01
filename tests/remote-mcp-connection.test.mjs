import assert from "node:assert/strict";
import { test } from "node:test";
import { createCredentialVault } from "../src/relay/credential-vault.mjs";
import { createSecureRemoteMcpClient } from "../src/relay/remote-mcp-connection.mjs";

class MemoryCredentialStore {
  records = new Map();
  async insert(record) {
    if (this.records.has(record.credentialId)) return false;
    this.records.set(record.credentialId, structuredClone(record));
    return true;
  }
  async get(id) {
    const record = this.records.get(id);
    return record ? structuredClone(record) : null;
  }
  async compareAndSwap(id, version, replacement) {
    const current = this.records.get(id);
    if (!current || current.version !== version) return false;
    this.records.set(id, structuredClone(replacement));
    return true;
  }
}

const key = Buffer.alloc(32, 9);
const keyProvider = {
  async getCurrentKey() { return { keyId: "key-1", key: Buffer.from(key) }; },
  async getKey(id) {
    if (id !== "key-1") throw new Error("missing");
    return Buffer.from(key);
  }
};

const allowedHosts = ["agent.example.test"];
const lookupAll = async () => [{ address: "93.184.216.34", family: 4 }];
const tool = {
  name: "review_message",
  description: "Review a supplied message.",
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

function makeVault() {
  const store = new MemoryCredentialStore();
  const vault = createCredentialVault({ store, keyProvider });
  return { store, vault };
}

function makeClientFactory(onRequest) {
  let createdClient;
  const clientFactory = () => {
    createdClient = {
      transport: null,
      closed: false,
      async connect(transport) {
        this.transport = transport;
      },
      async listTools() {
        const response = await this.transport.fetch(
          new Request("https://agent.example.test/mcp", {
            method: "POST",
            headers: {
              authorization: "Bearer caller-controlled-header",
              cookie: "caller-cookie=must-not-forward",
              "content-type": "application/json"
            },
            body: "{}"
          })
        );
        assert.equal(response.status, 200);
        return { tools: [tool] };
      },
      async close() {
        this.closed = true;
      }
    };
    return createdClient;
  };
  return { clientFactory, getClient: () => createdClient };
}

test("secure remote client validates endpoint, pins transport, and loads bearer credentials from the vault", async () => {
  const { vault } = makeVault();
  await vault.put({
    credentialId: "agent-credential",
    tenantId: "tenant-a",
    secret: { type: "bearer", token: "remote-agent-token" }
  });
  const requests = [];
  const requestImpl = async (url, options) => {
    const resolved = await new Promise((resolve, reject) => {
      options.lookup(options.hostname, { all: true }, (error, addresses) => error ? reject(error) : resolve(addresses));
    });
    requests.push({
      url,
      authorization: options.headers.get("authorization"),
      cookie: options.headers.get("cookie"),
      hostname: options.hostname,
      servername: options.servername,
      resolved
    });
    return new Response("ok", { status: 200 });
  };
  const { clientFactory, getClient } = makeClientFactory();
  const connection = await createSecureRemoteMcpClient({
    endpoint: "https://agent.example.test/mcp",
    allowedHosts,
    lookupAll,
    credentialVault: vault,
    credentialRef: "credential://agent-credential",
    tenantId: "tenant-a",
    requestImpl,
    clientFactory,
    transportFactory: (_url, options) => ({ fetch: options.fetch })
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].authorization, "Bearer remote-agent-token");
  assert.equal(requests[0].cookie, null);
  assert.equal(requests[0].hostname, "agent.example.test");
  assert.equal(requests[0].servername, "agent.example.test");
  assert.deepEqual(requests[0].resolved, [{ address: "93.184.216.34", family: 4 }]);
  assert.deepEqual(connection.endpointMetadata, {
    hostname: "agent.example.test",
    pathname: "/mcp"
  });
  assert.deepEqual(connection.discoveredTools.map((item) => item.name), ["review_message"]);
  assert.equal(typeof connection.schemaFingerprints.review_message, "string");
  assert.equal(connection.schemaFingerprints.review_message.length, 64);
  assert.strictEqual(connection.client, getClient());

  await vault.revoke({ credentialId: "agent-credential", tenantId: "tenant-a" });
  await assert.rejects(
    getClient().transport.fetch(new Request("https://agent.example.test/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    })),
    (error) => error.code === "CREDENTIAL_REVOKED"
  );
  assert.equal(requests.length, 1, "revoked credentials must be rejected before outbound network I/O");
});

test("untrusted caller authorization headers are removed when no credential reference is configured", async () => {
  const requests = [];
  const requestImpl = async (_url, options) => {
    requests.push(options.headers.get("authorization"));
    return new Response("ok", { status: 200 });
  };
  const { clientFactory } = makeClientFactory();
  await createSecureRemoteMcpClient({
    endpoint: "https://agent.example.test/mcp",
    allowedHosts,
    lookupAll,
    requestImpl,
    clientFactory,
    transportFactory: (_url, options) => ({ fetch: options.fetch })
  });
  assert.deepEqual(requests, [null]);
});

test("unsafe endpoints are rejected before the outbound MCP client is created", async () => {
  let clientCreations = 0;
  await assert.rejects(
    createSecureRemoteMcpClient({
      endpoint: "https://attacker.example.test/mcp",
      allowedHosts,
      lookupAll,
      clientFactory: () => { clientCreations += 1; return {}; },
      transportFactory: (_url, options) => ({ fetch: options.fetch })
    }),
    (error) => error.code === "ENDPOINT_REJECTED"
  );
  assert.equal(clientCreations, 0);
});

test("invalid credential references and malformed bearer secrets fail closed", async () => {
  const { vault } = makeVault();
  await vault.put({
    credentialId: "bad-token",
    tenantId: "tenant-a",
    secret: { type: "bearer", token: "token with spaces" }
  });
  const { clientFactory } = makeClientFactory();
  await assert.rejects(
    createSecureRemoteMcpClient({
      endpoint: "https://agent.example.test/mcp",
      allowedHosts,
      lookupAll,
      credentialVault: vault,
      credentialRef: "credential://bad-token",
      tenantId: "tenant-a",
      requestImpl: async () => new Response("should not request"),
      clientFactory,
      transportFactory: (_url, options) => ({ fetch: options.fetch })
    }),
    (error) => error.code === "REMOTE_AUTH_CONFIG_INVALID"
  );
  await assert.rejects(
    createSecureRemoteMcpClient({
      endpoint: "https://agent.example.test/mcp",
      allowedHosts,
      lookupAll,
      credentialRef: "not-a-credential-reference",
      tenantId: "tenant-a",
      clientFactory,
      transportFactory: (_url, options) => ({ fetch: options.fetch })
    }),
    (error) => error.code === "REMOTE_AUTH_CONFIG_INVALID"
  );
});
