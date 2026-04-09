import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  createSupabaseMiddlewareResponse,
  mergeResponseCookies,
} from "@/lib/supabase/middleware";

function editorEnabled(): boolean {
  return process.env.ALLOW_PROMPT_EDITOR === "true";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { response, user } = await createSupabaseMiddlewareResponse(request);

  if ((pathname.startsWith("/chat") || pathname.startsWith("/observability")) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    mergeResponseCookies(response, redirect);
    return redirect;
  }

  if (pathname === "/login" && user) {
    const chatUrl = request.nextUrl.clone();
    chatUrl.pathname = "/chat";
    const redirect = NextResponse.redirect(chatUrl);
    mergeResponseCookies(response, redirect);
    return redirect;
  }

  if (!pathname.startsWith("/settings") && !pathname.startsWith("/api/settings")) {
    return response;
  }

  if (editorEnabled()) {
    return response;
  }

  if (pathname.startsWith("/api/settings")) {
    const blocked = NextResponse.json(
      {
        error:
          "Prompt editor disabled. Set ALLOW_PROMPT_EDITOR=true to access settings APIs.",
      },
      { status: 403 }
    );
    mergeResponseCookies(response, blocked);
    return blocked;
  }

  const notFoundUrl = request.nextUrl.clone();
  notFoundUrl.pathname = "/";
  const redirect = NextResponse.redirect(notFoundUrl);
  mergeResponseCookies(response, redirect);
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
