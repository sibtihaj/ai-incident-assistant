'use client';

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
    description: 'LangChain JS manages the complex logic of prompt assembly, context injection, and tool-calling loops. It ensures consistent and reliable AI behavior.',
    tech: 'LangChain JS, @langchain/openai'
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
          The AI Incident Assistant separates the interface layer, intelligence orchestration, and deterministic tool execution into distinct boundaries.
        </p>
      </motion.div>

      {/* Schematic Diagram (Text-Based/Structural) */}
      <div className="mb-24 border border-slate-200 rounded-sm bg-white p-8 md:p-16 shadow-sm">
        <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-12">Schematic Overview</h2>
        
        <div className="flex flex-col md:flex-row gap-8 justify-between">
          <div className="flex-1 border-l-2 border-slate-950 pl-6 py-2">
            <span className="text-xs font-mono text-slate-400 block mb-2">01 / CLIENT</span>
            <div className="text-lg font-outfit font-medium text-slate-950">Next.js UI</div>
            <div className="text-sm text-slate-500 mt-1 font-light">React Server Components</div>
          </div>
          
          <div className="hidden md:flex items-center text-slate-300 font-mono">→</div>

          <div className="flex-1 border-l-2 border-slate-950 pl-6 py-2">
            <span className="text-xs font-mono text-slate-400 block mb-2">02 / COMPUTE</span>
            <div className="text-lg font-outfit font-medium text-slate-950">LangChain Route</div>
            <div className="text-sm text-slate-500 mt-1 font-light">Tool Calling Loop</div>
          </div>

          <div className="hidden md:flex items-center text-slate-300 font-mono">→</div>

          <div className="flex-1 flex flex-col gap-8 py-2">
            <div className="border-l-2 border-slate-300 pl-6">
              <span className="text-xs font-mono text-slate-400 block mb-2">03A / PROXY</span>
              <div className="text-lg font-outfit font-medium text-slate-950">AI Gateway</div>
            </div>
            <div className="border-l-2 border-slate-300 pl-6">
              <span className="text-xs font-mono text-slate-400 block mb-2">03B / EXECUTION</span>
              <div className="text-lg font-outfit font-medium text-slate-950">MCP Server</div>
            </div>
          </div>
        </div>
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

      {/* Revamp & Architectural Trade-offs */}
      <div className="mt-24 border-t border-slate-200 pt-24 pb-12">
        <h2 className="text-2xl font-outfit font-medium text-slate-950 tracking-tight mb-8">Revamp & Architectural Trade-offs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6 text-sm text-slate-600 font-light leading-relaxed">
            <h3 className="text-base font-outfit font-medium text-slate-950">The Move to LangChain & Observability</h3>
            <p>
              In the recent v2.0 revamp, we completely migrated away from hardcoded, provider-specific prompts (e.g., raw Ollama integrations) to <strong>LangChain JS</strong>. This orchestration layer gives us a unified framework for prompt engineering, context management, and deterministic tool-calling loops.
            </p>
            <p>
              Coupled with this is the introduction of a robust <strong>Observability</strong> adapter. By building an abstraction layer, we can seamlessly plug in tracing platforms like LangSmith or Langfuse to monitor token usage, latency, and step-by-step execution traces of our MCP tools.
            </p>
          </div>
          <div className="space-y-6 text-sm text-slate-600 font-light leading-relaxed">
            <h3 className="text-base font-outfit font-medium text-slate-950">Why Vercel AI Gateway?</h3>
            <p>
              For model access, we shifted to <strong>Vercel AI Gateway</strong> primarily for <em>ease of deployment</em> and zero-config edge proxying. However, we evaluated several alternatives during the architectural design phase:
            </p>
            <ul className="list-disc pl-4 space-y-3">
              <li>
                <strong>Kubernetes KServe:</strong> A highly scalable, CNCF-incubating inference platform that offers scale-to-zero capabilities and an OpenAI-compatible API layer for self-hosted models. We bypassed this to avoid the overhead of managing complex Kubernetes infrastructure (Gateway API, cert-manager, etc.).
              </li>
              <li>
                <strong>Cloud-Native Gateways:</strong> We considered <strong>Amazon Bedrock</strong> and <strong>Google Cloud Vertex AI</strong> (the official Google AI platform). While excellent for their respective ecosystems, they introduce deeper vendor lock-in compared to an agnostic proxy.
              </li>
              <li>
                <strong>Edge Proxies:</strong> Alternatives like <strong>Cloudflare AI Gateway</strong> were viable, but Vercel AI Gateway offered the tightest integration with our Next.js frontend and native OIDC authentication.
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
          <Link href="/chat" className="hover:text-slate-900 transition-colors uppercase tracking-widest">Terminal</Link>
        </div>
      </footer>
    </main>
  );
}
