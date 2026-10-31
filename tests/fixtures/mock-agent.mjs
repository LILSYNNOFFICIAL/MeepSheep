import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export function createMockAgent({ id = "agent-mock", toolName = "review_message", reply = "Remote agent processed the request.", onCall = () => {} } = {}) {
  let calls = 0;
  const handler = createMcpHandler(() => {
    const server = new McpServer({ name: id, version: "0.1.0" });
    server.registerTool(
      toolName,
      {
        description: "Process a message using this independent mock agent.",
        inputSchema: z.object({ message: z.string() }),
        outputSchema: z.object({ reply: z.string(), agentId: z.string() })
      },
      async ({ message }) => {
        calls += 1;
        onCall({ message });
        const output = { reply, agentId: id };
        return {
          content: [{ type: "text", text: JSON.stringify(output) }],
          structuredContent: output
        };
      }
    );
    return server;
  });
  return {
    handler,
    get calls() { return calls; }
  };
}
