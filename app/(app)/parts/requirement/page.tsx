'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Download, Printer, CheckSquare, Square, Eye, Package } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { TableRowSkeleton, PartListRowSkeleton } from '@/components/ui/LoadingSkeleton';

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
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set());
  const [groupBySupplier, setGroupBySupplier] = useState(false);
  const partsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
    fetchOutOfStockParts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedSupplier]);

  useEffect(() => {
    fetchOutOfStockParts(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchOutOfStockParts = async (page: number = currentPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: partsPerPage.toString() });
      if (searchQuery) params.append('search', searchQuery);
      if (selectedSupplier !== 'all') params.append('supplier', selectedSupplier);
      const response = await fetch(`/api/parts/out-of-stock?${params.toString()}`);
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setParts(data.parts || []);
      setSuppliers(data.suppliers || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePart = (id: string) => {
    setSelectedParts(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    setSelectedParts(prev => prev.size === parts.length ? new Set() : new Set(parts.map(p => p._id)));
  };

  const generateOrderList = () => {
    if (!selectedParts.size) { alert('Select at least one item'); return; }
    const selected = parts.filter(p => selectedParts.has(p._id));
    const grouped: Record<string, Part[]> = {};
    selected.forEach(p => { const s = p.supplier || 'Unknown Supplier'; (grouped[s] ??= []).push(p); });

    let content = '=== SUPPLIER ORDER LIST ===\n';
    content += `Generated: ${new Date().toLocaleString('en-IN')}\nTotal Items: ${selected.length}\n\n`;
    Object.entries(grouped).forEach(([supplier, items]) => {
      content += `${'='.repeat(50)}\nSUPPLIER: ${supplier}\nItems: ${items.length}\n${'='.repeat(50)}\n\n`;
      items.forEach((item, idx) => {
        content += `${idx + 1}. ${item.partName}\n   Part Number: ${item.partNumber}\n   Location: ${item.location}\n   Unit: ${item.unitOfMeasure}\n`;
        if (item.brand) content += `   Brand: ${item.brand}\n`;
        content += '\n';
      });
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `order-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
  };

  const printOrderList = () => {
    if (!selectedParts.size) { alert('Select at least one item'); return; }
    const selected = parts.filter(p => selectedParts.has(p._id));
    const grouped: Record<string, Part[]> = {};
    selected.forEach(p => { const s = p.supplier || 'Unknown Supplier'; (grouped[s] ??= []).push(p); });

    let html = `<html><head><title>Order List</title><style>
      body{font-family:Arial,sans-serif;padding:20px}
      h1{color:#059669;border-bottom:3px solid #059669;padding-bottom:10px}
      h2{color:#334155;margin-top:30px;border-bottom:2px solid #E2E8F0;padding-bottom:5px}
      .item{margin-bottom:15px;padding:10px;border:1px solid #E2E8F0;border-radius:8px}
      .item-title{font-weight:bold;font-size:15px}
      .item-detail{margin-left:15px;color:#475569;font-size:13px}
      .meta{color:#64748B;margin-bottom:20px}
    </style></head><body>
    <h1>Supplier Order List</h1>
    <div class="meta"><p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</p><p><strong>Total Items:</strong> ${selected.length}</p></div>`;

    Object.entries(grouped).forEach(([supplier, items]) => {
      html += `<h2>${supplier} (${items.length} items)</h2>`;
      items.forEach((item, idx) => {
        html += `<div class="item"><div class="item-title">${idx + 1}. ${item.partName}</div>
          <div class="item-detail">Part Number: ${item.partNumber}</div>
          <div class="item-detail">Location: ${item.location}</div>
          <div class="item-detail">Unit: ${item.unitOfMeasure}</div>
          ${item.brand ? `<div class="item-detail">Brand: ${item.brand}</div>` : ''}</div>`;
      });
    });
    html += '</body></html>';
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 250); }
  };

  const grouped = groupBySupplier
    ? parts.reduce<Record<string, Part[]>>((acc, p) => { const s = p.supplier || 'Unknown'; (acc[s] ??= []).push(p); return acc; }, {})
    : { 'All Items': parts };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Restock Required</h1>
        <p className="text-sm text-slate-500">{pagination ? `${pagination.total} items out of stock` : 'Items with zero quantity'}</p>
      </div>

      {/* Filters - sticky */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-slate-50/95 backdrop-blur-sm space-y-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder="Search parts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-base border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
          </div>
          <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}
            className="w-full px-4 py-3 text-base border border-slate-300 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm">
            <option value="all">All Suppliers</option>
            {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between bg-white rounded-xl border border-slate-200/60 shadow-sm px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={groupBySupplier} onChange={e => setGroupBySupplier(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500" />
              <span className="text-sm font-medium text-slate-700">Group by Supplier</span>
            </label>
            {parts.length > 0 && (
              <button onClick={toggleAll} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                {selectedParts.size === parts.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
            {selectedParts.size > 0 && (
              <span className="text-xs text-slate-500 bg-emerald-50 px-2 py-1 rounded-full font-medium">
                {selectedParts.size} selected
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={generateOrderList} disabled={!selectedParts.size}
              className="btn-primary text-xs sm:text-sm py-2 disabled:bg-slate-200 disabled:text-slate-400">
              <Download className="w-4 h-4" /> Download
            </button>
            <button onClick={printOrderList} disabled={!selectedParts.size}
              className="btn-secondary text-xs sm:text-sm py-2 disabled:opacity-40">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <>
          {/* Desktop skeleton */}
          <div className="hidden sm:block bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
            <table className="min-w-full"><tbody>{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)}</tbody></table>
          </div>
          {/* Mobile skeleton */}
          <div className="sm:hidden space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <PartListRowSkeleton key={i} />)}
          </div>
        </>
      ) : !parts.length ? (
        <EmptyState
          icon={<Package className="w-8 h-8 text-emerald-500" />}
          title={searchQuery || selectedSupplier !== 'all' ? 'No items found' : 'All items in stock!'}
          description={searchQuery || selectedSupplier !== 'all' ? 'Try adjusting filters.' : 'No items with zero quantity.'}
          action={<Link href="/parts" className="btn-primary">View All Parts</Link>}
        />
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-6">
            {groupBySupplier && (
              <h2 className="text-base font-semibold text-slate-900 mb-2">
                {group} <span className="text-sm font-normal text-slate-500">({items.length})</span>
              </h2>
            )}

            {/* Desktop Table */}
            <div className="hidden sm:block bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left w-10">
                      <input type="checkbox" checked={items.every(p => selectedParts.has(p._id))}
                        onChange={() => {
                          const all = items.every(p => selectedParts.has(p._id));
                          const n = new Set(selectedParts);
                          items.forEach(p => all ? n.delete(p._id) : n.add(p._id));
                          setSelectedParts(n);
                        }}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500" />
                    </th>
                    {['Part Name', 'Part Number', 'Supplier', 'Location', 'Unit', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(part => (
                    <tr key={part._id} className={`hover:bg-slate-50 transition-colors ${selectedParts.has(part._id) ? 'bg-emerald-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedParts.has(part._id)} onChange={() => togglePart(part._id)}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-900">{part.partName}</div>
                        {part.brand && <div className="text-xs text-slate-500">{part.brand}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-mono">{part.partNumber}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{part.supplier || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{part.location}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{part.unitOfMeasure}</td>
                      <td className="px-4 py-3">
                        <Link href={`/parts/${part._id}`} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-2">
              {items.map(part => (
                <div
                  key={part._id}
                  className={`bg-white rounded-xl border border-slate-200/60 shadow-sm p-3 flex items-start gap-3 stock-critical ${selectedParts.has(part._id) ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}`}
                  onClick={() => togglePart(part._id)}
                >
                  <div className="pt-0.5">
                    {selectedParts.has(part._id) ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{part.partName}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono">{part.partNumber}</span>
                      {part.brand && <span>{part.brand}</span>}
                      <span>{part.location}</span>
                    </div>
                    {part.supplier && <p className="text-xs text-slate-400 mt-0.5">Supplier: {part.supplier}</p>}
                  </div>
                  <Link href={`/parts/${part._id}`} onClick={e => e.stopPropagation()}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors touch-manipulation">
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={currentPage} totalPages={pagination.totalPages} totalItems={pagination.total}
            itemsPerPage={partsPerPage} onPageChange={setCurrentPage} itemLabel="items" />
        </div>
      )}

      {/* Mobile Sticky Bottom Action Bar */}
      {selectedParts.size > 0 && (
        <div className="sm:hidden fixed bottom-[64px] left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between pb-safe">
          <span className="text-sm font-medium text-slate-700">{selectedParts.size} selected</span>
          <div className="flex gap-2">
            <button onClick={generateOrderList} className="btn-primary text-xs py-2 px-3"><Download className="w-4 h-4" /> Download</button>
            <button onClick={printOrderList} className="btn-secondary text-xs py-2 px-3"><Printer className="w-4 h-4" /> Print</button>
          </div>
        </div>
      )}
    </div>
  );
}
