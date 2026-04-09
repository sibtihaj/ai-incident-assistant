import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function editorEnabled(): boolean {
  return process.env.ALLOW_PROMPT_EDITOR === "true";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/settings") && !pathname.startsWith("/api/settings")) {
    return NextResponse.next();
  }

  if (editorEnabled()) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/settings")) {
    return NextResponse.json(
      {
        error:
          "Prompt editor disabled. Set ALLOW_PROMPT_EDITOR=true to access settings APIs.",
      },
      { status: 403 }
    );
  }

  const notFoundUrl = request.nextUrl.clone();
  notFoundUrl.pathname = "/";
  return NextResponse.redirect(notFoundUrl);
}

export const config = {
  matcher: ["/settings/:path*", "/api/settings/:path*"],
};
