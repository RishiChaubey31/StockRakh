import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { uploadImage } from '@/lib/services/cloudinary';

async function handlePOST(request: NextRequest, userId: string) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'inventory';
    
    if (!file) {
      console.error('No file provided in request');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Log file info for debugging
    console.log('Uploading file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      folder: folder
    });
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('File buffer created, size:', buffer.length);
    
    const url = await uploadImage(buffer, folder);
    console.log('Image uploaded successfully, URL:', url);
    
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}

export const POST = (request: NextRequest) => 
  requireAuth(request, handlePOST);
