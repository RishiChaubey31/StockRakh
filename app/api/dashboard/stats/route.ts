import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getInventoryCollection } from '@/lib/models/inventory';
import { getActivityCollection } from '@/lib/models/activity';

async function handleGET(request: NextRequest, userId: string) {
  try {
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
    
    // Get recent activities (last 10)
    const recentActivities = await activityCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    return NextResponse.json({
      totalParts,
      totalValue,
      recentActivities,
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

