import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { createLocalJWKSet, SignJWT } from "jose";
import {
  createBearerAuthenticator,
  withBearerAuthentication
} from "../src/relay/auth.mjs";

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
    { scope: 'agent:message bad"scope' },
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

