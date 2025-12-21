import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { uploadImage } from '@/lib/services/cloudinary';

async function handlePOST(request: NextRequest, userId: string) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'inventory';
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadImage(buffer, folder);
    
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

export const POST = (request: NextRequest) => 
  requireAuth(request, handlePOST);
