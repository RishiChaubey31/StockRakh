'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, Camera, Upload } from 'lucide-react';

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
  images, currentIndex: initialIndex, partName, partId,
  onClose, onDelete, onAddImages, isEditable = false,
}: ImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setCurrentIndex(p => (p > 0 ? p - 1 : images.length - 1));
      else if (e.key === 'ArrowRight') setCurrentIndex(p => (p < images.length - 1 ? p + 1 : 0));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  const handleDelete = async (url: string) => {
    if (!onDelete || !confirm('Delete this image?')) return;
    await onDelete(url);
    const idx = images.indexOf(url);
    if (idx < currentIndex) setCurrentIndex(p => p - 1);
    else if (idx === currentIndex && images.length > 1) setCurrentIndex(p => (p >= images.length - 1 ? p - 1 : p));
    else if (images.length === 1) onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !onAddImages) return;
    setUploading(true);
    try { await onAddImages(Array.from(e.target.files)); e.target.value = ''; }
    catch { alert('Upload failed.'); }
    finally { setUploading(false); }
  };

  if (!images.length) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-7xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 text-white">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold truncate">{partName}</h2>
            <span className="text-sm text-slate-400">{currentIndex + 1} / {images.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {isEditable && onAddImages && (
              <div className="flex items-center gap-2">
                <label className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer touch-manipulation text-sm flex items-center gap-1.5">
                  <Camera className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Photo'}
                  <input type="file" accept="image/*" multiple capture="environment" onChange={handleFileSelect} disabled={uploading} className="hidden" />
                </label>
                <label className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 cursor-pointer touch-manipulation text-sm flex items-center gap-1.5">
                  <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Gallery'}
                  <input type="file" accept="image/*" multiple onChange={handleFileSelect} disabled={uploading} className="hidden" />
                </label>
              </div>
            )}
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors touch-manipulation">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="relative flex-1 flex items-center justify-center bg-black/40 rounded-xl overflow-hidden min-h-0">
          {images.length > 1 && (
            <button onClick={() => setCurrentIndex(p => (p > 0 ? p - 1 : images.length - 1))}
              className="absolute left-2 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors touch-manipulation">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div className="w-full h-full flex items-center justify-center p-4">
            <img src={images[currentIndex]} alt={`${partName} - ${currentIndex + 1}`} className="max-w-full max-h-full object-contain" />
          </div>
          {images.length > 1 && (
            <button onClick={() => setCurrentIndex(p => (p < images.length - 1 ? p + 1 : 0))}
              className="absolute right-2 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors touch-manipulation">
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          {isEditable && onDelete && (
            <button onClick={() => handleDelete(images[currentIndex])}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors touch-manipulation flex items-center gap-2 text-sm">
              <Trash2 className="w-4 h-4" /> Delete Image
            </button>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <button key={idx} onClick={() => setCurrentIndex(idx)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentIndex ? 'border-emerald-500 ring-2 ring-emerald-300' : 'border-transparent hover:border-slate-400'
                }`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
