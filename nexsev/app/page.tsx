'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight, Cpu, Zap, ShieldCheck } from 'lucide-react';

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

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-32">
      {/* Hero */}
      <section className="max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-slate-900"></div>
          <span className="text-xs font-mono tracking-[0.2em] text-slate-500 uppercase">Version 2.0.4</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl sm:text-7xl md:text-[5rem] font-outfit font-medium tracking-tight text-slate-950 leading-[1.05]"
        >
          Incident Response, <br />
          <span className="text-slate-400">Architected for Scale.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 max-w-xl text-lg text-slate-600 font-outfit font-light leading-relaxed"
        >
          A mission-critical playground that accelerates Sev1 resolution through automated RCA generation, robust tool execution, and deterministic LLM orchestration.
        </motion.p>

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
      <section>
        <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-16">
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
              className="flex flex-col"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <feature.icon className="h-5 w-5 text-slate-900" strokeWidth={1.5} />
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

      {/* Footer */}
      <footer className="mt-32 flex flex-col sm:flex-row justify-between items-center py-8 border-t border-slate-200 text-xs font-mono text-slate-400">
        <div>© 2026 IB AI Assistant</div>
        <div className="flex gap-6 mt-4 sm:mt-0">
          <Link href="/architecture" className="hover:text-slate-900 transition-colors uppercase tracking-widest">Architecture</Link>
          <Link href="/chat" className="hover:text-slate-900 transition-colors uppercase tracking-widest">Terminal</Link>
        </div>
      </footer>
    </main>
  );
}
