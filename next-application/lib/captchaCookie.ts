import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "login_captcha_proof";
const MAX_AGE_SEC = 20 * 60; // 20 minutes

function getSecret(): string {
  const s = process.env.CAPTCHA_COOKIE_SECRET?.trim();
  if (s) return s;
  const fallback = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (fallback) return fallback;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CAPTCHA_COOKIE_SECRET is required in production");
  }
  return "dev-only-captcha-secret-change-me";
}

function signPayload(payloadJson: string): string {
  const h = createHmac("sha256", getSecret());
  h.update(payloadJson);
  return h.digest("base64url");
}

export type CaptchaProofPayload = { exp: number };

export function createCaptchaProofCookieValue(): string {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const payloadJson = JSON.stringify({ exp } satisfies CaptchaProofPayload);
  const sig = signPayload(payloadJson);
  return `${Buffer.from(payloadJson, "utf8").toString("base64url")}.${sig}`;
}

export function verifyCaptchaProofCookie(raw: string | undefined): {
  ok: boolean;
  payload?: CaptchaProofPayload;
} {
  if (!raw || typeof raw !== "string") {
    return { ok: false };
  }
  const parts = raw.split(".");
  if (parts.length !== 2) {
    return { ok: false };
  }
  const [b64Payload, sig] = parts;
  let payloadJson: string;
  try {
    payloadJson = Buffer.from(b64Payload, "base64url").toString("utf8");
  } catch {
    return { ok: false };
  }
  const expected = signPayload(payloadJson);
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false };
    }
  } catch {
    return { ok: false };
  }
  let payload: CaptchaProofPayload;
  try {
    payload = JSON.parse(payloadJson) as CaptchaProofPayload;
  } catch {
    return { ok: false };
  }
  if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
    return { ok: false };
  }
  return { ok: true, payload };
}

export const captchaProofCookie = {
  name: COOKIE_NAME,
  maxAgeSec: MAX_AGE_SEC,
};
