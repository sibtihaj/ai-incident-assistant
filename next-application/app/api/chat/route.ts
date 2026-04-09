import { createGateway, generateText, stepCountIs } from "ai";
import type { ModelMessage } from "ai";
import { AIMessage, HumanMessage, trimMessages } from "@langchain/core/messages";
import { NextRequest, NextResponse } from "next/server";

import {
  chatQuotaExtensionCreditsFromEnv,
  chatQuotaMaxFromEnv,
  parseQuotaRpc,
  peekChatQuota,
  type UserChatUsageRow,
} from "@/lib/chatQuota";
import { quotaExtensionSecretFromEnv } from "@/lib/quotaExtensionAuth";
import { getAIConfig, getAiSdkGatewayBaseUrl } from "@/lib/ai/config";
import {
  getObservabilityClient,
  type ChatObservabilityMode,
} from "@/lib/ai/observability";
import { buildMcpToolsForAiSdk } from "@/lib/ai/mcpToolsAiSdk";
import { ContextDetector } from "@/lib/contextDetector";
import { MCPClient } from "@/lib/mcp-client";
import { PromptContext, PromptEngine } from "@/lib/promptEngine";
import { readPromptRuntimeConfig } from "@/lib/promptConfigStore";
import { getChatRuntimeHealth } from "@/lib/ai/runtime-health";
import { getMcpServerPath } from "@/lib/mcp-server-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PLAYGROUND_DEVICE_COOKIE } from "@/lib/supabase/middleware";
import type { ConversationMemory } from "@/types/conversation";

type ConversationMessage = {
  sender: "user" | "ai";
  content: string;
};

type StoredConversationEnvelope = {
  messages: ConversationMessage[];
  memory?: ConversationMemory;
};

const observability = getObservabilityClient();

const CAN_REQUIRED_FACTS = [
  "customer",
  "incident_description",
  "severity",
  "status",
  "impact",
] as const;

function normalizeFactKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function extractFactsFromText(text: string): Record<string, string> {
  const facts: Record<string, string> = {};
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9 _-]{1,40})\s*[:=-]\s*(.+)$/);
    if (!match) {
      continue;
    }
    const key = normalizeFactKey(match[1]);
    const value = match[2].trim();
    if (key && value) {
      facts[key] = value;
    }
  }
  return facts;
}

function readConversationEnvelope(raw: unknown): StoredConversationEnvelope {
  if (Array.isArray(raw)) {
    return { messages: raw as ConversationMessage[] };
  }
  if (!raw || typeof raw !== "object") {
    return { messages: [] };
  }
  const obj = raw as { messages?: unknown; memory?: unknown };
  const messages = Array.isArray(obj.messages)
    ? (obj.messages as ConversationMessage[])
    : [];
  const memory =
    obj.memory && typeof obj.memory === "object" && !Array.isArray(obj.memory)
      ? (obj.memory as ConversationMemory)
      : undefined;
  return { messages, memory };
}

function updateConversationMemory(
  existing: ConversationMemory | undefined,
  message: string
): ConversationMemory {
  const incomingFacts = extractFactsFromText(message);
  const mergedFacts = { ...(existing?.keyFacts ?? {}), ...incomingFacts };
  const incomingSummary = message.length > 500 ? `${message.slice(0, 500)}…` : message;
  return {
    incidentSummary: incomingSummary,
    keyFacts: mergedFacts,
    updatedAt: new Date().toISOString(),
  };
}

function buildMemoryContextBlock(memory: ConversationMemory | undefined): string {
  if (!memory) {
    return "";
  }
  const entries = Object.entries(memory.keyFacts);
  const factsBlock =
    entries.length > 0
      ? entries.map(([k, v]) => `- ${k}: ${v}`).join("\n")
      : "- none captured";
  return `Persistent incident memory:\nSummary: ${memory.incidentSummary || "none"}\nKey facts:\n${factsBlock}`;
}

function shouldGenerateCan(message: string): boolean {
  return /\b(can|customer alert notice|generate can)\b/i.test(message);
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

function estimateMessageTokens(messages: Array<HumanMessage | AIMessage>): number {
  const totalCharacters = messages.reduce((sum, message) => {
    const content = typeof message.content === "string" ? message.content : "";
    return sum + content.length;
  }, 0);
  return Math.ceil(totalCharacters / 4);
}

async function trimHistoryMessages(
  messages: ModelMessage[],
  maxHistoryTokens: number
): Promise<ModelMessage[]> {
  const baseMessages: Array<HumanMessage | AIMessage> = [];
  for (const message of messages) {
    if (typeof message.content !== "string") {
      continue;
    }
    if (message.role === "user") {
      baseMessages.push(new HumanMessage(message.content));
    } else if (message.role === "assistant") {
      baseMessages.push(new AIMessage(message.content));
    }
  }

  if (baseMessages.length <= 1) {
    return messages;
  }

  const trimmed = await trimMessages(baseMessages, {
    strategy: "last",
    maxTokens: maxHistoryTokens,
    startOn: "human",
    endOn: ["human", "ai"],
    tokenCounter: (msgs) => estimateMessageTokens(msgs as Array<HumanMessage | AIMessage>),
  });

  return trimmed.map((msg) => {
    if (msg.getType() === "ai") {
      return { role: "assistant", content: String(msg.content) } satisfies ModelMessage;
    }
    return { role: "user", content: String(msg.content) } satisfies ModelMessage;
  });
}

export async function POST(request: NextRequest) {
  const requestId = `chat-${Date.now()}`;
  const startedAt = Date.now();

  try {
    const body = await request.json();
    const {
      message,
      conversationHistory = [],
      conversationId,
      userContext = {},
    }: {
      message?: string;
      conversationHistory?: ConversationMessage[];
      conversationId?: string | null;
      userContext?: Record<string, unknown>;
    } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    const supabaseAuth = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let existingMemory: ConversationMemory | undefined;
    if (conversationId && typeof conversationId === "string") {
      const { data: row } = await supabaseAuth
        .from("chat_sessions")
        .select("messages")
        .eq("id", conversationId)
        .maybeSingle();
      existingMemory = readConversationEnvelope(row?.messages).memory;
    }
    const updatedMemory = updateConversationMemory(existingMemory, message);

    if (shouldGenerateCan(message)) {
      const missing = CAN_REQUIRED_FACTS.filter((key) => !updatedMemory.keyFacts[key]);
      if (missing.length > 0) {
        return NextResponse.json({
          content: `Before generating the CAN report, I still need these fields: ${missing.join(
            ", "
          )}. Please provide them as key-value lines (for example: \"severity: SEV1\").`,
          model: "memory-guard",
          metadata: {
            provider: "local",
            sdk: "guard",
            timestamp: new Date().toISOString(),
            missingFacts: missing,
          },
        });
      }
    }

    const deviceId = request.cookies.get(PLAYGROUND_DEVICE_COOKIE)?.value ?? null;
    const quotaMax = chatQuotaMaxFromEnv();
    const { data: quotaRaw, error: quotaError } = await supabaseAuth.rpc(
      "increment_and_check_chat_quota",
      {
        p_device_id: deviceId,
        p_max: quotaMax,
      }
    );

    if (quotaError) {
      console.error("increment_and_check_chat_quota", quotaError);
      return NextResponse.json(
        {
          error: "Chat quota service unavailable",
          details: quotaError.message,
        },
        { status: 503 }
      );
    }

    const quota = parseQuotaRpc(quotaRaw);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "Daily chat limit reached for this account.",
          code: quota.code ?? "CHAT_QUOTA_EXCEEDED",
          resetAt: quota.reset_at,
          remaining: quota.remaining ?? 0,
          max: quotaMax,
        },
        { status: 429 }
      );
    }

    const aiConfig = getAIConfig();
    const gatewayProvider = createGateway({
      apiKey: aiConfig.gatewayToken,
      baseURL: getAiSdkGatewayBaseUrl(),
    });

    const model = gatewayProvider(aiConfig.model);

    const promptEngine = new PromptEngine();
    await PromptEngine.loadFileContext();
    const runtimeConfig = await readPromptRuntimeConfig();
    const intent = ContextDetector.detectIntent(message);
    const entities = ContextDetector.extractEntities(message);
    const hasActionableEntities =
      entities.actions.length > 0 || ContextDetector.isActionableInput(message);
    const context: PromptContext = {
      intent,
      entities,
      domain: intent,
      ...userContext,
    };
    promptEngine.setSessionContext({
      currentProject:
        typeof userContext.currentProject === "string"
          ? userContext.currentProject
          : undefined,
    });

    const promptData = promptEngine.buildPrompt(context);
    const memoryContextBlock = buildMemoryContextBlock(updatedMemory);
    const isConversationalByText = PromptEngine.isConversationalQuery(
      message,
      runtimeConfig
    );
    const forceActionableForCan = shouldGenerateCan(message);
    const isConversational =
      isConversationalByText &&
      !hasActionableEntities &&
      intent !== "technical" &&
      !forceActionableForCan;

    const historyModelMessages = mapHistoryToModelMessages(conversationHistory);
    const lastHistory = historyModelMessages.at(-1);
    const shouldAppendCurrentUserTurn =
      !(lastHistory?.role === "user" && lastHistory.content === message);
    const baseMessages: ModelMessage[] = shouldAppendCurrentUserTurn
      ? [...historyModelMessages, { role: "user", content: message }]
      : [...historyModelMessages];
    const trimmedMessages = await trimHistoryMessages(
      baseMessages,
      runtimeConfig.maxHistoryTokens
    );
    const estimatedInputTokens = Math.ceil(
      baseMessages.reduce((sum, msg) => {
        if (typeof msg.content !== "string") {
          return sum;
        }
        return sum + msg.content.length;
      }, 0) / 4
    );
    const estimatedTrimmedTokens = Math.ceil(
      trimmedMessages.reduce((sum, msg) => {
        if (typeof msg.content !== "string") {
          return sum;
        }
        return sum + msg.content.length;
      }, 0) / 4
    );

    if (conversationId && typeof conversationId === "string") {
      const { data: row } = await supabaseAuth
        .from("chat_sessions")
        .select("messages")
        .eq("id", conversationId)
        .maybeSingle();
      const envelope = readConversationEnvelope(row?.messages);
      await supabaseAuth
        .from("chat_sessions")
        .update({
          messages: {
            messages: envelope.messages,
            memory: updatedMemory,
          },
        })
        .eq("id", conversationId);
    }

    const obsMode: ChatObservabilityMode = isConversational ? "conversational" : "tooling";
    await observability.onRequestStart({
      requestId,
      model: aiConfig.model,
      messagePreview: message.slice(0, 160),
      intent,
      mode: obsMode,
      quotaRemaining: quota.remaining,
      quotaMax,
      userIdPrefix: user.id.slice(0, 8),
      conversationId: conversationId ?? null,
      vercelEnv: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      toolCalls: [`tokens:${estimatedInputTokens}->${estimatedTrimmedTokens}`],
    });

    if (isConversational) {
      const result = await generateText({
        model,
        system: [promptData.system, memoryContextBlock].filter(Boolean).join("\n\n"),
        messages: trimmedMessages,
        temperature: aiConfig.temperature,
      });

      const elapsedMs = Date.now() - startedAt;
      const langsmith = await observability.onRequestEnd({
        requestId,
        model: aiConfig.model,
        messagePreview: message.slice(0, 160),
        intent,
        mode: obsMode,
        quotaRemaining: quota.remaining,
        quotaMax,
        userIdPrefix: user.id.slice(0, 8),
        conversationId: conversationId ?? null,
        vercelEnv: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
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
          historyCountIn: baseMessages.length,
          historyCountAfterTrim: trimmedMessages.length,
          tokensBefore: estimatedInputTokens,
          tokensAfter: estimatedTrimmedTokens,
          ...(langsmith ? { langsmith } : {}),
        },
      });
    }

    let mcpClient: MCPClient;
    try {
      mcpClient = await getMcpClient();
    } catch (mcpErr) {
      const details = mcpErr instanceof Error ? mcpErr.message : String(mcpErr);
      const langsmith = await observability.onRequestError({
        requestId,
        model: aiConfig.model,
        messagePreview: message.slice(0, 160),
        intent,
        mode: obsMode,
        error: `MCP unavailable: ${details}`,
        elapsedMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        {
          error: "MCP server unavailable",
          details:
            `${details} — Ensure mcp-server is built (npm run build in mcp-server), set MCP_SERVER_PATH if needed, and use stdio only in a Node environment (local or long-lived server), not typical Vercel serverless without a remote MCP transport.`,
          ...(langsmith ? { metadata: { langsmith } } : {}),
        },
        { status: 503 }
      );
    }

    const tools = buildMcpToolsForAiSdk(mcpClient);

    const result = await generateText({
      model,
      system: [promptData.system, memoryContextBlock].filter(Boolean).join("\n\n"),
      messages: trimmedMessages,
      tools,
      temperature: aiConfig.temperature,
      stopWhen: stepCountIs(runtimeConfig.maxToolSteps),
      onStepFinish: ({ toolCalls: stepToolCalls }) => {
        if (stepToolCalls.length) {
          void observability
            .onToolCall({
              requestId,
              model: aiConfig.model,
              messagePreview: message.slice(0, 160),
              intent,
              mode: obsMode,
              toolCalls: stepToolCalls.map((tc) => tc.toolName),
            })
            .catch(() => {});
        }
      },
    });

    const elapsedMs = Date.now() - startedAt;
    const toolCalls = result.toolCalls?.map((tc) => tc.toolName) ?? [];

    const langsmith = await observability.onRequestEnd({
      requestId,
      model: aiConfig.model,
      messagePreview: message.slice(0, 160),
      intent,
      mode: obsMode,
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
        historyCountIn: baseMessages.length,
        historyCountAfterTrim: trimmedMessages.length,
        tokensBefore: estimatedInputTokens,
        tokensAfter: estimatedTrimmedTokens,
        ...(langsmith ? { langsmith } : {}),
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    await observability.onRequestError({
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
    const max = chatQuotaMaxFromEnv();
    let chat_quota:
      | {
          max: number;
          remaining: number;
          reset_at: string | null;
          authenticated: boolean;
        }
      | undefined;

    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: row } = await supabase
          .from("user_chat_usage")
          .select("chat_count, window_start")
          .eq("user_id", user.id)
          .maybeSingle();
        const peek = peekChatQuota((row as UserChatUsageRow | null) ?? null, max);
        chat_quota = {
          max,
          remaining: peek.remaining,
          reset_at: peek.resetAtIso,
          authenticated: true,
        };
      } else {
        chat_quota = {
          max,
          remaining: max,
          reset_at: null,
          authenticated: false,
        };
      }
    } catch {
      chat_quota = undefined;
    }

    const health = await getChatRuntimeHealth();
    const extensionSecret = quotaExtensionSecretFromEnv();

    return NextResponse.json({
      message: "AI Incident Assistant chat API is running",
      status:
        health.llm_status === "healthy" && health.mcp_status === "healthy"
          ? "healthy"
          : "degraded",
      llm_status: health.llm_status,
      llm_error: health.llm_error,
      provider: health.provider,
      sdk: health.sdk,
      gateway_base_url: health.gateway_sdk_base_url,
      current_model: health.current_model,
      mcp_status: health.mcp_status,
      mcp_error: health.mcp_error,
      mcp_server_path: health.mcp_server_path,
      mcp_server_path_exists: health.mcp_server_path_exists,
      mcp_tools_count: health.mcp_tools_count,
      mcp_tools: health.mcp_tools,
      chat_quota,
      quota_extension_enabled: extensionSecret !== null,
      ...(extensionSecret !== null
        ? { quota_extension_credits: chatQuotaExtensionCreditsFromEnv() }
        : {}),
    });
  } catch (error) {
    const message = String(error);
    return NextResponse.json({
      message: "AI Incident Assistant chat API is running",
      status: "error",
      llm_status: "error",
      llm_error: message,
      error: message,
    });
  }
}
