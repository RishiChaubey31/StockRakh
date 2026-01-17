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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Parts Inventory</h1>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Link
              href="/dashboard"
              className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-600 text-white rounded-md hover:bg-gray-700 active:bg-gray-800 touch-manipulation"
            >
              Dashboard
            </Link>
            <button
              onClick={handleAdd}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-indigo-600 text-white rounded-md hover:bg-indigo-700 active:bg-indigo-800 touch-manipulation flex-1 sm:flex-initial"
            >
              Add New Part
            </button>
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

        <div className="mb-4 sm:mb-6">
          <input
            type="text"
            placeholder="Search parts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {parts.map((part) => (
              <div
                key={part._id}
                onClick={() => router.push(`/parts/${part._id}`)}
                className="bg-white rounded-lg shadow-md hover:shadow-lg active:shadow-xl transition-shadow cursor-pointer overflow-hidden flex flex-col"
              >
                <div 
                  className="h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden relative p-1.5 sm:p-2 cursor-pointer group"
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
                              <div key={idx} className="flex-shrink-0 flex items-center justify-center" style={{ width: `${100 / (part.partImages?.length || 1)}%` }}>
                                <img
                                  src={img}
                                  alt={`${part.partName} - Image ${idx + 1}`}
                                  className="max-w-full max-h-full w-auto h-auto object-contain"
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
                        <>
                          <img
                            src={part.partImages[0]}
                            alt={part.partName}
                            className="max-w-full max-h-full w-auto h-auto object-contain"
                          />
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-400 text-xs sm:text-sm">No Image</div>
                  )}
                </div>
                <div className="p-2 sm:p-2.5 flex-1 flex flex-col">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-1 mb-0.5">
                    {part.partName}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-600 mb-1.5">
                    <div className="break-words">Part No: {part.partNumber}</div>
                    {part.code ? (
                      <div className="font-mono break-words">Code: {part.code}</div>
                    ) : (
                      <div />
                    )}
                    {part.brand ? (
                      <div className="break-words">Brand: {part.brand}</div>
                    ) : (
                      <div />
                    )}
                    <div className="break-words">Location: {part.location}</div>
                    <div className="break-words">Pieces: {part.quantity} {part.unitOfMeasure}</div>
                    <div className="break-words">
                      MRP:{' '}
                      <span className="font-semibold text-gray-900">
                        {part.mrp
                          ? `₹${part.mrp.toLocaleString('en-IN')}`
                          : part.buyingPrice
                            ? `₹${part.buyingPrice.toLocaleString('en-IN')}`
                            : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/parts/${part._id}`);
                      }}
                      className="flex-1 bg-indigo-600 text-white py-1.5 sm:py-2 px-3 sm:px-4 rounded-md hover:bg-indigo-700 active:bg-indigo-800 transition-colors text-xs sm:text-sm font-medium touch-manipulation"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(part._id, part.partName);
                      }}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-md transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
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
          <div className="mt-4 sm:mt-8 flex flex-col sm:flex-row items-center justify-between bg-white rounded-lg shadow px-4 sm:px-6 py-3 sm:py-4 gap-3">
            <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
              Showing {((currentPage - 1) * partsPerPage) + 1} - {Math.min(currentPage * partsPerPage, pagination.total)} of {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
              >
                Previous
              </button>
              <span className="text-xs sm:text-sm text-gray-700 px-2">
                {currentPage}/{pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                disabled={currentPage >= pagination.totalPages}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
              >
                Next
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
    </div>
  );
}
