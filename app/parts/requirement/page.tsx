'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Part {
  _id: string;
  partName: string;
  partNumber: string;
  location: string;
  unitOfMeasure: string;
  supplier?: string;
  brand?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function RequirementPage() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set());
  const [groupBySupplier, setGroupBySupplier] = useState(false);
  const partsPerPage = 50;

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated) {
      setCurrentPage(1);
      fetchOutOfStockParts(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, searchQuery, selectedSupplier]);

  useEffect(() => {
    if (authenticated) {
      fetchOutOfStockParts(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

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

  const fetchOutOfStockParts = async (page: number = currentPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: partsPerPage.toString(),
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (selectedSupplier !== 'all') {
        params.append('supplier', selectedSupplier);
      }

      const response = await fetch(`/api/parts/out-of-stock?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch out-of-stock parts');
      }
      const data = await response.json();
      setParts(data.parts || []);
      setSuppliers(data.suppliers || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching out-of-stock parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePartSelection = (partId: string) => {
    setSelectedParts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(partId)) {
        newSet.delete(partId);
      } else {
        newSet.add(partId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedParts.size === parts.length) {
      setSelectedParts(new Set());
    } else {
      setSelectedParts(new Set(parts.map(p => p._id)));
    }
  };

  const generateSupplierOrderList = () => {
    if (selectedParts.size === 0) {
      alert('Please select at least one item to generate order list');
      return;
    }

    const selectedItems = parts.filter(p => selectedParts.has(p._id));
    
    // Group by supplier
    const ordersBySupplier: Record<string, Part[]> = {};
    selectedItems.forEach(part => {
      const supplier = part.supplier || 'Unknown Supplier';
      if (!ordersBySupplier[supplier]) {
        ordersBySupplier[supplier] = [];
      }
      ordersBySupplier[supplier].push(part);
    });

    // Generate text content
    let content = '=== SUPPLIER ORDER LIST ===\n';
    content += `Generated: ${new Date().toLocaleString('en-IN')}\n`;
    content += `Total Items: ${selectedItems.length}\n\n`;

    Object.entries(ordersBySupplier).forEach(([supplier, items]) => {
      content += `\n${'='.repeat(60)}\n`;
      content += `SUPPLIER: ${supplier}\n`;
      content += `Items: ${items.length}\n`;
      content += `${'='.repeat(60)}\n\n`;

      items.forEach((item, idx) => {
        content += `${idx + 1}. ${item.partName}\n`;
        content += `   Part Number: ${item.partNumber}\n`;
        content += `   Location: ${item.location}\n`;
        content += `   Unit: ${item.unitOfMeasure}\n`;
        if (item.brand) content += `   Brand: ${item.brand}\n`;
        content += `\n`;
      });
    });

    // Download as text file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-order-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const printOrderList = () => {
    if (selectedParts.size === 0) {
      alert('Please select at least one item to print');
      return;
    }

    const selectedItems = parts.filter(p => selectedParts.has(p._id));
    
    // Group by supplier
    const ordersBySupplier: Record<string, Part[]> = {};
    selectedItems.forEach(part => {
      const supplier = part.supplier || 'Unknown Supplier';
      if (!ordersBySupplier[supplier]) {
        ordersBySupplier[supplier] = [];
      }
      ordersBySupplier[supplier].push(part);
    });

    // Generate HTML for printing
    let html = `
      <html>
        <head>
          <title>Supplier Order List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 3px solid #4F46E5; padding-bottom: 10px; }
            h2 { color: #4F46E5; margin-top: 30px; border-bottom: 2px solid #E5E7EB; padding-bottom: 5px; }
            .meta { color: #666; margin-bottom: 20px; }
            .item { margin-bottom: 20px; padding: 10px; border: 1px solid #E5E7EB; border-radius: 5px; }
            .item-title { font-weight: bold; color: #1F2937; font-size: 16px; }
            .item-detail { margin-left: 15px; color: #4B5563; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Supplier Order List</h1>
          <div class="meta">
            <p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</p>
            <p><strong>Total Items:</strong> ${selectedItems.length}</p>
          </div>
    `;

    Object.entries(ordersBySupplier).forEach(([supplier, items]) => {
      html += `
        <h2>Supplier: ${supplier} (${items.length} items)</h2>
      `;

      items.forEach((item, idx) => {
        html += `
          <div class="item">
            <div class="item-title">${idx + 1}. ${item.partName}</div>
            <div class="item-detail">Part Number: ${item.partNumber}</div>
            <div class="item-detail">Location: ${item.location}</div>
            <div class="item-detail">Unit of Measure: ${item.unitOfMeasure}</div>
            ${item.brand ? `<div class="item-detail">Brand: ${item.brand}</div>` : ''}
          </div>
        `;
      });
    });

    html += `
        </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const getGroupedParts = () => {
    if (!groupBySupplier) return { 'All Items': parts };

    const grouped: Record<string, Part[]> = {};
    parts.forEach(part => {
      const supplier = part.supplier || 'Unknown Supplier';
      if (!grouped[supplier]) {
        grouped[supplier] = [];
      }
      grouped[supplier].push(part);
    });

    return grouped;
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  const groupedParts = getGroupedParts();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Restock Required</h1>
              <p className="mt-1 text-sm text-gray-500">
                {pagination ? `${pagination.total} items out of stock` : 'Items with zero quantity'}
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Link
                href="/parts"
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium sm:font-semibold rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation whitespace-nowrap"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="hidden sm:inline">All Parts</span>
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium sm:font-semibold rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation whitespace-nowrap"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <button
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  router.push('/login');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium sm:font-semibold rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation whitespace-nowrap"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Filters and Actions */}
        <div className="mb-6 space-y-4">
          {/* Search and Supplier Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by part name or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-12 pr-4 py-3.5 text-base border border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>

            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="block w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map(supplier => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupBySupplier}
                  onChange={(e) => setGroupBySupplier(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Group by Supplier</span>
              </label>

              {parts.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {selectedParts.size === parts.length ? 'Deselect All' : 'Select All'}
                </button>
              )}

              {selectedParts.size > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedParts.size} item{selectedParts.size !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={generateSupplierOrderList}
                disabled={selectedParts.size === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download List
              </button>
              <button
                onClick={printOrderList}
                disabled={selectedParts.size === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="animate-spin h-10 w-10 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-500">Loading out-of-stock items...</p>
          </div>
        ) : parts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || selectedSupplier !== 'all' ? 'No items found' : 'All items in stock!'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || selectedSupplier !== 'all' 
                ? 'Try adjusting your filters.' 
                : 'There are no items with zero quantity.'}
            </p>
            <Link
              href="/parts"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm"
            >
              View All Parts
            </Link>
          </div>
        ) : (
          <>
            {Object.entries(groupedParts).map(([groupName, groupParts]) => (
              <div key={groupName} className="mb-6">
                {groupBySupplier && (
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 px-2">
                    {groupName} <span className="text-sm font-normal text-gray-500">({groupParts.length} items)</span>
                  </h2>
                )}

                <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={groupParts.every(p => selectedParts.has(p._id))}
                              onChange={() => {
                                const allSelected = groupParts.every(p => selectedParts.has(p._id));
                                const newSet = new Set(selectedParts);
                                groupParts.forEach(p => {
                                  if (allSelected) {
                                    newSet.delete(p._id);
                                  } else {
                                    newSet.add(p._id);
                                  }
                                });
                                setSelectedParts(newSet);
                              }}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Part Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Part Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Supplier
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {groupParts.map((part) => (
                          <tr 
                            key={part._id}
                            className={`hover:bg-gray-50 ${selectedParts.has(part._id) ? 'bg-indigo-50' : ''}`}
                          >
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedParts.has(part._id)}
                                onChange={() => togglePartSelection(part._id)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{part.partName}</div>
                              {part.brand && (
                                <div className="text-xs text-gray-500">{part.brand}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 font-mono">{part.partNumber}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{part.supplier || '—'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{part.location}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{part.unitOfMeasure}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Link
                                href={`/parts/${part._id}`}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                View Details
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between bg-white rounded-xl border border-gray-200 shadow-md px-5 sm:px-6 py-4 gap-4">
            <div className="text-sm text-gray-600 text-center sm:text-left">
              Showing <span className="font-medium text-gray-900">{((currentPage - 1) * partsPerPage) + 1}</span> - <span className="font-medium text-gray-900">{Math.min(currentPage * partsPerPage, pagination.total)}</span> of <span className="font-medium text-gray-900">{pagination.total}</span> items
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <span className="text-sm font-medium text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
                {currentPage} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                disabled={currentPage >= pagination.totalPages}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
