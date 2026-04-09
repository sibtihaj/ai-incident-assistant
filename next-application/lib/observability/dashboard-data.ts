import { Client } from "langsmith";

import {
  fetchGatewayCredits,
  fetchGatewaySpendReport,
} from "@/lib/ai/gateway-usage";
import { getChatRuntimeHealth } from "@/lib/ai/runtime-health";
import {
  chatQuotaMaxFromEnv,
  peekChatQuota,
  type UserChatUsageRow,
} from "@/lib/chatQuota";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RuntimeSection = Awaited<
  ReturnType<typeof getChatRuntimeHealth>
> | { error: string };

export const OBSERVABILITY_NOTES: string[] = [
  "Vercel AI Gateway Custom Reporting may require a Pro/Enterprise plan; errors here are expected on some accounts.",
  "Full gateway charts and request logs also live in the Vercel dashboard under AI Gateway → Observability.",
  "LangSmith shows trace detail; this list is root runs only (sanitized, no API keys).",
];

export function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function langsmithProjectName(): string {
  return (
    process.env.LANGSMITH_PROJECT?.trim() ??
    process.env.LANGCHAIN_PROJECT?.trim() ??
    "default"
  );
}

export function gatewayUsageApiRoot(): string {
  return (
    process.env.AI_GATEWAY_USAGE_API_ROOT?.trim() ??
    "https://ai-gateway.vercel.sh/v1"
  );
}

export async function buildRuntimeSection(): Promise<{
  generatedAt: string;
  runtime: RuntimeSection;
}> {
  const generatedAt = new Date().toISOString();
  let runtime: RuntimeSection = { error: "not loaded" };
  try {
    runtime = await getChatRuntimeHealth();
  } catch (e) {
    runtime = { error: e instanceof Error ? e.message : String(e) };
  }
  return { generatedAt, runtime };
}

export async function buildGatewaySection(): Promise<{
  generatedAt: string;
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
}> {
  const generatedAt = new Date().toISOString();
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);

  const [creditsResult, reportResult] = await Promise.all([
    fetchGatewayCredits(),
    fetchGatewaySpendReport({
      startDate: utcDateString(start),
      endDate: utcDateString(end),
      groupBy: "model",
      datePart: "day",
    }),
  ]);

  return {
    generatedAt,
    gateway: {
      usage_api_root: gatewayUsageApiRoot(),
      credits: creditsResult.data,
      credits_error: creditsResult.error,
      credits_http_status: creditsResult.httpStatus,
      report: reportResult.data,
      report_error: reportResult.error,
      report_http_status: reportResult.httpStatus,
      report_window: {
        start_date: utcDateString(start),
        end_date: utcDateString(end),
        group_by: "model",
        date_part: "day",
      },
    },
  };
}

export async function buildLangsmithSection(): Promise<{
  generatedAt: string;
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
}> {
  const generatedAt = new Date().toISOString();
  const langsmithProject = langsmithProjectName();
  const langsmithKey =
    process.env.LANGSMITH_API_KEY?.trim() ??
    process.env.LANGCHAIN_API_KEY?.trim();

  const runs: Array<{
    id: string;
    trace_id?: string;
    name: string;
    run_type: string;
    start_time?: string | number;
    status?: string;
    error_preview?: string;
  }> = [];
  let langsmithError: string | undefined;

  if (langsmithKey) {
    try {
      const client = new Client({ apiKey: langsmithKey });
      for await (const run of client.listRuns({
        projectName: langsmithProject,
        isRoot: true,
        order: "desc",
        limit: 25,
      })) {
        runs.push({
          id: run.id,
          trace_id: run.trace_id,
          name: run.name,
          run_type: run.run_type,
          start_time: run.start_time,
          status: run.status,
          error_preview: run.error
            ? String(run.error).slice(0, 240)
            : undefined,
        });
      }
    } catch (e) {
      langsmithError = e instanceof Error ? e.message : String(e);
    }
  } else {
    langsmithError = "LANGSMITH_API_KEY not configured";
  }

  return {
    generatedAt,
    langsmith: {
      enabled: Boolean(langsmithKey),
      project_name: langsmithProject,
      runs,
      error: langsmithError,
    },
  };
}

export async function buildQuotaSection(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  generatedAt: string;
  chat_quota: {
    max: number;
    remaining: number;
    reset_at: string | null;
    authenticated: boolean;
  };
}> {
  const generatedAt = new Date().toISOString();
  const max = chatQuotaMaxFromEnv();
  const { data: row } = await supabase
    .from("user_chat_usage")
    .select("chat_count, window_start")
    .eq("user_id", userId)
    .maybeSingle();
  const peek = peekChatQuota((row as UserChatUsageRow | null) ?? null, max);
  return {
    generatedAt,
    chat_quota: {
      max,
      remaining: peek.remaining,
      reset_at: peek.resetAtIso,
      authenticated: true,
    },
  };
}

export async function buildNotesSection(): Promise<{
  generatedAt: string;
  notes: string[];
}> {
  return {
    generatedAt: new Date().toISOString(),
    notes: [...OBSERVABILITY_NOTES],
  };
}

export async function buildFullObservabilityPayload(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  generatedAt: string;
  runtime: RuntimeSection;
  gateway: Awaited<ReturnType<typeof buildGatewaySection>>["gateway"];
  langsmith: Awaited<ReturnType<typeof buildLangsmithSection>>["langsmith"];
  chat_quota: Awaited<ReturnType<typeof buildQuotaSection>>["chat_quota"];
  notes: string[];
}> {
  const generatedAt = new Date().toISOString();
  const [runtimeBlock, gatewayBlock, langsmithBlock, quotaBlock] =
    await Promise.all([
      buildRuntimeSection(),
      buildGatewaySection(),
      buildLangsmithSection(),
      buildQuotaSection(supabase, userId),
    ]);

  return {
    generatedAt,
    runtime: runtimeBlock.runtime,
    gateway: gatewayBlock.gateway,
    langsmith: langsmithBlock.langsmith,
    chat_quota: quotaBlock.chat_quota,
    notes: [...OBSERVABILITY_NOTES],
  };
}
