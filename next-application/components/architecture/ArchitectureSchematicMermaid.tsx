'use client';

import { motion } from 'framer-motion';
import { useEffect, useId, useRef } from 'react';

/**
 * Industrial / editorial schematic: client → compute → parallel gateway + MCP.
 * Styling uses slate + cyan/emerald accents (aligned with playground telemetry).
 */
const ARCHITECTURE_FLOWCHART = `
flowchart LR
  classDef nodeClient fill:#f8fafc,stroke:#0f172a,stroke-width:2px,color:#0f172a
  classDef nodeCompute fill:#ffffff,stroke:#0f172a,stroke-width:2px,color:#0f172a
  classDef nodeProxy fill:#ecfeff,stroke:#0e7490,stroke-width:1.5px,color:#134e4a
  classDef nodeExec fill:#ecfdf5,stroke:#047857,stroke-width:1.5px,color:#064e3b

  UI["01 · CLIENT<br/>Next.js UI<br/>React Server Components"]
  LC["02 · COMPUTE<br/>LangChain Route<br/>Tool calling loop"]
  subgraph PAR["Parallel downstream"]
    direction TB
    AG["03A · PROXY<br/>AI Gateway"]
    MS["03B · EXECUTION<br/>MCP Server"]
  end

  UI --> LC
  LC --> AG
  LC --> MS

  class UI nodeClient
  class LC nodeCompute
  class AG nodeProxy
  class MS nodeExec
`;

export default function ArchitectureSchematicMermaid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stableId = useId().replace(/:/g, '');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        themeVariables: {
          fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif',
          fontSize: '13px',
          primaryColor: '#f8fafc',
          primaryTextColor: '#0f172a',
          primaryBorderColor: '#0f172a',
          secondaryColor: '#ffffff',
          tertiaryColor: '#f1f5f9',
          lineColor: '#64748b',
          secondaryTextColor: '#475569',
          tertiaryTextColor: '#64748b',
          clusterBkg: '#f8fafc',
          clusterBorder: '#cbd5e1',
          defaultLinkColor: '#64748b',
          titleColor: '#64748b',
          edgeLabelBackground: '#ffffff',
          actorBkg: '#f8fafc',
          actorBorder: '#e2e8f0',
          actorTextColor: '#0f172a',
        },
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
          padding: 20,
          nodeSpacing: 48,
          rankSpacing: 64,
          diagramPadding: 16,
          useMaxWidth: true,
        },
      });

      try {
        const { svg } = await mermaid.render(
          `arch-schematic-${stableId}`,
          ARCHITECTURE_FLOWCHART.trim()
        );
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.setAttribute('role', 'img');
            svgEl.setAttribute('focusable', 'false');
          }
        }
      } catch (err) {
        console.error('Mermaid render failed', err);
        if (!cancelled && containerRef.current) {
          containerRef.current.textContent = 'Unable to render diagram.';
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stableId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      {/* Spec-sheet frame: grid texture + inset highlight */}
      <div
        className="pointer-events-none absolute inset-0 rounded-sm opacity-[0.45]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(15 23 42 / 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(15 23 42 / 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/80 to-transparent"
        aria-hidden
      />
      <div
        ref={containerRef}
        className="architecture-mermaid relative flex min-h-[220px] w-full justify-center overflow-x-auto rounded-sm border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-white px-4 py-10 shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.9)] sm:px-8 sm:py-12 [&_svg]:max-h-none [&_svg]:max-w-full [&_svg]:min-w-0"
        aria-label="Architecture schematic flowchart: Next.js UI to LangChain route, then AI Gateway and MCP server"
      />
      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
        Request path · left to right
      </p>
    </motion.div>
  );
}
