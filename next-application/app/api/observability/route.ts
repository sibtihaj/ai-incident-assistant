import { type NextRequest, NextResponse } from "next/server";

import {
  buildFullObservabilityPayload,
  buildGatewaySection,
  buildLangsmithSection,
  buildNotesSection,
  buildQuotaSection,
  buildRuntimeSection,
} from "@/lib/observability/dashboard-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PARTS = new Set([
  "runtime",
  "gateway",
  "langsmith",
  "quota",
  "notes",
]);

/**
 * Authenticated dashboard: Vercel AI Gateway usage (credits + report API) + LangSmith root runs + live health.
 * Use `?part=runtime|gateway|langsmith|quota|notes` for parallel section loads from the client.
 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const part = req.nextUrl.searchParams.get("part");
  if (part && PARTS.has(part)) {
    switch (part) {
      case "runtime":
        return NextResponse.json(await buildRuntimeSection());
      case "gateway":
        return NextResponse.json(await buildGatewaySection());
      case "langsmith":
        return NextResponse.json(await buildLangsmithSection());
      case "quota":
        return NextResponse.json(await buildQuotaSection(supabase, user.id));
      case "notes":
        return NextResponse.json(await buildNotesSection());
      default:
        break;
    }
  }

  const payload = await buildFullObservabilityPayload(supabase, user.id);
  return NextResponse.json(payload);
}
