import { RunTree } from "langsmith";

type ObservabilityProvider = "langsmith" | "langfuse" | "none";

export type ChatObservabilityMode = "conversational" | "tooling" | "guard";

export interface ChatEvent {
  requestId: string;
  model: string;
  messagePreview: string;
  toolCalls?: string[];
  error?: string;
  elapsedMs?: number;
  /** Detected intent label (ContextDetector). */
  intent?: string;
  /** High-level routing mode for this request. */
  mode?: ChatObservabilityMode;
  /** Rolling chat quota after increment (if applicable). */
  quotaRemaining?: number;
  quotaMax?: number;
  /** Short stable prefix of auth user id for correlation (not full PII). */
  userIdPrefix?: string;
  conversationId?: string | null;
  vercelEnv?: string;
}

/** Safe, non-secret fields returned to the client for linking to LangSmith. */
export interface LangsmithTraceRef {
  traceId: string;
  rootRunId: string;
  projectName: string;
  /** Base URL for LangSmith UI (org-specific paths vary). */
  langsmithHost: string;
}

export interface ObservabilityClient {
  onRequestStart(event: ChatEvent): Promise<void>;
  onToolCall(event: ChatEvent): Promise<void>;
  onRequestEnd(event: ChatEvent): Promise<LangsmithTraceRef | null>;
  onRequestError(event: ChatEvent): Promise<LangsmithTraceRef | null>;
}

function tracingEnabledFromEnv(): boolean {
  return (
    process.env.LANGSMITH_TRACING === "true" ||
    process.env.LANGCHAIN_TRACING_V2 === "true" ||
    process.env.TRACING_V2 === "true"
  );
}

function langsmithApiKey(): string | undefined {
  return process.env.LANGSMITH_API_KEY ?? process.env.LANGCHAIN_API_KEY;
}

function langsmithProjectName(): string {
  const p =
    process.env.LANGSMITH_PROJECT?.trim() ?? process.env.LANGCHAIN_PROJECT?.trim();
  return p && p.length > 0 ? p : "default";
}

function langsmithHost(): string {
  const endpoint = process.env.LANGSMITH_ENDPOINT ?? process.env.LANGCHAIN_ENDPOINT;
  if (endpoint) {
    try {
      return new URL(endpoint).origin;
    } catch {
      /* fall through */
    }
  }
  return "https://smith.langchain.com";
}

function toTraceRef(run: RunTree): LangsmithTraceRef {
  return {
    traceId: run.trace_id,
    rootRunId: run.id,
    projectName: run.project_name,
    langsmithHost: langsmithHost(),
  };
}

function baseMetadata(event: ChatEvent): Record<string, unknown> {
  return {
    app: "ib-ai-incident-assistant",
    route: "POST /api/chat",
    provider: "vercel-ai-gateway",
    requestId: event.requestId,
    model: event.model,
    ...(event.intent !== undefined ? { intent: event.intent } : {}),
    ...(event.mode !== undefined ? { mode: event.mode } : {}),
    ...(event.quotaRemaining !== undefined ? { quota_remaining: event.quotaRemaining } : {}),
    ...(event.quotaMax !== undefined ? { quota_max: event.quotaMax } : {}),
    ...(event.userIdPrefix !== undefined ? { user_prefix: event.userIdPrefix } : {}),
    ...(event.conversationId ? { conversation_id: event.conversationId } : {}),
    ...(event.vercelEnv !== undefined ? { vercel_env: event.vercelEnv } : {}),
  };
}

class ConsoleObservabilityClient implements ObservabilityClient {
  constructor(private readonly provider: ObservabilityProvider) {}

  async onRequestStart(event: ChatEvent): Promise<void> {
    console.log(`[OBS:${this.provider}] request:start`, event);
  }

  async onToolCall(event: ChatEvent): Promise<void> {
    console.log(`[OBS:${this.provider}] tool:call`, event);
  }

  async onRequestEnd(event: ChatEvent): Promise<LangsmithTraceRef | null> {
    console.log(`[OBS:${this.provider}] request:end`, event);
    return null;
  }

  async onRequestError(event: ChatEvent): Promise<LangsmithTraceRef | null> {
    console.error(`[OBS:${this.provider}] request:error`, event);
    return null;
  }
}

class LangSmithObservabilityClient implements ObservabilityClient {
  private readonly activeRoots = new Map<string, RunTree>();

  constructor(private readonly console: ObservabilityClient) {}

  private canTrace(): boolean {
    return Boolean(langsmithApiKey()) && tracingEnabledFromEnv();
  }

  async onRequestStart(event: ChatEvent): Promise<void> {
    await this.console.onRequestStart(event);
    if (!this.canTrace()) {
      return;
    }

    const projectName = langsmithProjectName();
    const tags = [
      "vercel-ai-gateway",
      event.mode ?? "unknown",
      `model:${event.model.replace(/[^\w\-./]/g, "_")}`,
    ];

    const runTree = new RunTree({
      name: "POST /api/chat",
      run_type: "chain",
      project_name: projectName,
      tracingEnabled: true,
      inputs: {
        requestId: event.requestId,
        messagePreview: event.messagePreview,
        model: event.model,
        tokenHint: event.toolCalls?.find((t) => t.startsWith("tokens:")),
      },
      metadata: baseMetadata(event),
      tags,
    });

    await runTree.postRun();
    this.activeRoots.set(event.requestId, runTree);
  }

  async onToolCall(event: ChatEvent): Promise<void> {
    await this.console.onToolCall(event);
    const parent = this.activeRoots.get(event.requestId);
    if (!parent || !event.toolCalls?.length) {
      return;
    }

    const child = parent.createChild({
      name: `mcp_tools:${event.toolCalls.join(",")}`,
      run_type: "tool",
      inputs: { toolCalls: event.toolCalls },
      metadata: { ...baseMetadata(event), phase: "tool_step" },
    });
    await child.postRun();
    await child.end({ outputs: { toolCalls: event.toolCalls } });
  }

  async onRequestEnd(event: ChatEvent): Promise<LangsmithTraceRef | null> {
    await this.console.onRequestEnd(event);
    const parent = this.activeRoots.get(event.requestId);
    if (!parent) {
      return null;
    }
    this.activeRoots.delete(event.requestId);

    await parent.end({
      outputs: {
        elapsedMs: event.elapsedMs,
        toolCalls: event.toolCalls,
        ok: true,
      },
    });

    return toTraceRef(parent);
  }

  async onRequestError(event: ChatEvent): Promise<LangsmithTraceRef | null> {
    await this.console.onRequestError(event);
    const parent = this.activeRoots.get(event.requestId);
    if (!parent) {
      return null;
    }
    this.activeRoots.delete(event.requestId);

    await parent.end(
      {
        outputs: {
          elapsedMs: event.elapsedMs,
        },
      },
      event.error ?? "error"
    );

    return toTraceRef(parent);
  }
}

export function getObservabilityClient(): ObservabilityClient {
  const configured =
    (process.env.OBSERVABILITY_PROVIDER as ObservabilityProvider | undefined) ||
    "none";
  const provider: ObservabilityProvider =
    configured === "langsmith" || configured === "langfuse"
      ? configured
      : "none";

  const consoleBackend = new ConsoleObservabilityClient(provider);

  if (provider === "langsmith") {
    return new LangSmithObservabilityClient(consoleBackend);
  }

  return consoleBackend;
}
