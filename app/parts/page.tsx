'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Part {
  _id: string;
  partName: string;
  partNumber: string;
  code?: string;
  quantity: number;
  location: string;
  unitOfMeasure: string;
  partImages?: string[];
  brand?: string;
  description?: string;
  buyingPrice?: number;
  mrp?: number;
  supplier?: string;
  billingDate?: string;
  billImages?: string[];
}

export default function PartsPage() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchParts();
    }
  }, [authenticated, searchQuery]);

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

  const fetchParts = async () => {
    setLoading(true);
    try {
      const url = searchQuery
        ? `/api/parts/search?q=${encodeURIComponent(searchQuery)}`
        : '/api/parts';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch parts');
      }
      const data = await response.json();
      setParts(data.parts || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, partName: string) => {
    if (!confirm(`Are you sure you want to delete "${partName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/parts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete part');
      }

      fetchParts();
    } catch (error) {
      console.error('Error deleting part:', error);
      alert('Failed to delete part. Please try again.');
    }
  };

  const handleAdd = () => {
    router.push('/parts/new');
  };

  if (!authenticated) {
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
          <h1 className="text-3xl font-bold text-gray-900">Parts Inventory</h1>
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Dashboard
            </Link>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Add New Part
            </button>
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

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search parts by name, number, code, brand, supplier, location, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-500">Loading parts...</div>
          </div>
        ) : parts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">
              {searchQuery ? 'No parts found matching your search.' : 'No parts in inventory yet.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleAdd}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Add Your First Part
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {parts.map((part) => (
              <div
                key={part._id}
                onClick={() => router.push(`/parts/${part._id}`)}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden flex flex-col"
              >
                <div className="aspect-square bg-white flex items-center justify-center overflow-hidden relative p-4">
                  {part.partImages && part.partImages.length > 0 ? (
                    <img
                      src={part.partImages[0]}
                      alt={part.partName}
                      className="max-w-full max-h-full w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-gray-400 text-sm">No Image</div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">
                    {part.partName}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600 mb-3 flex-1">
                    <div>Part No.: {part.partNumber}</div>
                    {part.code && <div className="font-mono">Code: {part.code}</div>}
                    {part.brand && <div>Brand: {part.brand}</div>}
                    <div>Location: {part.location}</div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    {part.buyingPrice ? (
                      <div className="text-xl font-bold text-gray-900">
                        ₹{part.buyingPrice.toLocaleString('en-IN')}
                      </div>
                    ) : (
                      <div className="text-lg text-gray-500">No Price</div>
                    )}
                    <div className="text-sm text-gray-500">
                      Qty: {part.quantity} {part.unitOfMeasure}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/parts/${part._id}`);
                      }}
                      className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(part._id, part.partName);
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
