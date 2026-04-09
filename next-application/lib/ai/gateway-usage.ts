import { getAIConfig } from "@/lib/ai/config";

/** OpenAI-style gateway root used by Vercel for credits & reporting (not the AI SDK `/v1/ai` base). */
const DEFAULT_GATEWAY_API_ROOT = "https://ai-gateway.vercel.sh/v1";

/** Gateway error payloads may be a string or a structured object — avoid `[object Object]` in UI. */
function formatGatewayApiErrorField(error: unknown): string {
  if (error == null) return "";
  if (typeof error === "string") return error.trim() || "Unknown error";
  if (typeof error === "number" || typeof error === "boolean") {
    return String(error);
  }
  if (Array.isArray(error)) {
    return error.map((x) => formatGatewayApiErrorField(x)).filter(Boolean).join("; ");
  }
  if (typeof error === "object") {
    const o = error as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.trim()) {
      return o.message.trim();
    }
    if (typeof o.detail === "string" && o.detail.trim()) {
      return o.detail.trim();
    }
    if (o.error != null && o.error !== error) {
      const nested = formatGatewayApiErrorField(o.error);
      if (nested) return nested;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return "Request failed";
    }
  }
  return String(error);
}

function gatewayApiRoot(): string {
  const raw = process.env.AI_GATEWAY_USAGE_API_ROOT?.trim();
  if (raw) {
    return raw.replace(/\/$/, "");
  }
  return DEFAULT_GATEWAY_API_ROOT;
}

export interface GatewayCredits {
  balance?: string;
  total_used?: string;
}

export type GatewayReportResult = Record<string, unknown>;

export interface GatewayReportResponse {
  results?: GatewayReportResult[];
}

async function gatewayFetchJson(
  pathWithQuery: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const token = getAIConfig().gatewayToken;
  const url = `${gatewayApiRoot()}${pathWithQuery.startsWith("/") ? "" : "/"}${pathWithQuery}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

/** `GET /v1/credits` — balance and total used (when supported for the key). */
export async function fetchGatewayCredits(): Promise<{
  data: GatewayCredits | null;
  error?: string;
  httpStatus?: number;
}> {
  try {
    const { ok, status, json } = await gatewayFetchJson("/credits");
    if (!ok || !json || typeof json !== "object") {
      const body = json && typeof json === "object" ? (json as { error?: unknown }) : null;
      const fromBody =
        body && "error" in body ? formatGatewayApiErrorField(body.error) : "";
      return {
        data: null,
        error: fromBody || `HTTP ${status}`,
        httpStatus: status,
      };
    }
    const o = json as Record<string, unknown>;
    return {
      data: {
        balance: o.balance !== undefined ? String(o.balance) : undefined,
        total_used: o.total_used !== undefined ? String(o.total_used) : undefined,
      },
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface ReportQuery {
  startDate: string;
  endDate: string;
  groupBy?: "model" | "provider" | "user" | "tag" | "credential_type";
  datePart?: "day" | "hour";
}

/**
 * `GET /v1/report` — custom reporting (beta; may require Pro/Enterprise).
 * @see https://vercel.com/docs/ai-gateway/capabilities/custom-reporting
 */
export async function fetchGatewaySpendReport(
  query: ReportQuery
): Promise<{
  data: GatewayReportResponse | null;
  error?: string;
  httpStatus?: number;
}> {
  try {
    const params = new URLSearchParams({
      start_date: query.startDate,
      end_date: query.endDate,
    });
    if (query.groupBy) {
      params.set("group_by", query.groupBy);
    }
    if (query.datePart) {
      params.set("date_part", query.datePart);
    }
    const { ok, status, json } = await gatewayFetchJson(`/report?${params.toString()}`);
    if (!ok) {
      const body = json && typeof json === "object" ? (json as { error?: unknown }) : null;
      const fromBody =
        body && "error" in body ? formatGatewayApiErrorField(body.error) : "";
      return {
        data: null,
        error: fromBody || `HTTP ${status}`,
        httpStatus: status,
      };
    }
    if (!json || typeof json !== "object") {
      return { data: null, error: "Invalid JSON", httpStatus: status };
    }
    return { data: json as GatewayReportResponse };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : String(e) };
  }
}
