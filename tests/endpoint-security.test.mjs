import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPinnedFetch,
  isPublicAddress,
  validateRemoteEndpoint
} from "../src/relay/endpoint-security.mjs";

test("classifies only globally routable IPv4 and IPv6 unicast addresses as public", () => {
  for (const address of ["8.8.8.8", "93.184.216.34", "2606:4700:4700::1111", "2001:4860:4860::8888"]) {
    assert.equal(isPublicAddress(address), true, address);
  }
  for (const address of [
    "0.1.2.3", "10.0.0.1", "100.64.0.1", "127.0.0.1", "169.254.1.1",
    "172.16.0.1", "192.0.0.1", "192.0.2.1", "192.88.99.1", "192.168.1.1",
    "198.18.0.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "240.0.0.1",
    "255.255.255.255", "::", "::1", "::ffff:8.8.8.8", "64:ff9b::808:808",
    "100::1", "2001:db8::1", "2001:1::1", "2002::1", "3fff::1",
    "fc00::1", "fe80::1", "ff02::1", "1::1"
  ]) {
    assert.equal(isPublicAddress(address), false, address);
  }
});

const allowedHosts = ["agent.example.test"];
const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];

test("validates exact HTTPS endpoint identity and returns a frozen DNS snapshot", async () => {
  const endpoint = await validateRemoteEndpoint("https://agent.example.test/mcp", {
    allowedHosts,
    lookupAll: publicLookup
  });
  assert.equal(endpoint.origin, "https://agent.example.test");
  assert.equal(endpoint.pathname, "/mcp");
  assert.deepEqual(endpoint.addresses, [{ address: "93.184.216.34", family: 4 }]);
  assert.equal(Object.isFrozen(endpoint), true);
  assert.equal(Object.isFrozen(endpoint.addresses), true);
});

test("rejects insecure, noncanonical, credentialed, unapproved, or query-bearing endpoints", async () => {
  for (const url of [
    "http://agent.example.test/mcp",
    "https://agent.example.test:8443/mcp",
    "https://user:pass@agent.example.test/mcp",
    "https://agent.example.test/mcp?token=secret",
    "https://agent.example.test/mcp#fragment",
    "https://unapproved.example.test/mcp",
    "https://127.0.0.1/mcp",
    "https://localhost/mcp",
    "ftp://agent.example.test/mcp"
  ]) {
    await assert.rejects(
      validateRemoteEndpoint(url, { allowedHosts, lookupAll: publicLookup }),
      (error) => error.code === "ENDPOINT_REJECTED"
    );
  }
});

test("rejects DNS errors, empty answers, malformed answers, and mixed public/private DNS", async () => {
  await assert.rejects(
    validateRemoteEndpoint("https://agent.example.test/mcp", {
      allowedHosts, lookupAll: async () => { throw new Error("DNS failure"); }
    }),
    (error) => error.code === "ENDPOINT_REJECTED"
  );
  for (const lookupAll of [
    async () => [],
    async () => [{ address: "not-an-ip", family: 4 }],
    async () => [{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.1", family: 4 }]
  ]) {
    await assert.rejects(
      validateRemoteEndpoint("https://agent.example.test/mcp", { allowedHosts, lookupAll }),
      (error) => error.code === "ENDPOINT_REJECTED"
    );
  }
});

test("pinned fetch uses only validated addresses and preserves hostname TLS verification", async () => {
  const endpoint = await validateRemoteEndpoint("https://agent.example.test/mcp", {
    allowedHosts,
    lookupAll: async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "2606:4700:4700::1111", family: 6 }
    ]
  });
  let captured;
  const fetchRemote = createPinnedFetch({
    validatedEndpoint: endpoint,
    timeoutMs: 5000,
    requestImpl: async (_url, options) => {
      captured = options;
      return new Response("remote response", { status: 200 });
    }
  });
  const response = await fetchRemote(new Request("https://agent.example.test/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", cookie: "sid=secret" },
    body: "{\"jsonrpc\":\"2.0\"}"
  }));
  assert.equal(await response.text(), "remote response");
  assert.equal(captured.hostname, "agent.example.test");
  assert.equal(captured.servername, "agent.example.test");
  assert.equal(captured.port, 443);
  assert.equal(captured.rejectUnauthorized, true);
  assert.ok(captured.signal);
  const pinned = await new Promise((resolve, reject) => {
    captured.lookup("agent.example.test", { all: true }, (error, addresses) => error ? reject(error) : resolve(addresses));
  });
  assert.deepEqual(pinned, endpoint.addresses);
  assert.equal(captured.headers.has("cookie"), false);
});

test("pinned fetch rejects origin, path, query, and unsupported method changes before network I/O", async () => {
  const endpoint = await validateRemoteEndpoint("https://agent.example.test/mcp", {
    allowedHosts, lookupAll: publicLookup
  });
  let calls = 0;
  const fetchRemote = createPinnedFetch({
    validatedEndpoint: endpoint,
    requestImpl: async () => { calls += 1; return new Response("unexpected"); }
  });
  for (const request of [
    new Request("https://attacker.example.test/mcp", { method: "POST" }),
    new Request("https://agent.example.test/other", { method: "POST" }),
    new Request("https://agent.example.test/mcp?redirect=1", { method: "POST" }),
    new Request("https://agent.example.test/mcp", { method: "PUT" })
  ]) {
    await assert.rejects(fetchRemote(request), (error) => error.code === "ENDPOINT_REJECTED");
  }
  assert.equal(calls, 0);
});

test("pinned fetch removes hop-by-hop, proxy, cookie, and connection-nominated headers", async () => {
  const endpoint = await validateRemoteEndpoint("https://agent.example.test/mcp", {
    allowedHosts, lookupAll: publicLookup
  });
  let headers;
  const fetchRemote = createPinnedFetch({
    validatedEndpoint: endpoint,
    requestImpl: async (_url, options) => {
      headers = options.headers;
      return new Response(null, { status: 204 });
    }
  });
  await fetchRemote(new Request("https://agent.example.test/mcp", {
    method: "POST",
    headers: {
      connection: "x-internal, keep-alive",
      "x-internal": "must-remove",
      "proxy-authorization": "secret",
      "proxy-connection": "keep-alive",
      cookie: "sid=secret",
      "content-type": "application/json",
      "accept-encoding": "gzip, br"
    },
    body: "{}"
  }));
  for (const name of ["connection", "keep-alive", "x-internal", "proxy-authorization", "proxy-connection", "cookie"]) {
    assert.equal(headers.has(name), false, name);
  }
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(headers.get("accept-encoding"), "identity");
});

test("pinned fetch returns redirects without following them", async () => {
  const endpoint = await validateRemoteEndpoint("https://agent.example.test/mcp", {
    allowedHosts, lookupAll: publicLookup
  });
  let calls = 0;
  const fetchRemote = createPinnedFetch({
    validatedEndpoint: endpoint,
    requestImpl: async () => {
      calls += 1;
      return new Response(null, { status: 302, headers: { location: "https://attacker.example.test/" } });
    }
  });
  const response = await fetchRemote(new Request("https://agent.example.test/mcp", { method: "POST" }));
  assert.equal(response.status, 302);
  assert.equal(calls, 1);
});

test("pinned fetch enforces request size and exposes a bounded timeout", async () => {
  const endpoint = await validateRemoteEndpoint("https://agent.example.test/mcp", {
    allowedHosts, lookupAll: publicLookup
  });
  let captured;
  const fetchRemote = createPinnedFetch({
    validatedEndpoint: endpoint,
    timeoutMs: 25,
    maxRequestBytes: 4,
    requestImpl: async (_url, options) => {
      captured = options;
      return new Response("ok");
    }
  });
  await assert.rejects(
    fetchRemote(new Request("https://agent.example.test/mcp", { method: "POST", body: "12345" })),
    (error) => error.code === "PAYLOAD_TOO_LARGE"
  );
  await fetchRemote(new Request("https://agent.example.test/mcp", { method: "POST", body: "1234" }));
  assert.equal(captured.timeoutMs, 25);
});


test("pinned fetch enforces the timeout and caller abort while reading request bodies", async () => {
  const endpoint = await validateRemoteEndpoint("https://agent.example.test/mcp", {
    allowedHosts, lookupAll: publicLookup
  });
  let outboundCalls = 0;
  const fetchRemote = createPinnedFetch({
    validatedEndpoint: endpoint,
    timeoutMs: 1000,
    requestImpl: async () => {
      outboundCalls += 1;
      return new Response("unexpected");
    }
  });
  const controller = new AbortController();
  const slowBody = new ReadableStream({
    pull() {
      return new Promise(() => {});
    }
  });
  const pending = fetchRemote(new Request("https://agent.example.test/mcp", {
    method: "POST",
    body: slowBody,
    duplex: "half",
    signal: controller.signal
  }));
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(pending, (error) => error.code === "REQUEST_ABORTED");
  assert.equal(outboundCalls, 0);
});

test("pinned fetch deadline covers stalled request-body reads", async () => {
  const endpoint = await validateRemoteEndpoint("https://agent.example.test/mcp", {
    allowedHosts, lookupAll: publicLookup
  });
  let outboundCalls = 0;
  const fetchRemote = createPinnedFetch({
    validatedEndpoint: endpoint,
    timeoutMs: 10,
    requestImpl: async () => {
      outboundCalls += 1;
      return new Response("unexpected");
    }
  });
  const slowBody = new ReadableStream({
    pull() {
      return new Promise(() => {});
    }
  });
  await assert.rejects(
    fetchRemote(new Request("https://agent.example.test/mcp", {
      method: "POST", body: slowBody, duplex: "half"
    })),
    (error) => error.code === "REMOTE_TIMEOUT"
  );
  assert.equal(outboundCalls, 0);
});
