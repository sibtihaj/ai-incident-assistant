'use client';

import MermaidDiagramCard from '@/components/architecture/MermaidDiagramCard';
import {
  endToEndRuntimeDiagram,
  libHelpersModuleDiagram,
  optimizedPipelineDiagram,
  platformContextDiagram,
  toolSelectionDiagram,
} from '@/components/architecture/diagrams';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Brain } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } }
};

export default function FlowPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-24 lg:px-12 lg:py-40">
      {/* Hero */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-32"
      >
        <div className="flex items-center gap-3 mb-8 backdrop-blur-md bg-white/40 w-fit px-4 py-2 rounded-full border border-white/20 shadow-sm">
          <div className="h-[1px] w-12 bg-slate-900" />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">Execution Narrative</span>
        </div>
        <h1 className="text-6xl md:text-8xl font-outfit font-medium tracking-tighter text-slate-950 mb-10 leading-[0.9]">
          Prompt to <br />
          <span className="text-slate-400">MCP Execution</span>
        </h1>
        <div className="max-w-xl backdrop-blur-lg bg-white/40 p-8 rounded-3xl border border-white/30 shadow-xl shadow-slate-200/50">
          <p className="text-xl text-slate-600 font-light leading-relaxed">
            Tracing the lifecycle of a request from client-side submission to deterministic tool execution and final response.
          </p>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="space-y-32"
      >
        {/* Step 1: Pipeline Overview */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-4 sticky top-40">
            <div className="text-[10px] font-mono text-emerald-600 uppercase tracking-widest mb-4">Phase 01</div>
            <h2 className="text-3xl font-outfit font-medium text-slate-950 mb-6 tracking-tight">Optimized Pipeline</h2>
            <p className="text-base text-slate-500 font-light leading-relaxed">
              High-level view of thin system prompt assembly, bounded history, and routing into model-only or tool-enabled execution.
            </p>
          </div>
          <div className="lg:col-span-8">
            <MermaidDiagramCard
              title="Pipeline overview"
              description="How the request is prepared and routed."
              diagram={optimizedPipelineDiagram}
              ariaLabel="Optimized high-level request pipeline"
            />
          </div>
        </motion.section>

        <motion.section variants={itemVariants}>
          <MermaidDiagramCard
            title="Platform context (Supabase + Gateway + MCP)"
            description="Same source as Architecture: where auth, quotas, and chat persistence sit relative to model and tool execution."
            diagram={platformContextDiagram}
            ariaLabel="Platform context diagram"
          />
        </motion.section>

        {/* Step 2: Runtime Sequence */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-4 lg:order-last sticky top-40">
            <div className="text-[10px] font-mono text-emerald-600 uppercase tracking-widest mb-4">Phase 02</div>
            <h2 className="text-3xl font-outfit font-medium text-slate-950 mb-6 tracking-tight">Runtime Sequence</h2>
            <p className="text-base text-slate-500 font-light leading-relaxed">
              Detailed sequence from chat submit to API, decision gates, optional MCP calls, and final JSON response.
            </p>
          </div>
          <div className="lg:col-span-8">
            <MermaidDiagramCard
              title="End-to-end runtime sequence"
              description="The complete lifecycle of a single user interaction."
              diagram={endToEndRuntimeDiagram}
              ariaLabel="Detailed end-to-end runtime sequence"
            />
          </div>
        </motion.section>

        {/* Step 3: Tool Selection */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-4 sticky top-40">
            <div className="text-[10px] font-mono text-emerald-600 uppercase tracking-widest mb-4">Phase 03</div>
            <h2 className="text-3xl font-outfit font-medium text-slate-950 mb-6 tracking-tight">Tool Selection Loop</h2>
            <p className="text-base text-slate-500 font-light leading-relaxed">
              How tool schemas are supplied, when a tool is chosen, and how tool results are fed back into generation.
            </p>
          </div>
          <div className="lg:col-span-8">
            <MermaidDiagramCard
              title="Tool-selection loop"
              description="Recursive tool execution within the AI SDK loop."
              diagram={toolSelectionDiagram}
              ariaLabel="Tool selection and execution loop"
            />
          </div>
        </motion.section>

        {/* Narrative Section */}
        <motion.section variants={itemVariants} className="bg-slate-950 rounded-[3rem] p-12 md:p-20 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full -mr-48 -mt-48" />
          
          <div className="relative z-10">
            <h2 className="text-4xl font-outfit font-medium tracking-tight mb-12">Decision logic explained</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12">
              {[
                { title: 'Prompt submission', desc: 'The client posts the new message plus conversation history to /api/chat.' },
                { title: 'Context extraction', desc: 'The route runs intent/entity extraction and reads prompt runtime settings.' },
                { title: 'History bounding', desc: 'LangChain trimMessages reduces message history to a configured token budget.' },
                { title: 'Conversational vs actionable', desc: 'Regex routing and action entity detection classify the request.' },
                { title: 'MCP execution path', desc: 'The route ensures MCP connectivity and exposes tools to the AI SDK.' },
                { title: 'Response delivery', desc: 'Final assistant text plus metadata are returned to the client.' }
              ].map((step, i) => (
                <div key={step.title} className="group">
                  <div className="text-[10px] font-mono text-emerald-400 mb-2 uppercase tracking-widest">0{i+1}</div>
                  <h3 className="text-lg font-outfit font-medium mb-3 group-hover:text-emerald-400 transition-colors">{step.title}</h3>
                  <p className="text-sm text-slate-400 font-light leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Helpers Link */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-7">
            <MermaidDiagramCard
              title="lib helper relationships"
              description="Logical map of config, engine, and client-side helpers."
              diagram={libHelpersModuleDiagram}
              ariaLabel="lib helper module relationship diagram"
            />
          </div>
          <div className="lg:col-span-5">
            <h2 className="text-3xl font-outfit font-medium text-slate-950 mb-6 tracking-tight">Helper Modules</h2>
            <p className="text-base text-slate-500 font-light leading-relaxed mb-8">
              Prompt assembly, intent hints, and editable config are implemented as small TypeScript modules—not separate services.
            </p>
            <Link href="/architecture#lib-helpers" className="inline-flex items-center gap-2 text-sm font-outfit text-slate-950 group">
              <span className="border-b border-slate-900 pb-1 group-hover:border-emerald-500 group-hover:text-emerald-600 transition-all">View Server Helpers Table</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </motion.section>
      </motion.div>

      {/* FAQ */}
      <section className="mt-40 pt-20 border-t border-slate-200">
        <h2 className="text-sm font-mono uppercase tracking-[0.3em] text-slate-950 mb-16">Common Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12">
          {[
            { q: 'Does every request hit MCP?', a: 'No. Only actionable requests enter the tool-enabled path.' },
            { q: 'What counts as actionable?', a: 'Messages matching actionable regexes or containing action entities like create/update/search.' },
            { q: 'Who selects the tool?', a: 'The model selects tools from registered MCP schemas during generation.' },
            { q: 'What happens if MCP is down?', a: 'The API returns a 503 with remediation guidance; the failure is explicit.' }
          ].map((faq) => (
            <div key={faq.q}>
              <h3 className="text-base font-outfit font-medium text-slate-950 mb-3 tracking-tight">{faq.q}</h3>
              <p className="text-sm text-slate-500 font-light leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-40 pt-20 pb-20 border-t border-slate-200 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 backdrop-blur-xl bg-white/40 p-10 rounded-[3rem] border border-white/30 shadow-2xl shadow-slate-200/50">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-950 text-white">
                <Brain className="h-5 w-5" />
              </div>
              <div className="text-2xl font-outfit font-medium text-slate-950 tracking-tighter">IB AI Assistant</div>
            </div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.3em] bg-slate-950/5 px-3 py-1 rounded-full w-fit">Operational Intelligence</div>
          </div>
          
          <div className="flex flex-wrap gap-x-16 gap-y-8">
            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Navigation</span>
              <div className="flex flex-col gap-2">
                <Link href="/" className="text-sm font-outfit text-slate-600 hover:text-emerald-600 transition-colors">Home</Link>
                <Link href="/chat" className="text-sm font-outfit text-slate-600 hover:text-emerald-600 transition-colors">Playground</Link>
                <Link href="/architecture" className="text-sm font-outfit text-slate-600 hover:text-emerald-600 transition-colors">Architecture</Link>
                <Link href="/flow" className="text-sm font-outfit text-slate-600 hover:text-emerald-600 transition-colors">Chat Flow Diagram</Link>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">System</span>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 group cursor-default">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="text-sm font-outfit text-slate-600 group-hover:text-slate-950 transition-colors">Vercel AI Gateway: Nominal</span>
                </div>
                <div className="flex items-center gap-2 group cursor-default">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="text-sm font-outfit text-slate-600 group-hover:text-slate-950 transition-colors">MCP Layer: Active</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-4 pt-4 border-t border-slate-100">© 2026 Architectural Spec</div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
