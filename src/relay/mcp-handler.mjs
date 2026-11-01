import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/client";
import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { RelayError } from "./agent-registry.mjs";
import { withBearerAuthentication } from "./auth.mjs";
import { fingerprintToolSchema } from "./tool-schema.mjs";
import { registerTaskTools } from "./task-mcp-tools.mjs";

const agentSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
  status: z.string()
});

const discoveryOutputSchema = z.object({ agents: z.array(agentSummarySchema) });

const messageOutputSchema = z.object({
  messageId: z.string(),
  traceId: z.string(),
  sourceAgentId: z.string(),
  targetAgentId: z.string(),
  status: z.literal("completed"),
  output: z.json(),
  provenance: z.object({ protocol: z.literal("mcp"), remoteToolName: z.string() })
});

function toolError(code) {
  return { isError: true, content: [{ type: "text", text: code }] };
}

function safeCode(error) {
  if (error instanceof RelayError) return error.code;
  return "REMOTE_FAILED";
}

export function createRelayHandler({ registry, resolvePrincipal, authenticator, taskCoordinator }) {
  if (!registry || typeof registry.discover !== "function" || typeof registry.getAuthorized !== "function") {
    throw new TypeError("A compatible agent registry is required.");
  }
  const principalResolver = authenticator?.resolvePrincipal ?? resolvePrincipal;
  if (typeof principalResolver !== "function") throw new TypeError("A trusted principal resolver is required.");
  if (authenticator && typeof authenticator.authenticate !== "function") throw new TypeError("A valid bearer authenticator is required.");

  const handler = createMcpHandler((context) => {
    const principal = principalResolver(context.authInfo);
    const server = new McpServer({ name: "meepsheep-relay", version: "0.1.0" }, { maxToolInputElements: 256 });

    server.registerTool("discover_agents", {
      description: "Discover active agents visible to the authenticated caller.",
      inputSchema: z.object({}),
      outputSchema: discoveryOutputSchema
    }, async () => {
      try {
        return { content: [{ type: "text", text: "Visible agents" }], structuredContent: { agents: registry.discover(principal) } };
      } catch (error) { return toolError(safeCode(error)); }
    });

    server.registerTool("send_message", {
      description: "Send a message to an approved tool on a connected agent.",
      inputSchema: z.object({
        targetAgentId: z.string().min(1),
        toolName: z.string().min(1),
        arguments: z.record(z.string(), z.unknown())
      }),
      outputSchema: messageOutputSchema
    }, async ({ targetAgentId, toolName, arguments: toolArguments }) => {
      try {
        const agent = registry.getAuthorized(principal, targetAgentId, toolName);
        const remoteTools = await agent.client.listTools();
        const remoteTool = remoteTools.tools.find((tool) => tool.name === toolName);
        if (!remoteTool || fingerprintToolSchema(remoteTool) !== agent.approvedSchemaFingerprint) {
          throw new RelayError("SCHEMA_CHANGED");
        }
        const remoteResult = await agent.client.callTool({ name: toolName, arguments: toolArguments });
        if (remoteResult.isError) throw new RelayError("REMOTE_FAILED");
        return {
          content: [{ type: "text", text: "Message delivered to " + agent.id }],
          structuredContent: {
            messageId: randomUUID(), traceId: randomUUID(), sourceAgentId: principal.principalId,
            targetAgentId: agent.id, status: "completed",
            output: remoteResult.structuredContent ?? remoteResult.content,
            provenance: { protocol: "mcp", remoteToolName: toolName }
          }
        };
      } catch (error) { return toolError(safeCode(error)); }
    });

    if (taskCoordinator) {
      registerTaskTools(server, taskCoordinator, principal);
    }
    return server;
  }, { legacy: "stateless", maxRequestBodySize: 1024 * 1024 });

  return authenticator ? withBearerAuthentication(handler, authenticator) : handler;
}
