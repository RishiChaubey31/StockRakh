import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getInventoryCollection } from '@/lib/models/inventory';
import { getActivityCollection } from '@/lib/models/activity';

async function handleGET(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;
    
    const collection = await getInventoryCollection();
    const activityCollection = await getActivityCollection();
    
    // Get total parts count
    const totalParts = await collection.countDocuments();
    
    // Calculate total inventory value
    const allParts = await collection.find({}).toArray();
    const totalValue = allParts.reduce((sum, part) => {
      if (part.buyingPrice && part.quantity) {
        return sum + (part.buyingPrice * part.quantity);
      }
      return sum;
    }, 0);
    
    // Get paginated activities
    const totalActivities = await activityCollection.countDocuments();
    const recentActivities = await activityCollection
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    return NextResponse.json({
      totalParts,
      totalValue,
      activities: {
        data: recentActivities,
        pagination: {
          page,
          limit,
          total: totalActivities,
          totalPages: Math.ceil(totalActivities / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => 
  requireAuth(request, handleGET);

