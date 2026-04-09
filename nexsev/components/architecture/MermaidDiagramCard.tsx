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
        theme: 'neutral',
        securityLevel: 'loose',
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
          useMaxWidth: true,
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
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className="rounded-sm border border-slate-200 bg-white shadow-[0_20px_44px_-34px_rgb(15_23_42_/_0.4)]"
    >
      <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">
        <div className="mb-2 h-0.5 w-10 rounded-full bg-emerald-500" aria-hidden />
        <h3 className="font-outfit text-lg font-medium tracking-tight text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
      </div>
      <div
        ref={ref}
        className="min-h-[220px] overflow-x-auto px-4 py-8 sm:px-6"
        aria-label={ariaLabel}
      />
      {caption ? (
        <p className="border-t border-slate-100 px-6 py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {caption}
        </p>
      ) : null}
    </motion.section>
  );
}
