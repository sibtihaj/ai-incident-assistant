"use client";

type MetricsLoadingOverlayProps = {
  label?: string;
  sublabel?: string;
};

/**
 * Full-bleed overlay for the metrics region on first load — blur, pulse ring, monospace caption.
 */
export function MetricsLoadingOverlay({
  label = "Loading metrics",
  sublabel = "Fetching runtime health, gateway usage, LangSmith runs, and quota…",
}: MetricsLoadingOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 rounded-md border border-slate-200/90 bg-slate-50/90 px-6 py-16 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] backdrop-blur-md motion-reduce:backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative size-14 motion-reduce:animate-none">
        <div
          className="absolute inset-0 rounded-full border-2 border-slate-200"
          aria-hidden
        />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-slate-800 border-r-slate-600 motion-safe:animate-spin"
          style={{ animationDuration: "0.85s" }}
          aria-hidden
        />
      </div>
      <div className="max-w-sm text-center">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-700">
          {label}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{sublabel}</p>
      </div>
    </div>
  );
}
