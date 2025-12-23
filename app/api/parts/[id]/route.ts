import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getInventoryCollection } from '@/lib/models/inventory';
import { inventoryItemSchema } from '@/lib/validators/inventory';
import { createActivity } from '@/lib/models/activity';
import { deleteMultipleImagesByUrls } from '@/lib/services/cloudinary';

async function handleGET(
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Dynamic import to avoid Turbopack issues
    const { ObjectId } = await import('mongodb');
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid part ID' }, { status: 400 });
    }
    
    const collection = await getInventoryCollection();
    const part = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 });
    }
    
    return NextResponse.json({ part });
  } catch (error) {
    console.error('Error fetching part:', error);
    return NextResponse.json(
      { error: 'Failed to fetch part' },
      { status: 500 }
    );
  }
}

async function handlePUT(
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Dynamic import to avoid Turbopack issues
    const { ObjectId } = await import('mongodb');
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid part ID' }, { status: 400 });
    }
    
    const body = await request.json();
    const validated = inventoryItemSchema.parse(body);
    
    const collection = await getInventoryCollection();
    const existingPart = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!existingPart) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 });
    }
    
    // Detect removed images and delete them from Cloudinary
    const existingPartImages = existingPart.partImages || [];
    const existingBillImages = existingPart.billImages || [];
    const newPartImages = validated.partImages || [];
    const newBillImages = validated.billImages || [];
    
    // Find images that were removed (present in existing but not in new)
    const removedPartImages = existingPartImages.filter(
      (url: string) => !newPartImages.includes(url)
    );
    const removedBillImages = existingBillImages.filter(
      (url: string) => !newBillImages.includes(url)
    );
    const removedImages = [...removedPartImages, ...removedBillImages];
    
    // Delete removed images from Cloudinary
    if (removedImages.length > 0) {
      console.log(`Deleting ${removedImages.length} removed images from Cloudinary for part ${id}`);
      const deleteResult = await deleteMultipleImagesByUrls(removedImages);
      console.log(`Cloudinary cleanup: ${deleteResult.successCount}/${removedImages.length} images deleted`);
      
      if (deleteResult.failedUrls.length > 0) {
        console.warn(`Failed to delete ${deleteResult.failedUrls.length} images from Cloudinary:`, deleteResult.failedUrls);
      }
    }
    
    const updateData = {
      ...validated,
      billingDate: validated.billingDate ? new Date(validated.billingDate) : undefined,
      updatedAt: new Date(),
    };
    
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    // Check if quantity changed
    const activityType = existingPart.quantity !== validated.quantity ? 'quantity_change' : 'edit';
    const details = activityType === 'quantity_change' 
      ? `Quantity changed from ${existingPart.quantity} to ${validated.quantity}`
      : undefined;
    
    await createActivity(activityType, validated.partName, validated.partNumber, id, details);
    
    return NextResponse.json({ 
      success: true,
      imagesDeleted: removedImages.length
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating part:', error);
    return NextResponse.json(
      { error: 'Failed to update part' },
      { status: 500 }
    );
  }
}

async function handleDELETE(
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Dynamic import to avoid Turbopack issues
    const { ObjectId } = await import('mongodb');
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid part ID' }, { status: 400 });
    }
    
    const collection = await getInventoryCollection();
    const part = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 });
    }
    
    // Collect all image URLs to delete from Cloudinary
    const imageUrls: string[] = [
      ...(part.partImages || []),
      ...(part.billImages || []),
    ];
    
    // Delete images from Cloudinary first
    if (imageUrls.length > 0) {
      console.log(`Deleting ${imageUrls.length} images from Cloudinary for part ${id}`);
      const deleteResult = await deleteMultipleImagesByUrls(imageUrls);
      console.log(`Cloudinary cleanup: ${deleteResult.successCount}/${imageUrls.length} images deleted`);
      
      // Log any failed deletions but continue with database deletion
      if (deleteResult.failedUrls.length > 0) {
        console.warn(`Failed to delete ${deleteResult.failedUrls.length} images from Cloudinary:`, deleteResult.failedUrls);
      }
    }
    
    // Delete the database record
    await collection.deleteOne({ _id: new ObjectId(id) });
    
    // Log activity
    await createActivity('delete', part.partName, part.partNumber, id);
    
    return NextResponse.json({ 
      success: true,
      imagesDeleted: imageUrls.length > 0 ? imageUrls.length : 0
    });
  } catch (error) {
    console.error('Error deleting part:', error);
    return NextResponse.json(
      { error: 'Failed to delete part' },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest, context: { params: Promise<{ id: string }> }) => 
  requireAuth(request, (req, userId) => handleGET(req, userId, context));

export const PUT = (request: NextRequest, context: { params: Promise<{ id: string }> }) => 
  requireAuth(request, (req, userId) => handlePUT(req, userId, context));

export const DELETE = (request: NextRequest, context: { params: Promise<{ id: string }> }) => 
  requireAuth(request, (req, userId) => handleDELETE(req, userId, context));
