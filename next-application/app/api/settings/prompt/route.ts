import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  DEFAULT_PROMPT_RUNTIME_CONFIG,
  isPromptEditorEnabled,
  readPromptRuntimeConfig,
  writePromptRuntimeConfig,
} from "@/lib/promptConfigStore";

const promptRuntimeSchema = z.object({
  maxHistoryTokens: z.number().int().min(100).max(12000),
  maxToolSteps: z.number().int().min(1).max(40),
  conversationalPatterns: z.array(z.string().min(1)).min(1),
  actionablePatterns: z.array(z.string().min(1)).min(1),
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
  const promptRuntime = await readPromptRuntimeConfig();
  return NextResponse.json({
    promptRuntime,
    defaults: DEFAULT_PROMPT_RUNTIME_CONFIG,
  });
}

export async function PUT(request: NextRequest) {
  if (!isPromptEditorEnabled()) {
    return forbiddenResponse();
  }

  const body = await request.json();
  const parsed = promptRuntimeSchema.safeParse(body?.promptRuntime);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid prompt runtime payload",
        details: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 }
    );
  }

  await writePromptRuntimeConfig(parsed.data);
  return NextResponse.json({ ok: true, promptRuntime: parsed.data });
}
