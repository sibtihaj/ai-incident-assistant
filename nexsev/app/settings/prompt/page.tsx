'use client';

import { Save, RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

type PromptRuntime = {
  maxHistoryTokens: number;
  maxToolSteps: number;
  conversationalPatterns: string[];
  actionablePatterns: string[];
};

const initialState: PromptRuntime = {
  maxHistoryTokens: 1600,
  maxToolSteps: 12,
  conversationalPatterns: [],
  actionablePatterns: [],
};

export default function PromptSettingsPage() {
  const [promptRuntime, setPromptRuntime] = useState<PromptRuntime>(initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function loadPromptRuntime() {
    setLoading(true);
    setError('');
    setStatus('');
    try {
      const response = await fetch('/api/settings/prompt');
      const data = (await response.json()) as {
        promptRuntime?: PromptRuntime;
        error?: string;
      };
      if (!response.ok || !data.promptRuntime) {
        throw new Error(data.error || 'Unable to load prompt runtime settings');
      }
      setPromptRuntime(data.promptRuntime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load prompt runtime settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPromptRuntime();
  }, []);

  async function savePromptRuntime() {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const response = await fetch('/api/settings/prompt', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ promptRuntime }),
      });
      const data = (await response.json()) as { error?: string; details?: string[] };
      if (!response.ok) {
        throw new Error([data.error, ...(data.details || [])].filter(Boolean).join(' · '));
      }
      setStatus('Prompt runtime settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt runtime settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-14 lg:px-8">
      <div className="mb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Admin / Prompt Runtime</p>
        <h1 className="mt-2 font-outfit text-4xl font-medium tracking-tight text-slate-950">Prompt Runtime Editor</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Edit trimming thresholds and regex-based routing hints used to decide conversational replies vs tool-enabled execution.
        </p>
      </div>

      <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-[0_16px_40px_-30px_rgb(15_23_42_/_0.35)]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-xs font-mono uppercase tracking-[0.18em] text-slate-500">
            maxHistoryTokens
            <input
              type="number"
              className="mt-2 w-full rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
              value={promptRuntime.maxHistoryTokens}
              onChange={(event) =>
                setPromptRuntime((prev) => ({
                  ...prev,
                  maxHistoryTokens: Number(event.target.value),
                }))
              }
              disabled={loading || saving}
            />
          </label>
          <label className="text-xs font-mono uppercase tracking-[0.18em] text-slate-500">
            maxToolSteps
            <input
              type="number"
              className="mt-2 w-full rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
              value={promptRuntime.maxToolSteps}
              onChange={(event) =>
                setPromptRuntime((prev) => ({
                  ...prev,
                  maxToolSteps: Number(event.target.value),
                }))
              }
              disabled={loading || saving}
            />
          </label>
        </div>

        <div className="mt-6 space-y-6">
          <label className="block text-xs font-mono uppercase tracking-[0.18em] text-slate-500">
            conversationalPatterns (one regex per line)
            <textarea
              className="mt-2 min-h-[150px] w-full rounded-sm border border-slate-300 bg-slate-50/50 px-3 py-3 font-mono text-xs leading-relaxed text-slate-800 outline-none transition focus:border-emerald-500"
              value={promptRuntime.conversationalPatterns.join('\n')}
              onChange={(event) =>
                setPromptRuntime((prev) => ({
                  ...prev,
                  conversationalPatterns: event.target.value
                    .split('\n')
                    .map((value) => value.trim())
                    .filter(Boolean),
                }))
              }
              disabled={loading || saving}
            />
          </label>

          <label className="block text-xs font-mono uppercase tracking-[0.18em] text-slate-500">
            actionablePatterns (one regex per line)
            <textarea
              className="mt-2 min-h-[150px] w-full rounded-sm border border-slate-300 bg-slate-50/50 px-3 py-3 font-mono text-xs leading-relaxed text-slate-800 outline-none transition focus:border-emerald-500"
              value={promptRuntime.actionablePatterns.join('\n')}
              onChange={(event) =>
                setPromptRuntime((prev) => ({
                  ...prev,
                  actionablePatterns: event.target.value
                    .split('\n')
                    .map((value) => value.trim())
                    .filter(Boolean),
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
            onClick={savePromptRuntime}
            disabled={saving || loading}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving...' : 'Save Prompt Runtime'}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-sm border border-slate-300 bg-white px-4 py-2 text-xs font-mono uppercase tracking-[0.16em] text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={() => void loadPromptRuntime()}
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
