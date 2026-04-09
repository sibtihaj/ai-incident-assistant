type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(token: string | undefined): Promise<boolean> {
  if (!token || typeof token !== "string" || token.length < 10) {
    return false;
  }
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not set");
    return false;
  }
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    return false;
  }

  const data = (await res.json()) as TurnstileVerifyResponse;
  return data.success === true;
}
