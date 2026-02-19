'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/parts', label: 'All Parts', icon: Package },
  { href: '/parts/new', label: 'Add Part', icon: PlusCircle },
  { href: '/parts/requirement', label: 'Restock', icon: AlertTriangle },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/parts') return pathname === '/parts';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`hidden lg:flex flex-col bg-slate-900 text-white transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[256px]'
      }`}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800 flex-shrink-0">
        <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Package className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight truncate">StockRakh</h1>
            <p className="text-[11px] text-slate-400 truncate">Alok Automobiles</p>
          </div>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(item => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-3 pb-4">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-5 h-5 mx-auto" />
          ) : (
            <>
              <PanelLeftClose className="w-5 h-5 flex-shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
