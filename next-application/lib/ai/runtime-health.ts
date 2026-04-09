import fs from "fs";

import { createGateway, generateText } from "ai";

import { getAIConfig, getAiSdkGatewayBaseUrl } from "@/lib/ai/config";
import { getMcpServerPath } from "@/lib/mcp-server-path";
import { MCPClient } from "@/lib/mcp-client";
import {
  resolveMcpTransport,
  type ResolvedMcpTransport,
} from "@/lib/mcp-transport-config";

const MCP_SERVER_PATH = getMcpServerPath();

async function getMcpClient(): Promise<MCPClient> {
  const mcpClient = MCPClient.getInstance();
  if (!mcpClient.isConnected()) {
    await mcpClient.connect(MCP_SERVER_PATH);
  }
  return mcpClient;
}

export interface ChatRuntimeHealth {
  llm_status: "healthy" | "error";
  llm_error?: string;
  mcp_status: "healthy" | "error";
  mcp_error?: string;
  /** How MCP is reached: local subprocess or remote HTTP transport. */
  mcp_transport: "stdio" | "streamable-http" | "sse";
  /** stdio script path or remote MCP base URL (no secrets). */
  mcp_endpoint: string;
  mcp_server_path: string;
  mcp_server_path_exists: boolean;
  mcp_tools_count: number;
  mcp_tools: string[];
  current_model: string;
  gateway_sdk_base_url: string;
  provider: string;
  sdk: string;
}

/**
 * Live checks used by `/api/chat` GET and `/api/observability` (gateway ping + MCP tools).
 */
export async function getChatRuntimeHealth(): Promise<ChatRuntimeHealth> {
  const aiConfig = getAIConfig();
  const gatewayProvider = createGateway({
    apiKey: aiConfig.gatewayToken,
    baseURL: getAiSdkGatewayBaseUrl(),
  });
  const model = gatewayProvider(aiConfig.model);

  let llmStatus: "healthy" | "error" = "healthy";
  let llmError: string | undefined;
  try {
    await generateText({
      model,
      prompt: "ping",
      temperature: 0,
    });
  } catch (error) {
    llmStatus = "error";
    llmError = String(error);
  }

  let mcpStatus: "healthy" | "error" = "healthy";
  let mcpError: string | undefined;
  let mcpTools: string[] = [];
  let resolvedMcp: ResolvedMcpTransport;
  try {
    resolvedMcp = resolveMcpTransport(MCP_SERVER_PATH);
  } catch (e) {
    resolvedMcp = { mode: "stdio", serverScriptPath: MCP_SERVER_PATH };
    mcpStatus = "error";
    mcpError = e instanceof Error ? e.message : String(e);
  }

  if (mcpStatus === "healthy") {
    try {
      const mcpClient = await getMcpClient();
      mcpTools = mcpClient.getAvailableTools().map((tool) => tool.name);
    } catch (error) {
      mcpStatus = "error";
      mcpError = String(error);
    }
  }

  const mcpTransport = resolvedMcp.mode;
  const mcpEndpoint =
    resolvedMcp.mode === "stdio"
      ? resolvedMcp.serverScriptPath
      : resolvedMcp.url.toString();

  return {
    llm_status: llmStatus,
    llm_error: llmError,
    mcp_status: mcpStatus,
    mcp_error: mcpError,
    mcp_transport: mcpTransport,
    mcp_endpoint: mcpEndpoint,
    mcp_server_path: MCP_SERVER_PATH,
    mcp_server_path_exists: fs.existsSync(MCP_SERVER_PATH),
    mcp_tools_count: mcpTools.length,
    mcp_tools: mcpTools,
    current_model: aiConfig.model,
    gateway_sdk_base_url: getAiSdkGatewayBaseUrl(),
    provider: "vercel-ai-gateway",
    sdk: "ai",
  };
}
