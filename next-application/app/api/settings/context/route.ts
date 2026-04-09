import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  isPromptEditorEnabled,
  readContextConfig,
  writeContextConfig,
} from "@/lib/promptConfigStore";

const contextSchema = z.object({
  instructions: z.string().min(1),
  abbreviations: z.record(z.string(), z.string()),
  rules: z.array(z.string()),
  field_guidance: z.string().min(1),
  reference_material: z.string().optional(),
});

function forbiddenResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Prompt editor is disabled. Set ALLOW_PROMPT_EDITOR=true (and NEXT_PUBLIC_ALLOW_PROMPT_EDITOR=true for nav visibility).",
    },
    { status: 403 }
  );
}

export async function GET() {
  if (!isPromptEditorEnabled()) {
    return forbiddenResponse();
  }

  const context = await readContextConfig();
  return NextResponse.json({ context });
}

export async function PUT(request: NextRequest) {
  if (!isPromptEditorEnabled()) {
    return forbiddenResponse();
  }

  const body = await request.json();
  const parsed = contextSchema.safeParse(body?.context);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid context payload",
        details: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 }
    );
  }

  await writeContextConfig(parsed.data);
  return NextResponse.json({ ok: true, context: parsed.data });
}
