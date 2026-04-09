type ObservabilityProvider = "langsmith" | "langfuse" | "none";

interface ChatEvent {
  requestId: string;
  model: string;
  messagePreview: string;
  toolCalls?: string[];
  error?: string;
  elapsedMs?: number;
}

export interface ObservabilityClient {
  onRequestStart(event: ChatEvent): void;
  onToolCall(event: ChatEvent): void;
  onRequestEnd(event: ChatEvent): void;
  onRequestError(event: ChatEvent): void;
}

class ConsoleObservabilityClient implements ObservabilityClient {
  constructor(private provider: ObservabilityProvider) {}

  onRequestStart(event: ChatEvent): void {
    console.log(`[OBS:${this.provider}] request:start`, event);
  }

  onToolCall(event: ChatEvent): void {
    console.log(`[OBS:${this.provider}] tool:call`, event);
  }

  onRequestEnd(event: ChatEvent): void {
    console.log(`[OBS:${this.provider}] request:end`, event);
  }

  onRequestError(event: ChatEvent): void {
    console.error(`[OBS:${this.provider}] request:error`, event);
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

  return new ConsoleObservabilityClient(provider);
}
