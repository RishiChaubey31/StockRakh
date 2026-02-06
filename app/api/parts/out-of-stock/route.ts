import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getInventoryCollection } from '@/lib/models/inventory';

async function handleGET(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 50);
    const skip = (page - 1) * limit;
    
    const supplier = searchParams.get('supplier');
    const search = searchParams.get('search');
    
    const collection = await getInventoryCollection();
    
    // Build query - only items with quantity = 0
    const query: any = { quantity: 0 };
    
    // Add supplier filter if provided
    if (supplier && supplier !== 'all') {
      query.supplier = supplier;
    }
    
    // Add search filter if provided (search in partName and partNumber)
    if (search) {
      query.$or = [
        { partName: { $regex: search, $options: 'i' } },
        { partNumber: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Get total count with filters
    const total = await collection.countDocuments(query);
    
    // Get paginated out-of-stock parts
    const parts = await collection
      .find(query)
      .sort({ partName: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Get unique suppliers for filter dropdown
    const suppliers = await collection
      .distinct('supplier', { quantity: 0, supplier: { $exists: true, $ne: '' } });
    
    return NextResponse.json({
      parts,
      suppliers: suppliers.filter(Boolean).sort(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching out-of-stock parts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch out-of-stock parts' },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => 
  requireAuth(request, handleGET);
