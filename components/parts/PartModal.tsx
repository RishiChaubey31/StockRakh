'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Package, X, Camera, Upload, AlertCircle } from 'lucide-react';

interface Part {
  _id?: string;
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

interface PartModalProps {
  part: Part | null;
  onClose: () => void;
}

export default function PartModal({ part, onClose }: PartModalProps) {
  const [formData, setFormData] = useState<Partial<Part>>({
    partName: '', partNumber: '', code: '', quantity: 0, location: '',
    unitOfMeasure: 'pcs', brand: '', description: '', buyingPrice: undefined,
    mrp: undefined, supplier: '', billingDate: '', partImages: [], billImages: [],
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingBills, setUploadingBills] = useState(false);
  const [partNumberExists, setPartNumberExists] = useState(false);
  const [checkingPartNumber, setCheckingPartNumber] = useState(false);

  useEffect(() => {
    if (part) {
      setFormData({
        ...part,
        billingDate: part.billingDate ? new Date(part.billingDate).toISOString().split('T')[0] : '',
      });
    }
  }, [part]);

  const checkPartNumber = async (partNumber: string) => {
    if (!partNumber?.trim()) { setPartNumberExists(false); return; }
    setCheckingPartNumber(true);
    try {
      const params = new URLSearchParams({ partNumber });
      if (part?._id) params.append('excludeId', part._id);
      const res = await fetch(`/api/parts/check-number?${params}`);
      if (res.ok) { const data = await res.json(); setPartNumberExists(data.exists); }
    } catch { setPartNumberExists(false); }
    finally { setCheckingPartNumber(false); }
  };

  const debouncedCheck = useDebounce(checkPartNumber, 500);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'partNumber') { setPartNumberExists(false); debouncedCheck(value); }
    setFormData(prev => ({
      ...prev,
      [name]:
        name === 'quantity' || name === 'buyingPrice' || name === 'mrp'
          ? value === '' ? 0 : parseFloat(value)
          : name === 'code' ? value.toUpperCase().replace(/[^A-Z]/g, '')
          : name === 'billingDate' || name === 'unitOfMeasure' ? value
          : value.toUpperCase(),
    }));
  };

  const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<File> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('No context')); return; }
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

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, type: 'partImages' | 'billImages') => {
    const files = e.target.files;
    if (!files?.length) { e.target.value = ''; return; }
    const setUploading = type === 'partImages' ? setUploadingImages : setUploadingBills;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(async file => {
        if (!file.type.startsWith('image/')) throw new Error(`${file.name} not an image`);
        let f = file;
        if (f.size > 2 * 1024 * 1024) f = await compressImage(f);
        if (f.size > 4 * 1024 * 1024) { f = await compressImage(file, 1280, 0.6); if (f.size > 4 * 1024 * 1024) throw new Error('File too large'); }
        const fd = new FormData(); fd.append('file', f); fd.append('folder', type === 'partImages' ? 'parts' : 'bills');
        const res = await fetch('/api/upload/image', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
        return (await res.json()).url;
      }));
      const updated = { ...formData, [type]: [...(formData[type] || []), ...urls] };
      setFormData(updated);
      if (part?._id) {
        await fetch(`/api/parts/${part._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
      }
    } catch (err: any) { alert(err.message || 'Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const removeImage = (url: string, type: 'partImages' | 'billImages') => {
    setFormData(prev => ({ ...prev, [type]: (prev[type] || []).filter(i => i !== url) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (partNumberExists && !part?._id) { alert('Part number already exists.'); return; }
    setLoading(true);
    try {
      const url = part?._id ? `/api/parts/${part._id}` : '/api/parts';
      const method = part?._id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
      onClose();
    } catch (err: any) { alert(err.message || 'Failed to save'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 bg-white transition-colors";
  const pricingInputClass = "w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 bg-white transition-colors";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-2xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-slate-900">{part ? 'Edit Part' : 'Add New Part'}</h2>
              <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">{part ? 'Update part information' : 'Fill in the details below'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 w-10 h-10 flex items-center justify-center touch-manipulation rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="part-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* Basic Information */}
          <div className="bg-slate-50 rounded-xl p-3.5 sm:p-5 border border-slate-200">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 sm:mb-4 uppercase tracking-wide">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Part Name <span className="text-rose-500">*</span></label>
                <input type="text" name="partName" required value={formData.partName || ''} onChange={handleInputChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Part Number <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input type="text" name="partNumber" required value={formData.partNumber || ''} onChange={handleInputChange}
                    className={`${inputClass} ${partNumberExists ? 'border-rose-500 focus:ring-rose-500' : ''}`} />
                  {checkingPartNumber && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}
                </div>
                {partNumberExists && (
                  <p className="mt-1 text-sm text-rose-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Part number already exists</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Code</label>
                <input type="text" name="code" value={formData.code || ''} onChange={handleInputChange} placeholder="Uppercase letters" className={`${inputClass} font-mono uppercase`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Brand</label>
                <input type="text" name="brand" value={formData.brand || ''} onChange={handleInputChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Location <span className="text-rose-500">*</span></label>
                <input type="text" name="location" required value={formData.location || ''} onChange={handleInputChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Supplier</label>
                <input type="text" name="supplier" value={formData.supplier || ''} onChange={handleInputChange} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Quantity & Pricing */}
          <div className="bg-emerald-50 rounded-xl p-3.5 sm:p-5 border border-emerald-200 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 sm:mb-4 uppercase tracking-wide pl-2">Quantity & Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity <span className="text-rose-500">*</span></label>
                <input type="number" name="quantity" required min="0" value={formData.quantity || ''} onChange={handleInputChange} className={pricingInputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit of Measure <span className="text-rose-500">*</span></label>
                <select name="unitOfMeasure" required value={formData.unitOfMeasure || 'pcs'} onChange={handleInputChange} className={pricingInputClass}>
                  <option value="pcs">Pieces</option><option value="kg">Kilograms</option><option value="liters">Liters</option><option value="meters">Meters</option><option value="boxes">Boxes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Buying Price (₹)</label>
                <input type="number" name="buyingPrice" min="0" step="0.01" value={formData.buyingPrice || ''} onChange={handleInputChange} className={pricingInputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">MRP (₹)</label>
                <input type="number" name="mrp" min="0" step="0.01" value={formData.mrp || ''} onChange={handleInputChange} className={pricingInputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Billing Date</label>
                <input type="date" name="billingDate" value={formData.billingDate || ''} onChange={handleInputChange} className={pricingInputClass} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea name="description" rows={3} value={formData.description || ''} onChange={handleInputChange}
              className="w-full px-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white resize-none" />
          </div>

          {/* Part Images */}
          <div className="bg-slate-50 rounded-xl p-3.5 sm:p-5 border border-slate-200">
            <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2 sm:mb-3 uppercase tracking-wide">Part Images</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="btn-primary text-sm cursor-pointer text-center">
                <Camera className="w-4 h-4" /> Take Photo
                <input type="file" accept="image/*" multiple capture="environment" onChange={e => handleImageUpload(e, 'partImages')} disabled={uploadingImages} className="hidden" />
              </label>
              <label className="btn-secondary text-sm cursor-pointer text-center">
                <Upload className="w-4 h-4" /> Gallery
                <input type="file" accept="image/*" multiple onChange={e => handleImageUpload(e, 'partImages')} disabled={uploadingImages} className="hidden" />
              </label>
            </div>
            {uploadingImages && <div className="flex items-center gap-2 text-sm text-emerald-600 mt-3"><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Uploading...</div>}
            {formData.partImages?.length ? (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {formData.partImages.map((url, i) => (
                  <div key={i} className="relative aspect-square bg-white rounded-lg overflow-hidden border border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(url, 'partImages')}
                      className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-rose-600 touch-manipulation shadow">×</button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Bill Images */}
          <div className="bg-slate-50 rounded-xl p-3.5 sm:p-5 border border-slate-200">
            <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2 sm:mb-3 uppercase tracking-wide">Bill Images</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="btn-primary text-sm cursor-pointer text-center">
                <Camera className="w-4 h-4" /> Take Photo
                <input type="file" accept="image/*" multiple capture="environment" onChange={e => handleImageUpload(e, 'billImages')} disabled={uploadingBills} className="hidden" />
              </label>
              <label className="btn-secondary text-sm cursor-pointer text-center">
                <Upload className="w-4 h-4" /> Gallery
                <input type="file" accept="image/*" multiple onChange={e => handleImageUpload(e, 'billImages')} disabled={uploadingBills} className="hidden" />
              </label>
            </div>
            {uploadingBills && <div className="flex items-center gap-2 text-sm text-emerald-600 mt-3"><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Uploading...</div>}
            {formData.billImages?.length ? (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {formData.billImages.map((url, i) => (
                  <div key={i} className="relative aspect-square bg-white rounded-lg overflow-hidden border border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(url, 'billImages')}
                      className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-rose-600 touch-manipulation shadow">×</button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Spacer so content doesn't hide behind fixed footer on mobile */}
          <div className="h-20 sm:hidden" />
        </form>

        {/* Footer - fixed at bottom on mobile, inline on desktop */}
        <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-slate-200 bg-white px-4 sm:px-6 py-3 sm:py-4 pb-safe">
          <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto py-2.5 sm:py-3 text-sm">Cancel</button>
          <button
            type="submit"
            form="part-form"
            disabled={loading || (partNumberExists && !part?._id)}
            className="btn-primary w-full sm:w-auto py-2.5 sm:py-3 text-sm"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
            ) : part ? 'Update Part' : 'Add Part'}
          </button>
        </div>
      </div>
    </div>
  );
}
