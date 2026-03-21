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
  images, currentIndex: initialIndex, partName,
  onClose, onDelete, onAddImages, isEditable = false,
}: ImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [uploading, setUploading] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

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

  const handleSwipe = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) < 40) return;
    if (distance > 0) setCurrentIndex(p => (p < images.length - 1 ? p + 1 : 0));
    else setCurrentIndex(p => (p > 0 ? p - 1 : images.length - 1));
    setTouchStart(null);
    setTouchEnd(null);
  };

  if (!images.length) return null;

  return (
    <div className="fixed inset-0 bg-slate-950 z-[70] flex flex-col" onClick={onClose}>
      <div className="relative flex items-center justify-between gap-3 px-4 py-3 text-white bg-gradient-to-b from-black/80 to-transparent z-10" onClick={e => e.stopPropagation()}>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-semibold truncate">{partName}</h2>
          <p className="text-xs text-slate-300">{currentIndex + 1} of {images.length}</p>
        </div>
        <button onClick={onClose} className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white touch-manipulation">
          <X className="w-5 h-5" />
        </button>
      </div>

      {isEditable && onAddImages && (
        <div className="px-4 pb-3 flex gap-2 z-10" onClick={e => e.stopPropagation()}>
          <label className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-xl cursor-pointer text-sm flex items-center justify-center gap-2 min-h-[44px]">
            <Camera className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Take Photo'}
            <input type="file" accept="image/*" multiple capture="environment" onChange={handleFileSelect} disabled={uploading} className="hidden" />
          </label>
          <label className="flex-1 px-3 py-2 bg-white/10 text-white rounded-xl cursor-pointer text-sm flex items-center justify-center gap-2 min-h-[44px] border border-white/15">
            <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Gallery'}
            <input type="file" accept="image/*" multiple onChange={handleFileSelect} disabled={uploading} className="hidden" />
          </label>
        </div>
      )}

      <div
        className="relative flex-1 min-h-0 flex items-center justify-center"
        onClick={e => e.stopPropagation()}
        onTouchStart={e => setTouchStart(e.targetTouches[0].clientX)}
        onTouchMove={e => setTouchEnd(e.targetTouches[0].clientX)}
        onTouchEnd={handleSwipe}
      >
        {images.length > 1 && (
          <button
            onClick={() => setCurrentIndex(p => (p > 0 ? p - 1 : images.length - 1))}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-black/40 text-white rounded-full flex items-center justify-center touch-manipulation"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div className="w-full h-full flex items-center justify-center px-3 pb-4 sm:px-8">
          <img src={images[currentIndex]} alt={`${partName} - ${currentIndex + 1}`} className="max-w-full max-h-full object-contain select-none" />
        </div>

        {images.length > 1 && (
          <button
            onClick={() => setCurrentIndex(p => (p < images.length - 1 ? p + 1 : 0))}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-black/40 text-white rounded-full flex items-center justify-center touch-manipulation"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {isEditable && onDelete && (
          <button
            onClick={() => handleDelete(images[currentIndex])}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-rose-600 text-white rounded-full transition-colors touch-manipulation flex items-center gap-2 text-sm shadow-lg"
          >
            <Trash2 className="w-4 h-4" /> Delete Image
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className="px-4 pb-4 pt-2 bg-gradient-to-t from-black/90 to-transparent" onClick={e => e.stopPropagation()}>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 transition-all ${
                  idx === currentIndex ? 'border-emerald-400 scale-[1.02]' : 'border-white/10 opacity-75'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
