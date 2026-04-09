'use client';

import MermaidDiagramCard from '@/components/architecture/MermaidDiagramCard';
import {
  endToEndRuntimeDiagram,
  libHelpersModuleDiagram,
  optimizedPipelineDiagram,
  toolSelectionDiagram,
} from '@/components/architecture/diagrams';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function FlowPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20 lg:px-8 lg:py-28">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Chat Flow Diagram</p>
        <h1 className="mt-2 font-outfit text-4xl font-medium tracking-tight text-slate-950 md:text-5xl">
          Prompt to MCP execution
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
          This page documents how a user prompt moves through the system, how conversational and actionable requests are separated, when MCP is used, and how responses are returned.
        </p>
      </motion.div>

      <section className="mt-10 grid grid-cols-1 gap-6">
        <MermaidDiagramCard
          title="Optimized pipeline overview"
          description="High-level view of thin system prompt assembly, bounded history, and routing into model-only or tool-enabled execution."
          diagram={optimizedPipelineDiagram}
          ariaLabel="Optimized high-level request pipeline"
        />
        <MermaidDiagramCard
          title="End-to-end runtime sequence"
          description="Detailed sequence from chat submit to API, decision gates, optional MCP calls, and final JSON response."
          diagram={endToEndRuntimeDiagram}
          ariaLabel="Detailed end-to-end runtime sequence"
        />
        <MermaidDiagramCard
          title="Tool-selection loop"
          description="How tool schemas are supplied, when a tool is chosen, and how tool results are fed back into generation."
          diagram={toolSelectionDiagram}
          ariaLabel="Tool selection and execution loop"
        />
      </section>

      <section className="mt-10 rounded-sm border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600">
        <h2 className="font-outfit text-xl font-medium tracking-tight text-slate-950">Decision logic explained</h2>
        <div className="mt-4 space-y-3">
          <p>
            <strong>1) Prompt submission:</strong> The client posts the new message plus conversation history to <code>/api/chat</code>.
          </p>
          <p>
            <strong>2) Context extraction:</strong> The route runs intent/entity extraction and reads prompt runtime settings.
          </p>
          <p>
            <strong>3) History bounding:</strong> LangChain <code>trimMessages</code> reduces message history to a configured token budget before model invocation.
          </p>
          <p>
            <strong>4) Conversational vs actionable:</strong> Regex routing and action entity detection classify the request. Conversational requests stay model-only; actionable requests initialize MCP tools.
          </p>
          <p>
            <strong>5) MCP execution path:</strong> The route ensures MCP connectivity, exposes tools to the AI SDK, and the model decides whether to call tools based on user intent and tool descriptions.
          </p>
          <p>
            <strong>6) Response delivery:</strong> Final assistant text plus metadata (model, timing, tool calls) are returned to the client and rendered in chat.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-outfit text-xl font-medium tracking-tight text-slate-950">
          Helper modules in <code className="font-mono text-base text-slate-800">lib/</code>
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Prompt assembly, intent hints, and editable config are implemented as small TypeScript modules—not separate services.
          The diagram shows how files like <code className="font-mono text-xs">promptEngine.ts</code>,{' '}
          <code className="font-mono text-xs">contextDetector.ts</code>, and JSON config relate to{' '}
          <code className="font-mono text-xs">POST /api/chat</code>. For a full file-by-file table, open{' '}
          <Link href="/architecture#lib-helpers" className="font-medium text-emerald-700 hover:text-emerald-800">
            Architecture → Server helpers
          </Link>
          .
        </p>
        <div className="mt-6">
          <MermaidDiagramCard
            title="lib helper relationships"
            description="Same logical map as on the architecture page: config into prompt engine, detector into route, conversation helpers on the client."
            diagram={libHelpersModuleDiagram}
            ariaLabel="lib helper module relationship diagram"
            caption="Client-side manager and storage are used by the playground UI; the route runs on the server."
          />
        </div>
      </section>

      <section className="mt-8 rounded-sm border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
        <h2 className="font-outfit text-lg font-medium tracking-tight text-slate-950">FAQ</h2>
        <div className="mt-3 space-y-2">
          <p><strong>Does every request hit MCP?</strong> No. Only actionable requests enter the tool-enabled path.</p>
          <p><strong>What counts as actionable?</strong> Messages matching actionable regexes or containing action entities such as create/update/search/generate.</p>
          <p><strong>Who selects the tool?</strong> The model selects tools from registered MCP schemas during generation.</p>
          <p><strong>What if no tool is needed?</strong> The model returns directly without any MCP call.</p>
          <p><strong>What happens if MCP is down?</strong> The API returns a 503 with remediation guidance; the failure is explicit.</p>
        </div>
      </section>

      <footer className="mt-12 flex flex-wrap gap-6 border-t border-slate-200 pt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
        <Link href="/architecture" className="hover:text-slate-800">Architecture</Link>
        <Link href="/architecture#lib-helpers" className="hover:text-slate-800">Lib helpers</Link>
        <Link href="/chat" className="hover:text-slate-800">Playground</Link>
      </footer>
    </main>
  );
}
