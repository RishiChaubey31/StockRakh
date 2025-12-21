import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getInventoryCollection } from '@/lib/models/inventory';

async function handleGET(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 20);
    const skip = (page - 1) * limit;
    
    const collection = await getInventoryCollection();
    
    let filter: any = {};
    let total: number;
    let parts;
    
    if (query.trim()) {
      // Text search across multiple fields
      filter = {
        $or: [
          { partName: { $regex: query, $options: 'i' } },
          { partNumber: { $regex: query, $options: 'i' } },
          { code: { $regex: query, $options: 'i' } },
          { brand: { $regex: query, $options: 'i' } },
          { supplier: { $regex: query, $options: 'i' } },
          { location: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
        ],
      };
    }
    
    // Get total count
    total = await collection.countDocuments(filter);
    
    // Get paginated parts
    parts = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    return NextResponse.json({
      parts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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
