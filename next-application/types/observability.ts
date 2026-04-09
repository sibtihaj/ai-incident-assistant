export type RuntimeHealth = {
  llm_status: string;
  llm_error?: string;
  mcp_status: string;
  mcp_error?: string;
  current_model: string;
  gateway_sdk_base_url: string;
  mcp_tools_count: number;
  mcp_tools: string[];
  mcp_server_path_exists: boolean;
};

export type ObservabilityPayload = {
  generatedAt: string;
  runtime: RuntimeHealth | { error: string };
  gateway: {
    usage_api_root: string;
    credits: { balance?: string; total_used?: string } | null;
    credits_error?: string;
    credits_http_status?: number;
    report: { results?: Record<string, unknown>[] } | null;
    report_error?: string;
    report_http_status?: number;
    report_window: Record<string, string>;
  };
  langsmith: {
    enabled: boolean;
    project_name: string;
    runs: Array<{
      id: string;
      trace_id?: string;
      name: string;
      run_type: string;
      start_time?: string | number;
      status?: string;
      error_preview?: string;
    }>;
    error?: string;
  };
  chat_quota: {
    max: number;
    remaining: number;
    reset_at: string | null;
    authenticated: boolean;
  };
  notes: string[];
};

export type ObservabilityPart =
  | "runtime"
  | "gateway"
  | "langsmith"
  | "quota"
  | "notes";

export const OBSERVABILITY_PARTS: ObservabilityPart[] = [
  "runtime",
  "gateway",
  "langsmith",
  "quota",
  "notes",
];
