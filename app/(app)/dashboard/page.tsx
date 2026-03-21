'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  AlertTriangle,
  IndianRupee,
  Clock,
  PlusCircle,
  TrendingUp,
  LayoutGrid,
  ArrowRight,
  PackagePlus,
  PencilLine,
  Trash2,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';
import { StatCardSkeleton, ActivitySkeleton } from '@/components/ui/LoadingSkeleton';
import Pagination from '@/components/ui/Pagination';

interface DashboardStats {
  totalParts: number;
  outOfStockCount: number;
  totalValue: number;
  activities: {
    data: Array<{
      _id: string;
      type: string;
      partName: string;
      partNumber: string;
      details?: string;
      createdAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

const dm = "'DM Sans', ui-sans-serif, system-ui, sans-serif";
const syne = "'Syne', ui-sans-serif, system-ui, sans-serif";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatToday() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityPage, setActivityPage] = useState(1);
  const activitiesPerPage = 10;

  const fetchStats = async (page: number = activityPage) => {
    try {
      const response = await fetch(`/api/dashboard/stats?page=${page}&limit=${activitiesPerPage}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(activityPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityPage]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const getActivityMeta = (type: string) => {
    const map: Record<string, { label: string; className: string; Icon: typeof Package }> = {
      add: {
        label: 'Added',
        className: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/25',
        Icon: PackagePlus,
      },
      edit: {
        label: 'Edited',
        className: 'bg-sky-500/15 text-sky-700 ring-sky-500/25',
        Icon: PencilLine,
      },
      delete: {
        label: 'Deleted',
        className: 'bg-rose-500/15 text-rose-700 ring-rose-500/25',
        Icon: Trash2,
      },
      quantity_change: {
        label: 'Qty change',
        className: 'bg-amber-500/15 text-amber-800 ring-amber-500/25',
        Icon: ArrowLeftRight,
      },
    };
    return (
      map[type] || {
        label: type,
        className: 'bg-slate-500/10 text-slate-700 ring-slate-500/20',
        Icon: Package,
      }
    );
  };

  return (
    <div
      className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8"
      style={{ fontFamily: dm }}
    >
      {/* Hero */}
      <section className="relative mb-8 overflow-hidden rounded-[28px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 shadow-[0_24px_80px_-20px_rgba(15,23,42,0.55)] sm:mb-10 sm:rounded-[32px]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-8 px-6 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:py-10 lg:px-12 lg:py-12">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-emerald-200/90 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
              {greeting()}
            </div>
            <h1
              className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
              style={{ fontFamily: syne }}
            >
              Inventory overview
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
              Alok Automobiles — spare parts, stock levels, and recent movement in one place.
            </p>
            <p className="mt-4 text-xs font-medium text-slate-500 sm:text-sm">{formatToday()}</p>
          </div>

          <div className="flex flex-wrap gap-3 sm:justify-end">
            {loading ? (
              <>
                <div className="h-[72px] w-[100px] animate-pulse rounded-2xl bg-white/10" />
                <div className="h-[72px] w-[100px] animate-pulse rounded-2xl bg-white/10" />
                <div className="h-[72px] min-w-[120px] flex-1 animate-pulse rounded-2xl bg-white/10 sm:flex-none sm:min-w-[140px]" />
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-md">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Parts</p>
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-white" style={{ fontFamily: syne }}>
                    {stats?.totalParts ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 backdrop-blur-md">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-200/80">Out of stock</p>
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-rose-100" style={{ fontFamily: syne }}>
                    {stats?.outOfStockCount ?? 0}
                  </p>
                </div>
                <div className="min-w-[140px] flex-1 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 backdrop-blur-md sm:flex-none sm:min-w-[160px]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200/80">Stock value</p>
                  <p className="mt-0.5 truncate text-lg font-bold tabular-nums text-white sm:text-xl" style={{ fontFamily: syne }}>
                    {stats ? formatCurrency(stats.totalValue) : '₹0'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* KPI cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3 sm:gap-5">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.18)]">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/[0.08] transition-transform duration-500 group-hover:scale-110" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Total parts</p>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums text-slate-900 sm:text-4xl" style={{ fontFamily: syne }}>
                    {stats?.totalParts ?? 0}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">SKUs tracked in inventory</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25">
                  <Package className="h-6 w-6" strokeWidth={2} />
                </div>
              </div>
            </div>

            <Link
              href="/parts/requirement"
              className="group relative block overflow-hidden rounded-2xl border border-rose-200/80 bg-gradient-to-br from-white to-rose-50/80 p-6 shadow-[0_8px_30px_-12px_rgba(225,29,72,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-[0_16px_40px_-16px_rgba(225,29,72,0.2)]"
            >
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-rose-400/10 transition-transform duration-500 group-hover:scale-110" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-600/80">Restock required</p>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums text-rose-600 sm:text-4xl" style={{ fontFamily: syne }}>
                    {stats?.outOfStockCount ?? 0}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-rose-700/90">
                    Review list
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-lg shadow-rose-500/25">
                  <AlertTriangle className="h-6 w-6" strokeWidth={2} />
                </div>
              </div>
            </Link>

            <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.18)]">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sky-500/[0.08] transition-transform duration-500 group-hover:scale-110" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Inventory value</p>
                  <p className="mt-2 truncate text-2xl font-extrabold tabular-nums text-slate-900 sm:text-3xl" style={{ fontFamily: syne }}>
                    {stats ? formatCurrency(stats.totalValue) : '₹0'}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">At buying price × quantity</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 text-white shadow-lg shadow-sky-500/25">
                  <IndianRupee className="h-6 w-6" strokeWidth={2} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-400" style={{ fontFamily: syne }}>
          Quick actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <Link
            href="/parts/new"
            className="group relative flex min-h-[140px] flex-col justify-between overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 text-white shadow-lg shadow-emerald-900/15 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/20 sm:min-h-[160px]"
          >
            <PlusCircle className="h-9 w-9 opacity-90" strokeWidth={1.75} />
            <div className="mt-8">
              <p className="text-base font-bold" style={{ fontFamily: syne }}>
                Add part
              </p>
              <p className="mt-1 text-xs text-emerald-100/90">New SKU, photos & pricing</p>
            </div>
            <ArrowRight className="absolute right-4 top-4 h-5 w-5 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
          </Link>

          <Link
            href="/parts"
            className="group flex min-h-[140px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:min-h-[160px]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-900 group-hover:text-white">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div className="mt-8">
              <p className="text-base font-bold text-slate-900" style={{ fontFamily: syne }}>
                Browse parts
              </p>
              <p className="mt-1 text-xs text-slate-500">Search, grid & list views</p>
            </div>
          </Link>

          <Link
            href="/parts/requirement"
            className="group flex min-h-[140px] flex-col justify-between rounded-2xl border border-rose-200/70 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md sm:min-h-[160px]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition-colors group-hover:bg-rose-600 group-hover:text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="mt-8">
              <p className="text-base font-bold text-slate-900" style={{ fontFamily: syne }}>
                Restock list
              </p>
              <p className="mt-1 text-xs text-slate-500">Items at zero quantity</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Activity */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_40px_-24px_rgba(15,23,42,0.15)] sm:rounded-3xl">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
              <Clock className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl" style={{ fontFamily: syne }}>
                Recent activity
              </h2>
              {stats?.activities.pagination && (
                <p className="text-sm text-slate-500">
                  {stats.activities.pagination.total} events logged
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <ActivitySkeleton key={i} />
              ))}
            </div>
          ) : stats?.activities.data && stats.activities.data.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {stats.activities.data.map(activity => {
                const meta = getActivityMeta(activity.type);
                const Icon = meta.Icon;
                return (
                  <li key={activity._id}>
                    <div className="flex gap-4 px-5 py-4 transition-colors hover:bg-slate-50/90 sm:gap-5 sm:px-8 sm:py-5">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${meta.className}`}
                      >
                        <Icon className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
                          <span className="inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                            {meta.label}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 sm:text-[15px]">{activity.partName}</span>
                          <span className="font-mono text-xs text-slate-400">#{activity.partNumber}</span>
                        </div>
                        {activity.details && (
                          <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">{activity.details}</p>
                        )}
                      </div>
                      <time
                        dateTime={activity.createdAt}
                        className="shrink-0 text-right text-[11px] tabular-nums text-slate-400 sm:text-xs"
                      >
                        {formatDate(activity.createdAt)}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                <Clock className="h-8 w-8" />
              </div>
              <p className="mt-5 text-base font-semibold text-slate-700" style={{ fontFamily: syne }}>
                No activity yet
              </p>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Add or edit parts — changes will show up here as a running log.
              </p>
              <Link href="/parts/new" className="btn-primary mt-6">
                <PlusCircle className="h-4 w-4" />
                Add your first part
              </Link>
            </div>
          )}
        </div>
      </section>

      {stats?.activities.pagination && stats.activities.pagination.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={activityPage}
            totalPages={stats.activities.pagination.totalPages}
            totalItems={stats.activities.pagination.total}
            itemsPerPage={activitiesPerPage}
            onPageChange={setActivityPage}
            itemLabel="activities"
          />
        </div>
      )}
    </div>
  );
}
