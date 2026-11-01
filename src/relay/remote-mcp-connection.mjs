import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { fingerprintToolSchema } from "./tool-schema.mjs";
import { createPinnedFetch, validateRemoteEndpoint } from "./endpoint-security.mjs";

const CREDENTIAL_REF_PREFIX = "credential://";
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const BEARER_TOKEN_PATTERN = /^[A-Za-z0-9\-._~+/]+=*$/;

export class RemoteMcpConnectionError extends Error {
  constructor(code) {
    super(code);
    this.name = "RemoteMcpConnectionError";
    this.code = code;
  }
}

function invalidAuthConfig() {
  return new RemoteMcpConnectionError("REMOTE_AUTH_CONFIG_INVALID");
}

function parseCredentialRef(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !value.startsWith(CREDENTIAL_REF_PREFIX)) {
    throw invalidAuthConfig();
  }
  const credentialId = value.slice(CREDENTIAL_REF_PREFIX.length);
  if (!IDENTIFIER_PATTERN.test(credentialId)) throw invalidAuthConfig();
  return credentialId;
}

function authorizationFromSecret(secret) {
  if (
    !secret ||
    typeof secret !== "object" ||
    Array.isArray(secret) ||
    secret.type !== "bearer" ||
    typeof secret.token !== "string" ||
    secret.token.length === 0 ||
    secret.token.length > 16 * 1024 ||
    !BEARER_TOKEN_PATTERN.test(secret.token)
  ) {
    throw invalidAuthConfig();
  }
  return "Bearer " + secret.token;
}

function toRequest(input, init) {
  try {
    if (input instanceof Request && init === undefined) return input;
    const requestInit = init ? { ...init } : {};
    if (requestInit.body && typeof requestInit.body.getReader === "function") {
      requestInit.duplex ??= "half";
    }
    return new Request(input, requestInit);
  } catch {
    throw new RemoteMcpConnectionError("REMOTE_REQUEST_INVALID");
  }
}

function createVaultBackedFetch({
  pinnedFetch,
  credentialVault,
  credentialId,
  tenantId
}) {
  return async function remoteFetch(input, init) {
    const request = toRequest(input, init);
    const headers = new Headers(request.headers);

    // An MCP caller or transport must never choose the remote agent credential.
    headers.delete("authorization");

    if (credentialId !== null) {
      const authorization = await credentialVault.withCredential(
        { credentialId, tenantId },
        authorizationFromSecret
      );
      headers.set("authorization", authorization);
    }

    const authenticatedRequest = new Request(request, { headers });
    return pinnedFetch(authenticatedRequest);
  };
}

async function closeQuietly(client, transport) {
  try {
    if (client && typeof client.close === "function") {
      await client.close();
      return;
    }
  } catch {
    // Do not replace the original sanitized connection failure.
  }
  try {
    if (transport && typeof transport.close === "function") await transport.close();
  } catch {
    // Cleanup is best effort only.
  }
}

function defaultClientFactory({ name, version }) {
  return new Client({ name, version });
}

function defaultTransportFactory(url, { fetch }) {
  return new StreamableHTTPClientTransport(url, { fetch });
}

export async function createSecureRemoteMcpClient({
  endpoint,
  allowedHosts,
  credentialVault,
  credentialRef,
  tenantId,
  lookupAll,
  requestImpl,
  timeoutMs = 15000,
  maxRequestBytes = 1024 * 1024,
  maxResponseBytes = 1024 * 1024,
  clientName = "meepsheep-remote",
  clientVersion = "0.1.0",
  clientFactory = defaultClientFactory,
  transportFactory = defaultTransportFactory
} = {}) {
  const credentialId = parseCredentialRef(credentialRef);
  if (
    credentialId !== null &&
    (!credentialVault || typeof credentialVault.withCredential !== "function" ||
      typeof tenantId !== "string" || tenantId.length === 0)
  ) {
    throw invalidAuthConfig();
  }
  if (typeof clientFactory !== "function" || typeof transportFactory !== "function") {
    throw new TypeError("MCP client and transport factories must be functions.");
  }

  // Endpoint validation is deliberately completed before constructing any network client.
  const validatedEndpoint = await validateRemoteEndpoint(endpoint, {
    allowedHosts,
    ...(lookupAll ? { lookupAll } : {})
  });

  const pinnedFetch = createPinnedFetch({
    validatedEndpoint,
    ...(requestImpl ? { requestImpl } : {}),
    timeoutMs,
    maxRequestBytes,
    maxResponseBytes
  });
  const fetch = createVaultBackedFetch({
    pinnedFetch,
    credentialVault,
    credentialId,
    tenantId
  });

  let client;
  let transport;
  try {
    client = clientFactory({ name: clientName, version: clientVersion });
    if (!client || typeof client.connect !== "function" ||
        typeof client.listTools !== "function" || typeof client.close !== "function") {
      throw new TypeError("MCP client factory returned an incompatible client.");
    }
    transport = transportFactory(new URL(validatedEndpoint.href), { fetch });
    if (!transport) throw new TypeError("MCP transport factory returned no transport.");

    await client.connect(transport);
    const discovery = await client.listTools();
    if (!discovery || !Array.isArray(discovery.tools)) {
      throw new RemoteMcpConnectionError("REMOTE_TOOL_DISCOVERY_FAILED");
    }

    const schemaFingerprints = {};
    for (const tool of discovery.tools) {
      schemaFingerprints[tool.name] = fingerprintToolSchema(tool);
    }

    const endpointMetadata = Object.freeze({
      hostname: validatedEndpoint.hostname,
      pathname: validatedEndpoint.pathname
    });

    return Object.freeze({
      client,
      credentialRef: credentialRef ?? null,
      endpointMetadata,
      discoveredTools: Object.freeze([...discovery.tools]),
      schemaFingerprints: Object.freeze(schemaFingerprints),
      close: () => client.close()
    });
  } catch (error) {
    await closeQuietly(client, transport);
    if (
      error instanceof RemoteMcpConnectionError ||
      (typeof error?.code === "string" && error.code.startsWith("CREDENTIAL_"))
    ) {
      throw error;
    }
    throw new RemoteMcpConnectionError("REMOTE_CONNECT_FAILED");
  }
}
