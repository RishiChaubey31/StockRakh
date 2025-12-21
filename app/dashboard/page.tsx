'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardStats {
  totalParts: number;
  totalValue: number;
  recentActivities: Array<{
    _id: string;
    type: string;
    partName: string;
    partNumber: string;
    details?: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

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
      fetchStats();
    } catch (error) {
      router.push('/login');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex gap-4">
            <Link
              href="/parts"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              See All Parts
            </Link>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Total Parts
            </h2>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.totalParts || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Total Inventory Value
            </h2>
            <p className="text-3xl font-bold text-gray-900">
              {stats ? formatCurrency(stats.totalValue) : '₹0'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Activities
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity) => (
                <div key={activity._id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
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
                      <span className="text-sm text-gray-500">
                        ({activity.partNumber})
                      </span>
                      {activity.details && (
                        <span className="text-sm text-gray-600">
                          - {activity.details}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(activity.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No activities yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
