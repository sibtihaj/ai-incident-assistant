"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";

import { MetricsLoadingOverlay } from "@/components/observability/MetricsLoadingOverlay";
import {
  GatewayCreditsSkeleton,
  GatewayReportTableSkeleton,
  LangSmithTableSkeleton,
  NotesSectionSkeleton,
  QuotaSectionSkeleton,
  RuntimeSectionSkeleton,
} from "@/components/observability/ObservabilitySectionSkeletons";
import {
  OBSERVABILITY_PARTS,
  type ObservabilityPart,
  type ObservabilityPayload,
} from "@/types/observability";

function formatStartTime(v: string | number | undefined): string {
  if (v === undefined) return "—";
  if (typeof v === "number") {
    return new Date(v).toISOString();
  }
  const n = Number(v);
  if (!Number.isNaN(n) && String(n) === String(v)) {
    return new Date(n).toISOString();
  }
  return String(v);
}

function mergeFromPart(
  part: ObservabilityPart,
  json: Record<string, unknown>,
): Partial<ObservabilityPayload> {
  const out: Partial<ObservabilityPayload> = {};
  if (typeof json.generatedAt === "string") {
    out.generatedAt = json.generatedAt;
  }
  switch (part) {
    case "runtime":
      if (json.runtime != null) {
        out.runtime = json.runtime as ObservabilityPayload["runtime"];
      }
      break;
    case "gateway":
      if (json.gateway != null) {
        out.gateway = json.gateway as ObservabilityPayload["gateway"];
      }
      break;
    case "langsmith":
      if (json.langsmith != null) {
        out.langsmith = json.langsmith as ObservabilityPayload["langsmith"];
      }
      break;
    case "quota":
      if (json.chat_quota != null) {
        out.chat_quota = json.chat_quota as ObservabilityPayload["chat_quota"];
      }
      break;
    case "notes":
      if (Array.isArray(json.notes)) {
        out.notes = json.notes as string[];
      }
      break;
    default: {
      const _exhaustive: never = part;
      void _exhaustive;
      break;
    }
  }
  return out;
}

function initialLoadingRecord(): Record<ObservabilityPart, boolean> {
  return {
    runtime: true,
    gateway: true,
    langsmith: true,
    quota: true,
    notes: true,
  };
}

type SectionHeaderProps = {
  id: string;
  title: string;
  loading: boolean;
  showRefreshPulse: boolean;
};

function SectionHeader({
  id,
  title,
  loading,
  showRefreshPulse,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2
        id={id}
        className="text-xs font-mono uppercase tracking-widest text-slate-500"
      >
        {title}
      </h2>
      {showRefreshPulse && loading ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-500"
          aria-live="polite"
        >
          <span
            className="size-1.5 rounded-full bg-slate-500 motion-safe:animate-pulse motion-reduce:opacity-80"
            aria-hidden
          />
          Updating
        </span>
      ) : null}
    </div>
  );
}

export default function ObservabilityPage() {
  const [payload, setPayload] = useState<Partial<ObservabilityPayload>>({});
  const [sectionLoading, setSectionLoading] = useState<
    Record<ObservabilityPart, boolean>
  >(() => initialLoadingRecord());
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [firstLoadComplete, setFirstLoadComplete] = useState(false);
  const loadEpoch = useRef(0);

  const anySectionLoading = useMemo(
    () => OBSERVABILITY_PARTS.some((p) => sectionLoading[p]),
    [sectionLoading],
  );

  const allSectionsLoaded = useMemo(
    () => OBSERVABILITY_PARTS.every((p) => !sectionLoading[p]),
    [sectionLoading],
  );

  const showGlobalOverlay = !firstLoadComplete;

  useLayoutEffect(() => {
    if (firstLoadComplete) return;
    if (allSectionsLoaded) {
      setFirstLoadComplete(true);
    }
  }, [allSectionsLoaded, firstLoadComplete]);

  const loadPart = useCallback(async (part: ObservabilityPart, epoch: number) => {
    setSectionLoading((s) => ({ ...s, [part]: true }));
    try {
      const res = await fetch(`/api/observability?part=${part}`, {
        credentials: "same-origin",
      });
      if (epoch !== loadEpoch.current) return;
      if (res.status === 401) {
        setAuthRequired(true);
        setPayload({});
        setError(null);
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (epoch !== loadEpoch.current) return;
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as Record<string, unknown>;
      if (epoch !== loadEpoch.current) return;
      setError(null);
      setAuthRequired(false);
      setPayload((prev) => ({ ...prev, ...mergeFromPart(part, json) }));
    } catch (e) {
      if (epoch !== loadEpoch.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (epoch === loadEpoch.current) {
        setSectionLoading((s) => ({ ...s, [part]: false }));
      }
    }
  }, []);

  const loadAll = useCallback(() => {
    loadEpoch.current += 1;
    const epoch = loadEpoch.current;
    setAuthRequired(false);
    setError(null);
    setSectionLoading(initialLoadingRecord());
    for (const part of OBSERVABILITY_PARTS) {
      void loadPart(part, epoch);
    }
  }, [loadPart]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshing = firstLoadComplete && anySectionLoading;

  if (authRequired) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-xl font-outfit font-semibold text-slate-900">
          Observability
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to view gateway usage and traces.
        </p>
        <Link
          href="/login?next=/observability"
          className="mt-6 inline-block text-sm font-mono uppercase tracking-widest text-slate-900 underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-outfit font-semibold tracking-tight text-slate-900">
            Observability
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            In-app view of Vercel AI Gateway usage APIs, app runtime health, chat
            quota, and recent LangSmith root runs. For full charts, use the Vercel
            AI Gateway dashboard and LangSmith project UI.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadAll()}
          disabled={anySectionLoading}
          className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-xs font-mono uppercase tracking-widest text-slate-800 hover:border-slate-900 disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="mt-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="relative mt-8 min-h-[min(70vh,640px)]">
        {showGlobalOverlay ? <MetricsLoadingOverlay /> : null}

        <div
          className={`space-y-10 ${showGlobalOverlay ? "opacity-0" : "opacity-100"} motion-safe:transition-opacity motion-safe:duration-300`}
          aria-hidden={showGlobalOverlay}
        >
          {payload.generatedAt ? (
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              Last updated · {payload.generatedAt}
            </p>
          ) : (
            <div className="h-4 w-48 rounded-sm bg-slate-100 motion-safe:animate-pulse motion-reduce:animate-none" />
          )}

          <section
            aria-busy={sectionLoading.runtime}
            aria-labelledby="obs-section-runtime"
          >
            <SectionHeader
              id="obs-section-runtime"
              title="Runtime health"
              loading={sectionLoading.runtime}
              showRefreshPulse={firstLoadComplete}
            />
            {sectionLoading.runtime ? (
              <div className="mt-3">
                <RuntimeSectionSkeleton />
              </div>
            ) : payload.runtime ? (
              <div className="mt-3">
                {"error" in payload.runtime ? (
                  <p className="text-sm text-red-700">{payload.runtime.error}</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-sm border border-slate-200 bg-slate-50/80 p-4">
                      <div className="text-[10px] font-mono uppercase text-slate-400">
                        Gateway (live ping)
                      </div>
                      <div
                        className={`mt-1 text-sm font-mono font-bold ${
                          payload.runtime.llm_status === "healthy"
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {payload.runtime.llm_status}
                      </div>
                      {payload.runtime.llm_error && (
                        <p className="mt-2 text-xs text-red-600 break-all">
                          {payload.runtime.llm_error}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-slate-600 break-all">
                        Model: {payload.runtime.current_model}
                      </p>
                    </div>
                    <div className="rounded-sm border border-slate-200 bg-slate-50/80 p-4">
                      <div className="text-[10px] font-mono uppercase text-slate-400">
                        MCP transport
                      </div>
                      <div
                        className={`mt-1 text-sm font-mono font-bold ${
                          payload.runtime.mcp_status === "healthy"
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {payload.runtime.mcp_status}
                      </div>
                      {payload.runtime.mcp_error && (
                        <p className="mt-2 text-xs text-red-600 break-all">
                          {payload.runtime.mcp_error}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-slate-600">
                        Tools: {payload.runtime.mcp_tools_count} · Server file
                        present:{" "}
                        {payload.runtime.mcp_server_path_exists ? "yes" : "no"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No runtime data yet.</p>
            )}
          </section>

          <section
            aria-busy={sectionLoading.quota}
            aria-labelledby="obs-section-quota"
          >
            <SectionHeader
              id="obs-section-quota"
              title="App chat quota"
              loading={sectionLoading.quota}
              showRefreshPulse={firstLoadComplete}
            />
            {sectionLoading.quota ? (
              <div className="mt-2">
                <QuotaSectionSkeleton />
              </div>
            ) : payload.chat_quota ? (
              <p className="mt-2 font-mono text-sm text-slate-800">
                {payload.chat_quota.remaining} / {payload.chat_quota.max}{" "}
                remaining
                {payload.chat_quota.reset_at
                  ? ` · window resets ${payload.chat_quota.reset_at}`
                  : ""}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No quota data yet.</p>
            )}
          </section>

          <section
            aria-busy={sectionLoading.gateway}
            aria-labelledby="obs-section-gateway-credits"
          >
            <SectionHeader
              id="obs-section-gateway-credits"
              title="Vercel AI Gateway — credits"
              loading={sectionLoading.gateway}
              showRefreshPulse={firstLoadComplete}
            />
            {sectionLoading.gateway ? (
              <div className="mt-1">
                <GatewayCreditsSkeleton />
              </div>
            ) : payload.gateway ? (
              <div className="mt-1">
                <p className="text-[11px] text-slate-500">
                  API root: {payload.gateway.usage_api_root}
                </p>
                {payload.gateway.credits ? (
                  <dl className="mt-3 grid gap-2 font-mono text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[10px] uppercase text-slate-400">
                        Balance
                      </dt>
                      <dd>{payload.gateway.credits.balance ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase text-slate-400">
                        Total used
                      </dt>
                      <dd>{payload.gateway.credits.total_used ?? "—"}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-amber-800">
                    {payload.gateway.credits_error ?? "Credits unavailable"}
                    {payload.gateway.credits_http_status != null
                      ? ` (HTTP ${payload.gateway.credits_http_status})`
                      : ""}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No gateway data yet.
              </p>
            )}
          </section>

          <section
            aria-busy={sectionLoading.gateway}
            aria-labelledby="obs-section-gateway-report"
          >
            <SectionHeader
              id="obs-section-gateway-report"
              title="Vercel AI Gateway — spend report (7d, by model)"
              loading={sectionLoading.gateway}
              showRefreshPulse={firstLoadComplete}
            />
            {sectionLoading.gateway ? (
              <div className="mt-1">
                <GatewayReportTableSkeleton />
              </div>
            ) : payload.gateway ? (
              <div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {payload.gateway.report_window.start_date} →{" "}
                  {payload.gateway.report_window.end_date}
                </p>
                {payload.gateway.report?.results &&
                payload.gateway.report.results.length > 0 ? (
                  <div className="mt-3 overflow-x-auto rounded-sm border border-slate-200">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-100 text-[10px] uppercase tracking-wider text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Row</th>
                          <th className="px-3 py-2">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payload.gateway.report.results
                          .slice(0, 50)
                          .map((row, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="px-3 py-2 text-slate-400">
                                {i + 1}
                              </td>
                              <td className="px-3 py-2 text-slate-800 break-all">
                                {JSON.stringify(row)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-amber-800">
                    {payload.gateway.report_error ?? "No report data"}
                    {payload.gateway.report_http_status != null
                      ? ` (HTTP ${payload.gateway.report_http_status})`
                      : ""}
                  </p>
                )}
              </div>
            ) : null}
          </section>

          <section
            aria-busy={sectionLoading.langsmith}
            aria-labelledby="obs-section-langsmith"
          >
            <SectionHeader
              id="obs-section-langsmith"
              title="LangSmith — recent root runs"
              loading={sectionLoading.langsmith}
              showRefreshPulse={firstLoadComplete}
            />
            {sectionLoading.langsmith ? (
              <div className="mt-1">
                <LangSmithTableSkeleton />
              </div>
            ) : payload.langsmith ? (
              <div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Project: {payload.langsmith.project_name}
                </p>
                {payload.langsmith.error && !payload.langsmith.runs.length ? (
                  <p className="mt-2 text-sm text-amber-800">
                    {payload.langsmith.error}
                  </p>
                ) : null}
                {payload.langsmith.runs.length > 0 ? (
                  <div className="mt-3 overflow-x-auto rounded-sm border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 font-mono text-[10px] uppercase tracking-wider text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Start</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Trace</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-[11px]">
                        {payload.langsmith.runs.map((r) => (
                          <tr key={r.id} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-900">
                              {r.name}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {r.run_type}
                            </td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                              {formatStartTime(r.start_time)}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {r.status ?? "—"}
                            </td>
                            <td className="px-3 py-2 break-all text-slate-500">
                              {r.trace_id ?? r.id}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No LangSmith data yet.
              </p>
            )}
          </section>

          <section
            aria-busy={sectionLoading.notes}
            aria-labelledby="obs-section-notes"
          >
            <SectionHeader
              id="obs-section-notes"
              title="Notes"
              loading={sectionLoading.notes}
              showRefreshPulse={firstLoadComplete}
            />
            {sectionLoading.notes ? (
              <div className="mt-3">
                <NotesSectionSkeleton />
              </div>
            ) : payload.notes && payload.notes.length > 0 ? (
              <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                <ul className="list-inside list-disc text-sm text-slate-600">
                  {payload.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
                <a
                  href="https://vercel.com/docs/ai-gateway/capabilities/observability"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-xs font-mono text-slate-800 underline"
                >
                  Vercel AI Gateway observability docs
                </a>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No notes yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
