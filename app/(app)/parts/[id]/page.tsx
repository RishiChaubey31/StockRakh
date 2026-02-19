'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Edit3, Trash2, Save, X, Upload, Camera, ImageIcon, FileText,
} from 'lucide-react';
import ImageModal from '@/components/parts/ImageModal';
import { useToast } from '@/components/ui/Toast';

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

function getStockClass(qty: number) {
  if (qty === 0) return 'border-l-4 border-l-rose-500';
  if (qty === 1) return 'border-l-4 border-l-orange-500';
  if (qty === 2) return 'border-l-4 border-l-amber-400';
  return '';
}

export default function PartDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const id = params?.id as string;

  const [part, setPart] = useState<Part | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Part>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingPartImages, setUploadingPartImages] = useState(false);
  const [uploadingBillImages, setUploadingBillImages] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'pricing' | 'bills'>('details');
  const [imageModal, setImageModal] = useState<{
    open: boolean; images: string[]; currentIndex: number;
  } | null>(null);

  useEffect(() => {
    if (id) fetchPart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPart = async () => {
    try {
      const response = await fetch(`/api/parts/${id}`);
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setPart(data.part);
      setFormData(data.part);
    } catch {
      router.push('/parts');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]:
        name === 'quantity' || name === 'buyingPrice' || name === 'mrp'
          ? value === '' ? undefined : parseFloat(value)
          : name === 'code' ? value.toUpperCase().replace(/[^A-Z]/g, '')
          : value,
    }));
  };

  const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<File> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('No canvas')); return; }
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(blob => {
            if (!blob) { reject(new Error('Compress failed')); return; }
            resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() }));
          }, file.type, quality);
        };
        img.onerror = () => reject(new Error('Load failed'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Read failed'));
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'partImages' | 'billImages') => {
    const files = e.target.files;
    if (!files?.length) { e.target.value = ''; return; }
    const setUploading = type === 'partImages' ? setUploadingPartImages : setUploadingBillImages;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(async file => {
        if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image`);
        let f = file;
        if (f.size > 2 * 1024 * 1024) f = await compressImage(f, 1920, 0.8);
        if (f.size > 4 * 1024 * 1024) { f = await compressImage(file, 1280, 0.6); if (f.size > 4 * 1024 * 1024) throw new Error('File too large'); }
        const fd = new FormData();
        fd.append('file', f);
        fd.append('folder', type === 'partImages' ? 'parts' : 'bills');
        const res = await fetch('/api/upload/image', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
        return (await res.json()).url;
      }));
      const updated = { ...formData, [type]: [...(formData[type] || []), ...urls] };
      setFormData(updated);
      await fetch(`/api/parts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
      await fetchPart();
      toast('Images uploaded');
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (url: string, type: 'partImages' | 'billImages') => {
    setFormData(prev => ({ ...prev, [type]: (prev[type] || []).filter(i => i !== url) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/parts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error('Failed');
      setIsEditing(false);
      fetchPart();
      toast('Part updated');
    } catch {
      toast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${part?.partName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/parts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast('Part deleted');
      router.push('/parts');
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!part) return;
    const updated = part.partImages?.filter(i => i !== imageUrl) || [];
    await fetch(`/api/parts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...part, partImages: updated }) });
    if (!updated.length) setImageModal(null);
    else setImageModal({ ...imageModal!, images: updated, currentIndex: Math.min(imageModal!.currentIndex, updated.length - 1) });
    fetchPart();
  };

  const handleAddImages = async (files: File[]) => {
    if (!part) return;
    const urls = await Promise.all(files.map(async file => {
      const fd = new FormData(); fd.append('file', file); fd.append('folder', 'parts');
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      return (await res.json()).url;
    }));
    const updated = [...(part.partImages || []), ...urls];
    await fetch(`/api/parts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...part, partImages: updated }) });
    if (imageModal) setImageModal({ ...imageModal, images: updated });
    fetchPart();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!part) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ImageIcon className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-lg font-medium text-slate-900 mb-1">Part not found</p>
        <Link href="/parts" className="btn-primary mt-4">Back to Parts</Link>
      </div>
    );
  }

  const d = isEditing ? formData : part;
  const tabs = [
    { id: 'details' as const, label: 'Details' },
    { id: 'pricing' as const, label: 'Pricing' },
    { id: 'bills' as const, label: 'Bills' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 bg-white border-b border-slate-200">
        <Link href="/parts" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-emerald-600 font-medium transition-colors touch-manipulation">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button onClick={() => { setIsEditing(false); setFormData(part); }} className="btn-secondary text-xs sm:text-sm py-2 px-3">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs sm:text-sm py-2 px-3">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="btn-primary text-xs sm:text-sm py-2 px-3">
                <Edit3 className="w-4 h-4" /> Edit
              </button>
              <button onClick={handleDelete} className="btn-danger text-xs sm:text-sm py-2 px-3">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden ${getStockClass(part.quantity)}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-8">
            {/* Left - Images */}
            <div className="p-4 sm:p-6">
              <div
                className="aspect-square bg-slate-50 rounded-xl overflow-hidden mb-4 cursor-pointer relative border border-slate-200"
                onClick={() => !isEditing && d?.partImages?.length && setImageModal({ open: true, images: d.partImages, currentIndex: 0 })}
              >
                {d?.partImages?.length ? (
                  <>
                    <img src={d.partImages[0]} alt={d.partName} className="w-full h-full object-contain p-4" />
                    {d.partImages.length > 1 && (
                      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                        {d.partImages.length} Images
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <ImageIcon className="w-16 h-16 mb-2" />
                    <span className="text-sm">No Image</span>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Upload Part Images</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <label className="btn-primary text-sm cursor-pointer text-center">
                      <Camera className="w-4 h-4" /> Take Photo
                      <input type="file" accept="image/*" multiple capture="environment" onChange={e => handleImageUpload(e, 'partImages')} disabled={uploadingPartImages} className="hidden" />
                    </label>
                    <label className="btn-secondary text-sm cursor-pointer text-center">
                      <Upload className="w-4 h-4" /> Gallery
                      <input type="file" accept="image/*" multiple onChange={e => handleImageUpload(e, 'partImages')} disabled={uploadingPartImages} className="hidden" />
                    </label>
                  </div>
                  {uploadingPartImages && <p className="text-sm text-emerald-600 mt-2 font-medium">Uploading...</p>}
                </div>
              )}

              {d?.partImages && d.partImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {d.partImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden cursor-pointer border hover:border-emerald-400 transition-colors"
                      onClick={() => !isEditing && setImageModal({ open: true, images: d.partImages!, currentIndex: idx })}>
                      <img src={img} alt="" className="w-full h-full object-contain p-1" />
                      {isEditing && (
                        <button onClick={e => { e.stopPropagation(); removeImage(img, 'partImages'); }}
                          className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-rose-600 touch-manipulation">
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right - Details */}
            <div className="p-4 sm:p-6 lg:border-l border-slate-100">
              {/* Part Name */}
              <div className="mb-5">
                {isEditing ? (
                  <input type="text" name="partName" value={formData.partName || ''} onChange={handleInputChange}
                    className="w-full px-4 py-3 text-xl font-bold border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900" />
                ) : (
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{d?.partName}</h1>
                )}
              </div>

              {/* Tabs (mobile) */}
              <div className="flex border-b border-slate-200 mb-5 overflow-x-auto sm:hidden">
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Details Section */}
              <div className={`${activeTab !== 'details' ? 'hidden sm:block' : ''} mb-6`}>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h2 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">Basic Information</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Part Number', name: 'partNumber', value: d?.partNumber },
                      { label: 'Code', name: 'code', value: d?.code || '-', mono: true, placeholder: 'Uppercase letters' },
                      { label: 'Brand', name: 'brand', value: d?.brand || '-' },
                      { label: 'Location', name: 'location', value: d?.location },
                      { label: 'Quantity', name: 'quantity', value: `${d?.quantity} ${d?.unitOfMeasure}`, type: 'number' },
                      { label: 'Supplier', name: 'supplier', value: d?.supplier || '-' },
                    ].map(field => (
                      <div key={field.name}>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{field.label}</label>
                        {isEditing ? (
                          <input type={field.type || 'text'} name={field.name}
                            value={(formData as any)[field.name] ?? ''}
                            onChange={handleInputChange}
                            placeholder={field.placeholder}
                            className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white ${field.mono ? 'font-mono uppercase' : ''}`} />
                        ) : (
                          <p className={`text-sm font-medium text-slate-900 ${field.mono ? 'font-mono' : ''}`}>{field.value}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Description */}
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</label>
                    {isEditing ? (
                      <textarea name="description" value={formData.description || ''} onChange={handleInputChange} rows={3}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white resize-none" />
                    ) : (
                      <p className="text-sm text-slate-700 leading-relaxed">{d?.description || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className={`${activeTab !== 'pricing' ? 'hidden sm:block' : ''} mb-6`}>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                  <h2 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide pl-2">Pricing</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Buying Price</label>
                      {isEditing ? (
                        <input type="number" name="buyingPrice" value={formData.buyingPrice ?? ''} onChange={handleInputChange} min="0" step="0.01"
                          className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white" />
                      ) : d?.buyingPrice ? (
                        <p className="text-2xl font-bold text-emerald-700">₹{d.buyingPrice.toLocaleString('en-IN')}</p>
                      ) : <p className="text-sm text-slate-500">-</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">MRP</label>
                      {isEditing ? (
                        <input type="number" name="mrp" value={formData.mrp ?? ''} onChange={handleInputChange} min="0" step="0.01"
                          className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white" />
                      ) : d?.mrp ? (
                        <p className="text-2xl font-bold text-emerald-700">₹{d.mrp.toLocaleString('en-IN')}</p>
                      ) : <p className="text-sm text-slate-500">-</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bills Section */}
              <div className={`${activeTab !== 'bills' ? 'hidden sm:block' : ''}`}>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h2 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">Billing Images</h2>
                  {isEditing && (
                    <div className="mb-4 bg-white rounded-lg p-3 border-2 border-dashed border-slate-300">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <label className="btn-primary text-sm cursor-pointer text-center">
                          <Camera className="w-4 h-4" /> Take Photo
                          <input type="file" accept="image/*" multiple capture="environment" onChange={e => handleImageUpload(e, 'billImages')} disabled={uploadingBillImages} className="hidden" />
                        </label>
                        <label className="btn-secondary text-sm cursor-pointer text-center">
                          <Upload className="w-4 h-4" /> Gallery
                          <input type="file" accept="image/*" multiple onChange={e => handleImageUpload(e, 'billImages')} disabled={uploadingBillImages} className="hidden" />
                        </label>
                      </div>
                      {uploadingBillImages && <p className="text-sm text-emerald-600 mt-2 font-medium">Uploading...</p>}
                    </div>
                  )}
                  {d?.billImages?.length ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {d.billImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-square bg-white rounded-lg overflow-hidden border border-slate-200 hover:shadow-sm transition-shadow">
                          <img src={img} alt={`Bill ${idx + 1}`} className="w-full h-full object-contain p-2 cursor-pointer" onClick={() => !isEditing && window.open(img, '_blank')} />
                          {isEditing && (
                            <button onClick={() => removeImage(img, 'billImages')}
                              className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-rose-600 touch-manipulation">×</button>
                          )}
                          <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">Bill {idx + 1}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-slate-200">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm text-slate-500">No billing images</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {imageModal?.open && part && (
        <ImageModal
          images={imageModal.images}
          currentIndex={imageModal.currentIndex}
          partName={part.partName}
          partId={part._id}
          onClose={() => setImageModal(null)}
          onDelete={handleDeleteImage}
          onAddImages={handleAddImages}
          isEditable={true}
        />
      )}
    </div>
  );
}
