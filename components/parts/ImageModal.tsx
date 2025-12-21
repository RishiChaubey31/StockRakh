'use client';

import { useState, useEffect } from 'react';

interface ImageModalProps {
  images: string[];
  currentIndex: number;
  partName: string;
  partId: string;
  onClose: () => void;
  onDelete?: (imageUrl: string) => void;
  onAddImages?: (files: File[]) => Promise<void>;
  isEditable?: boolean;
}

export default function ImageModal({
  images,
  currentIndex: initialIndex,
  partName,
  partId,
  onClose,
  onDelete,
  onAddImages,
  isEditable = false,
}: ImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [uploading, setUploading] = useState(false);
  const [showAddImages, setShowAddImages] = useState(false);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleDelete = async (imageUrl: string) => {
    if (!onDelete) return;
    
    if (confirm('Are you sure you want to delete this image?')) {
      await onDelete(imageUrl);
      
      // Adjust current index if needed
      const deletedIndex = images.indexOf(imageUrl);
      if (deletedIndex < currentIndex) {
        setCurrentIndex((prev) => prev - 1);
      } else if (deletedIndex === currentIndex && images.length > 1) {
        setCurrentIndex((prev) => (prev >= images.length - 1 ? prev - 1 : prev));
      } else if (images.length === 1) {
        onClose();
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !onAddImages) return;

    setUploading(true);
    try {
      await onAddImages(Array.from(files));
      setShowAddImages(false);
      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-7xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 text-white">
          <div className="flex items-center gap-4">
            <h2 className="text-lg sm:text-xl font-semibold truncate">{partName}</h2>
            <span className="text-sm text-gray-300">
              {currentIndex + 1} / {images.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isEditable && onAddImages && (
              <>
                <label className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 active:bg-indigo-800 cursor-pointer touch-manipulation text-sm sm:text-base min-h-[44px] flex items-center">
                  {uploading ? 'Uploading...' : 'Add Images'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </>
            )}
            <button
              onClick={onClose}
              className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-colors touch-manipulation text-2xl sm:text-3xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Image Container */}
        <div className="relative flex-1 flex items-center justify-center bg-black/50 rounded-lg overflow-hidden min-h-0">
          {/* Previous Button */}
          {images.length > 1 && (
            <button
              onClick={handlePrevious}
              className="absolute left-2 sm:left-4 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors touch-manipulation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={images[currentIndex]}
              alt={`${partName} - Image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Next Button */}
          {images.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-4 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors touch-manipulation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Delete Button (if editable) */}
          {isEditable && onDelete && (
            <button
              onClick={() => handleDelete(images[currentIndex])}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation min-h-[44px] flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Image
            </button>
          )}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4B5563 #1F2937' }}>
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded overflow-hidden border-2 transition-all ${
                  idx === currentIndex
                    ? 'border-indigo-500 ring-2 ring-indigo-300'
                    : 'border-transparent hover:border-gray-400'
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

