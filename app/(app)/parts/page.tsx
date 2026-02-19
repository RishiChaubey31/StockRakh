'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, LayoutGrid, List, Minus, ImageIcon, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import ImageModal from '@/components/parts/ImageModal';
import { useToast } from '@/components/ui/Toast';
import { PartCardSkeleton, PartListRowSkeleton } from '@/components/ui/LoadingSkeleton';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

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

  const [editingQuantity, setEditingQuantity] = useState<Record<string, string>>({});
  const [cardImageIndices, setCardImageIndices] = useState<Record<string, number>>({});
  const [touchStart, setTouchStart] = useState<Record<string, number>>({});
  const [touchEnd, setTouchEnd] = useState<Record<string, number>>({});

  const goToImage = (partId: string, idx: number) => {
    setCardImageIndices(prev => ({ ...prev, [partId]: idx }));
  };

  const handleSwipe = (partId: string, imagesLen: number) => {
    const start = touchStart[partId];
    const end = touchEnd[partId];
    if (!start || !end) return;
    const distance = start - end;
    const current = cardImageIndices[partId] || 0;
    if (distance > 50) {
      goToImage(partId, current < imagesLen - 1 ? current + 1 : 0);
    } else if (distance < -50) {
      goToImage(partId, current > 0 ? current - 1 : imagesLen - 1);
    }
    setTouchStart(prev => ({ ...prev, [partId]: 0 }));
    setTouchEnd(prev => ({ ...prev, [partId]: 0 }));
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchParts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    fetchParts(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchParts = async (page: number = currentPage) => {
    setLoading(true);
    try {
      const url = searchQuery
        ? `/api/parts/search?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=${partsPerPage}`
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

  const handleQuantityInput = async (partId: string, currentQty: number) => {
    const val = editingQuantity[partId];
    if (val !== undefined && val !== '') {
      const newQty = parseInt(val, 10);
      if (!isNaN(newQty) && newQty >= 0 && newQty !== currentQty) {
        const part = parts.find(p => p._id === partId);
        if (!part) return;
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
      }
    }
    setEditingQuantity(prev => {
      const n = { ...prev };
      delete n[partId];
      return n;
    });
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
      if (updated.length === 0) { setImageModal(null); fetchParts(); }
      else { setImageModal({ ...imageModal, images: updated, currentIndex: Math.min(imageModal.currentIndex, updated.length - 1) }); fetchParts(); }
    } catch { toast('Failed to delete image', 'error'); }
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
    if (part.mrp) return `₹${part.mrp.toLocaleString('en-IN')}`;
    if (part.buyingPrice) return `₹${part.buyingPrice.toLocaleString('en-IN')}`;
    return '—';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
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

      {/* Search - sticky */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-slate-50/95 backdrop-blur-sm mb-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, number, code, brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 text-base border border-slate-300 rounded-xl placeholder-slate-400 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Content */}
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
          title={searchQuery ? 'No parts found' : 'No parts in inventory'}
          description={searchQuery ? 'Try adjusting your search terms.' : 'Get started by adding your first part.'}
          action={!searchQuery ? (
            <button onClick={() => router.push('/parts/new')} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Your First Part
            </button>
          ) : undefined}
        />
      ) : viewMode === 'grid' ? (
        /* ===== GRID VIEW ===== */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {parts.map(part => (
            <div
              key={part._id}
              onClick={() => router.push(`/parts/${part._id}`)}
              className={`bg-white rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col ${getStockClass(part.quantity)}`}
            >
              {/* Image Carousel */}
              {part.partImages && part.partImages.length > 1 ? (
                <div
                  className="h-40 bg-slate-50 overflow-hidden relative group border-b border-slate-100"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Sliding track: each child is exactly 100% of the container */}
                  <div
                    className="h-full flex transition-transform duration-300 ease-in-out"
                    style={{ transform: `translateX(-${(cardImageIndices[part._id] || 0) * 100}%)` }}
                    onTouchStart={e => setTouchStart(prev => ({ ...prev, [part._id]: e.targetTouches[0].clientX }))}
                    onTouchMove={e => setTouchEnd(prev => ({ ...prev, [part._id]: e.targetTouches[0].clientX }))}
                    onTouchEnd={() => handleSwipe(part._id, part.partImages!.length)}
                  >
                    {part.partImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="w-full h-full shrink-0 flex items-center justify-center cursor-pointer"
                        onClick={() => setImageModal({ open: true, images: part.partImages!, currentIndex: idx, partName: part.partName, partId: part._id })}
                      >
                        <img src={img} alt={`${part.partName} ${idx + 1}`} className="max-w-full max-h-full object-contain p-2" />
                      </div>
                    ))}
                  </div>

                  {/* Prev / Next arrows */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      const cur = cardImageIndices[part._id] || 0;
                      goToImage(part._id, cur > 0 ? cur - 1 : part.partImages!.length - 1);
                    }}
                    className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      const cur = cardImageIndices[part._id] || 0;
                      goToImage(part._id, cur < part.partImages!.length - 1 ? cur + 1 : 0);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Dot indicators */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                    {part.partImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={e => { e.stopPropagation(); goToImage(part._id, idx); }}
                        className={`rounded-full transition-all touch-manipulation ${
                          (cardImageIndices[part._id] || 0) === idx
                            ? 'bg-white w-4 h-1.5'
                            : 'bg-white/50 hover:bg-white/75 w-1.5 h-1.5'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Counter badge */}
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full z-10">
                    {(cardImageIndices[part._id] || 0) + 1} / {part.partImages.length}
                  </div>
                </div>
              ) : (
                <div
                  className="h-40 bg-slate-50 flex items-center justify-center overflow-hidden relative group border-b border-slate-100"
                  onClick={e => handleImageClick(e, part)}
                >
                  {part.partImages?.length === 1 ? (
                    <img src={part.partImages[0]} alt={part.partName} className="max-w-full max-h-full object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-300">
                      <ImageIcon className="w-10 h-10 mb-1" />
                      <span className="text-xs">No Image</span>
                    </div>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="p-3 flex-1 flex flex-col">
                <h3 className="text-sm font-semibold text-slate-900 line-clamp-1 mb-2">{part.partName}</h3>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 mb-3">
                  <div><span className="text-slate-400">Part#</span> {part.partNumber}</div>
                  {part.code && <div className="font-mono"><span className="text-slate-400 font-sans">Code</span> {part.code}</div>}
                  {part.brand && <div><span className="text-slate-400">Brand</span> {part.brand}</div>}
                  <div><span className="text-slate-400">Loc</span> {part.location}</div>
                  <div className="col-span-2">
                    <span className="text-slate-400">MRP</span>{' '}
                    <span className="font-semibold text-emerald-700">{priceDisplay(part)}</span>
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-slate-400">Qty:</span>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleQuantityChange(part._id, -1)}
                      disabled={part.quantity === 0}
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors touch-manipulation"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editingQuantity[part._id] ?? part.quantity}
                      onChange={e => {
                        if (e.target.value === '' || /^\d+$/.test(e.target.value))
                          setEditingQuantity(prev => ({ ...prev, [part._id]: e.target.value }));
                      }}
                      onBlur={() => handleQuantityInput(part._id, part.quantity)}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      onFocus={e => e.target.select()}
                      className="w-12 h-8 text-center text-sm font-semibold text-slate-900 border-x border-slate-200 focus:outline-none focus:bg-emerald-50"
                    />
                    <button
                      onClick={() => handleQuantityChange(part._id, 1)}
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors touch-manipulation"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400">{part.unitOfMeasure}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={e => { e.stopPropagation(); router.push(`/parts/${part._id}`); }}
                    className="flex-1 bg-emerald-600 text-white py-2 px-3 rounded-lg hover:bg-emerald-700 transition-colors text-xs font-semibold touch-manipulation flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> Details
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(part._id, part.partName); }}
                    className="px-2.5 py-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors touch-manipulation border border-rose-200"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ===== LIST VIEW ===== */
        <div className="space-y-2">
          {parts.map(part => (
            <div
              key={part._id}
              onClick={() => router.push(`/parts/${part._id}`)}
              className={`bg-white rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all cursor-pointer p-3 flex items-center gap-3 ${getStockClass(part.quantity)}`}
            >
              {/* Thumbnail */}
              <div
                className="w-14 h-14 bg-slate-50 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                onClick={e => handleImageClick(e, part)}
              >
                {part.partImages?.length ? (
                  <img src={part.partImages[0]} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-300" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{part.partName}</h3>
                  {part.brand && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{part.brand}</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span>{part.partNumber}</span>
                  <span>{part.location}</span>
                  <span className="font-semibold text-emerald-700">{priceDisplay(part)}</span>
                </div>
              </div>

              {/* Quantity Stepper */}
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

      {/* Pagination */}
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

      {/* FAB on mobile */}
      <button
        onClick={() => router.push('/parts/new')}
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-600/30 flex items-center justify-center hover:bg-emerald-700 active:bg-emerald-800 transition-colors touch-manipulation z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Image Modal */}
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
    </div>
  );
}
