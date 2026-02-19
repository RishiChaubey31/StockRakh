'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, AlertTriangle, IndianRupee, Clock, PlusCircle, TrendingUp } from 'lucide-react';
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
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

  const getActivityLabel = (type: string) => {
    const labels: Record<string, string> = {
      add: 'Added',
      edit: 'Edited',
      delete: 'Deleted',
      quantity_change: 'Qty Changed',
    };
    return labels[type] || type;
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      add: 'bg-emerald-100 text-emerald-800',
      edit: 'bg-sky-100 text-sky-800',
      delete: 'bg-rose-100 text-rose-800',
      quantity_change: 'bg-amber-100 text-amber-800',
    };
    return colors[type] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome back to Alok Automobiles Inventory</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            {/* Total Parts */}
            <div className="stat-card stat-card-emerald">
              <div className="flex items-start justify-between">
                <div className="pl-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Parts</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.totalParts || 0}</p>
                  <p className="mt-1 text-xs text-slate-500">items in inventory</p>
                </div>
                <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Restock Required */}
            <Link href="/parts/requirement" className="stat-card stat-card-rose hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="pl-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Restock Required</p>
                  <p className="mt-2 text-3xl font-bold text-rose-600">{stats?.outOfStockCount || 0}</p>
                  <p className="mt-1 text-xs text-slate-500">items out of stock</p>
                </div>
                <div className="w-11 h-11 bg-rose-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
              </div>
            </Link>

            {/* Total Value */}
            <div className="stat-card stat-card-sky">
              <div className="flex items-start justify-between">
                <div className="pl-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Inventory Value</p>
                  <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
                    {stats ? formatCurrency(stats.totalValue) : '₹0'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">combined value</p>
                </div>
                <div className="w-11 h-11 bg-sky-100 rounded-xl flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-sky-600" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/parts/new"
          className="flex items-center gap-3 p-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <PlusCircle className="w-5 h-5" />
          <div>
            <p className="text-sm font-semibold">Add New Part</p>
            <p className="text-xs text-emerald-200">Create inventory item</p>
          </div>
        </Link>
        <Link
          href="/parts/requirement"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200/60 text-slate-900 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          <TrendingUp className="w-5 h-5 text-rose-500" />
          <div>
            <p className="text-sm font-semibold">View Restock</p>
            <p className="text-xs text-slate-500">Out of stock items</p>
          </div>
        </Link>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Activities</h2>
            {stats?.activities.pagination && (
              <p className="text-xs text-slate-500">
                {stats.activities.pagination.total} total activities
              </p>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <ActivitySkeleton key={i} />)
          ) : stats?.activities.data && stats.activities.data.length > 0 ? (
            stats.activities.data.map((activity) => (
              <div key={activity._id} className="px-5 sm:px-6 py-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${getActivityColor(activity.type)}`}>
                      {getActivityLabel(activity.type)}
                    </span>
                    <span className="text-sm font-medium text-slate-900">{activity.partName}</span>
                    <span className="text-xs text-slate-400">({activity.partNumber})</span>
                  </div>
                  <span className="text-xs text-slate-400 sm:ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(activity.createdAt)}
                  </span>
                </div>
                {activity.details && (
                  <p className="text-xs text-slate-500 mt-1 pl-0 sm:pl-0">{activity.details}</p>
                )}
              </div>
            ))
          ) : (
            <div className="px-5 sm:px-6 py-12 text-center">
              <Clock className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm">No activities yet</p>
              <p className="text-xs text-slate-400 mt-1">Activities will appear here as you make changes</p>
            </div>
          )}
        </div>

        {stats?.activities.pagination && stats.activities.pagination.totalPages > 1 && (
          <div className="border-t border-slate-200 p-4">
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
    </div>
  );
}
