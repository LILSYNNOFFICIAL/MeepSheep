import { jwtVerify } from "jose";

const MAX_TOKEN_BYTES = 16 * 1024;
const SCOPE_TOKEN = /^[\x21\x23-\x5B\x5D-\x7E]+$/;

export class AuthError extends Error {
  constructor(code) {
    super(code);
    this.name = "AuthError";
    this.code = code;
  }
}

function invalid() {
  return new AuthError("AUTH_INVALID");
}

function parseBearerHeader(request) {
  if (!request?.headers || typeof request.headers.get !== "function") {
    throw new AuthError("AUTH_REQUIRED");
  }
  const authorization = request.headers.get("authorization");
  if (!authorization) throw new AuthError("AUTH_REQUIRED");

  const match = /^Bearer[ \t]+([^\s,]+)$/i.exec(authorization);
  if (!match) {
    if (/^Bearer(?:\s|$)/i.test(authorization)) throw invalid();
    throw new AuthError("AUTH_REQUIRED");
  }
  const token = match[1];
  if (Buffer.byteLength(token, "utf8") > MAX_TOKEN_BYTES) throw invalid();
  return token;
}

function parseScopes(scopeClaim) {
  if (typeof scopeClaim !== "string" || scopeClaim.length === 0 || scopeClaim.trim() !== scopeClaim) {
    throw invalid();
  }
  const scopes = scopeClaim.split(" ");
  if (scopes.some((scope) => !SCOPE_TOKEN.test(scope)) || new Set(scopes).size !== scopes.length) {
    throw invalid();
  }
  return scopes;
}

function requiredString(value, maxLength = 256) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength && !/[\u0000-\u001F\u007F]/.test(value);
}

export function createBearerAuthenticator({
  issuer,
  audience,
  jwks,
  clock = () => Date.now(),
  maxLifetimeSeconds = 900,
  clockSkewSeconds = 5
} = {}) {
  if (!requiredString(issuer) || !requiredString(audience) || typeof jwks !== "function") {
    throw new TypeError("An exact issuer, audience, and JWKS resolver are required.");
  }
  if (!Number.isInteger(maxLifetimeSeconds) || maxLifetimeSeconds < 1 || maxLifetimeSeconds > 3600) {
    throw new TypeError("maxLifetimeSeconds must be an integer between 1 and 3600.");
  }
  if (!Number.isInteger(clockSkewSeconds) || clockSkewSeconds < 0 || clockSkewSeconds > 60) {
    throw new TypeError("clockSkewSeconds must be an integer between 0 and 60.");
  }
  if (typeof clock !== "function") throw new TypeError("clock must be a function.");

  const trustedPrincipals = new WeakMap();

  async function authenticate(request) {
    const token = parseBearerHeader(request);
    const nowMs = clock();
    if (!Number.isFinite(nowMs)) throw new AuthError("AUTH_UNAVAILABLE");
    const nowSeconds = Math.floor(nowMs / 1000);

    let payload;
    let protectedHeader;
    try {
      const verified = await jwtVerify(token, jwks, {
        issuer,
        audience,
        algorithms: ["RS256"],
        currentDate: new Date(nowMs),
        clockTolerance: clockSkewSeconds
      });
      payload = verified.payload;
      protectedHeader = verified.protectedHeader;
    } catch (error) {
      if (error?.code === "ERR_JWKS_TIMEOUT" || error?.code === "ERR_JWKS_FETCH_FAILED") {
        throw new AuthError("AUTH_UNAVAILABLE");
      }
      throw invalid();
    }

    if (protectedHeader.alg !== "RS256" || protectedHeader.typ !== "at+jwt") throw invalid();

    const { sub, tenant_id: tenantId, client_id: clientId, iat, exp, jti } = payload;
    if (
      !requiredString(sub) ||
      !requiredString(tenantId) ||
      !requiredString(clientId) ||
      !requiredString(jti) ||
      !Number.isSafeInteger(iat) ||
      !Number.isSafeInteger(exp) ||
      exp <= iat ||
      iat > nowSeconds + clockSkewSeconds ||
      exp - iat > maxLifetimeSeconds
    ) {
      throw invalid();
    }

    const scopes = parseScopes(payload.scope);
    const principal = Object.freeze({
      principalId: sub,
      tenantId,
      permissions: Object.freeze([...scopes])
    });
    const authInfo = Object.freeze({
      token,
      clientId,
      scopes: Object.freeze([...scopes]),
      expiresAt: exp
    });

    trustedPrincipals.set(authInfo, { principal, token, clientId, scopes: authInfo.scopes, expiresAt: exp });
    return authInfo;
  }

  function resolvePrincipal(authInfo) {
    const trusted = authInfo && typeof authInfo === "object" ? trustedPrincipals.get(authInfo) : undefined;
    const nowMs = clock();
    if (
      !trusted ||
      !Number.isFinite(nowMs) ||
      authInfo.token !== trusted.token ||
      authInfo.clientId !== trusted.clientId ||
      authInfo.expiresAt !== trusted.expiresAt ||
      authInfo.scopes !== trusted.scopes ||
      Math.floor(nowMs / 1000) > trusted.expiresAt + clockSkewSeconds
    ) {
      throw invalid();
    }
    return trusted.principal;
  }

  return Object.freeze({ authenticate, resolvePrincipal });
}

export function withBearerAuthentication(handler, authenticator) {
  if (!handler || typeof handler.fetch !== "function" || typeof handler.close !== "function") {
    throw new TypeError("A closeable request handler is required.");
  }
  if (!authenticator || typeof authenticator.authenticate !== "function") {
    throw new TypeError("A bearer authenticator is required.");
  }

  return {
    async fetch(request, context = {}) {
      let authInfo;
      try {
        authInfo = await authenticator.authenticate(request);
      } catch (error) {
        const code = error?.code;
        const headers = {
          "cache-control": "no-store",
          "content-type": "text/plain; charset=utf-8"
        };
        if (code === "AUTH_UNAVAILABLE") {
          headers["retry-after"] = "5";
          return new Response("Authentication service unavailable.", { status: 503, headers });
        }
        headers["www-authenticate"] = code === "AUTH_REQUIRED"
          ? 'Bearer realm="meepsheep"'
          : 'Bearer realm="meepsheep", error="invalid_token"';
        return new Response("Unauthorized.", { status: 401, headers });
      }
      return handler.fetch(request, { ...context, authInfo });
    },
    close(...args) {
      return handler.close(...args);
    }
  };
}
