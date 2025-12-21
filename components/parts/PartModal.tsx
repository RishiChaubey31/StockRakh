'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';

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

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'quantity' || name === 'buyingPrice' || name === 'mrp'
          ? value === ''
            ? undefined
            : parseFloat(value)
          : name === 'code'
          ? value.toUpperCase().replace(/[^A-Z]/g, '') // Only uppercase letters
          : value,
    }));
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

          // Check file size (max 10MB)
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (file.size > maxSize) {
            throw new Error(`File ${file.name} is too large. Maximum size is 10MB`);
          }

          console.log(`Uploading file ${index + 1}/${files.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

          const formData = new FormData();
          formData.append('file', file);
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
      setFormData((prev) => ({
        ...prev,
        [type]: [...(prev[type] || []), ...urls],
      }));
      
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-lg max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center z-10">
          <h2 className="text-lg sm:text-xl font-semibold">
            {part ? 'Edit Part' : 'Add New Part'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 active:text-gray-800 text-2xl w-10 h-10 flex items-center justify-center touch-manipulation"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                className="w-full px-4 py-3 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Part Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="partNumber"
                required
                value={formData.partNumber || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-3 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
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
                className="w-full px-4 py-3 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 uppercase font-mono"
              />
            </div>

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
                className="w-full px-4 py-3 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
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
                className="w-full px-4 py-3 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
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
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="location"
                required
                value={formData.location || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-3 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
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
                className="w-full px-4 py-3 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
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
                className="w-full px-4 py-3 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
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
                className="w-full px-4 py-3 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
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
                className="w-full px-4 py-3 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
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
                className="w-full px-4 py-3 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-3 sm:py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Part Images
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageUpload(e, 'partImages')}
              disabled={uploadingImages}
              className="w-full px-4 py-3 sm:py-2 text-base border-2 border-dashed border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {uploadingImages && (
              <p className="text-sm text-gray-500 mt-1">Uploading...</p>
            )}
            {formData.partImages && formData.partImages.length > 0 && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {formData.partImages.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Part ${index + 1}`}
                      className="w-full h-24 sm:h-20 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(url, 'partImages')}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center text-lg sm:text-xs touch-manipulation"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bill Images
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageUpload(e, 'billImages')}
              disabled={uploadingBills}
              className="w-full px-4 py-3 sm:py-2 text-base border-2 border-dashed border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {uploadingBills && (
              <p className="text-sm text-gray-500 mt-1">Uploading...</p>
            )}
            {formData.billImages && formData.billImages.length > 0 && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {formData.billImages.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Bill ${index + 1}`}
                      className="w-full h-24 sm:h-20 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(url, 'billImages')}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center text-lg sm:text-xs touch-manipulation"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t sticky bottom-0 bg-white -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 sm:pb-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 text-base border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 active:bg-gray-100 touch-manipulation min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 text-base bg-indigo-600 text-white rounded-md hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 touch-manipulation min-h-[44px] font-medium"
            >
              {loading ? 'Saving...' : part ? 'Update Part' : 'Add Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

