import fs from "fs";
import path from "path";

import { createGateway, generateText, stepCountIs } from "ai";
import type { ModelMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";

import { getAIConfig, getAiSdkGatewayBaseUrl } from "@/lib/ai/config";
import { getObservabilityClient } from "@/lib/ai/observability";
import { buildMcpToolsForAiSdk } from "@/lib/ai/mcpToolsAiSdk";
import { ContextDetector } from "@/lib/contextDetector";
import { MCPClient } from "@/lib/mcp-client";
import { PromptContext, PromptEngine } from "@/lib/promptEngine";

type ConversationMessage = {
  sender: "user" | "ai";
  content: string;
};

const observability = getObservabilityClient();

function getMcpServerPath(): string {
  const configured = process.env.MCP_SERVER_PATH;
  if (configured) {
    return configured;
  }

  const possiblePaths = [
    path.resolve(process.cwd(), "../mcp-server/build/index.js"),
    path.resolve(process.cwd(), "../../mcp-server/build/index.js"),
    path.resolve(process.cwd(), "mcp-server/build/index.js"),
  ];

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      return possiblePath;
    }
  }

  return possiblePaths[0];
}

const MCP_SERVER_PATH = getMcpServerPath();

async function getMcpClient(): Promise<MCPClient> {
  const mcpClient = MCPClient.getInstance();
  if (!mcpClient.isConnected()) {
    await mcpClient.connect(MCP_SERVER_PATH);
  }
  return mcpClient;
}

function mapHistoryToModelMessages(
  conversationHistory: ConversationMessage[]
): ModelMessage[] {
  return conversationHistory
    .filter((msg) => msg.sender === "user" || msg.sender === "ai")
    .map((msg) =>
      msg.sender === "user"
        ? ({ role: "user", content: msg.content } satisfies ModelMessage)
        : ({ role: "assistant", content: msg.content } satisfies ModelMessage)
    );
}

export async function POST(request: NextRequest) {
  const requestId = `chat-${Date.now()}`;
  const startedAt = Date.now();

  try {
    const body = await request.json();
    const {
      message,
      conversationHistory = [],
      userContext = {},
    }: {
      message?: string;
      conversationHistory?: ConversationMessage[];
      userContext?: Record<string, unknown>;
    } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    const aiConfig = getAIConfig();
    const gatewayProvider = createGateway({
      apiKey: aiConfig.gatewayToken,
      baseURL: getAiSdkGatewayBaseUrl(),
    });

    const model = gatewayProvider(aiConfig.model);

    const promptEngine = new PromptEngine();
    const intent = ContextDetector.detectIntent(message);
    const entities = ContextDetector.extractEntities(message);
    const context: PromptContext = {
      intent,
      entities,
      domain: intent,
      ...userContext,
    };

    for (const historyMessage of conversationHistory) {
      if (historyMessage.sender === "user" || historyMessage.sender === "ai") {
        promptEngine.addToHistory({
          user: historyMessage.sender === "user" ? historyMessage.content : "",
          assistant: historyMessage.sender === "ai" ? historyMessage.content : "",
        });
      }
    }

    const promptData = promptEngine.buildPrompt(message, context);
    const isConversational = PromptEngine.isConversationalQuery(message);

    const baseMessages: ModelMessage[] = [
      ...mapHistoryToModelMessages(conversationHistory),
      { role: "user", content: message },
    ];

    observability.onRequestStart({
      requestId,
      model: aiConfig.model,
      messagePreview: message.slice(0, 160),
    });

    if (isConversational) {
      const result = await generateText({
        model,
        system: promptData.optimized,
        messages: baseMessages,
        temperature: aiConfig.temperature,
      });

      const elapsedMs = Date.now() - startedAt;
      observability.onRequestEnd({
        requestId,
        model: aiConfig.model,
        messagePreview: message.slice(0, 160),
        elapsedMs,
      });

      return NextResponse.json({
        content: result.text,
        model: aiConfig.model,
        metadata: {
          provider: "vercel-ai-gateway",
          sdk: "ai",
          timestamp: new Date().toISOString(),
          elapsedMs,
        },
      });
    }

    let mcpClient: MCPClient;
    try {
      mcpClient = await getMcpClient();
    } catch (mcpErr) {
      const details = mcpErr instanceof Error ? mcpErr.message : String(mcpErr);
      observability.onRequestError({
        requestId,
        model: aiConfig.model,
        messagePreview: message.slice(0, 160),
        error: `MCP unavailable: ${details}`,
        elapsedMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        {
          error: "MCP server unavailable",
          details:
            `${details} — Ensure mcp-server is built (npm run build in mcp-server), set MCP_SERVER_PATH if needed, and use stdio only in a Node environment (local or long-lived server), not typical Vercel serverless without a remote MCP transport.`,
        },
        { status: 503 }
      );
    }

    const tools = buildMcpToolsForAiSdk(mcpClient);

    const result = await generateText({
      model,
      system: promptData.optimized,
      messages: baseMessages,
      tools,
      temperature: aiConfig.temperature,
      stopWhen: stepCountIs(12),
      onStepFinish: ({ toolCalls: stepToolCalls }) => {
        if (stepToolCalls.length) {
          observability.onToolCall({
            requestId,
            model: aiConfig.model,
            messagePreview: message.slice(0, 160),
            toolCalls: stepToolCalls.map((tc) => tc.toolName),
          });
        }
      },
    });

    const elapsedMs = Date.now() - startedAt;
    const toolCalls = result.toolCalls?.map((tc) => tc.toolName) ?? [];

    observability.onRequestEnd({
      requestId,
      model: aiConfig.model,
      messagePreview: message.slice(0, 160),
      toolCalls,
      elapsedMs,
    });

    return NextResponse.json({
      content: result.text,
      model: aiConfig.model,
      metadata: {
        provider: "vercel-ai-gateway",
        sdk: "ai",
        timestamp: new Date().toISOString(),
        elapsedMs,
        toolCalls,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    observability.onRequestError({
      requestId,
      model: process.env.AI_GATEWAY_MODEL || "unknown",
      messagePreview: "POST /api/chat",
      error: details,
      elapsedMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        details,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
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

    return NextResponse.json({
      message: "AI Incident Assistant chat API is running",
      status: llmStatus === "healthy" && mcpStatus === "healthy" ? "healthy" : "degraded",
      llm_status: llmStatus,
      llm_error: llmError,
      provider: "vercel-ai-gateway",
      sdk: "ai",
      gateway_base_url: getAiSdkGatewayBaseUrl(),
      current_model: aiConfig.model,
      mcp_status: mcpStatus,
      mcp_error: mcpError,
      mcp_server_path: MCP_SERVER_PATH,
      mcp_server_path_exists: fs.existsSync(MCP_SERVER_PATH),
      mcp_tools_count: mcpTools.length,
      mcp_tools: mcpTools,
    });
  } catch (error) {
    return NextResponse.json({
      message: "AI Incident Assistant chat API is running",
      status: "error",
      error: String(error),
    });
  }
}
