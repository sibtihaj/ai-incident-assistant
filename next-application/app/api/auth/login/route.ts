import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { captchaProofCookie, createCaptchaProofCookieValue, verifyCaptchaProofCookie } from "@/lib/captchaCookie";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";

const secureCookie = process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const email = typeof o.email === "string" ? o.email.trim() : "";
    const password = typeof o.password === "string" ? o.password : "";
    const captchaToken = typeof o.captchaToken === "string" ? o.captchaToken : undefined;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cookieStore = await cookies();

    if (captchaToken) {
      const ok = await verifyTurnstileToken(captchaToken);
      if (!ok) {
        return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 });
      }
      cookieStore.set(captchaProofCookie.name, createCaptchaProofCookieValue(), {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookie,
        maxAge: captchaProofCookie.maxAgeSec,
        path: "/",
      });
    } else {
      const raw = request.cookies.get(captchaProofCookie.name)?.value;
      const proof = verifyCaptchaProofCookie(raw);
      if (!proof.ok) {
        return NextResponse.json(
          { error: "CAPTCHA required", code: "CAPTCHA_REQUIRED" },
          { status: 400 }
        );
      }
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? "Invalid email or password" },
        { status: 401 }
      );
    }

    cookieStore.set(captchaProofCookie.name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      maxAge: 0,
      path: "/",
    });

    return NextResponse.json({
      ok: true,
      user: { id: data.user.id, email: data.user.email ?? email },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected login error";
    console.error("POST /api/auth/login failed:", message);
    if (
      message.includes("NEXT_PUBLIC_SUPABASE_URL") ||
      message.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    ) {
      return NextResponse.json(
        { error: "Supabase auth is not configured on the server." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}