'use client';

import MermaidDiagramCard from '@/components/architecture/MermaidDiagramCard';
import FooterSocialIconRow from '@/components/layout/FooterSocialIconRow';
import {
  antiPatternDiagram,
  conversationContextRetentionFlowDiagram,
  conversationMemorySequenceDiagram,
  endToEndRuntimeDiagram,
  libHelpersModuleDiagram,
  operatorSaveFlowDiagram,
  optimizedPipelineDiagram,
  platformContextDiagram,
  toolSelectionDiagram,
} from '@/components/architecture/diagrams';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Brain } from 'lucide-react';

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
    description:
      'The Next.js route orchestrates prompt assembly and tool-capable generation. LangChain trimMessages bounds transcript tokens; the same route deduplicates the latest user turn when the client already sent it in history, and concatenates a compact persisted memory block into the system string before calling the model.',
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
  },
  {
    id: 'LAY-06',
    title: 'Backend / Data (Supabase)',
    description:
      'Supabase Auth issues JWT-backed sessions for the playground. Postgres stores chat_sessions (RLS per user, max 20 pruned) and user_chat_usage for rolling chat quotas enforced on POST /api/chat. Login is gated with Cloudflare Turnstile plus a signed httpOnly proof cookie for retry-friendly UX.',
    tech: 'Supabase Auth, Postgres, RLS, Turnstile'
  },
  {
    id: 'LAY-07',
    title: 'Conversation memory & CAN grounding',
    description:
      'Each session row stores a JSON envelope: the visible message list plus a small structured memory object (rolling incident summary and key-value facts extracted from your text). That memory is re-injected on every turn so long incidents stay anchored even when the raw transcript is trimmed for token limits. Structured outputs such as CAN reports are gated until required fact keys are present, which avoids the model inventing details after context drops off.',
    tech: 'Postgres JSONB, server-side validation, prompt composition'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

export default function ArchitecturePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-24 lg:px-12 lg:py-40">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-32 relative z-10"
      >
        <div className="flex items-center gap-3 mb-8 backdrop-blur-md bg-white/40 w-fit px-4 py-2 rounded-full border border-white/20 shadow-sm">
          <div className="h-[1px] w-12 bg-slate-900" />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500">System Design</span>
        </div>
        <h1 className="text-6xl md:text-8xl font-outfit font-medium tracking-tighter text-slate-950 mb-10 leading-[0.9]">
          Architecture <br />
          <span className="text-slate-400">& Schematic</span>
        </h1>
        <div className="max-w-xl backdrop-blur-lg bg-white/40 p-8 rounded-3xl border border-white/30 shadow-xl shadow-slate-200/50">
          <p className="text-xl text-slate-600 font-light leading-relaxed">
            A high-fidelity breakdown of how the AI Incident Assistant orchestrates UI, model generation, and tool execution.
          </p>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-40"
      >
        <motion.div variants={itemVariants}>
          <MermaidDiagramCard
            title="Current anti-pattern"
            description="Historical behavior combined oversized static context and duplicated history, which inflated tokens and blurred instruction focus."
            diagram={antiPatternDiagram}
            ariaLabel="Current anti-pattern diagram"
            caption="Before optimization: duplicated history and oversized system context."
          />
        </motion.div>
        <motion.div variants={itemVariants}>
        <MermaidDiagramCard
          title="Optimized request pipeline"
          description="Thin system prompt, LangChain-trimmed history, persisted session memory folded into the system string, then branch into model-only or tool-enabled execution."
          diagram={optimizedPipelineDiagram}
          ariaLabel="Optimized request pipeline diagram"
          caption="After optimization: bounded history plus durable memory injection before the decision gate."
        />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5 }}
        className="mb-40"
      >
        <MermaidDiagramCard
          title="Platform context"
          description="Next.js sits in front of Supabase (auth + Postgres with RLS), Vercel AI Gateway and MCP for execution, with Turnstile and per-user quotas at the trust boundary. Chat routes also read and write the session JSON envelope for memory."
          diagram={platformContextDiagram}
          ariaLabel="Platform context diagram with Supabase AI Gateway and MCP"
          caption="Supabase persistence and auth alongside gateway and tool execution."
        />
      </motion.div>

      <motion.section
        id="conversation-context"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5 }}
        className="mb-40 scroll-mt-24"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="h-[1px] w-12 bg-slate-900" />
          <h2 className="text-sm font-mono uppercase tracking-[0.3em] text-slate-950">
            Conversation context retention
          </h2>
        </div>
        <div className="max-w-3xl mb-12 space-y-4 text-base text-slate-600 font-light leading-relaxed">
          <p>
            Large language models only see what you send on each request. If the transcript is long, older
            turns may be trimmed to stay within a token budget, which can make the assistant feel like it
            “forgot” an early incident dump. This product addresses that in three ways—without relying on
            pgvector or ad-hoc retrieval for the core path.
          </p>
          <ul className="list-disc pl-5 space-y-2 marker:text-slate-400">
            <li>
              <span className="text-slate-800 font-normal">Structured session memory</span> in Postgres
              (summary + key facts) lives beside the message list in the same JSON envelope. The API refreshes
              it from each user message and injects it into the system prompt every turn so anchors survive
              trimming.
            </li>
            <li>
              <span className="text-slate-800 font-normal">History hygiene</span>: the server skips
              appending the current user message twice when the client already included it, and LangChain
              trimming enforces a configurable budget so costs stay predictable.
            </li>
            <li>
              <span className="text-slate-800 font-normal">CAN-style grounding</span>: when you ask for a
              CAN report, the route checks that required fact keys were captured first; otherwise it asks for
              the missing fields instead of hallucinating after context loss.
            </li>
          </ul>
          <p className="text-sm text-slate-500">
            Vector search (pgvector) is optional for future knowledge bases; the playbook here is
            deterministic persistence plus explicit validation—not semantic recall of raw logs.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-12">
          <MermaidDiagramCard
            title="Context retention pipeline"
            description="From the browser through load/merge of the envelope, optional CAN guardrails, token trimming, and generation—with memory written back under the same row the user already owns via RLS."
            diagram={conversationContextRetentionFlowDiagram}
            ariaLabel="Flowchart of conversation context retention and memory persistence"
            caption="Yellow node: early return when a CAN report is requested but structured facts are incomplete."
          />
          <MermaidDiagramCard
            title="Memory + generation sequence"
            description="Narrow sequence emphasizing Supabase envelope I/O, the CAN short-circuit path, persistence of memory before the model call, and the client’s debounced transcript save."
            diagram={conversationMemorySequenceDiagram}
            ariaLabel="Sequence diagram for session memory and chat generation"
          />
        </div>
      </motion.section>

      {/* Layers Section */}
      <section className="mb-40">
        <div className="flex items-center gap-3 mb-16">
          <div className="h-[1px] w-12 bg-slate-900" />
          <h2 className="text-sm font-mono uppercase tracking-[0.3em] text-slate-950">Structural Layers</h2>
        </div>
        
        <div className="space-y-px bg-slate-200 border-y border-slate-200">
          {architectureSteps.map((step) => (
            <motion.div 
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="group grid grid-cols-1 md:grid-cols-12 gap-8 py-12 px-6 bg-white hover:bg-slate-50/50 transition-all duration-300"
            >
              <div className="md:col-span-2 text-[10px] font-mono text-slate-400 pt-1 tracking-widest">
                {step.id}
              </div>
              <div className="md:col-span-3">
                <h3 className="text-xl font-outfit font-medium text-slate-950 mb-2 tracking-tight">{step.title}</h3>
                <div className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider">{step.tech}</div>
              </div>
              <div className="md:col-span-7 text-base text-slate-600 font-light leading-relaxed max-w-2xl">
                {step.description}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Runtime Flow Section */}
      <section className="mb-40">
        <div className="flex items-center gap-3 mb-16">
          <div className="h-[1px] w-12 bg-slate-900" />
          <h2 className="text-sm font-mono uppercase tracking-[0.3em] text-slate-950">Runtime Execution</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-slate-200 bg-white p-1 overflow-hidden shadow-sm"
          >
            <MermaidDiagramCard
              title="End-to-end runtime flow"
              description="Request execution from user submit through API orchestration, decision gates, optional MCP calls, and response delivery."
              diagram={endToEndRuntimeDiagram}
              ariaLabel="End-to-end runtime flow diagram"
            />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <MermaidDiagramCard
                title="MCP tool selection flow"
                description="Shows how tool schemas are exposed to the model and how tool calls are selected only when needed."
                diagram={toolSelectionDiagram}
                ariaLabel="MCP tool selection decision flow diagram"
              />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <MermaidDiagramCard
                title="Operator configuration save flow"
                description="Runtime config editing path from browser to authenticated API validation and persistence."
                diagram={operatorSaveFlowDiagram}
                ariaLabel="Operator configuration save flow diagram"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Lib Helpers Section */}
      <section id="lib-helpers" className="mb-40 scroll-mt-24">
        <div className="flex items-center gap-3 mb-16">
          <div className="h-[1px] w-12 bg-slate-900" />
          <h2 className="text-sm font-mono uppercase tracking-[0.3em] text-slate-950">Server Helpers</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-5">
            <p className="text-lg text-slate-600 font-light leading-relaxed mb-12">
              These modules are TypeScript helpers used by the playground UI and the API routes. Together they assemble prompts, classify intent, load config, and persist chat sessions through Supabase.
            </p>
            
            <div className="space-y-8 relative z-10">
              {[
                { name: 'promptEngine.ts', desc: 'Builds the system string from static instructions and rules.' },
                { name: 'contextDetector.ts', desc: 'Lightweight intent and entity extraction from user messages.' },
                { name: 'promptConfigStore.ts', desc: 'Reads and writes context and prompt runtime JSON.' },
                {
                  name: 'chatSessions.ts',
                  desc: 'Maps Supabase rows to a JSON envelope: typed messages for the UI plus optional incident memory (summary and key facts).',
                },
                { name: 'supabase/* clients', desc: 'Browser and server Supabase clients for RLS-backed CRUD and JWT refresh.' }
              ].map((helper) => (
                <div key={helper.name} className="border-l-2 border-slate-100 pl-6 py-4 hover:border-emerald-500 transition-all backdrop-blur-md bg-white/30 rounded-r-2xl border-y border-r border-white/20 shadow-sm">
                  <div className="font-mono text-sm text-slate-950 mb-1">{helper.name}</div>
                  <div className="text-sm text-slate-500 font-light">{helper.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <MermaidDiagramCard
              title="Helper module relationships"
              description="How configuration flows into prompt assembly, how the chat route enforces quotas against Supabase, and how the browser client lists or saves sessions under RLS."
              diagram={libHelpersModuleDiagram}
              ariaLabel="Diagram of lib helper modules and POST api chat route"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-40 border-t border-slate-200 pt-20 pb-0 relative z-10">
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
        <FooterSocialIconRow />
      </footer>
    </main>
  );
}
