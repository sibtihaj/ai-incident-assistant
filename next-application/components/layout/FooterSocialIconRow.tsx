import { Github, Globe } from 'lucide-react';

const GITHUB_HREF =
  'https://github.com/sibtihaj/ai-incident-assistant/tree/main';
const PORTFOLIO_HREF = 'https://syedibtihaj.com';

const circleClass =
  'flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm transition-colors group-hover:border-slate-900 group-hover:bg-slate-950 group-hover:text-white';

const labelClass =
  'text-center text-[10px] font-mono uppercase tracking-widest text-slate-500';

export default function FooterSocialIconRow() {
  return (
    <div className="flex justify-center gap-10 p-0 pt-6">
      <a
        href={GITHUB_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col items-center gap-2 rounded-sm no-underline outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900"
      >
        <span className={circleClass}>
          <Github className="h-8 w-8" strokeWidth={1.5} aria-hidden />
        </span>
        <span className={labelClass}>GitHub repo</span>
      </a>
      <a
        href={PORTFOLIO_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col items-center gap-2 rounded-sm no-underline outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900"
      >
        <span className={circleClass}>
          <Globe className="h-8 w-8" strokeWidth={1.5} aria-hidden />
        </span>
        <span className={labelClass}>Portfolio</span>
      </a>
    </div>
  );
}
