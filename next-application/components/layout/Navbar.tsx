'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain } from 'lucide-react';

const navItems = [
  { name: 'Home', href: '/' },
  { name: 'Playground', href: '/chat' },
  { name: 'Observability', href: '/observability' },
  { name: 'Architecture', href: '/architecture' },
  { name: 'Chat Flow Diagram', href: '/flow' },
];

export default function Navbar() {
  const pathname = usePathname();
  const showSettings = process.env.NEXT_PUBLIC_ALLOW_PROMPT_EDITOR === 'true';
  const displayedNavItems = showSettings
    ? [...navItems, { name: 'Settings', href: '/settings' }]
    : navItems;

  return (
    <nav className="w-full bg-transparent">
      <div className="flex h-14 w-full items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-12">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-1.5 rounded-lg bg-slate-950 text-white group-hover:scale-110 transition-transform duration-300">
              <Brain className="h-4 w-4" />
            </div>
            <span className="text-sm font-outfit font-semibold tracking-tight text-slate-950">
              IB AI Assistant
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {displayedNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-xs font-mono transition-colors tracking-widest uppercase ${
                    isActive ? 'text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-5 sm:flex">
          <a
            href="https://github.com/sibtihaj/ai-incident-assistant/tree/main"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono tracking-widest text-slate-400 uppercase transition-colors hover:text-slate-900"
          >
            GitHub
          </a>
          <a
            href="https://syedibtihaj.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono tracking-widest text-slate-400 uppercase transition-colors hover:text-slate-900"
          >
            Portfolio
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
            Operational
          </span>
        </div>
      </div>
    </nav>
  );
}
