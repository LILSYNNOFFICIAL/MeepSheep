import { createServer } from "node:http";
import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: "agent-process", version: "0.1.0" });
  server.registerTool(
    "review_message",
    {
      description: "Echo a unique message through a separate MCP server process.",
      inputSchema: z.object({ message: z.string() }),
      outputSchema: z.object({ reply: z.string(), agentId: z.string() })
    },
    async ({ message }) => {
      const reply = "REMOTE RECEIVED: " + message;
      const output = { reply, agentId: "agent-process" };
      return {
        content: [{ type: "text", text: reply }],
        structuredContent: output
      };
    }
  );
  return server;
});

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

const httpServer = createServer(async (incoming, outgoing) => {
  try {
    const method = incoming.method ?? "GET";
    const body = method === "GET" || method === "HEAD"
      ? undefined
      : await readRequestBody(incoming);
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers)) {
      if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    const request = new Request(
      new URL(incoming.url ?? "/mcp", "http://" + (incoming.headers.host ?? "127.0.0.1")),
      { method, headers, ...(body === undefined ? {} : { body, duplex: "half" }) }
    );
    const response = await handler.fetch(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    if (response.body) {
      for await (const chunk of response.body) outgoing.write(Buffer.from(chunk));
    }
    outgoing.end();
  } catch {
    outgoing.statusCode = 500;
    outgoing.end("Internal server error");
  }
});

httpServer.listen(0, "127.0.0.1", () => {
  const address = httpServer.address();
  if (!address || typeof address === "string") {
    process.stderr.write("Mock MCP server failed to bind a TCP port.\n");
    process.exitCode = 1;
    return;
  }
  process.stdout.write("READY http://127.0.0.1:" + address.port + "/mcp\n");
});

function shutdown() {
  httpServer.close(() => {
    handler.close().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 3000).unref();
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
