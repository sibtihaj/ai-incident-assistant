import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const PLAYGROUND_DEVICE_COOKIE = "playground_device_id";

const DEVICE_MAX_AGE = 60 * 60 * 24 * 365;

export type MiddlewareUser = { id: string };

/**
 * Refreshes Supabase session cookies, ensures a stable httpOnly device id, and returns the current user (if any).
 */
export async function createSupabaseMiddlewareResponse(request: NextRequest): Promise<{
  response: NextResponse;
  user: MiddlewareUser | null;
}> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user: MiddlewareUser | null = null;

  if (url && anon) {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (u?.id) {
      user = { id: u.id };
    }
  }

  if (!request.cookies.get(PLAYGROUND_DEVICE_COOKIE)?.value) {
    const id = crypto.randomUUID();
    response.cookies.set(PLAYGROUND_DEVICE_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: DEVICE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return { response, user };
}

export function mergeResponseCookies(source: NextResponse, target: NextResponse): void {
  const raw = source.headers.getSetCookie();
  if (!raw?.length) {
    return;
  }
  for (const line of raw) {
    target.headers.append("Set-Cookie", line);
  }
}
