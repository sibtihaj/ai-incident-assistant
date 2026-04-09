import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

import type { MCPClient } from "@/lib/mcp-client";

type JsonSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: string[];
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
};

export function schemaFromJsonSchema(schema?: JsonSchema): z.ZodTypeAny {
  if (!schema || typeof schema !== "object") {
    return z.record(z.string(), z.unknown());
  }

  if (schema.oneOf?.length) {
    if (schema.oneOf.length === 1) {
      return schemaFromJsonSchema(schema.oneOf[0]);
    }
    return z.union(
      schema.oneOf.map((item) => schemaFromJsonSchema(item)) as [
        z.ZodTypeAny,
        z.ZodTypeAny,
        ...z.ZodTypeAny[],
      ]
    );
  }

  if (schema.anyOf?.length) {
    if (schema.anyOf.length === 1) {
      return schemaFromJsonSchema(schema.anyOf[0]);
    }
    return z.union(
      schema.anyOf.map((item) => schemaFromJsonSchema(item)) as [
        z.ZodTypeAny,
        z.ZodTypeAny,
        ...z.ZodTypeAny[],
      ]
    );
  }

  switch (schema.type) {
    case "string":
      return schema.enum?.length ? z.enum(schema.enum as [string, ...string[]]) : z.string();
    case "number":
      return z.number();
    case "integer":
      return z.number().int();
    case "boolean":
      return z.boolean();
    case "array":
      return z.array(schemaFromJsonSchema(schema.items));
    case "object":
    default: {
      const shape: Record<string, z.ZodTypeAny> = {};
      const required = new Set(schema.required ?? []);
      for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
        const childSchema = schemaFromJsonSchema(propertySchema);
        shape[key] = required.has(key) ? childSchema : childSchema.optional();
      }
      return z.object(shape).passthrough();
    }
  }
}

export function extractTextContent(toolResult: unknown): string {
  if (typeof toolResult === "string") {
    return toolResult;
  }

  if (
    toolResult &&
    typeof toolResult === "object" &&
    "content" in toolResult &&
    Array.isArray((toolResult as { content?: unknown[] }).content)
  ) {
    const textParts = ((toolResult as { content: Array<{ text?: string }> }).content || [])
      .map((item) => item?.text)
      .filter((item): item is string => Boolean(item));
    if (textParts.length) {
      return textParts.join("\n");
    }
  }

  return JSON.stringify(toolResult, null, 2);
}

export function buildMcpTools(client: MCPClient): DynamicStructuredTool[] {
  const tools = client.getAvailableTools();

  return tools.map((tool) => {
    const rawSchema = schemaFromJsonSchema(tool.inputSchema);
    const schema =
      rawSchema instanceof z.ZodObject
        ? rawSchema
        : z.object({ value: rawSchema.optional() });

    return new DynamicStructuredTool({
      name: tool.name,
      description: tool.description || `MCP tool: ${tool.name}`,
      schema,
      func: async (input) => {
        const payload =
          rawSchema instanceof z.ZodObject
            ? input
            : ((input as { value?: Record<string, unknown> }).value ?? {});
        const result = await client.callTool(tool.name, payload);
        return extractTextContent(result);
      },
    });
  });
}
