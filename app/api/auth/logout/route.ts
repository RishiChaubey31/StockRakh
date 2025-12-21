import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/mongodb';
import { cookies } from 'next/headers';
import { verifyAuth } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    
    if (auth.authenticated) {
      const sessionToken = request.cookies.get('session')?.value;
      if (sessionToken) {
        const db = await getDb();
        const sessions = db.collection('sessions');
        await sessions.deleteOne({ token: sessionToken });
      }
    }

    const cookieStore = await cookies();
    cookieStore.delete('session');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
