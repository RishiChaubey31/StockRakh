'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageModal from '@/components/parts/ImageModal';

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

export default function PartsPage() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const partsPerPage = 20;
  const [imageModal, setImageModal] = useState<{
    open: boolean;
    images: string[];
    currentIndex: number;
    partName: string;
    partId: string;
  } | null>(null);
  const [cardImageIndices, setCardImageIndices] = useState<Record<string, number>>({});
  const [touchStart, setTouchStart] = useState<Record<string, number>>({});
  const [touchEnd, setTouchEnd] = useState<Record<string, number>>({});
  const [editingQuantity, setEditingQuantity] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ 
    show: false, 
    message: '', 
    type: 'success' 
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated) {
      setCurrentPage(1); // Reset to page 1 when search changes
      fetchParts(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, searchQuery]);

  useEffect(() => {
    if (authenticated) {
      fetchParts(currentPage);
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

  const fetchParts = async (page: number = currentPage) => {
    setLoading(true);
    try {
      const url = searchQuery
        ? `/api/parts/search?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=${partsPerPage}`
        : `/api/parts?page=${page}&limit=${partsPerPage}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch parts');
      }
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

  const handleImageClick = (e: React.MouseEvent, part: Part) => {
    e.stopPropagation();
    if (part.partImages && part.partImages.length > 0) {
      setImageModal({
        open: true,
        images: part.partImages,
        currentIndex: 0,
        partName: part.partName,
        partId: part._id,
      });
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!imageModal) return;

    try {
      // Get current part
      const part = parts.find((p) => p._id === imageModal.partId);
      if (!part) return;

      // Remove image from part
      const updatedImages = part.partImages?.filter((img) => img !== imageUrl) || [];

      const response = await fetch(`/api/parts/${imageModal.partId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...part,
          partImages: updatedImages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      // Update local state
      if (updatedImages.length === 0) {
        setImageModal(null);
        fetchParts();
      } else {
        setImageModal({
          ...imageModal,
          images: updatedImages,
          currentIndex: Math.min(imageModal.currentIndex, updatedImages.length - 1),
        });
        fetchParts();
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. Please try again.');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const handleQuantityChange = async (partId: string, newQuantity: number) => {
    try {
      // Get current part
      const part = parts.find((p) => p._id === partId);
      if (!part) return;

      const response = await fetch(`/api/parts/${partId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...part,
          quantity: newQuantity,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quantity');
      }

      // Update local state
      setParts(prevParts => 
        prevParts.map(p => 
          p._id === partId ? { ...p, quantity: newQuantity } : p
        )
      );

      // Show success toast
      showToast(`Quantity updated to ${newQuantity}`);
    } catch (error) {
      console.error('Error updating quantity:', error);
      showToast('Failed to update quantity', 'error');
    }
  };

  const handleQuantityInputChange = (partId: string, value: string) => {
    // Allow only numbers
    if (value === '' || /^\d+$/.test(value)) {
      setEditingQuantity(prev => ({ ...prev, [partId]: value }));
    }
  };

  const handleQuantityBlur = async (partId: string, currentQuantity: number) => {
    const newValue = editingQuantity[partId];
    if (newValue !== undefined && newValue !== '') {
      const newQuantity = parseInt(newValue, 10);
      if (!isNaN(newQuantity) && newQuantity >= 0 && newQuantity !== currentQuantity) {
        await handleQuantityChange(partId, newQuantity);
      }
    }
    // Clear editing state
    setEditingQuantity(prev => {
      const newState = { ...prev };
      delete newState[partId];
      return newState;
    });
  };

  const handleQuantityKeyDown = async (e: React.KeyboardEvent, partId: string, currentQuantity: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingQuantity(prev => {
        const newState = { ...prev };
        delete newState[partId];
        return newState;
      });
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleAddImages = async (files: File[]) => {
    if (!imageModal) return;

    try {
      // Upload images
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'parts');

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        return data.url;
      });

      const urls = await Promise.all(uploadPromises);

      // Get current part
      const part = parts.find((p) => p._id === imageModal.partId);
      if (!part) return;

      // Add images to part
      const updatedImages = [...(part.partImages || []), ...urls];

      const response = await fetch(`/api/parts/${imageModal.partId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...part,
          partImages: updatedImages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update part');
      }

      // Update modal with new images
      setImageModal({
        ...imageModal,
        images: updatedImages,
      });

      fetchParts();
    } catch (error) {
      console.error('Error adding images:', error);
      throw error;
    }
  };

  const handleAdd = () => {
    router.push('/parts/new');
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Parts Inventory</h1>
              <p className="mt-1 text-sm text-gray-500">
                {pagination ? `${pagination.total} total parts` : 'Manage your automobile parts'}
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Link
                href="/parts/requirement"
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium sm:font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation shadow-sm whitespace-nowrap"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="hidden sm:inline">Restock</span>
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
                onClick={handleAdd}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium sm:font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors touch-manipulation shadow-sm whitespace-nowrap"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Part
              </button>
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
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by part name, number, code, or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-4 py-3.5 text-base border border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="animate-spin h-10 w-10 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-500">Loading parts...</p>
          </div>
        ) : parts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No parts found' : 'No parts in inventory'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery ? 'Try adjusting your search terms.' : 'Get started by adding your first part.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Your First Part
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            {parts.map((part) => (
              <div
                key={part._id}
                onClick={() => router.push(`/parts/${part._id}`)}
                className="bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:shadow-xl transition-all cursor-pointer overflow-hidden flex flex-col"
              >
                <div 
                  className="h-48 sm:h-56 bg-gray-50 flex items-center justify-center overflow-hidden relative cursor-pointer group border-b border-gray-100"
                  onClick={(e) => handleImageClick(e, part)}
                >
                  {part.partImages && part.partImages.length > 0 ? (
                    <>
                      {part.partImages.length > 1 ? (
                        <div className="relative w-full h-full overflow-hidden">
                          {/* Scrollable Image Container */}
                          <div 
                            className="flex h-full transition-transform duration-500 ease-in-out"
                            style={{ 
                              transform: `translateX(-${(cardImageIndices[part._id] || 0) * (100 / (part.partImages?.length || 1))}%)`,
                              width: `${(part.partImages?.length || 1) * 100}%`
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onTouchStart={(e) => {
                              setTouchStart({ ...touchStart, [part._id]: e.targetTouches[0].clientX });
                            }}
                            onTouchMove={(e) => {
                              setTouchEnd({ ...touchEnd, [part._id]: e.targetTouches[0].clientX });
                            }}
                            onTouchEnd={() => {
                              if (!touchStart[part._id] || !touchEnd[part._id]) return;
                              
                              const distance = touchStart[part._id] - touchEnd[part._id];
                              const isLeftSwipe = distance > 50;
                              const isRightSwipe = distance < -50;
                              
                              if (isLeftSwipe || isRightSwipe) {
                                const currentIdx = cardImageIndices[part._id] || 0;
                                const imagesLength = part.partImages?.length || 0;
                                if (imagesLength === 0) return;
                                
                                let newIdx;
                                if (isLeftSwipe) {
                                  newIdx = currentIdx < imagesLength - 1 ? currentIdx + 1 : 0;
                                } else {
                                  newIdx = currentIdx > 0 ? currentIdx - 1 : imagesLength - 1;
                                }
                                setCardImageIndices({ ...cardImageIndices, [part._id]: newIdx });
                              }
                              
                              setTouchStart({ ...touchStart, [part._id]: 0 });
                              setTouchEnd({ ...touchEnd, [part._id]: 0 });
                            }}
                          >
                            {part.partImages.map((img, idx) => (
                              <div key={idx} className="flex-shrink-0 h-full" style={{ width: `${100 / (part.partImages?.length || 1)}%` }}>
                                <img
                                  src={img}
                                  alt={`${part.partName} - Image ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                          
                          {/* Navigation Arrows */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentIdx = cardImageIndices[part._id] || 0;
                              const imagesLength = part.partImages?.length || 0;
                              if (imagesLength === 0) return;
                              const newIdx = currentIdx > 0 ? currentIdx - 1 : imagesLength - 1;
                              setCardImageIndices({ ...cardImageIndices, [part._id]: newIdx });
                            }}
                            className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation z-10"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentIdx = cardImageIndices[part._id] || 0;
                              const imagesLength = part.partImages?.length || 0;
                              if (imagesLength === 0) return;
                              const newIdx = currentIdx < imagesLength - 1 ? currentIdx + 1 : 0;
                              setCardImageIndices({ ...cardImageIndices, [part._id]: newIdx });
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation z-10"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          
                          {/* Image Indicator Dots */}
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                            {part.partImages.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCardImageIndices({ ...cardImageIndices, [part._id]: idx });
                                }}
                                className={`w-1.5 h-1.5 rounded-full transition-all touch-manipulation ${
                                  (cardImageIndices[part._id] || 0) === idx 
                                    ? 'bg-white w-4' 
                                    : 'bg-white/50 hover:bg-white/75'
                                }`}
                              />
                            ))}
                          </div>
                          
                          {/* Image Counter */}
                          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10">
                            {(cardImageIndices[part._id] || 0) + 1} / {part.partImages?.length || 0}
                          </div>
                        </div>
                      ) : (
                        <img
                          src={part.partImages[0]}
                          alt={part.partName}
                          className="w-full h-full object-contain"
                        />
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 h-full">
                      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">No Image</span>
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-4 flex-1 flex flex-col">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-1 mb-2">
                    {part.partName}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:text-sm text-gray-600 mb-3">
                    <div className="break-words">
                      <span className="text-gray-400">Part No:</span> {part.partNumber}
                    </div>
                    {part.code ? (
                      <div className="font-mono break-words">
                        <span className="text-gray-400 font-sans">Code:</span> {part.code}
                      </div>
                    ) : (
                      <div />
                    )}
                    {part.brand ? (
                      <div className="break-words">
                        <span className="text-gray-400">Brand:</span> {part.brand}
                      </div>
                    ) : (
                      <div />
                    )}
                    <div className="break-words">
                      <span className="text-gray-400">Location:</span> {part.location}
                    </div>
                    <div className="col-span-2 flex items-center gap-2 py-1">
                      <span className="text-gray-400 text-xs sm:text-sm">Qty:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editingQuantity[part._id] !== undefined ? editingQuantity[part._id] : part.quantity}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleQuantityInputChange(part._id, e.target.value);
                          }}
                          onBlur={(e) => {
                            e.stopPropagation();
                            handleQuantityBlur(part._id, part.quantity);
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            handleQuantityKeyDown(e, part._id, part.quantity);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => {
                            e.stopPropagation();
                            e.target.select();
                          }}
                          className="w-16 px-2 py-1 text-center font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          title="Click to edit quantity"
                        />
                        <span className="text-xs text-gray-500">{part.unitOfMeasure}</span>
                      </div>
                    </div>
                    <div className="break-words col-span-2">
                      <span className="text-gray-400">MRP:</span>{' '}
                      <span className="font-semibold text-indigo-600">
                        {part.mrp
                          ? `₹${part.mrp.toLocaleString('en-IN')}`
                          : part.buyingPrice
                            ? `₹${part.buyingPrice.toLocaleString('en-IN')}`
                            : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/parts/${part._id}`);
                      }}
                      className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors text-xs sm:text-sm font-semibold touch-manipulation"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(part._id, part.partName);
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center border border-red-200"
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

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between bg-white rounded-xl border border-gray-200 shadow-md px-5 sm:px-6 py-4 gap-4">
            <div className="text-sm text-gray-600 text-center sm:text-left">
              Showing <span className="font-medium text-gray-900">{((currentPage - 1) * partsPerPage) + 1}</span> - <span className="font-medium text-gray-900">{Math.min(currentPage * partsPerPage, pagination.total)}</span> of <span className="font-medium text-gray-900">{pagination.total}</span> parts
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

      {/* Image Modal */}
      {imageModal && imageModal.open && (
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

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
