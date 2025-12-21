'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

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
    if (!files || files.length === 0) return;

    const setUploading = type === 'partImages' ? setUploadingPartImages : setUploadingBillImages;
    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', type === 'partImages' ? 'parts' : 'bills');

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
      setFormData((prev) => ({
        ...prev,
        [type]: [...(prev[type] || []), ...urls],
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string, type: 'partImages' | 'billImages') => {
    setFormData((prev) => ({
      ...prev,
      [type]: (prev[type] || []).filter((img) => img !== url),
    }));
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/parts"
            className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Parts
          </Link>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(part);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Left Panel - Image */}
            <div>
              <div className="w-full max-w-sm mx-auto">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                  {displayData?.partImages && displayData.partImages.length > 0 ? (
                    <img
                      src={displayData.partImages[0]}
                      alt={displayData.partName}
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image Available
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Part Images
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(e, 'partImages')}
                      disabled={uploadingPartImages}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm"
                    />
                    {uploadingPartImages && (
                      <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                    )}
                  </div>
                )}
                {displayData?.partImages && displayData.partImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {displayData.partImages.slice(1).map((img, idx) => (
                      <div key={idx} className="relative aspect-square bg-gray-100 rounded overflow-hidden">
                        <img src={img} alt={`${displayData.partName} ${idx + 2}`} className="w-full h-full object-contain p-1" />
                        {isEditing && (
                          <button
                            onClick={() => removeImage(img, 'partImages')}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {isEditing && displayData?.partImages && displayData.partImages.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-2">Click × to remove images</p>
                    <div className="grid grid-cols-4 gap-2">
                      {displayData.partImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-square bg-gray-100 rounded overflow-hidden">
                          <img src={img} alt={`${displayData.partName} ${idx + 1}`} className="w-full h-full object-contain p-1" />
                          <button
                            onClick={() => removeImage(img, 'partImages')}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Details */}
            <div>
              <div className="mb-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  {isEditing ? (
                    <input
                      type="text"
                      name="partName"
                      value={formData.partName || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  ) : (
                    displayData?.partName
                  )}
                </h1>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <span className="text-sm text-gray-500">Part Number:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="partNumber"
                      value={formData.partNumber || ''}
                      onChange={handleInputChange}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  ) : (
                    <span className="ml-2 text-gray-900">{displayData?.partNumber}</span>
                  )}
                </div>

                <div>
                  <span className="text-sm text-gray-500">Code:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="code"
                      value={formData.code || ''}
                      onChange={handleInputChange}
                      placeholder="Uppercase letters only"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 uppercase font-mono"
                    />
                  ) : (
                    <span className="ml-2 text-gray-900 font-mono">{displayData?.code || '-'}</span>
                  )}
                </div>

                <div>
                  <span className="text-sm text-gray-500">Brand:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand || ''}
                      onChange={handleInputChange}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  ) : (
                    <span className="ml-2 text-gray-900">{displayData?.brand || '-'}</span>
                  )}
                </div>

                <div>
                  <span className="text-sm text-gray-500">Buying Price:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      name="buyingPrice"
                      value={formData.buyingPrice || ''}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  ) : displayData?.buyingPrice ? (
                    <span className="ml-2 text-2xl font-bold text-gray-900">
                      ₹{displayData.buyingPrice.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="ml-2 text-gray-500">-</span>
                  )}
                </div>

                {displayData?.mrp && (
                  <div>
                    <span className="text-sm text-gray-500">MRP:</span>
                    {isEditing ? (
                      <input
                        type="number"
                        name="mrp"
                        value={formData.mrp || ''}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      />
                    ) : (
                      <span className="ml-2 text-gray-900">₹{displayData.mrp.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                )}

                <div>
                  <span className="text-sm text-gray-500">Quantity:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity || ''}
                      onChange={handleInputChange}
                      min="0"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  ) : (
                    <span className="ml-2 text-gray-900">
                      {displayData?.quantity} {displayData?.unitOfMeasure}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-sm text-gray-500">Location:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="location"
                      value={formData.location || ''}
                      onChange={handleInputChange}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  ) : (
                    <span className="ml-2 text-gray-900">{displayData?.location}</span>
                  )}
                </div>

                <div>
                  <span className="text-sm text-gray-500">Description:</span>
                  {isEditing ? (
                    <textarea
                      name="description"
                      value={formData.description || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{displayData?.description || '-'}</p>
                  )}
                </div>

                <div>
                  <span className="text-sm text-gray-500">Supplier:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="supplier"
                      value={formData.supplier || ''}
                      onChange={handleInputChange}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  ) : (
                    <span className="ml-2 text-gray-900">{displayData?.supplier || '-'}</span>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Billing Images</h3>
                {isEditing && (
                  <div className="mb-4">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(e, 'billImages')}
                      disabled={uploadingBillImages}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm"
                    />
                    {uploadingBillImages && (
                      <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                    )}
                  </div>
                )}
                {displayData?.billImages && displayData.billImages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {displayData.billImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-square bg-gray-100 rounded overflow-hidden">
                        <img
                          src={img}
                          alt={`Bill ${idx + 1}`}
                          className="w-full h-full object-contain p-2 cursor-pointer hover:opacity-80"
                          onClick={() => !isEditing && window.open(img, '_blank')}
                        />
                        {isEditing && (
                          <button
                            onClick={() => removeImage(img, 'billImages')}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No billing images</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
