import { NextRequest, NextResponse } from "next/server";

import {
  chatQuotaExtensionCreditsFromEnv,
  chatQuotaMaxFromEnv,
  chatQuotaWindowHoursFromEnv,
  peekChatQuota,
  type UserChatUsageRow,
} from "@/lib/chatQuota";
import {
  quotaExtensionSecretFromEnv,
  verifyQuotaExtensionPassphrase,
} from "@/lib/quotaExtensionAuth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RpcResult = {
  ok?: boolean;
  code?: string;
  applied?: number;
  note?: string;
};

export async function POST(request: NextRequest) {
  const secret = quotaExtensionSecretFromEnv();
  if (!secret) {
    return NextResponse.json(
      { error: "Quota extension is not enabled on this deployment." },
      { status: 403 }
    );
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!verifyQuotaExtensionPassphrase(password, secret)) {
    return NextResponse.json({ error: "Invalid passphrase." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credits = chatQuotaExtensionCreditsFromEnv();
  const windowHours = chatQuotaWindowHoursFromEnv();
  const max = chatQuotaMaxFromEnv();

  const { data: rpcRaw, error: rpcError } = await supabase.rpc(
    "extend_chat_quota_credits",
    { p_credits: credits, p_window_hours: windowHours }
  );

  if (rpcError) {
    console.error("extend_chat_quota_credits", rpcError);
    const msg = rpcError.message ?? "";
    if (
      msg.includes("extend_chat_quota_credits") ||
      msg.includes("does not exist") ||
      rpcError.code === "42883"
    ) {
      return NextResponse.json(
        {
          error:
            "Quota extension is not fully configured. Run the Supabase migration that defines extend_chat_quota_credits.",
          details: msg,
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not extend quota", details: msg },
      { status: 503 }
    );
  }

  const rpc = rpcRaw as RpcResult;
  if (rpc && rpc.ok === false) {
    return NextResponse.json(
      { error: rpc.code ?? "Extension rejected" },
      { status: 400 }
    );
  }

  const { data: row } = await supabase
    .from("user_chat_usage")
    .select("chat_count, window_start")
    .eq("user_id", user.id)
    .maybeSingle();

  const peek = peekChatQuota((row as UserChatUsageRow | null) ?? null, max);

  return NextResponse.json({
    ok: true,
    credits_granted: typeof rpc?.applied === "number" ? rpc.applied : credits,
    note: rpc?.note,
    chat_quota: {
      max,
      remaining: peek.remaining,
      reset_at: peek.resetAtIso,
      authenticated: true,
    },
  });
}
