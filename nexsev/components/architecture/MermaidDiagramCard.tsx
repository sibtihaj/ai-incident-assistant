'use client';

import { motion } from 'framer-motion';
import { useEffect, useId, useRef } from 'react';

type MermaidDiagramCardProps = {
  title: string;
  description: string;
  diagram: string;
  ariaLabel: string;
  caption?: string;
};

export default function MermaidDiagramCard({
  title,
  description,
  diagram,
  ariaLabel,
  caption,
}: MermaidDiagramCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const stableId = useId().replace(/:/g, '');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    void (async () => {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        fontFamily: 'var(--font-mono)',
        themeVariables: {
          primaryColor: '#0f172a',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#1e293b',
          lineColor: '#334155',
          secondaryColor: '#f1f5f9',
          tertiaryColor: '#ffffff',
          mainBkg: '#ffffff',
          nodeBorder: '#1e293b',
          clusterBkg: '#f8fafc',
          clusterBorder: '#cbd5e1',
          fontSize: '14px',
          fontFamily: 'var(--font-mono)',
          textColor: '#0f172a',
          edgeLabelBackground: '#ffffff',
          nodeTextColor: '#0f172a'
        },
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
          useMaxWidth: true,
          padding: 24,
        },
      });

      try {
        const { svg } = await mermaid.render(`mermaid-diagram-${stableId}`, diagram.trim());
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          const svgEl = ref.current.querySelector('svg');
          if (svgEl) {
            svgEl.setAttribute('role', 'img');
            svgEl.setAttribute('focusable', 'false');
          }
        }
      } catch {
        if (!cancelled && ref.current) {
          ref.current.textContent = 'Unable to render diagram.';
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [diagram, stableId]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="group rounded-3xl border border-slate-200 bg-white shadow-[0_32px_64px_-48px_rgba(0,0,0,0.1)] hover:shadow-[0_48px_96px_-64px_rgba(0,0,0,0.15)] transition-all duration-700 overflow-hidden"
    >
      <div className="px-8 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-1 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Diagram Module</span>
        </div>
        <h3 className="font-outfit text-2xl font-medium tracking-tight text-slate-950 mb-3">{title}</h3>
        <p className="text-base font-light leading-relaxed text-slate-500 max-w-lg">{description}</p>
      </div>
      
      <div className="relative">
        <div
          ref={ref}
          className="min-h-[300px] overflow-x-auto px-8 py-12 bg-slate-50/30 border-y border-slate-100 flex justify-center items-center [&_svg]:max-w-full [&_svg]:h-auto"
          aria-label={ariaLabel}
        />
      </div>

      {caption ? (
        <div className="px-8 py-6 bg-white/80 backdrop-blur-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
            Note: <span className="text-slate-600">{caption}</span>
          </p>
        </div>
      ) : null}
    </motion.section>
  );
}
