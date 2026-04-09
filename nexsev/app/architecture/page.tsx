'use client';

import MermaidDiagramCard from '@/components/architecture/MermaidDiagramCard';
import {
  antiPatternDiagram,
  endToEndRuntimeDiagram,
  libHelpersModuleDiagram,
  operatorSaveFlowDiagram,
  optimizedPipelineDiagram,
  toolSelectionDiagram,
} from '@/components/architecture/diagrams';
import { motion } from 'framer-motion';
import Link from 'next/link';

const architectureSteps = [
  {
    id: 'LAY-01',
    title: 'Frontend Interface',
    description: 'Next.js 15 App Router provides a responsive, high-performance interface. The UI is built with Tailwind CSS for a strictly minimalist, high-contrast aesthetic.',
    tech: 'Next.js, Tailwind CSS, TypeScript'
  },
  {
    id: 'LAY-02',
    title: 'Orchestration Engine',
    description: 'The Next.js route orchestrates prompt assembly and tool-capable generation. LangChain utilities (trimMessages) are used for history bounding, while AI SDK handles model and tool loops.',
    tech: 'Next.js Route Handlers, LangChain Core, Vercel AI SDK'
  },
  {
    id: 'LAY-03',
    title: 'Model Gateway',
    description: 'Vercel AI Gateway acts as a unified proxy for model providers. It handles OIDC-first authentication, failover, and cost tracking across multiple LLMs.',
    tech: 'Vercel AI Gateway, OpenAI SDK'
  },
  {
    id: 'LAY-04',
    title: 'Tool Ecosystem (MCP)',
    description: 'The Model Context Protocol (MCP) server executes backend tools for incident CRUD, document generation, and template management via stdio transport.',
    tech: 'MCP SDK, Node.js, Zod'
  },
  {
    id: 'LAY-05',
    title: 'Observability',
    description: 'A pluggable adapter system supports LangSmith or Langfuse for end-to-end tracing of every AI interaction and tool execution.',
    tech: 'LangSmith, Langfuse'
  }
];

export default function ArchitecturePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20 lg:px-8 lg:py-32">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-outfit font-medium tracking-tight text-slate-950 mb-6">
          System Architecture
        </h1>
        <p className="max-w-2xl text-lg text-slate-600 font-light leading-relaxed mb-16">
          The AI Incident Assistant separates UI, request orchestration, model generation, and MCP tool execution into explicit boundaries with auditable decision gates.
        </p>
      </motion.div>

      <div className="mb-24 grid grid-cols-1 gap-6">
        <MermaidDiagramCard
          title="Current anti-pattern"
          description="Historical behavior combined oversized static context and duplicated history, which inflated tokens and blurred instruction focus."
          diagram={antiPatternDiagram}
          ariaLabel="Current anti-pattern diagram"
          caption="Before optimization: duplicated history and oversized system context."
        />
        <MermaidDiagramCard
          title="Optimized request pipeline"
          description="Current target architecture keeps the system prompt thin, trims history using LangChain, and branches into model-only or tool-enabled execution."
          diagram={optimizedPipelineDiagram}
          ariaLabel="Optimized request pipeline diagram"
          caption="After optimization: clear decision gate and bounded history."
        />
      </div>

      {/* Components Table */}
      <div className="border-t border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-4 border-b border-slate-200 bg-slate-50/50 px-4 text-[10px] font-mono tracking-widest text-slate-500 uppercase">
          <div className="md:col-span-2">ID</div>
          <div className="md:col-span-3">Subsystem</div>
          <div className="md:col-span-7">Specification</div>
        </div>

        {architectureSteps.map((step) => (
          <div key={step.id} className="grid grid-cols-1 md:grid-cols-12 gap-y-4 gap-x-4 py-8 border-b border-slate-100 px-4 hover:bg-slate-50/50 transition-colors">
            <div className="md:col-span-2 text-xs font-mono text-slate-400 pt-1">
              {step.id}
            </div>
            <div className="md:col-span-3 pr-4">
              <div className="text-base font-outfit font-medium text-slate-950 mb-1 tracking-tight">{step.title}</div>
              <div className="text-xs font-mono text-slate-500">{step.tech}</div>
            </div>
            <div className="md:col-span-7 text-sm text-slate-600 font-light leading-relaxed">
              {step.description}
            </div>
          </div>
        ))}
      </div>

      <section id="lib-helpers" className="mt-24 scroll-mt-24 border-t border-slate-200 pt-20">
        <h2 className="text-2xl font-outfit font-medium text-slate-950 tracking-tight">
          Server helpers in <code className="font-mono text-lg text-slate-800">lib/</code>
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
          These modules are not separate microservices—they are TypeScript helpers used by the playground UI and the{' '}
          <code className="font-mono text-xs text-slate-700">POST /api/chat</code> route. Together they assemble prompts,
          classify intent, load editable config, and manage conversation metadata. The diagram below is a logical map, not a
          deployment diagram.
        </p>

        <div className="mt-8 overflow-x-auto rounded-sm border border-slate-200 bg-white">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 font-mono uppercase tracking-[0.14em] text-slate-500">Module</th>
                <th className="px-3 py-2 font-mono uppercase tracking-[0.14em] text-slate-500">Responsibility</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3 font-mono text-[11px] text-slate-800">promptEngine.ts</td>
                <td className="px-3 py-3">
                  Builds the <strong>system</strong> string from static instructions, rules, abbreviations, and field guidance.
                  Loads <code className="font-mono text-[11px]">context.json</code> via{' '}
                  <code className="font-mono text-[11px]">promptConfigStore</code>. Exposes{' '}
                  <code className="font-mono text-[11px]">isConversationalQuery</code> using patterns from{' '}
                  <code className="font-mono text-[11px]">prompt-runtime.json</code>.
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3 font-mono text-[11px] text-slate-800">contextDetector.ts</td>
                <td className="px-3 py-3">
                  Lightweight <strong>intent</strong> (technical, business, data, etc.) and <strong>entity</strong> extraction
                  (technologies, actions, time phrases) from the user message. Feeds structured hints into{' '}
                  <code className="font-mono text-[11px]">PromptContext</code> for routing and grounding—not a second LLM call.
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3 font-mono text-[11px] text-slate-800">promptConfigStore.ts</td>
                <td className="px-3 py-3">
                  Reads and writes <strong>context</strong> and <strong>prompt runtime</strong> JSON (validation, defaults).
                  Backs the secured <code className="font-mono text-[11px]">/api/settings/*</code> APIs and the Settings UI when{' '}
                  <code className="font-mono text-[11px]">ALLOW_PROMPT_EDITOR=true</code>.
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3 font-mono text-[11px] text-slate-800">context.json</td>
                <td className="px-3 py-3">
                  Runtime <strong>operator guidance</strong>: instructions, rules, abbreviations, optional{' '}
                  <code className="font-mono text-[11px]">reference_material</code> kept out of the hottest path when slimmed.
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3 font-mono text-[11px] text-slate-800">prompt-runtime.json</td>
                <td className="px-3 py-3">
                  Tunable <strong>limits and regex lists</strong>: max history tokens, max tool steps, conversational vs actionable
                  patterns used for the conversational vs tool-enabled branch.
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3 font-mono text-[11px] text-slate-800">context.json5</td>
                <td className="px-3 py-3">
                  Optional <strong>human-friendly duplicate</strong> of context content for editing or docs; the running app reads{' '}
                  <code className="font-mono text-[11px]">context.json</code>. Safe to ignore at runtime unless you sync or generate
                  JSON from it.
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3 font-mono text-[11px] text-slate-800">conversationManager.ts</td>
                <td className="px-3 py-3">
                  Client-side <strong>session identity</strong>: new session IDs, optional auto-save hooks. Persists to storage only
                  when that path is enabled; coordinates with <code className="font-mono text-[11px]">titleGenerator</code> for
                  thread titles.
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-3 font-mono text-[11px] text-slate-800">conversationStorage.ts</td>
                <td className="px-3 py-3">
                  <strong>Pluggable persistence</strong> layer (currently a no-op stub for stateless playground mode). Swappable for
                  localStorage or a remote store without changing the manager API.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-3 font-mono text-[11px] text-slate-800">titleGenerator.ts</td>
                <td className="px-3 py-3">
                  Derives a <strong>short thread title</strong> from the first user message (cleanup, length cap, meaningful
                  snippet)—used when saving or displaying conversation lists.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <MermaidDiagramCard
            title="Helper module relationships"
            description="How configuration flows into prompt assembly and how client-side conversation helpers sit beside the API route."
            diagram={libHelpersModuleDiagram}
            ariaLabel="Diagram of lib helper modules and POST api chat route"
            caption="Dashed line: storage is currently a stub; solid lines are active code paths."
          />
        </div>
      </section>

      <section className="mt-24 border-t border-slate-200 pt-20">
        <h2 className="text-2xl font-outfit font-medium text-slate-950 tracking-tight">Prompt and context optimization spec</h2>

        <div className="mt-8 grid grid-cols-1 gap-8 text-sm leading-relaxed text-slate-600">
          <article className="rounded-sm border border-slate-200 bg-white p-6">
            <h3 className="font-outfit text-lg font-medium tracking-tight text-slate-950">Context layer today</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2 font-mono uppercase tracking-[0.14em] text-slate-500">Piece</th>
                    <th className="px-3 py-2 font-mono uppercase tracking-[0.14em] text-slate-500">Location</th>
                    <th className="px-3 py-2 font-mono uppercase tracking-[0.14em] text-slate-500">Role</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-700">Static context</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">lib/context.json</td>
                    <td className="px-3 py-2">System instructions, rules, abbreviations, and field guidance.</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-700">Runtime detector</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">lib/contextDetector.ts</td>
                    <td className="px-3 py-2">Intent and entities that influence conversational vs actionable routing.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-700">Client session context</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">POST /api/chat body</td>
                    <td className="px-3 py-2">Current project and session metadata carried per request.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-sm border border-slate-200 bg-white p-6">
            <h3 className="font-outfit text-lg font-medium tracking-tight text-slate-950">Current decisions and why they matter</h3>
            <ul className="mt-4 space-y-2">
              <li>System prompt now excludes duplicated user turns and history blocks.</li>
              <li>History is trimmed with LangChain `trimMessages` before every model call.</li>
              <li>MCP capability is inferred from registered tools instead of fake domain server lists.</li>
              <li>Regex routing and tool loop limits are configurable via settings APIs and admin UI.</li>
            </ul>
          </article>

          <article className="rounded-sm border border-slate-200 bg-white p-6">
            <h3 className="font-outfit text-lg font-medium tracking-tight text-slate-950">FAQ: chat vs command vs MCP</h3>
            <div className="mt-4 space-y-3">
              <p><strong>How does the system differentiate chitchat from MCP commands?</strong> It combines regex routing signals with extracted action entities. Conversational messages use model-only generation; actionable messages enable tools.</p>
              <p><strong>Does every request go to MCP?</strong> No. MCP connection and tool registration happen only on actionable requests after the decision gate.</p>
              <p><strong>How does tool selection work?</strong> The AI SDK receives the MCP tool schemas. During generation, the model decides whether to call a tool and which one. Tool outputs feed back into subsequent generation steps.</p>
              <p><strong>What if MCP is unavailable?</strong> The route returns a typed 503 error with remediation details instead of silently failing.</p>
            </div>
          </article>

          <article className="rounded-sm border border-slate-200 bg-white p-6">
            <h3 className="font-outfit text-lg font-medium tracking-tight text-slate-950">Persistence and security model</h3>
            <ul className="mt-4 space-y-2">
              <li>Local development can persist settings to JSON files on disk.</li>
              <li>For serverless production, durable storage should replace file writes (Blob/DB/Redis/Edge Config).</li>
              <li>Settings routes and APIs are gated behind <code>ALLOW_PROMPT_EDITOR=true</code>.</li>
              <li>Navbar visibility for settings can be toggled with <code>NEXT_PUBLIC_ALLOW_PROMPT_EDITOR=true</code>.</li>
            </ul>
          </article>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6">
          <MermaidDiagramCard
            title="End-to-end runtime flow"
            description="Request execution from user submit through API orchestration, decision gates, optional MCP calls, and response delivery."
            diagram={endToEndRuntimeDiagram}
            ariaLabel="End-to-end runtime flow diagram"
            caption="Submit -> decision -> model/tool loop -> response."
          />
          <MermaidDiagramCard
            title="MCP tool selection flow"
            description="Shows how tool schemas are exposed to the model and how tool calls are selected only when needed."
            diagram={toolSelectionDiagram}
            ariaLabel="MCP tool selection decision flow diagram"
            caption="Tools are model-selected per step, not forced for every request."
          />
          <MermaidDiagramCard
            title="Operator configuration save flow"
            description="Runtime config editing path from browser to authenticated API validation and persistence."
            diagram={operatorSaveFlowDiagram}
            ariaLabel="Operator configuration save flow diagram"
            caption="Editor route -> validation -> persistence -> next chat reads updates."
          />
        </div>

        <div className="mt-10 rounded-sm border border-slate-200 bg-slate-50 px-6 py-5 text-sm text-slate-600">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Deep-dive</p>
          <p className="mt-2">
            For each file under <code className="font-mono text-xs">nexsev/lib/</code>, see{' '}
            <Link href="#lib-helpers" className="font-medium text-emerald-700 hover:text-emerald-800">
              Server helpers
            </Link>{' '}
            (above on this page). For a step-by-step runtime explainer, open{' '}
            <Link href="/flow" className="font-medium text-emerald-700 hover:text-emerald-800">
              Chat Flow Diagram
            </Link>
            . For runtime editing, use{' '}
            <Link href="/settings" className="font-medium text-emerald-700 hover:text-emerald-800">
              Settings
            </Link>
            .
          </p>
        </div>
      </section>

      <div className="mt-20 border-t border-slate-200 pt-12 pb-12">
        <h2 className="text-2xl font-outfit font-medium text-slate-950 tracking-tight mb-8">Architectural Trade-offs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6 text-sm text-slate-600 font-light leading-relaxed">
            <h3 className="text-base font-outfit font-medium text-slate-950">Why trim at runtime?</h3>
            <p>
              Bounding history with LangChain utilities gives a predictable input envelope while preserving recent and relevant context. This lowers token spend and reduces instruction dilution.
            </p>
            <p>
              The route keeps model-only and tool-enabled paths explicit so response quality remains high for simple conversational requests while still supporting deterministic MCP workflows when needed.
            </p>
          </div>
          <div className="space-y-6 text-sm text-slate-600 font-light leading-relaxed">
            <h3 className="text-base font-outfit font-medium text-slate-950">Why Vercel AI Gateway + MCP split?</h3>
            <p>
              The gateway provides provider abstraction, model routing, and operational visibility while MCP preserves deterministic backend actions behind typed tools.
            </p>
            <ul className="list-disc pl-4 space-y-3">
              <li>
                <strong>Model-only path:</strong> faster for normal Q&A and non-actionable chat.
              </li>
              <li>
                <strong>Tool-enabled path:</strong> deterministic for incident actions, templates, and document generation.
              </li>
              <li>
                <strong>Clear failure domain:</strong> MCP outages return explicit availability errors without masking model behavior.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-32 flex flex-col sm:flex-row justify-between items-center py-8 border-t border-slate-200 text-xs font-mono text-slate-400">
        <div>© 2026 IB AI Assistant</div>
        <div className="flex gap-6 mt-4 sm:mt-0">
          <Link href="/" className="hover:text-slate-900 transition-colors uppercase tracking-widest">Index</Link>
          <Link href="/chat" className="hover:text-slate-900 transition-colors uppercase tracking-widest">Playground</Link>
          <Link href="/flow" className="hover:text-slate-900 transition-colors uppercase tracking-widest">Chat Flow Diagram</Link>
        </div>
      </footer>
    </main>
  );
}
