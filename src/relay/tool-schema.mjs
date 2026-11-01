import { createHash } from "node:crypto";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function fingerprintToolSchema(tool) {
  if (!tool || typeof tool.name !== "string" || !tool.inputSchema) {
    throw new TypeError("A remote tool name and input schema are required for approval.");
  }
  const snapshot = canonicalize({
    name: tool.name,
    description: tool.description ?? "",
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema ?? null
  });
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}
