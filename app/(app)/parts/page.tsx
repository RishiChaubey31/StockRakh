'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, LayoutGrid, List, Minus, ImageIcon, Package } from 'lucide-react';
import ImageModal from '@/components/parts/ImageModal';
import PartModal from '@/components/parts/PartModal';
import ProductCard from '@/components/parts/ProductCard';
import { useToast } from '@/components/ui/Toast';
import { PartCardSkeleton, PartListRowSkeleton } from '@/components/ui/LoadingSkeleton';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { useDebounce } from '@/hooks/use-debounce';

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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function getStockClass(qty: number) {
  if (qty === 0) return 'stock-critical';
  if (qty === 1) return 'stock-low';
  if (qty === 2) return 'stock-warning';
  return '';
}

export default function PartsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeSearchQuery, setActiveSearchQuery] = useState((searchParams.get('q') || '').trim());
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const partsPerPage = 20;

  const [imageModal, setImageModal] = useState<{
    open: boolean;
    images: string[];
    currentIndex: number;
    partName: string;
    partId: string;
  } | null>(null);

  const [editPart, setEditPart] = useState<Part | null>(null);

  const debouncedSetSearch = useDebounce((value: string) => {
    setActiveSearchQuery(value.trim());
  }, 250);

  useEffect(() => {
    setCurrentPage(1);
    fetchParts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSearchQuery]);

  useEffect(() => {
    fetchParts(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchParts = async (page: number = currentPage) => {
    setLoading(true);
    try {
      const url = activeSearchQuery
        ? `/api/parts/search?q=${encodeURIComponent(activeSearchQuery)}&page=${page}&limit=${partsPerPage}`
        : `/api/parts?page=${page}&limit=${partsPerPage}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch parts');
      const data = await response.json();
      setParts(data.parts || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeEditModal = () => {
    setEditPart(null);
    fetchParts(currentPage);
  };

  const handleDelete = async (id: string, partName: string) => {
    if (!confirm(`Delete "${partName}"? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/parts/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      toast('Part deleted successfully');
      fetchParts();
    } catch {
      toast('Failed to delete part', 'error');
    }
  };

  const handleQuantityChange = async (partId: string, delta: number) => {
    const part = parts.find(p => p._id === partId);
    if (!part) return;
    const newQty = Math.max(0, part.quantity + delta);
    try {
      const response = await fetch(`/api/parts/${partId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...part, quantity: newQty }),
      });
      if (!response.ok) throw new Error('Failed');
      setParts(prev => prev.map(p => p._id === partId ? { ...p, quantity: newQty } : p));
      toast(`Quantity updated to ${newQty}`);
    } catch {
      toast('Failed to update quantity', 'error');
    }
  };

  const handleImageClick = (e: React.MouseEvent, part: Part) => {
    e.stopPropagation();
    if (part.partImages?.length) {
      setImageModal({ open: true, images: part.partImages, currentIndex: 0, partName: part.partName, partId: part._id });
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!imageModal) return;
    const part = parts.find(p => p._id === imageModal.partId);
    if (!part) return;
    const updated = part.partImages?.filter(img => img !== imageUrl) || [];
    try {
      await fetch(`/api/parts/${imageModal.partId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...part, partImages: updated }),
      });
      if (updated.length === 0) {
        setImageModal(null);
      } else {
        setImageModal({ ...imageModal, images: updated, currentIndex: Math.min(imageModal.currentIndex, updated.length - 1) });
      }
      fetchParts();
    } catch {
      toast('Failed to delete image', 'error');
    }
  };

  const handleAddImages = async (files: File[]) => {
    if (!imageModal) return;
    const part = parts.find(p => p._id === imageModal.partId);
    if (!part) return;
    const urls = await Promise.all(files.map(async file => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'parts');
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      return (await res.json()).url;
    }));
    const updated = [...(part.partImages || []), ...urls];
    await fetch(`/api/parts/${imageModal.partId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...part, partImages: updated }),
    });
    setImageModal({ ...imageModal, images: updated });
    fetchParts();
  };

  const priceDisplay = (part: Part) => {
    if (part.mrp) return `Rs ${part.mrp.toLocaleString('en-IN')}`;
    if (part.buyingPrice) return `Rs ${part.buyingPrice.toLocaleString('en-IN')}`;
    return '-';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Parts Inventory</h1>
          <p className="text-sm text-slate-500">{pagination ? `${pagination.total} total parts` : 'Manage your parts'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100'}`}
            title="Grid view"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100'}`}
            title="List view"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-slate-50/95 backdrop-blur-sm mb-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, number, code, brand..."
            value={searchQuery}
            onChange={(e) => {
              const value = e.target.value;
              setSearchQuery(value);
              debouncedSetSearch(value);
            }}
            className="block w-full pl-11 pr-4 py-3 text-base border border-slate-300 rounded-xl placeholder-slate-400 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <PartCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <PartListRowSkeleton key={i} />)}
          </div>
        )
      ) : parts.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8 text-slate-400" />}
          title={activeSearchQuery ? 'No parts found' : 'No parts in inventory'}
          description={activeSearchQuery ? 'Try adjusting your search terms.' : 'Get started by adding your first part.'}
          action={!activeSearchQuery ? (
            <button onClick={() => router.push('/parts/new')} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Your First Part
            </button>
          ) : undefined}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {parts.map(part => (
            <div key={part._id} className={`rounded-[22px] overflow-hidden ${getStockClass(part.quantity)}`}>
              <ProductCard
                part={part}
                onCardClick={() => router.push(`/parts/${part._id}`)}
                onEdit={(p: Part) => setEditPart(p)}
                onDelete={(p: Part) => handleDelete(p._id, p.partName)}
                onQuantityChange={handleQuantityChange}
                onImageClick={
                  part.partImages?.length
                    ? (imageIndex: number) =>
                        setImageModal({
                          open: true,
                          images: part.partImages!,
                          currentIndex: imageIndex,
                          partName: part.partName,
                          partId: part._id,
                        })
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {parts.map(part => (
            <div
              key={part._id}
              onClick={() => router.push(`/parts/${part._id}`)}
              className={`bg-white rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all cursor-pointer p-3 flex items-center gap-3 ${getStockClass(part.quantity)}`}
            >
              <div
                className="w-16 h-16 bg-slate-50 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                onClick={e => handleImageClick(e, part)}
              >
                {part.partImages?.length ? (
                  <img src={part.partImages[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-300" />
                )}
              </div>

              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{part.partName}</h3>
                  {part.brand && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">{part.brand}</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 min-w-0">
                  <span className="truncate">{part.partNumber}</span>
                  <span className="truncate">{part.location}</span>
                  <span className="font-semibold text-emerald-700 flex-shrink-0">{priceDisplay(part)}</span>
                </div>
              </div>

              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden flex-shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => handleQuantityChange(part._id, -1)}
                  disabled={part.quantity === 0}
                  className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors touch-manipulation"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 h-8 flex items-center justify-center text-sm font-semibold text-slate-900 border-x border-slate-200">
                  {part.quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(part._id, 1)}
                  className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors touch-manipulation"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={partsPerPage}
            onPageChange={setCurrentPage}
            itemLabel="parts"
          />
        </div>
      )}

      {imageModal?.open && (
        <ImageModal
          images={imageModal.images}
          currentIndex={imageModal.currentIndex}
          partName={imageModal.partName}
          partId={imageModal.partId}
          onClose={() => setImageModal(null)}
          onDelete={handleDeleteImage}
          onAddImages={handleAddImages}
          isEditable={true}
        />
      )}

      {editPart && (
        <PartModal part={editPart} onClose={closeEditModal} presentation="modal" />
      )}
    </div>
  );
}
