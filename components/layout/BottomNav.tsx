'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, PlusCircle, AlertTriangle } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/parts', label: 'Parts', icon: Package },
  { href: '/parts/new', label: 'Add', icon: PlusCircle, accent: true },
  { href: '/parts/requirement', label: 'Restock', icon: AlertTriangle },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/parts') return pathname === '/parts';
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map(item => {
          const active = isActive(item.href);
          if (item.accent) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-600/30">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] font-medium text-emerald-700 mt-0.5">{item.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 min-w-[64px] ${
                active ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              <item.icon className={`w-5 h-5 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className={`text-[10px] font-medium ${active ? 'text-emerald-600' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
