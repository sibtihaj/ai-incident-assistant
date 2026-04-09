'use client';

import MermaidDiagramCard from '@/components/architecture/MermaidDiagramCard';
import { siteDeploymentDiagram } from '@/components/architecture/diagrams';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowUpRight,
  Bot,
  Brain,
  Cpu,
  Fingerprint,
  Gauge,
  ShieldCheck,
  LockKeyhole,
  Zap,
} from 'lucide-react';

const features = [
  {
    id: '01',
    title: 'LangChain Orchestration',
    description: 'Dynamic prompt assembly and tool-calling loops engineered for reliability. Eliminates fragile static prompts.',
    icon: Cpu
  },
  {
    id: '02',
    title: 'Vercel AI Gateway',
    description: 'Unified model proxying. Zero-downtime failover, precise cost tracking, and enterprise-grade OIDC authentication.',
    icon: Zap
  },
  {
    id: '03',
    title: 'Hardened MCP Layer',
    description: 'Atomic persistence and strict schema validation. Tool execution bounded by rigid timeout constraints.',
    icon: ShieldCheck
  }
];

const trustControls = [
  {
    id: 'T01',
    title: 'CAPTCHA-backed login',
    description:
      'Cloudflare Turnstile verifies humans before password sign-in. After a successful check, the server issues a short-lived, signed httpOnly cookie so legitimate users can retry credentials without solving the widget again—nothing critical is stored in readable client storage.',
    icon: Bot,
  },
  {
    id: 'T02',
    title: 'Authenticated playground only',
    description:
      'The chat playground is behind Supabase Auth. Sessions are refreshed in middleware; unauthenticated visits are redirected to sign-in. Chat history lives in Postgres under row-level security so each account only sees its own data.',
    icon: LockKeyhole,
  },
  {
    id: 'T03',
    title: 'Server-side chat quotas',
    description:
      'Every user message that hits model orchestration counts against a rolling per-user limit enforced in the API route and database—not in the browser. Automated scripts cannot reset limits by clearing local state; compromised accounts still burn down a bounded budget.',
    icon: Gauge,
  },
  {
    id: 'T04',
    title: 'Device correlation (audit)',
    description:
      'A first-party httpOnly device cookie is set for troubleshooting and audit trails. Usage limits remain tied to the signed-in user; the device id helps correlate traffic without replacing account-level enforcement.',
    icon: Fingerprint,
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-32 relative">
      {/* Background Grid - Subtle and Modern */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(16,185,129,0.05),transparent_50%)]"></div>
      </div>

      {/* Hero */}
      <section className="max-w-4xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 mb-8 backdrop-blur-md bg-white/40 w-fit px-4 py-2 rounded-full border border-white/20 shadow-sm"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-slate-900"></div>
          <span className="text-xs font-mono tracking-[0.2em] text-slate-500 uppercase">Version 2.0.4</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl sm:text-7xl md:text-[5rem] font-outfit font-medium tracking-tight text-slate-950 leading-[1.05] drop-shadow-sm"
        >
          Incident Response, <br />
          <span className="text-slate-400">Architected for Scale.</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 max-w-xl backdrop-blur-lg bg-white/40 p-8 rounded-3xl border border-white/30 shadow-xl shadow-slate-200/50"
        >
          <p className="text-lg text-slate-600 font-outfit font-light leading-relaxed">
            A mission-critical playground that accelerates Sev1 resolution through automated RCA generation, robust tool execution, and deterministic LLM orchestration.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 flex flex-wrap items-center gap-6"
        >
          <Link
            href="/chat"
            className="group flex items-center gap-3 bg-slate-950 text-white px-6 py-3.5 rounded-sm text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Initialize Playground
            <ArrowUpRight className="h-4 w-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </Link>
          <Link
            href="/architecture"
            className="text-sm font-medium text-slate-950 hover:text-slate-500 transition-colors"
          >
            View Architecture
          </Link>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="my-24 md:my-32 h-px w-full bg-slate-200"></div>

      {/* Features - Technical Spec Layout */}
      <section className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-16 backdrop-blur-sm bg-white/20 p-6 rounded-2xl border border-white/10">
          <h2 className="text-2xl font-outfit font-medium text-slate-950 tracking-tight">Core Infrastructure</h2>
          <p className="text-xs text-slate-400 font-mono mt-4 md:mt-0 tracking-widest uppercase">SYS_CAPABILITIES_03</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-16">
          {features.map((feature, idx) => (
            <motion.div 
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="flex flex-col group p-8 rounded-[2rem] backdrop-blur-xl bg-white/40 border border-white/30 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-500"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/50">
                <div className="p-2.5 rounded-xl bg-slate-950 text-white group-hover:scale-110 transition-transform duration-500">
                  <feature.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <span className="text-xs font-mono text-slate-400">{feature.id}</span>
              </div>
              <h3 className="text-lg font-outfit font-medium text-slate-950 mb-3">{feature.title}</h3>
              <p className="text-sm text-slate-600 font-light leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="my-24 md:my-32 h-px w-full bg-slate-200" />

      <section className="relative z-10 space-y-10">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between backdrop-blur-sm bg-white/20 p-6 rounded-2xl border border-white/10">
          <div>
            <h2 className="text-2xl font-outfit font-medium text-slate-950 tracking-tight">
              Deployment topology
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 font-outfit font-light leading-relaxed">
              How the browser, Vercel-hosted Next.js, Supabase, AI Gateway, Turnstile, and the MCP runtime
              connect. Arrows follow the main request paths; dashed lines are auxiliary verification or
              widget traffic.
            </p>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-6 md:mt-0 tracking-widest uppercase shrink-0">
            DEPLOY_MAP_01
          </p>
        </div>
        <MermaidDiagramCard
          title="Site deployment map"
          description="Runtime layout: edge middleware and route handlers on Vercel, auth and durable state in Supabase, models through Vercel AI Gateway, tools through your MCP server, and login CAPTCHA via Cloudflare."
          diagram={siteDeploymentDiagram}
          ariaLabel="Deployment diagram showing browser, Vercel Next.js, Supabase, AI Gateway, Turnstile, and MCP"
          caption="MCP is typically stdio to a local Node process in development; serverless production often needs a remote MCP transport or a long-lived backend—see /architecture for the full pipeline."
        />
      </section>

      <div className="my-24 md:my-32 h-px w-full bg-slate-200" />

      <section className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-16 backdrop-blur-sm bg-white/20 p-6 rounded-2xl border border-white/10">
          <div>
            <h2 className="text-2xl font-outfit font-medium text-slate-950 tracking-tight">
              Abuse protection
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 font-outfit font-light leading-relaxed">
              The playground is designed so bots and casual abuse cannot silently burn LLM inference or MCP
              capacity. Controls are enforced on the server and in the database—marketing copy here reflects
              what the app actually does today, not a future roadmap.
            </p>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-6 md:mt-0 tracking-widest uppercase shrink-0">
            TRUST_BOUNDARY_04
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
          {trustControls.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: idx * 0.06 }}
              className="flex flex-col p-8 rounded-[2rem] backdrop-blur-xl bg-white/40 border border-white/30 shadow-lg shadow-slate-200/30"
            >
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200/50">
                <div className="p-2.5 rounded-xl bg-slate-900 text-white">
                  <item.icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                </div>
                <span className="text-xs font-mono text-slate-400">{item.id}</span>
              </div>
              <h3 className="text-lg font-outfit font-medium text-slate-950 mb-3">{item.title}</h3>
              <p className="text-sm text-slate-600 font-light leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>

        <p className="mt-10 text-xs font-mono text-slate-500 leading-relaxed max-w-3xl">
          Quotas and exact limits are configurable per deployment; sign-up policy (for example disabling
          open registration) further reduces automated account farms.
        </p>
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
