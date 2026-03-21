import type { Filter } from 'mongodb';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getInventoryCollection, type InventoryItem } from '@/lib/models/inventory';

async function handleGET(request: NextRequest, _userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const partNumber = searchParams.get('partNumber');
    const excludeId = searchParams.get('excludeId'); // For edit mode, exclude current part

    if (!partNumber) {
      return NextResponse.json(
        { error: 'Part number is required' },
        { status: 400 }
      );
    }

    const collection = await getInventoryCollection();
    
    const query: Filter<InventoryItem> = { partNumber };

    if (excludeId) {
      query._id = { $ne: new ObjectId(excludeId) };
    }

    const existingPart = await collection.findOne(query);

    return NextResponse.json({
      exists: !!existingPart,
      part: existingPart ? {
        _id: existingPart._id,
        partName: existingPart.partName,
        partNumber: existingPart.partNumber,
      } : null,
    });
  } catch (error) {
    console.error('Error checking part number:', error);
    return NextResponse.json(
      { error: 'Failed to check part number' },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => 
  requireAuth(request, handleGET);
