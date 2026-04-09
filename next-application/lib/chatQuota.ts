export type UserChatUsageRow = {
  chat_count: number;
  window_start: string;
};

export function chatQuotaWindowHoursFromEnv(): number {
  const hours = Number(process.env.CHAT_QUOTA_WINDOW_HOURS ?? 24);
  return Number.isFinite(hours) && hours > 0 ? hours : 24;
}

function windowMsFromEnv(): number {
  return chatQuotaWindowHoursFromEnv() * 60 * 60 * 1000;
}

/**
 * Mirrors rolling-window semantics used by `increment_and_check_chat_quota` for read-only UI (GET /api/chat).
 */
export function peekChatQuota(
  row: UserChatUsageRow | null,
  max: number
): { remaining: number; resetAtIso: string | null } {
  const windowMs = windowMsFromEnv();
  const now = Date.now();

  if (!row) {
    return { remaining: max, resetAtIso: null };
  }

  const start = new Date(row.window_start).getTime();
  if (Number.isNaN(start)) {
    return { remaining: max, resetAtIso: null };
  }

  if (now - start >= windowMs) {
    return { remaining: max, resetAtIso: new Date(now + windowMs).toISOString() };
  }

  const used = Math.max(0, Number(row.chat_count) || 0);
  const remaining = Math.max(0, max - used);
  const resetAtIso = new Date(start + windowMs).toISOString();
  return { remaining, resetAtIso };
}

export function chatQuotaMaxFromEnv(): number {
  const n = Number(process.env.CHAT_QUOTA_MAX ?? 15);
  return Number.isFinite(n) && n > 0 ? n : 15;
}

/** Extra messages granted per successful quota extension (default 5). */
export function chatQuotaExtensionCreditsFromEnv(): number {
  const n = Number(process.env.CHAT_QUOTA_EXTENSION_CREDITS ?? 5);
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : 5;
}

export type QuotaRpcResult = {
  allowed: boolean;
  remaining?: number;
  reset_at?: string;
  code?: string;
};

export function parseQuotaRpc(data: unknown): QuotaRpcResult {
  if (!data || typeof data !== "object") {
    return { allowed: true };
  }
  const o = data as Record<string, unknown>;
  const allowed = o.allowed !== false;
  const remaining = typeof o.remaining === "number" ? o.remaining : undefined;
  const reset_at = typeof o.reset_at === "string" ? o.reset_at : undefined;
  const code = typeof o.code === "string" ? o.code : undefined;
  return { allowed, remaining, reset_at, code };
}
