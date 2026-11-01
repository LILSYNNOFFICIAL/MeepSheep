import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { createLocalJWKSet, SignJWT } from "jose";
import {
  createBearerAuthenticator,
  withBearerAuthentication
} from "../src/relay/auth.mjs";
import {
  createPinnedFetch,
  isPublicAddress,
  validateRemoteEndpoint
} from "../src/relay/endpoint-security.mjs";

const issuer = "https://identity.example.test/";
const audience = "https://meepsheep.example.test";
const now = 1_798_000_000;
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = { ...publicKey.export({ format: "jwk" }), use: "sig", alg: "RS256", kid: "test-key" };
const jwks = createLocalJWKSet({ keys: [publicJwk] });

async function makeToken(claimOverrides = {}, { tokenIssuer = issuer, tokenAudience = audience, alg = "RS256" } = {}) {
  const claims = {
    sub: "caller-1",
    tenant_id: "tenant-a",
    client_id: "client-a",
    scope: "agent:discover agent:message",
    iat: now,
    exp: now + 300,
    jti: "jti-001",
    ...claimOverrides
  };
  return new SignJWT(claims)
    .setProtectedHeader({ alg, typ: "at+jwt", kid: "test-key" })
    .setIssuer(tokenIssuer)
    .setAudience(tokenAudience)
    .sign(privateKey);
}

function makeAuthenticator(options = {}) {
  return createBearerAuthenticator({
    issuer,
    audience,
    jwks,
    clock: () => now * 1000,
    maxLifetimeSeconds: 900,
    clockSkewSeconds: 5,
    ...options
  });
}

async function requestWithToken(signed) {
  return new Request("https://meepsheep.example.test/mcp", {
    headers: { authorization: "Bearer " + signed }
  });
}

test("accepts a signed JWT access token and derives principal only from verified claims", async () => {
  const auth = makeAuthenticator();
  const signed = await makeToken();
  const info = await auth.authenticate(await requestWithToken(signed));
  assert.equal(info.clientId, "client-a");
  assert.deepEqual(info.scopes, ["agent:discover", "agent:message"]);
  assert.equal(info.expiresAt, now + 300);
  assert.deepEqual(auth.resolvePrincipal(info), {
    principalId: "caller-1",
    tenantId: "tenant-a",
    permissions: ["agent:discover", "agent:message"]
  });
});

test("rejects a missing bearer token distinctly from malformed credentials", async () => {
  const auth = makeAuthenticator();
  await assert.rejects(
    auth.authenticate(new Request("https://meepsheep.example.test/mcp")),
    (error) => error.code === "AUTH_REQUIRED"
  );
  await assert.rejects(
    auth.authenticate(new Request("https://meepsheep.example.test/mcp", {
      headers: { authorization: "Bearer not-a-jwt" }
    })),
    (error) => error.code === "AUTH_INVALID"
  );
});

test("rejects incorrect issuer, audience, expiry, future issue time, and excessive lifetime", async () => {
  const auth = makeAuthenticator();
  const cases = [
    await makeToken({}, { tokenIssuer: "https://attacker.example/" }),
    await makeToken({}, { tokenAudience: "https://other.example.test" }),
    await makeToken({ exp: now - 1 }),
    await makeToken({ iat: now + 60 }),
    await makeToken({ exp: now + 901 })
  ];
  for (const signed of cases) {
    await assert.rejects(auth.authenticate(await requestWithToken(signed)), (error) => error.code === "AUTH_INVALID");
  }
});

test("rejects incomplete or malformed identity and scope claims", async () => {
  const auth = makeAuthenticator();
  const malformedClaims = [
    { sub: "" },
    { tenant_id: "" },
    { client_id: "" },
    { scope: "" },
    { scope: "agent:message agent:message" },
    { scope: "agent:message invalid scope" },
    { jti: "" },
    { exp: "later" },
    { iat: "now" },
    { exp: now }
  ];
  for (const claims of malformedClaims) {
    const signed = await makeToken(claims);
    await assert.rejects(auth.authenticate(await requestWithToken(signed)), (error) => error.code === "AUTH_INVALID");
  }
});

test("rejects tokens signed with an algorithm outside the configured allowlist", async () => {
  const auth = makeAuthenticator();
  const signed = await makeToken({}, { alg: "HS256" });
  await assert.rejects(auth.authenticate(await requestWithToken(signed)), (error) => error.code === "AUTH_INVALID");
});

test("rejects a forged or copied authInfo object rather than trusting its extra principal", async () => {
  const auth = makeAuthenticator();
  const signed = await makeToken();
  const info = await auth.authenticate(await requestWithToken(signed));
  const copied = {
    ...info,
    extra: { principal: { principalId: "attacker", tenantId: "tenant-victim", permissions: ["*"] } }
  };
  assert.throws(() => auth.resolvePrincipal(copied), (error) => error.code === "AUTH_INVALID");
  assert.equal(auth.resolvePrincipal(info).principalId, "caller-1");
});

test("bearer middleware overwrites caller-supplied auth context with verified identity", async () => {
  const auth = makeAuthenticator();
  const signed = await makeToken();
  let observedPrincipal;
  const wrapped = withBearerAuthentication({
    async fetch(_request, context) {
      observedPrincipal = auth.resolvePrincipal(context.authInfo);
      return new Response("ok");
    },
    close() {}
  }, auth);
  const request = await requestWithToken(signed);
  await wrapped.fetch(request, {
    authInfo: { extra: { principal: { principalId: "attacker", tenantId: "tenant-victim", permissions: ["*"] } } }
  });
  assert.deepEqual(observedPrincipal, {
    principalId: "caller-1",
    tenantId: "tenant-a",
    permissions: ["agent:discover", "agent:message"]
  });
});

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
      "content-type": "application/json"
    },
    body: "{}"
  }));
  for (const name of ["connection", "keep-alive", "x-internal", "proxy-authorization", "proxy-connection", "cookie"]) {
    assert.equal(headers.has(name), false, name);
  }
  assert.equal(headers.get("content-type"), "application/json");
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
