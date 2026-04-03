'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, LogOut, Package, ArrowLeft } from 'lucide-react';

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const showBackButton = pathname === '/parts/new';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/parts?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleBack = () => {
    router.push('/parts');
  };

  return (
    <header
      className="flex h-16 w-full min-w-0 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:gap-3 sm:px-5 lg:px-6"
      style={{
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Mobile / tablet brand (sidebar hidden) — flex-1 + truncate on xs so logout stays on-screen */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-44 sm:flex-none lg:hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
          <Package className="h-4 w-4 text-white" />
        </div>
        <span className="min-w-0 truncate text-sm font-bold text-slate-900">StockRakh</span>
      </div>

      {/* Search */}
      <form
        onSubmit={handleSearch}
        className="mx-auto hidden min-w-0 max-w-xl flex-1 sm:block lg:min-w-48"
      >
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search parts by name, number, code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </form>

      {/* Actions — always full visibility on small screens */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        {showBackButton && (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:px-3"
            title="Back to parts"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex touch-manipulation items-center justify-center gap-1.5 rounded-lg p-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:gap-2 sm:px-3 sm:py-2"
          title="Logout"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
