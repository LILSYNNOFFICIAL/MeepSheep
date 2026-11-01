import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export function createMockAgent({ id = "agent-mock", toolName = "review_message", reply = "Remote agent processed the request.", failure = false, onCall = () => {}, description = "Process a message using this independent mock agent.", inputSchema = z.object({ message: z.string() }) } = {}) {
  let calls = 0;
  const handler = createMcpHandler(() => {
    const server = new McpServer({ name: id, version: "0.1.0" });
    server.registerTool(
      toolName,
      {
        description,
        inputSchema,
        outputSchema: z.object({ reply: z.string(), agentId: z.string() })
      },
      async ({ message }) => {
        calls += 1;
        onCall({ message });
        if (failure) {
          return {
            isError: true,
            content: [{ type: "text", text: "REMOTE SECRET: /private/path/stack-trace" }]
          };
        }
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
