"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { TurnstileField } from "@/components/auth/TurnstileField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/chat";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [needsCaptchaVisible, setNeedsCaptchaVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const body: Record<string, string> = { email: email.trim(), password };
        if (needsCaptchaVisible && captchaToken) {
          body.captchaToken = captchaToken;
        }

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(body),
        });

        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
          ok?: boolean;
        };

        if (res.ok && data.ok) {
          router.replace(nextPath);
          router.refresh();
          return;
        }

        if (res.status === 400 && data.code === "CAPTCHA_REQUIRED") {
          setNeedsCaptchaVisible(true);
          setCaptchaToken(null);
          setError("Please complete the CAPTCHA.");
          return;
        }

        if (res.status === 400) {
          setError(data.error ?? "Login request rejected.");
          return;
        }

        if (res.status === 401) {
          setError(data.error ?? "Invalid email or password.");
          setNeedsCaptchaVisible(false);
          return;
        }

        setError(data.error ?? "Something went wrong.");
      } catch {
        setError("Network error. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [captchaToken, email, needsCaptchaVisible, nextPath, password, router]
  );

  return (
    <div className="w-full max-w-md rounded-sm border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-outfit font-semibold text-slate-900 tracking-tight mb-1">Sign in</h1>
      <p className="text-sm text-slate-600 mb-8 font-outfit">
        AI Incident Assistant playground — authenticated sessions only.
      </p>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-sm"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-sm"
          />
        </div>

        {needsCaptchaVisible && (
          <TurnstileField siteKey={siteKey} onToken={setCaptchaToken} className="pt-1" />
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-sm px-3 py-2 font-mono">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading || (needsCaptchaVisible && (!siteKey.trim() || !captchaToken))}
          className="w-full rounded-sm bg-slate-950 hover:bg-slate-800 text-white font-medium"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
