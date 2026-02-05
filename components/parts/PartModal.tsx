'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

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
    partName: '',
    partNumber: '',
    code: '',
    quantity: 0,
    location: '',
    unitOfMeasure: 'pcs',
    brand: '',
    description: '',
    buyingPrice: undefined,
    mrp: undefined,
    supplier: '',
    billingDate: '',
    partImages: [],
    billImages: [],
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
        billingDate: part.billingDate
          ? new Date(part.billingDate).toISOString().split('T')[0]
          : '',
      });
    }
  }, [part]);

  // Function to check if part number exists
  const checkPartNumber = async (partNumber: string) => {
    if (!partNumber || partNumber.trim() === '') {
      setPartNumberExists(false);
      return;
    }

    setCheckingPartNumber(true);
    try {
      const params = new URLSearchParams({ partNumber });
      // If editing, exclude current part from check
      if (part?._id) {
        params.append('excludeId', part._id);
      }

      const response = await fetch(`/api/parts/check-number?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPartNumberExists(data.exists);
      } else {
        setPartNumberExists(false);
      }
    } catch (error) {
      console.error('Error checking part number:', error);
      setPartNumberExists(false);
    } finally {
      setCheckingPartNumber(false);
    }
  };

  // Debounced version of checkPartNumber
  const debouncedCheckPartNumber = useDebounce(checkPartNumber, 500);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // Check part number availability when it changes
    if (name === 'partNumber') {
      // Reset state immediately
      setPartNumberExists(false);
      // Trigger debounced check
      debouncedCheckPartNumber(value);
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'quantity' || name === 'buyingPrice' || name === 'mrp'
          ? value === ''
            ? 0 // Set to 0 instead of undefined for quantity when empty
            : parseFloat(value)
          : name === 'code'
          ? value.toUpperCase().replace(/[^A-Z]/g, '') // Only uppercase letters for code
          : name === 'billingDate' || name === 'unitOfMeasure'
          ? value // Keep original case for dates and select fields
          : value.toUpperCase(), // Convert all other text fields to uppercase
    }));
  };

  const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            file.type,
            quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    type: 'partImages' | 'billImages'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      e.target.value = '';
      return;
    }

    const setUploading = type === 'partImages' ? setUploadingImages : setUploadingBills;
    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        try {
          // Validate file type
          if (!file.type.startsWith('image/')) {
            throw new Error(`File ${file.name} is not an image`);
          }

          console.log(`Processing file ${index + 1}/${files.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

          // Compress image if it's larger than 2MB
          let fileToUpload = file;
          if (file.size > 2 * 1024 * 1024) {
            console.log(`Compressing ${file.name}...`);
            fileToUpload = await compressImage(file, 1920, 0.8);
            console.log(`Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
          }

          // Final size check (max 4MB after compression)
          const maxSize = 4 * 1024 * 1024; // 4MB
          if (fileToUpload.size > maxSize) {
            // Try more aggressive compression
            console.log(`File still too large, applying aggressive compression...`);
            fileToUpload = await compressImage(file, 1280, 0.6);
            if (fileToUpload.size > maxSize) {
              throw new Error(`File ${file.name} is too large even after compression. Please use a smaller image.`);
            }
          }

          const formData = new FormData();
          formData.append('file', fileToUpload);
          formData.append('folder', type === 'partImages' ? 'parts' : 'bills');

          const response = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText || 'Upload failed' };
            }
            console.error('Upload failed:', response.status, errorData);
            throw new Error(errorData.error || `Upload failed with status ${response.status}`);
          }

          const data = await response.json();
          console.log(`Successfully uploaded: ${file.name}`);
          return data.url;
        } catch (fileError: any) {
          console.error(`Error uploading ${file.name}:`, fileError);
          throw fileError;
        }
      });

      const urls = await Promise.all(uploadPromises);
      console.log('Uploaded URLs:', urls);
      
      // Update formData with new images
      const updatedFormData = {
        ...formData,
        [type]: [...(formData[type] || []), ...urls],
      };
      
      setFormData(updatedFormData);
      
      // If editing an existing part, save immediately to persist images
      if (part?._id) {
        try {
          const saveResponse = await fetch(`/api/parts/${part._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedFormData),
          });

          if (!saveResponse.ok) {
            throw new Error('Failed to save images');
          }

          console.log('Images saved successfully');
        } catch (saveError: any) {
          console.error('Error saving images:', saveError);
          alert('Images uploaded but failed to save. They will be saved when you submit the form.');
        }
      }
      
      // Reset input to allow uploading the same file again
      e.target.value = '';
    } catch (error: any) {
      console.error('Error uploading images:', error);
      const errorMessage = error.message || 'Failed to upload images. Please check your connection and try again.';
      alert(errorMessage);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (url: string, type: 'partImages' | 'billImages') => {
    setFormData((prev) => ({
      ...prev,
      [type]: (prev[type] || []).filter((img) => img !== url),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if part number already exists (for new parts only)
    if (partNumberExists && !part?._id) {
      alert('This part number already exists. Please use a different part number.');
      return;
    }
    
    setLoading(true);

    try {
      const url = part?._id ? `/api/parts/${part._id}` : '/api/parts';
      const method = part?._id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save part');
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving part:', error);
      alert(error.message || 'Failed to save part. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-2xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 sm:px-6 py-4 sm:py-5 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {part ? 'Edit Part' : 'Add New Part'}
              </h2>
              <p className="text-sm text-gray-500">
                {part ? 'Update part information' : 'Fill in the details below'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 active:text-gray-800 w-10 h-10 flex items-center justify-center touch-manipulation rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          {/* Basic Information Section */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Part Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="partName"
                  required
                  value={formData.partName || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Part Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="partNumber"
                    required
                    value={formData.partNumber || ''}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 text-base border rounded-xl focus:outline-none focus:ring-2 text-gray-900 bg-white transition-colors ${
                      partNumberExists
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                  />
                  {checkingPartNumber && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                {partNumberExists && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    This part number already exists in the database
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Code
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code || ''}
                  onChange={handleInputChange}
                  placeholder="Uppercase letters only"
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 uppercase font-mono bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Brand
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  required
                  value={formData.location || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Supplier
                </label>
                <input
                  type="text"
                  name="supplier"
                  value={formData.supplier || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Quantity & Pricing Section */}
          <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-200 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide pl-2">Quantity & Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  required
                  min="0"
                  value={formData.quantity || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-base border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Unit of Measure <span className="text-red-500">*</span>
                </label>
                <select
                  name="unitOfMeasure"
                  required
                  value={formData.unitOfMeasure || 'pcs'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-base border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                >
                  <option value="pcs">Pieces</option>
                  <option value="kg">Kilograms</option>
                  <option value="liters">Liters</option>
                  <option value="meters">Meters</option>
                  <option value="boxes">Boxes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Buying Price (₹)
                </label>
                <input
                  type="number"
                  name="buyingPrice"
                  min="0"
                  step="0.01"
                  value={formData.buyingPrice || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-base border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  MRP (₹)
                </label>
                <input
                  type="number"
                  name="mrp"
                  min="0"
                  step="0.01"
                  value={formData.mrp || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-base border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Billing Date
                </label>
                <input
                  type="date"
                  name="billingDate"
                  value={formData.billingDate || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-base border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors resize-none"
            />
          </div>

          {/* Part Images */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <label className="block text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
              Part Images
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label
                htmlFor="part-images-camera"
                className="w-full sm:w-auto px-4 py-3 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 cursor-pointer text-center touch-manipulation transition-colors"
              >
                Take Photo
              </label>
              <label
                htmlFor="part-images-gallery"
                className="w-full sm:w-auto px-4 py-3 text-sm font-semibold rounded-lg text-indigo-700 bg-white border border-indigo-300 hover:bg-indigo-50 active:bg-indigo-100 cursor-pointer text-center touch-manipulation transition-colors"
              >
                Choose from Gallery
              </label>
              <input
                id="part-images-camera"
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={(e) => handleImageUpload(e, 'partImages')}
                disabled={uploadingImages}
                className="hidden"
              />
              <input
                id="part-images-gallery"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload(e, 'partImages')}
                disabled={uploadingImages}
                className="hidden"
              />
            </div>
            {uploadingImages && (
              <div className="flex items-center gap-2 text-sm text-indigo-600 mt-3">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </div>
            )}
            {formData.partImages && formData.partImages.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {formData.partImages.map((url, index) => (
                  <div key={index} className="relative aspect-square bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <img
                      src={url}
                      alt={`Part ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(url, 'partImages')}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 active:bg-red-700 touch-manipulation shadow-lg transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bill Images */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <label className="block text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
              Bill Images
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label
                htmlFor="bill-images-camera"
                className="w-full sm:w-auto px-4 py-3 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 cursor-pointer text-center touch-manipulation transition-colors"
              >
                Take Photo
              </label>
              <label
                htmlFor="bill-images-gallery"
                className="w-full sm:w-auto px-4 py-3 text-sm font-semibold rounded-lg text-indigo-700 bg-white border border-indigo-300 hover:bg-indigo-50 active:bg-indigo-100 cursor-pointer text-center touch-manipulation transition-colors"
              >
                Choose from Gallery
              </label>
              <input
                id="bill-images-camera"
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={(e) => handleImageUpload(e, 'billImages')}
                disabled={uploadingBills}
                className="hidden"
              />
              <input
                id="bill-images-gallery"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload(e, 'billImages')}
                disabled={uploadingBills}
                className="hidden"
              />
            </div>
            {uploadingBills && (
              <div className="flex items-center gap-2 text-sm text-indigo-600 mt-3">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </div>
            )}
            {formData.billImages && formData.billImages.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {formData.billImages.map((url, index) => (
                  <div key={index} className="relative aspect-square bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <img
                      src={url}
                      alt={`Bill ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(url, 'billImages')}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 active:bg-red-700 touch-manipulation shadow-lg transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white -mx-5 sm:-mx-6 px-5 sm:px-6 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 text-sm font-semibold border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 active:bg-gray-100 touch-manipulation transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (partNumberExists && !part?._id)}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation transition-colors shadow-sm inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : part ? 'Update Part' : 'Add Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

