'use client';

import { useState, useEffect, useRef, FormEvent, ChangeEvent, KeyboardEvent } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Package, X, Camera, Upload, AlertCircle, ChevronDown } from 'lucide-react';

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
  presentation?: 'modal' | 'page';
}

interface PendingUpload {
  id: string;
  previewUrl: string;
  type: 'partImages' | 'billImages';
}

const formFieldOrder = [
  'partName',
  'partNumber',
  'code',
  'brand',
  'location',
  'supplier',
  'quantity',
  'unitOfMeasure',
  'buyingPrice',
  'mrp',
  'billingDate',
  'description',
] as const;

const unitOptions = [
  { value: 'pcs', label: 'Pieces' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'liters', label: 'Liters' },
  { value: 'meters', label: 'Meters' },
  { value: 'boxes', label: 'Boxes' },
] as const;

type FormFieldName = (typeof formFieldOrder)[number];
type FocusableField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement;
type ImageUploadType = 'partImages' | 'billImages';

export default function PartModal({ part, onClose, presentation = 'modal' }: PartModalProps) {
  const [formData, setFormData] = useState<Partial<Part>>({
    partName: '', partNumber: '', code: '', quantity: 0, location: '',
    unitOfMeasure: 'pcs', brand: '', description: '', buyingPrice: undefined,
    mrp: undefined, supplier: '', billingDate: '', partImages: [], billImages: [],
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingBills, setUploadingBills] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [partNumberExists, setPartNumberExists] = useState(false);
  const [checkingPartNumber, setCheckingPartNumber] = useState(false);
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [partImagePickerOpen, setPartImagePickerOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const isPage = presentation === 'page';
  const fieldRefs = useRef<Partial<Record<FormFieldName, FocusableField | null>>>({});
  const formDataRef = useRef<Partial<Part>>(formData);
  const pendingUploadsRef = useRef<PendingUpload[]>([]);
  const partImagesSectionRef = useRef<HTMLDivElement | null>(null);
  const partCameraInputRef = useRef<HTMLInputElement | null>(null);
  const partGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const uploadSequenceRef = useRef(0);

  useEffect(() => {
    if (part) {
      const nextData = {
        ...part,
        billingDate: part.billingDate ? new Date(part.billingDate).toISOString().split('T')[0] : '',
      };

      formDataRef.current = nextData;
      setFormData(nextData);
    }
  }, [part]);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    pendingUploadsRef.current = pendingUploads;
  }, [pendingUploads]);

  useEffect(() => {
    return () => {
      pendingUploadsRef.current.forEach(upload => {
        URL.revokeObjectURL(upload.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 1023px), (pointer: coarse)');
    const updateViewportMode = () => {
      setIsMobileView(mediaQuery.matches);
    };

    updateViewportMode();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateViewportMode);
      return () => mediaQuery.removeEventListener('change', updateViewportMode);
    }

    mediaQuery.addListener(updateViewportMode);
    return () => mediaQuery.removeListener(updateViewportMode);
  }, []);

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

  const registerFieldRef = (name: FormFieldName) => (element: FocusableField | null) => {
    fieldRefs.current[name] = element;
  };

  const isMobileFormViewport = () => isMobileView;

  const scrollFieldIntoView = (field: FocusableField) => {
    const viewport = window.visualViewport;
    const rect = field.getBoundingClientRect();
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;

    if (rect.top < viewportTop + 16 || rect.bottom > viewportBottom - 24) {
      field.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }
  };

  const positionCaret = (field: FocusableField) => {
    if (field instanceof HTMLTextAreaElement) {
      const end = field.value.length;
      field.setSelectionRange(end, end);
      return;
    }

    if (
      field instanceof HTMLInputElement &&
      !['number', 'date', 'time', 'month', 'week'].includes(field.type)
    ) {
      const end = field.value.length;
      field.setSelectionRange(end, end);
    }
  };

  const maybeOpenPicker = (fieldName: FormFieldName, field: FocusableField) => {
    if (!isMobileFormViewport()) return;
    if (fieldName !== 'unitOfMeasure' && fieldName !== 'billingDate') return;

    const openPicker = () => {
      if (fieldName === 'unitOfMeasure') {
        if (field instanceof HTMLButtonElement) {
          setUnitPickerOpen(true);
          return;
        }

        if (field instanceof HTMLSelectElement) {
          const selectField = field as HTMLSelectElement & { showPicker?: () => void };
          if (typeof selectField.showPicker === 'function') {
            try {
              selectField.showPicker();
            } catch {}
            return;
          }

          selectField.click();
          return;
        }
      }

      if (fieldName === 'billingDate' && field instanceof HTMLInputElement) {
        const dateField = field as HTMLInputElement & { showPicker?: () => void };
        if (typeof dateField.showPicker === 'function') {
          try {
            dateField.showPicker();
          } catch {}
          return;
        }

        dateField.click();
      }
    };

    openPicker();

    window.setTimeout(() => {
      if (document.activeElement === field) {
        openPicker();
      }
    }, 80);
  };

  const focusField = (fieldName: FormFieldName, options?: { openPicker?: boolean }) => {
    const field = fieldRefs.current[fieldName];
    if (!field) return;

    field.focus();
    positionCaret(field);

    if (options?.openPicker) {
      maybeOpenPicker(fieldName, field);
    }

    scrollFieldIntoView(field);

    window.setTimeout(() => {
      scrollFieldIntoView(field);
    }, 220);
  };

  const focusFieldWithDelay = (fieldName: FormFieldName, options?: { openPicker?: boolean }, delay = 40) => {
    window.setTimeout(() => {
      focusField(fieldName, options);
    }, delay);
  };

  const currentUnitLabel =
    unitOptions.find(option => option.value === (formData.unitOfMeasure || 'pcs'))?.label || 'Pieces';

  const handleUnitSelection = (value: Part['unitOfMeasure']) => {
    const nextData = {
      ...formDataRef.current,
      unitOfMeasure: value,
    };

    formDataRef.current = nextData;
    setFormData(nextData);
    setUnitPickerOpen(false);

    if (isMobileFormViewport()) {
      focusFieldWithDelay('buyingPrice', undefined, 120);
    }
  };

  const openPartImagePicker = () => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    partImagesSectionRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });

    window.setTimeout(() => {
      setPartImagePickerOpen(true);
    }, 120);
  };

  const triggerPartImageInput = (mode: 'camera' | 'gallery') => {
    const input = mode === 'camera' ? partCameraInputRef.current : partGalleryInputRef.current;
    setPartImagePickerOpen(false);
    input?.click();
  };

  const yieldToBrowser = () =>
    new Promise<void>(resolve => {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => resolve());
        return;
      }

      window.setTimeout(resolve, 0);
    });

  const appendUploadedImageUrl = (type: ImageUploadType, url: string) => {
    const nextData = {
      ...formDataRef.current,
      [type]: [...(formDataRef.current[type] || []), url],
    };

    formDataRef.current = nextData;
    setFormData(nextData);
    return nextData;
  };

  const persistImagesForExistingPart = async (nextData: Partial<Part>) => {
    if (!part?._id) return;

    const response = await fetch(`/api/parts/${part._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextData),
    });

    if (!response.ok) {
      throw new Error('Failed to sync uploaded images');
    }
  };

  const pendingPartUploads = pendingUploads.filter(upload => upload.type === 'partImages');
  const pendingBillUploads = pendingUploads.filter(upload => upload.type === 'billImages');

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const normalizedNumericValue =
      name === 'quantity'
        ? value.replace(/[^\d]/g, '')
        : value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');

    if (name === 'partNumber') { setPartNumberExists(false); debouncedCheck(value); }
    const nextData = {
      ...formDataRef.current,
      [name]:
        name === 'quantity' || name === 'buyingPrice' || name === 'mrp'
          ? normalizedNumericValue === '' ? 0 : parseFloat(normalizedNumericValue)
          : name === 'code' ? value.toUpperCase().replace(/[^A-Z]/g, '')
          : name === 'billingDate' || name === 'unitOfMeasure' ? value
          : value.toUpperCase(),
    };

    formDataRef.current = nextData;
    setFormData(nextData);

    if ((name === 'unitOfMeasure' || name === 'billingDate') && isMobileFormViewport()) {
      window.setTimeout(() => {
        focusNextField(name as FormFieldName);
      }, 60);
    }
  };

  const focusNextField = (currentName: FormFieldName) => {
    const currentIndex = formFieldOrder.indexOf(currentName);
    const nextName = formFieldOrder[currentIndex + 1];
    if (!nextName) return;

    if (nextName === 'quantity') {
      focusFieldWithDelay(nextName, undefined, 60);
      return;
    }

    focusField(nextName, { openPicker: nextName === 'unitOfMeasure' || nextName === 'billingDate' });
  };

  const handleFieldKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;

    const tagName = e.currentTarget.tagName.toLowerCase();
    const name = e.currentTarget.getAttribute('name');

    if (!name) return;

    if (tagName === 'textarea') {
      if (name === 'description' && isMobileFormViewport()) {
        e.preventDefault();
        openPartImagePicker();
      }
      return;
    }

    e.preventDefault();
    focusNextField(name as FormFieldName);
  };

  const handleFieldFocus = (e: React.FocusEvent<FocusableField>) => {
    window.setTimeout(() => {
      scrollFieldIntoView(e.currentTarget);
    }, 120);
  };

  const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<File> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = async () => {
          await yieldToBrowser();
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

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, type: ImageUploadType) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';

    if (!files.length) return;

    const setUploading = type === 'partImages' ? setUploadingImages : setUploadingBills;
    const uploadBatch = files.map(file => ({
      file,
      pending: {
        id: `${type}-${Date.now()}-${uploadSequenceRef.current++}`,
        previewUrl: URL.createObjectURL(file),
        type,
      },
    }));

    setPendingUploads(prev => [...prev, ...uploadBatch.map(item => item.pending)]);
    setUploading(true);

    void (async () => {
      const failedUploads: string[] = [];

      try {
        for (const { file, pending } of uploadBatch) {
          try {
            if (!file.type.startsWith('image/')) {
              throw new Error(`${file.name} is not an image`);
            }

            await yieldToBrowser();

            let preparedFile = file;
            if (preparedFile.size > 2 * 1024 * 1024) {
              preparedFile = await compressImage(preparedFile, 1600, 0.75);
            }

            if (preparedFile.size > 4 * 1024 * 1024) {
              preparedFile = await compressImage(preparedFile, 1280, 0.6);
            }

            if (preparedFile.size > 4 * 1024 * 1024) {
              throw new Error(`${file.name} is still too large after compression`);
            }

            const fd = new FormData();
            fd.append('file', preparedFile);
            fd.append('folder', type === 'partImages' ? 'parts' : 'bills');

            const res = await fetch('/api/upload/image', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Upload failed');

            const { url } = await res.json();
            const nextData = appendUploadedImageUrl(type, url);

            setPendingUploads(prev => prev.filter(upload => upload.id !== pending.id));
            URL.revokeObjectURL(pending.previewUrl);

            if (part?._id) {
              await persistImagesForExistingPart(nextData);
            }

            await yieldToBrowser();
          } catch (err) {
            failedUploads.push(err instanceof Error ? err.message : `${file.name} failed to upload`);
            setPendingUploads(prev => prev.filter(upload => upload.id !== pending.id));
            URL.revokeObjectURL(pending.previewUrl);
            await yieldToBrowser();
          }
        }

        if (failedUploads.length > 0) {
          alert(failedUploads.join('\n'));
        }
      } finally {
        setUploading(false);
      }
    })();
  };

  const removeImage = (url: string, type: ImageUploadType) => {
    const nextData = {
      ...formDataRef.current,
      [type]: (formDataRef.current[type] || []).filter(i => i !== url),
    };

    formDataRef.current = nextData;
    setFormData(nextData);
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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    }
    finally { setLoading(false); }
  };

  const inputClass = 'w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 bg-white transition-colors';
  const pricingInputClass = 'w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 bg-white transition-colors';
  const wrapperClass = isPage
    ? 'min-h-[100dvh] bg-slate-50'
    : 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-0 sm:p-4';
  const panelClass = isPage
    ? 'bg-white min-h-[100dvh] w-full flex flex-col'
    : 'bg-white rounded-none sm:rounded-2xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] shadow-2xl flex flex-col';

  return (
    <div className={wrapperClass}>
      <div className={panelClass}>
        {!isPage && (
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center flex-shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold text-slate-900">{part ? 'Edit Part' : 'Add New Part'}</h2>
                <p className="text-xs sm:text-sm text-slate-500">{part ? 'Update part information' : 'Use Next on your keyboard to move through fields faster'}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 min-w-10 h-10 px-2 flex items-center justify-center gap-1.5 touch-manipulation rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <form id="part-form" onSubmit={handleSubmit} className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 ${isPage ? 'pb-20 sm:pb-6' : 'pb-28 sm:pb-6'}`}>
          <div className="bg-slate-50 rounded-xl p-3.5 sm:p-5 border border-slate-200">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 sm:mb-4 uppercase tracking-wide">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Part Name <span className="text-rose-500">*</span></label>
                <input ref={registerFieldRef('partName')} type="text" name="partName" required value={formData.partName || ''} onChange={handleInputChange} onKeyDown={handleFieldKeyDown} onFocus={handleFieldFocus} enterKeyHint="next" data-field-name="partName" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Part Number <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input ref={registerFieldRef('partNumber')} type="text" name="partNumber" required value={formData.partNumber || ''} onChange={handleInputChange} onKeyDown={handleFieldKeyDown} onFocus={handleFieldFocus} enterKeyHint="next" data-field-name="partNumber"
                    className={`${inputClass} ${partNumberExists ? 'border-rose-500 focus:ring-rose-500' : ''}`} />
                  {checkingPartNumber && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}
                </div>
                {partNumberExists && (
                  <p className="mt-1 text-sm text-rose-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Part number already exists</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Code</label>
                <input ref={registerFieldRef('code')} type="text" name="code" value={formData.code || ''} onChange={handleInputChange} onKeyDown={handleFieldKeyDown} onFocus={handleFieldFocus} enterKeyHint="next" data-field-name="code" placeholder="Uppercase letters" className={`${inputClass} font-mono uppercase`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Brand</label>
                <input ref={registerFieldRef('brand')} type="text" name="brand" value={formData.brand || ''} onChange={handleInputChange} onKeyDown={handleFieldKeyDown} onFocus={handleFieldFocus} enterKeyHint="next" data-field-name="brand" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Location <span className="text-rose-500">*</span></label>
                <input ref={registerFieldRef('location')} type="text" name="location" required value={formData.location || ''} onChange={handleInputChange} onKeyDown={handleFieldKeyDown} onFocus={handleFieldFocus} enterKeyHint="next" data-field-name="location" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Supplier</label>
                <input ref={registerFieldRef('supplier')} type="text" name="supplier" value={formData.supplier || ''} onChange={handleInputChange} onKeyDown={handleFieldKeyDown} onFocus={handleFieldFocus} enterKeyHint="next" data-field-name="supplier" className={inputClass} />
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-xl p-3.5 sm:p-5 border border-emerald-200 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 sm:mb-4 uppercase tracking-wide pl-2">Quantity & Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity <span className="text-rose-500">*</span></label>
                <input ref={registerFieldRef('quantity')} type="text" inputMode="numeric" pattern="[0-9]*" name="quantity" required value={formData.quantity || ''} onChange={handleInputChange} onKeyDown={handleFieldKeyDown} onFocus={handleFieldFocus} enterKeyHint="next" data-field-name="quantity" className={pricingInputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit of Measure <span className="text-rose-500">*</span></label>
                {isMobileView ? (
                  <button
                    ref={registerFieldRef('unitOfMeasure')}
                    type="button"
                    onClick={() => setUnitPickerOpen(true)}
                    onFocus={handleFieldFocus}
                    data-field-name="unitOfMeasure"
                    className={`${pricingInputClass} flex items-center justify-between text-left`}
                  >
                    <span>{currentUnitLabel}</span>
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  </button>
                ) : (
                  <select ref={registerFieldRef('unitOfMeasure')} name="unitOfMeasure" required value={formData.unitOfMeasure || 'pcs'} onChange={handleInputChange} onKeyDown={handleFieldKeyDown} onFocus={handleFieldFocus} data-field-name="unitOfMeasure" className={pricingInputClass}>
                    {unitOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Buying Price (Rs)</label>
                <input ref={registerFieldRef('buyingPrice')} type="text" inputMode="decimal" name="buyingPrice" value={formData.buyingPrice || ''} onChange={handleInputChange} onKeyDown={handleFieldKeyDown} onFocus={handleFieldFocus} enterKeyHint="next" data-field-name="buyingPrice" className={pricingInputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">MRP (Rs)</label>
                <input ref={registerFieldRef('mrp')} type="text" inputMode="decimal" name="mrp" value={formData.mrp || ''} onChange={handleInputChange} onKeyDown={handleFieldKeyDown} onFocus={handleFieldFocus} enterKeyHint="next" data-field-name="mrp" className={pricingInputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Billing Date</label>
                <input ref={registerFieldRef('billingDate')} type="date" name="billingDate" value={formData.billingDate || ''} onChange={handleInputChange} onKeyDown={handleFieldKeyDown} onFocus={handleFieldFocus} enterKeyHint="next" data-field-name="billingDate" className={pricingInputClass} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea ref={registerFieldRef('description')} name="description" rows={3} value={formData.description || ''} onChange={handleInputChange} onKeyDown={handleFieldKeyDown} onFocus={handleFieldFocus} enterKeyHint="done" data-field-name="description"
              className="w-full px-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white resize-none" />
          </div>

          <div ref={partImagesSectionRef} className="bg-slate-50 rounded-xl p-3.5 sm:p-5 border border-slate-200">
            <label className="block text-xs sm:text-sm font-semibold text-slate-900 mb-2 sm:mb-3 uppercase tracking-wide">Part Images</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="btn-primary text-sm cursor-pointer text-center">
                <Camera className="w-4 h-4" /> Take Photo
                <input ref={partCameraInputRef} type="file" accept="image/*" multiple capture="environment" onChange={e => handleImageUpload(e, 'partImages')} disabled={uploadingImages} className="hidden" />
              </label>
              <label className="btn-secondary text-sm cursor-pointer text-center">
                <Upload className="w-4 h-4" /> Gallery
                <input ref={partGalleryInputRef} type="file" accept="image/*" multiple onChange={e => handleImageUpload(e, 'partImages')} disabled={uploadingImages} className="hidden" />
              </label>
            </div>
            {uploadingImages && <div className="flex items-center gap-2 text-sm text-emerald-600 mt-3"><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Uploading in background. You can keep filling the form.</div>}
            {(formData.partImages?.length || pendingPartUploads.length) ? (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(formData.partImages || []).map((url, i) => (
                  <div key={i} className="relative aspect-square bg-white rounded-lg overflow-hidden border border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(url, 'partImages')}
                      className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-rose-600 touch-manipulation shadow">x</button>
                  </div>
                ))}
                {pendingPartUploads.map(upload => (
                  <div key={upload.id} className="relative aspect-square overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50">
                    <img src={upload.previewUrl} alt="" className="h-full w-full object-cover opacity-70" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/35 px-3 text-center text-white">
                      <div className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      <span className="text-xs font-medium">Uploading...</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

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
            {uploadingBills && <div className="flex items-center gap-2 text-sm text-emerald-600 mt-3"><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Uploading in background. You can keep filling the form.</div>}
            {(formData.billImages?.length || pendingBillUploads.length) ? (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(formData.billImages || []).map((url, i) => (
                  <div key={i} className="relative aspect-square bg-white rounded-lg overflow-hidden border border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(url, 'billImages')}
                      className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-rose-600 touch-manipulation shadow">x</button>
                  </div>
                ))}
                {pendingBillUploads.map(upload => (
                  <div key={upload.id} className="relative aspect-square overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50">
                    <img src={upload.previewUrl} alt="" className="h-full w-full object-cover opacity-70" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/35 px-3 text-center text-white">
                      <div className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      <span className="text-xs font-medium">Uploading...</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </form>

        {isPage ? (
          <div className="sticky bottom-0 z-10 flex-shrink-0 border-t border-slate-200 bg-white/95 px-4 py-2.5 pb-safe backdrop-blur shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
            <div className="flex justify-end">
              <button
                type="submit"
                form="part-form"
                disabled={loading || (partNumberExists && !part?._id)}
                className="btn-primary min-w-[9rem] px-5 py-2.5 text-sm"
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                ) : part ? 'Update Part' : 'Add Part'}
              </button>
            </div>
          </div>
        ) : (
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
        )}

        {unitPickerOpen && isMobileView && (
          <div
            className="fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => setUnitPickerOpen(false)}
          >
            <div
              className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="mb-3">
                <h3 className="text-base font-semibold text-slate-900">Unit of Measure</h3>
                <p className="text-sm text-slate-500">Choose the unit, then we&apos;ll move to the next field.</p>
              </div>
              <div className="space-y-2">
                {unitOptions.map(option => {
                  const active = option.value === (formData.unitOfMeasure || 'pcs');
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleUnitSelection(option.value)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                        active
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <span>{option.label}</span>
                      {active && <span className="text-xs font-semibold uppercase tracking-wide">Selected</span>}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setUnitPickerOpen(false)}
                className="btn-secondary mt-4 w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {partImagePickerOpen && isMobileView && (
          <div
            className="fixed inset-0 z-[81] bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => setPartImagePickerOpen(false)}
          >
            <div
              className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="mb-3">
                <h3 className="text-base font-semibold text-slate-900">Add Part Photo</h3>
                <p className="text-sm text-slate-500">Choose camera or gallery for this part image.</p>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => triggerPartImageInput('camera')}
                  className="flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-medium text-emerald-700 transition-colors"
                >
                  <Camera className="h-5 w-5 shrink-0" />
                  <span>Take Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerPartImageInput('gallery')}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors"
                >
                  <Upload className="h-5 w-5 shrink-0" />
                  <span>Select From Gallery</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPartImagePickerOpen(false)}
                className="btn-secondary mt-4 w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
