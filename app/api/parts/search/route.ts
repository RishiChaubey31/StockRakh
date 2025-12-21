import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getInventoryCollection } from '@/lib/models/inventory';

async function handleGET(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    const collection = await getInventoryCollection();
    
    let parts;
    
    if (query.trim()) {
      // Text search across multiple fields
      parts = await collection.find({
        $or: [
          { partName: { $regex: query, $options: 'i' } },
          { partNumber: { $regex: query, $options: 'i' } },
          { code: { $regex: query, $options: 'i' } },
          { brand: { $regex: query, $options: 'i' } },
          { supplier: { $regex: query, $options: 'i' } },
          { location: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
        ],
      }).sort({ createdAt: -1 }).toArray();
    } else {
      parts = await collection.find({}).sort({ createdAt: -1 }).toArray();
    }
    
    return NextResponse.json({ parts });
  } catch (error) {
    console.error('Error searching parts:', error);
    return NextResponse.json(
      { error: 'Failed to search parts' },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => 
  requireAuth(request, handleGET);
