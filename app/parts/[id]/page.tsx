'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

export default function PartDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const [part, setPart] = useState<Part | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Part>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingPartImages, setUploadingPartImages] = useState(false);
  const [uploadingBillImages, setUploadingBillImages] = useState(false);
  const [imageModal, setImageModal] = useState<{
    open: boolean;
    images: string[];
    currentIndex: number;
  } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated && id) {
      fetchPart();
    }
  }, [authenticated, id]);

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

  const fetchPart = async () => {
    try {
      const response = await fetch(`/api/parts/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch part');
      }
      const data = await response.json();
      setPart(data.part);
      setFormData(data.part);
    } catch (error) {
      console.error('Error fetching part:', error);
      router.push('/parts');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
          ? value.toUpperCase().replace(/[^A-Z]/g, '')
          : value,
    }));
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'partImages' | 'billImages'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      e.target.value = '';
      return;
    }

    const setUploading = type === 'partImages' ? setUploadingPartImages : setUploadingBillImages;
    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`File ${file.name} is not an image`);
        }

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          throw new Error(`File ${file.name} is too large. Maximum size is 10MB`);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', type === 'partImages' ? 'parts' : 'bills');

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();
        return data.url;
      });

      const urls = await Promise.all(uploadPromises);
      setFormData((prev) => ({
        ...prev,
        [type]: [...(prev[type] || []), ...urls],
      }));
      
      // Refresh part data
      fetchPart();
      
      // Reset input
      e.target.value = '';
    } catch (error: any) {
      console.error('Error uploading images:', error);
      const errorMessage = error.message || 'Failed to upload images. Please try again.';
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

  const handleImageClick = (imageIndex: number) => {
    if (part?.partImages && part.partImages.length > 0) {
      setImageModal({
        open: true,
        images: part.partImages,
        currentIndex: imageIndex,
      });
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!part) return;

    try {
      const updatedImages = part.partImages?.filter((img) => img !== imageUrl) || [];

      const response = await fetch(`/api/parts/${id}`, {
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
        fetchPart();
      } else {
        setImageModal({
          ...imageModal!,
          images: updatedImages,
          currentIndex: Math.min(imageModal!.currentIndex, updatedImages.length - 1),
        });
        fetchPart();
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. Please try again.');
    }
  };

  const handleAddImages = async (files: File[]) => {
    if (!part) return;

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

      // Add images to part
      const updatedImages = [...(part.partImages || []), ...urls];

      const response = await fetch(`/api/parts/${id}`, {
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
      if (imageModal) {
        setImageModal({
          ...imageModal,
          images: updatedImages,
        });
      }

      fetchPart();
    } catch (error) {
      console.error('Error adding images:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/parts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save part');
      }

      setIsEditing(false);
      fetchPart();
    } catch (error) {
      console.error('Error saving part:', error);
      alert('Failed to save part. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${part?.partName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/parts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete part');
      }

      router.push('/parts');
    } catch (error) {
      console.error('Error deleting part:', error);
      alert('Failed to delete part. Please try again.');
    }
  };

  if (!authenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!part) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-500">Part not found</div>
      </div>
    );
  }

  const displayData = isEditing ? formData : part;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            href="/parts"
            className="inline-flex items-center gap-2 text-sm sm:text-base text-indigo-600 hover:text-indigo-700 active:text-indigo-800 font-medium transition-colors touch-manipulation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Parts
          </Link>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(part);
                  }}
                  className="flex-1 sm:flex-initial px-5 py-2.5 text-sm sm:text-base border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 font-medium transition-colors touch-manipulation min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 sm:flex-initial px-5 py-2.5 text-sm sm:text-base bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors touch-manipulation min-h-[44px] shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 text-sm sm:text-base bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 font-medium transition-colors touch-manipulation min-h-[44px] shadow-sm"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 sm:flex-initial px-5 py-2.5 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 font-medium transition-colors touch-manipulation min-h-[44px] shadow-sm"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 p-6 sm:p-8 lg:p-10">
            {/* Left Panel - Image */}
            <div className="space-y-4">
              <div className="w-full">
                <div 
                  className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden mb-4 cursor-pointer relative border-2 border-gray-200 shadow-inner"
                  onClick={() => !isEditing && displayData?.partImages && displayData.partImages.length > 0 && handleImageClick(0)}
                >
                  {displayData?.partImages && displayData.partImages.length > 0 ? (
                    <>
                      <img
                        src={displayData.partImages[0]}
                        alt={displayData.partName}
                        className="w-full h-full object-contain p-6"
                      />
                      {displayData.partImages.length > 1 && (
                        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
                          {displayData.partImages.length} Images
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <svg className="w-16 h-16 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">No Image Available</span>
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Upload Part Images
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      onChange={(e) => handleImageUpload(e, 'partImages')}
                      disabled={uploadingPartImages}
                      className="w-full px-4 py-3 text-base border-2 border-dashed border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    {uploadingPartImages && (
                      <p className="text-sm text-indigo-600 mt-2 font-medium">Uploading images...</p>
                    )}
                  </div>
                )}
                {displayData?.partImages && displayData.partImages.length > 1 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">All Images</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {displayData.partImages.map((img, idx) => (
                        <div 
                          key={idx} 
                          className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-indigo-400 transition-colors shadow-sm"
                          onClick={() => !isEditing && handleImageClick(idx)}
                        >
                          <img src={img} alt={`${displayData.partName} ${idx + 1}`} className="w-full h-full object-contain p-2" />
                          {isEditing && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(img, 'partImages');
                              }}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 active:bg-red-700 touch-manipulation shadow-lg transition-colors"
                            >
                              ×
                            </button>
                          )}
                          <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                            {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Details */}
            <div className="space-y-6 sm:space-y-8">
              {/* Part Name */}
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                  {isEditing ? (
                    <input
                      type="text"
                      name="partName"
                      value={formData.partName || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 text-xl sm:text-2xl border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-bold"
                    />
                  ) : (
                    displayData?.partName
                  )}
                </h1>
              </div>

              {/* Basic Information Card */}
              <div className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-300">Basic Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Part Number</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="partNumber"
                        value={formData.partNumber || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                      />
                    ) : (
                      <p className="text-base font-medium text-gray-900">{displayData?.partNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Code</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="code"
                        value={formData.code || ''}
                        onChange={handleInputChange}
                        placeholder="Uppercase letters only"
                        className="w-full px-4 py-2.5 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 uppercase font-mono bg-white transition-colors"
                      />
                    ) : (
                      <p className="text-base font-medium text-gray-900 font-mono">{displayData?.code || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Brand</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="brand"
                        value={formData.brand || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                      />
                    ) : (
                      <p className="text-base font-medium text-gray-900">{displayData?.brand || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Location</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="location"
                        value={formData.location || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                      />
                    ) : (
                      <p className="text-base font-medium text-gray-900">{displayData?.location}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Quantity</label>
                    {isEditing ? (
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity || ''}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-4 py-2.5 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                      />
                    ) : (
                      <p className="text-base font-medium text-gray-900">
                        {displayData?.quantity} {displayData?.unitOfMeasure}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing Information Card */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 sm:p-6 border-2 border-indigo-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-indigo-300">Pricing</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Buying Price</label>
                    {isEditing ? (
                      <input
                        type="number"
                        name="buyingPrice"
                        value={formData.buyingPrice || ''}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2.5 text-base border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                      />
                    ) : displayData?.buyingPrice ? (
                      <p className="text-2xl sm:text-3xl font-bold text-indigo-700">
                        ₹{displayData.buyingPrice.toLocaleString('en-IN')}
                      </p>
                    ) : (
                      <p className="text-base text-gray-500">-</p>
                    )}
                  </div>

                  {displayData?.mrp && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">MRP</label>
                      {isEditing ? (
                        <input
                          type="number"
                          name="mrp"
                          value={formData.mrp || ''}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2.5 text-base border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                        />
                      ) : (
                        <p className="text-2xl sm:text-3xl font-bold text-indigo-700">
                          ₹{displayData.mrp.toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information Card */}
              <div className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-300">Additional Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Description</label>
                    {isEditing ? (
                      <textarea
                        name="description"
                        value={formData.description || ''}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors resize-none"
                      />
                    ) : (
                      <p className="text-base text-gray-900 leading-relaxed">{displayData?.description || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Supplier</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="supplier"
                        value={formData.supplier || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                      />
                    ) : (
                      <p className="text-base font-medium text-gray-900">{displayData?.supplier || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Billing Images Section */}
              <div className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-300">Billing Images</h2>
                {isEditing && (
                  <div className="mb-4 bg-white rounded-lg p-4 border-2 border-dashed border-gray-300">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      onChange={(e) => handleImageUpload(e, 'billImages')}
                      disabled={uploadingBillImages}
                      className="w-full px-4 py-3 text-base border-2 border-dashed border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    {uploadingBillImages && (
                      <p className="text-sm text-indigo-600 mt-2 font-medium">Uploading images...</p>
                    )}
                  </div>
                )}
                {displayData?.billImages && displayData.billImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {displayData.billImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <img
                          src={img}
                          alt={`Bill ${idx + 1}`}
                          className="w-full h-full object-contain p-3 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => !isEditing && window.open(img, '_blank')}
                        />
                        {isEditing && (
                          <button
                            onClick={() => removeImage(img, 'billImages')}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 active:bg-red-700 touch-manipulation shadow-lg transition-colors"
                          >
                            ×
                          </button>
                        )}
                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                          Bill {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-gray-500">No billing images</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {imageModal && imageModal.open && part && (
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
