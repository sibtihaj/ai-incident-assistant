'use client';

import { RefreshCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

type ContextConfig = {
  instructions: string;
  abbreviations: Record<string, string>;
  rules: string[];
  field_guidance: string;
  reference_material?: string;
};

const initialContext: ContextConfig = {
  instructions: '',
  abbreviations: {},
  rules: [],
  field_guidance: '',
  reference_material: '',
};

function parseAbbreviations(input: string): Record<string, string> {
  const lines = input.split('\n').map((line) => line.trim()).filter(Boolean);
  const parsed: Record<string, string> = {};
  for (const line of lines) {
    const [abbr, ...rest] = line.split(':');
    if (!abbr || rest.length === 0) {
      continue;
    }
    parsed[abbr.trim()] = rest.join(':').trim();
  }
  return parsed;
}

function toAbbreviationText(abbreviations: Record<string, string>): string {
  return Object.entries(abbreviations)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

export default function ContextSettingsPage() {
  const [context, setContext] = useState<ContextConfig>(initialContext);
  const [abbreviationText, setAbbreviationText] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function loadContext() {
    setLoading(true);
    setError('');
    setStatus('');
    try {
      const response = await fetch('/api/settings/context');
      const data = (await response.json()) as { context?: ContextConfig; error?: string };
      if (!response.ok || !data.context) {
        throw new Error(data.error || 'Unable to load context settings');
      }
      setContext(data.context);
      setAbbreviationText(toAbbreviationText(data.context.abbreviations));
      setRulesText(data.context.rules.join('\n'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load context settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContext();
  }, []);

  async function saveContext() {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const payload: ContextConfig = {
        ...context,
        abbreviations: parseAbbreviations(abbreviationText),
        rules: rulesText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      };
      const response = await fetch('/api/settings/context', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: payload }),
      });
      const data = (await response.json()) as { error?: string; details?: string[] };
      if (!response.ok) {
        throw new Error([data.error, ...(data.details || [])].filter(Boolean).join(' · '));
      }
      setStatus('Context settings saved.');
      setContext(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save context settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-14 lg:px-8">
      <div className="mb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Admin / Context</p>
        <h1 className="mt-2 font-outfit text-4xl font-medium tracking-tight text-slate-950">Context Editor</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Edit the runtime prompt context that feeds system instructions, abbreviations, and operator guidance.
        </p>
      </div>

      <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-[0_16px_40px_-30px_rgb(15_23_42_/_0.35)]">
        <div className="space-y-6">
          <label className="block text-xs font-mono uppercase tracking-[0.18em] text-slate-500">
            instructions
            <textarea
              className="mt-2 min-h-[200px] w-full rounded-sm border border-slate-300 bg-slate-50/50 px-3 py-3 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-emerald-500"
              value={context.instructions}
              onChange={(event) =>
                setContext((prev) => ({
                  ...prev,
                  instructions: event.target.value,
                }))
              }
              disabled={loading || saving}
            />
          </label>

          <label className="block text-xs font-mono uppercase tracking-[0.18em] text-slate-500">
            rules (one per line)
            <textarea
              className="mt-2 min-h-[150px] w-full rounded-sm border border-slate-300 bg-slate-50/50 px-3 py-3 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-emerald-500"
              value={rulesText}
              onChange={(event) => setRulesText(event.target.value)}
              disabled={loading || saving}
            />
          </label>

          <label className="block text-xs font-mono uppercase tracking-[0.18em] text-slate-500">
            abbreviations (format: KEY: Value)
            <textarea
              className="mt-2 min-h-[120px] w-full rounded-sm border border-slate-300 bg-slate-50/50 px-3 py-3 font-mono text-xs leading-relaxed text-slate-800 outline-none transition focus:border-emerald-500"
              value={abbreviationText}
              onChange={(event) => setAbbreviationText(event.target.value)}
              disabled={loading || saving}
            />
          </label>

          <label className="block text-xs font-mono uppercase tracking-[0.18em] text-slate-500">
            field_guidance
            <textarea
              className="mt-2 min-h-[120px] w-full rounded-sm border border-slate-300 bg-slate-50/50 px-3 py-3 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-emerald-500"
              value={context.field_guidance}
              onChange={(event) =>
                setContext((prev) => ({
                  ...prev,
                  field_guidance: event.target.value,
                }))
              }
              disabled={loading || saving}
            />
          </label>

          <label className="block text-xs font-mono uppercase tracking-[0.18em] text-slate-500">
            reference_material
            <textarea
              className="mt-2 min-h-[100px] w-full rounded-sm border border-slate-300 bg-slate-50/50 px-3 py-3 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-emerald-500"
              value={context.reference_material || ''}
              onChange={(event) =>
                setContext((prev) => ({
                  ...prev,
                  reference_material: event.target.value,
                }))
              }
              disabled={loading || saving}
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        {status ? <p className="mt-4 text-sm text-emerald-700">{status}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-sm border border-emerald-600 bg-emerald-600 px-4 py-2 text-xs font-mono uppercase tracking-[0.16em] text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={saveContext}
            disabled={saving || loading}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving...' : 'Save Context'}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-sm border border-slate-300 bg-white px-4 py-2 text-xs font-mono uppercase tracking-[0.16em] text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={() => void loadContext()}
            disabled={saving || loading}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Reload
          </button>
        </div>
      </div>
    </main>
  );
}
