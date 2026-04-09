export default function ArchitectureNotice() {
  return (
    <div className="border-b border-slate-200 bg-slate-50/50">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-6 px-6 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 lg:px-8">
        <span>Framework: Next.js</span>
        <span className="text-slate-300">/</span>
        <span>Orchestrator: LangChain</span>
        <span className="text-slate-300">/</span>
        <span>Gateway: Vercel AI</span>
        <span className="text-slate-300">/</span>
        <span>Protocol: MCP</span>
      </div>
    </div>
  );
}
