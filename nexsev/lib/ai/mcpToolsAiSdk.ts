import { dynamicTool, zodSchema } from "ai";
import { z } from "zod";

import type { MCPClient } from "@/lib/mcp-client";
import { extractTextContent, schemaFromJsonSchema } from "@/lib/langchain/mcpTools";

/**
 * Exposes MCP tools to the Vercel AI SDK (`generateText` / `streamText`) using `dynamicTool`,
 * aligned with MCP client guidance (list tools → callTool with validated args).
 */
export function buildMcpToolsForAiSdk(
  client: MCPClient
): Record<string, ReturnType<typeof dynamicTool>> {
  const tools = client.getAvailableTools();
  const out: Record<string, ReturnType<typeof dynamicTool>> = {};

  for (const t of tools) {
    const rawSchema = schemaFromJsonSchema(t.inputSchema);
    const inputSchema =
      rawSchema instanceof z.ZodObject
        ? rawSchema
        : z.object({ value: rawSchema.optional() });

    out[t.name] = dynamicTool({
      description: t.description || `MCP tool: ${t.name}`,
      inputSchema: zodSchema(inputSchema),
      execute: async (input) => {
        const payload =
          rawSchema instanceof z.ZodObject
            ? (input as Record<string, unknown>)
            : ((input as { value?: Record<string, unknown> }).value ?? {});
        const result = await client.callTool(t.name, payload);
        return extractTextContent(result);
      },
    });
  }

  return out;
}
