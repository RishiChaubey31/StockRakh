'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardStats {
  totalParts: number;
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
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const activitiesPerPage = 10;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      if (!data.authenticated) {
        router.push('/login');
        return;
      }
      
      setAuthenticated(true);
    } catch (error) {
      router.push('/login');
    }
  };

  const fetchStats = async (page: number = activityPage) => {
    try {
      const response = await fetch(`/api/dashboard/stats?page=${page}&limit=${activitiesPerPage}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchStats(activityPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityPage, authenticated]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const getActivityLabel = (type: string) => {
    const labels: Record<string, string> = {
      add: 'Added',
      edit: 'Edited',
      delete: 'Deleted',
      quantity_change: 'Quantity Changed',
    };
    return labels[type] || type;
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      add: 'bg-green-100 text-green-800',
      edit: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      quantity_change: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (!authenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Link
              href="/parts"
              className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-indigo-600 text-white rounded-md hover:bg-indigo-700 active:bg-indigo-800 touch-manipulation"
            >
              See All Parts
            </Link>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
              }}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-600 text-white rounded-md hover:bg-gray-700 active:bg-gray-800 touch-manipulation"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
              Total Parts
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {stats?.totalParts || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
              Total Inventory Value
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {stats ? formatCurrency(stats.totalValue) : '₹0'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Recent Activities
            </h2>
            {stats?.activities.pagination && (
              <span className="text-xs sm:text-sm text-gray-500">
                Showing {((activityPage - 1) * activitiesPerPage) + 1} - {Math.min(activityPage * activitiesPerPage, stats.activities.pagination.total)} of {stats.activities.pagination.total}
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-200">
            {stats?.activities.data && stats.activities.data.length > 0 ? (
              stats.activities.data.map((activity) => (
                <div key={activity._id} className="px-4 sm:px-6 py-3 sm:py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getActivityColor(
                          activity.type
                        )}`}
                      >
                        {getActivityLabel(activity.type)}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {activity.partName}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-500">
                        ({activity.partNumber})
                      </span>
                      {activity.details && (
                        <span className="text-xs sm:text-sm text-gray-600">
                          - {activity.details}
                        </span>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm text-gray-500">
                      {formatDate(activity.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 sm:px-6 py-8 text-center text-gray-500">
                No activities yet
              </div>
            )}
          </div>
          {stats?.activities.pagination && stats.activities.pagination.totalPages > 1 && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => setActivityPage(prev => Math.max(1, prev - 1))}
                disabled={activityPage === 1}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
              >
                Previous
              </button>
              <span className="text-xs sm:text-sm text-gray-700">
                {activityPage}/{stats.activities.pagination.totalPages}
              </span>
              <button
                onClick={() => setActivityPage(prev => Math.min(stats.activities.pagination.totalPages, prev + 1))}
                disabled={activityPage >= stats.activities.pagination.totalPages}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
