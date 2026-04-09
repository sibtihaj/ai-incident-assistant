import fs from "fs";

import { createGateway, generateText } from "ai";

import { getAIConfig, getAiSdkGatewayBaseUrl } from "@/lib/ai/config";
import { getMcpServerPath } from "@/lib/mcp-server-path";
import { MCPClient } from "@/lib/mcp-client";

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
  try {
    const mcpClient = await getMcpClient();
    mcpTools = mcpClient.getAvailableTools().map((tool) => tool.name);
  } catch (error) {
    mcpStatus = "error";
    mcpError = String(error);
  }

  return {
    llm_status: llmStatus,
    llm_error: llmError,
    mcp_status: mcpStatus,
    mcp_error: mcpError,
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
