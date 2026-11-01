import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";

const validatedEndpoints = new WeakSet();
const IPV4_BLOCKED_CIDRS = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4]
];

function cidrContains(address, network, prefix, bits) {
  const shift = BigInt(bits - prefix);
  return (address >> shift) === (network >> shift);
}

function parseIPv4(address) {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  let value = 0n;
  for (const part of parts) {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = (value << 8n) | BigInt(octet);
  }
  return value;
}

function parseIPv6(address) {
  if (address.includes("%")) return null;
  let normalized = address.toLowerCase();

  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    if (lastColon < 0) return null;
    const ipv4 = normalized.slice(lastColon + 1);
    if (isIP(ipv4) !== 4) return null;
    const ipv4Value = parseIPv4(ipv4);
    if (ipv4Value === null) return null;
    const high = Number((ipv4Value >> 16n) & 0xffffn).toString(16);
    const low = Number(ipv4Value & 0xffffn).toString(16);
    normalized = normalized.slice(0, lastColon + 1) + high + ":" + low;
  }

  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  let groups;

  if (halves.length === 2) {
    const zeroGroups = 8 - left.length - right.length;
    if (zeroGroups < 1) return null;
    groups = [...left, ...Array(zeroGroups).fill("0"), ...right];
  } else {
    groups = left;
    if (groups.length !== 8) return null;
  }

  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.reduce((value, group) => (value << 16n) | BigInt("0x" + group), 0n);
}

function isPublicIPv4(address) {
  const value = parseIPv4(address);
  if (value === null) return false;
  return !IPV4_BLOCKED_CIDRS.some(([network, prefix]) =>
    cidrContains(value, parseIPv4(network), prefix, 32)
  );
}

function isPublicIPv6(address) {
  const value = parseIPv6(address);
  if (value === null) return false;

  // Accept only IPv6 global-unicast space (2000::/3) before exclusions.
  if ((value >> 125n) !== 1n) return false;

  const blocked = [
    ["2001::", 23],      // IETF protocol assignments, including discard/benchmark ranges
    ["2001:db8::", 32],  // documentation
    ["2002::", 16],      // 6to4 transition
    ["3fff::", 20]       // documentation
  ];
  return !blocked.some(([network, prefix]) =>
    cidrContains(value, parseIPv6(network), prefix, 128)
  );
}

export function isPublicAddress(address) {
  if (typeof address !== "string") return false;
  const family = isIP(address);
  if (family === 4) return isPublicIPv4(address);
  if (family === 6) return isPublicIPv6(address);
  return false;
}

export class EndpointSecurityError extends Error {
  constructor(code) {
    super(code);
    this.name = "EndpointSecurityError";
    this.code = code;
  }
}

function rejected() {
  return new EndpointSecurityError("ENDPOINT_REJECTED");
}

function normalizedHostname(hostname) {
  return hostname.toLowerCase().replace(/\.$/, "");
}

function normalizeAllowedHost(value) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || value.includes("*")) {
    throw rejected();
  }
  let parsed;
  try {
    parsed = new URL("https://" + value + "/");
  } catch {
    throw rejected();
  }
  if (parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || parsed.pathname !== "/") {
    throw rejected();
  }
  const hostname = normalizedHostname(parsed.hostname.replace(/^\[|\]$/g, ""));
  if (!hostname || isIP(hostname) !== 0) throw rejected();
  return hostname;
}

async function defaultLookupAll(hostname) {
  return dnsLookup(hostname, { all: true, verbatim: true });
}

export async function validateRemoteEndpoint(endpoint, { allowedHosts, lookupAll = defaultLookupAll } = {}) {
  try {
    if (typeof endpoint !== "string" || !Array.isArray(allowedHosts) || allowedHosts.length === 0 || typeof lookupAll !== "function") {
      throw rejected();
    }

    const url = new URL(endpoint);
    if (
      url.protocol !== "https:" ||
      (url.port !== "" && url.port !== "443") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw rejected();
    }

    const hostname = normalizedHostname(url.hostname.replace(/^\[|\]$/g, ""));
    if (!hostname || isIP(hostname) !== 0) throw rejected();
    const approvedHosts = new Set(allowedHosts.map(normalizeAllowedHost));
    if (!approvedHosts.has(hostname)) throw rejected();

    const answers = await lookupAll(hostname);
    if (!Array.isArray(answers) || answers.length === 0) throw rejected();

    const unique = new Map();
    for (const answer of answers) {
      if (!answer || typeof answer.address !== "string") throw rejected();
      const family = isIP(answer.address);
      if ((family !== 4 && family !== 6) || answer.family !== family || !isPublicAddress(answer.address)) {
        throw rejected();
      }
      unique.set(family + ":" + answer.address, Object.freeze({ address: answer.address, family }));
    }

    if (unique.size === 0) throw rejected();

    url.hostname = hostname;
    url.port = "443";
    const addressSnapshot = Object.freeze([...unique.values()]);
    const validated = Object.freeze({
      href: url.href,
      origin: url.origin,
      hostname,
      pathname: url.pathname,
      port: 443,
      addresses: addressSnapshot
    });
    validatedEndpoints.add(validated);
    return validated;
  } catch (error) {
    if (error instanceof EndpointSecurityError) throw error;
    throw rejected();
  }
}

const REQUEST_HEADERS_TO_REMOVE = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "accept-encoding",
  "cookie",
  "cookie2"
]);

function pinnedLookup(endpoint, requestedHostname, options, callback) {
  if (normalizedHostname(requestedHostname) !== endpoint.hostname) {
    const error = new Error("Unapproved DNS lookup.");
    error.code = "ENDPOINT_REJECTED";
    callback(error);
    return;
  }

  const family = typeof options === "number"
    ? options
    : (typeof options === "object" ? options.family : 0);
  const matching = family
    ? endpoint.addresses.filter((answer) => answer.family === family)
    : endpoint.addresses;

  if (matching.length === 0) {
    const error = new Error("No validated address for requested family.");
    error.code = "EAI_ADDRFAMILY";
    callback(error);
    return;
  }
  if (typeof options === "object" && options.all) {
    callback(null, matching.map((answer) => ({ ...answer })));
    return;
  }
  callback(null, matching[0].address, matching[0].family);
}

function performPinnedHttpsRequest(target, options) {
  return new Promise((resolve, reject) => {
    const headers = Object.fromEntries(options.headers.entries());
    if (options.body && !Object.hasOwn(headers, "content-length")) {
      headers["content-length"] = String(options.body.byteLength);
    }

    const request = httpsRequest(target, {
      method: options.method,
      headers,
      hostname: options.hostname,
      servername: options.servername,
      port: options.port,
      lookup: options.lookup,
      rejectUnauthorized: true,
      agent: false,
      autoSelectFamily: true,
      signal: options.signal
    }, (incoming) => {
      const encoding = String(incoming.headers["content-encoding"] ?? "identity").toLowerCase();
      if (encoding !== "identity") {
        const error = new EndpointSecurityError("REMOTE_ENCODING_UNSUPPORTED");
        incoming.destroy();
        reject(error);
        return;
      }

      const responseHeaders = new Headers();
      const connectionNominated = new Set(
        String(incoming.headers.connection ?? "")
          .split(",")
          .map((name) => name.trim().toLowerCase())
          .filter(Boolean)
      );
      const responseHopByHop = new Set([
        "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
        "proxy-connection", "te", "trailer", "transfer-encoding", "upgrade",
        "set-cookie", "set-cookie2", "content-encoding"
      ]);
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (
          value === undefined ||
          responseHopByHop.has(name) ||
          connectionNominated.has(name)
        ) continue;
        if (Array.isArray(value)) {
          for (const item of value) responseHeaders.append(name, item);
        } else {
          responseHeaders.set(name, String(value));
        }
      }

      const status = incoming.statusCode ?? 502;
      if (status < 200 || status > 599) {
        const error = new EndpointSecurityError("REMOTE_RESPONSE_INVALID");
        incoming.destroy();
        reject(error);
        return;
      }

      let receivedBytes = 0;
      let streamEnded = false;
      const body = new ReadableStream({
        start(controller) {
          incoming.on("data", (chunk) => {
            if (streamEnded) return;
            receivedBytes += chunk.byteLength;
            if (receivedBytes > options.maxResponseBytes) {
              const error = new EndpointSecurityError("RESPONSE_TOO_LARGE");
              request.destroy(error);
              streamEnded = true;
              controller.error(error);
              return;
            }
            controller.enqueue(new Uint8Array(chunk));
          });
          incoming.on("end", () => {
            if (streamEnded) return;
            streamEnded = true;
            controller.close();
          });
          incoming.on("aborted", () => {
            if (streamEnded) return;
            streamEnded = true;
            controller.error(new EndpointSecurityError("REMOTE_RESPONSE_ABORTED"));
          });
          incoming.on("error", (error) => {
            if (streamEnded) return;
            streamEnded = true;
            controller.error(error);
          });
        },
        cancel() {
          incoming.destroy();
        }
      });

      resolve(new Response([204, 205, 304].includes(status) ? null : body, {
        status,
        statusText: incoming.statusMessage,
        headers: responseHeaders
      }));
    });

    request.once("error", reject);
    request.setTimeout(options.timeoutMs, () => {
      const error = new EndpointSecurityError("REMOTE_TIMEOUT");
      request.destroy(error);
    });
    request.end(options.body);
  });
}

async function readBodyLimited(request, maximumBytes, signal) {
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  const abort = () => { reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    while (true) {
      if (signal.aborted) {
        throw new EndpointSecurityError(request.signal.aborted ? "REQUEST_ABORTED" : "REMOTE_TIMEOUT");
      }
      const { value, done } = await reader.read();
      if (signal.aborted) {
        throw new EndpointSecurityError(request.signal.aborted ? "REQUEST_ABORTED" : "REMOTE_TIMEOUT");
      }
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel().catch(() => {});
        throw new EndpointSecurityError("PAYLOAD_TOO_LARGE");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
  return chunks.length ? Buffer.concat(chunks, total) : undefined;
}

export function createPinnedFetch({
  validatedEndpoint,
  requestImpl = performPinnedHttpsRequest,
  timeoutMs = 15000,
  maxRequestBytes = 1024 * 1024,
  maxResponseBytes = 1024 * 1024
} = {}) {
  if (!validatedEndpoints.has(validatedEndpoint)) throw new TypeError("A validated remote endpoint is required.");
  if (typeof requestImpl !== "function") throw new TypeError("requestImpl must be a function.");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) {
    throw new TypeError("timeoutMs must be an integer between 1 and 60000.");
  }
  if (!Number.isSafeInteger(maxRequestBytes) || maxRequestBytes < 0) {
    throw new TypeError("maxRequestBytes must be a non-negative safe integer.");
  }
  if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1) {
    throw new TypeError("maxResponseBytes must be a positive safe integer.");
  }

  return async function pinnedFetch(request) {
    if (!(request instanceof Request)) throw rejected();
    const url = new URL(request.url);
    if (
      url.protocol !== "https:" ||
      url.origin !== validatedEndpoint.origin ||
      url.pathname !== validatedEndpoint.pathname ||
      url.search ||
      url.hash ||
      url.username ||
      url.password ||
      (url.port !== "" && url.port !== "443")
    ) {
      throw rejected();
    }

    const method = request.method.toUpperCase();
    if (!["GET", "POST", "DELETE"].includes(method)) throw rejected();

    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = request.signal
      ? AbortSignal.any([request.signal, timeoutSignal])
      : timeoutSignal;
    const body = await readBodyLimited(request, maxRequestBytes, signal);
    const headers = new Headers(request.headers);
    const nominated = (headers.get("connection") ?? "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);
    for (const name of REQUEST_HEADERS_TO_REMOVE) headers.delete(name);
    for (const name of nominated) headers.delete(name);
    for (const name of [...headers.keys()]) {
      if (name.startsWith("proxy-")) headers.delete(name);
    }
    headers.set("accept-encoding", "identity");
    const lookup = (hostname, options, callback) =>
      pinnedLookup(validatedEndpoint, hostname, options, callback);

    const response = await requestImpl(validatedEndpoint.href, {
      hostname: validatedEndpoint.hostname,
      servername: validatedEndpoint.hostname,
      port: 443,
      method,
      headers,
      body,
      signal,
      lookup,
      rejectUnauthorized: true,
      timeoutMs,
      maxResponseBytes
    });
    if (!(response instanceof Response)) throw new TypeError("requestImpl must return a Response.");
    return response;
  };
}
