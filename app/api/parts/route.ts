import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getInventoryCollection } from '@/lib/models/inventory';
import { inventoryItemSchema } from '@/lib/validators/inventory';
import { createActivity } from '@/lib/models/activity';

async function handleGET(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 20);
    const skip = (page - 1) * limit;
    
    const collection = await getInventoryCollection();
    
    // Get total count
    const total = await collection.countDocuments();
    
    // Get paginated parts
    const parts = await collection
      .find({})
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
    console.error('Error fetching parts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parts' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    
    // Validate input
    const validated = inventoryItemSchema.parse(body);
    
    const collection = await getInventoryCollection();
    const now = new Date();
    
    const newPart = {
      ...validated,
      billingDate: validated.billingDate ? new Date(validated.billingDate) : undefined,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await collection.insertOne(newPart);
    
    // Log activity
    await createActivity('add', validated.partName, validated.partNumber, result.insertedId);
    
    return NextResponse.json({ 
      success: true, 
      part: { ...newPart, _id: result.insertedId } 
    }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating part:', error);
    return NextResponse.json(
      { error: 'Failed to create part' },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => 
  requireAuth(request, handleGET);

export const POST = (request: NextRequest) => 
  requireAuth(request, handlePOST);
