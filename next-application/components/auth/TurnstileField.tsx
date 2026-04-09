"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string | undefined;
      reset?: (widgetId: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

type TurnstileFieldProps = {
  siteKey: string;
  onToken: (token: string | null) => void;
  className?: string;
};

export function TurnstileField({ siteKey, onToken, className }: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const [scriptReady, setScriptReady] = useState(false);

  const renderWidget = useCallback(() => {
    if (!scriptReady || !containerRef.current || !window.turnstile || !siteKey) {
      return;
    }
    if (widgetIdRef.current && window.turnstile.remove) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        /* ignore */
      }
      widgetIdRef.current = undefined;
    }
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (t) => onToken(t),
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
    });
  }, [onToken, scriptReady, siteKey]);

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
      }
      widgetIdRef.current = undefined;
    };
  }, [renderWidget]);

  if (!siteKey.trim()) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2">
        Set <code className="font-mono text-xs">NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> to enable login
        protection.
      </p>
    );
  }

  return (
    <div className={className}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="min-h-[65px]" />
    </div>
  );
}
