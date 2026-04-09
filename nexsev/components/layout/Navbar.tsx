'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: 'Index', href: '/' },
  { name: 'Workspace', href: '/chat' },
  { name: 'Architecture', href: '/architecture' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-3 w-3 bg-slate-950 rounded-sm" aria-hidden />
            <span className="text-sm font-outfit font-semibold tracking-tight text-slate-950">
              IB AI Assistant
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
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

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
              Operational
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
