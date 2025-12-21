import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/mongodb';

export async function verifyAuth(request: NextRequest): Promise<{ authenticated: boolean; userId?: string }> {
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    return { authenticated: false };
  }

  try {
    const db = await getDb();
    const sessions = db.collection('sessions');
    const session = await sessions.findOne({ token: sessionToken });

    if (!session || session.expiresAt < new Date()) {
      return { authenticated: false };
    }

    return { authenticated: true, userId: session.userId };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { authenticated: false };
  }
}

export async function requireAuth(
  request: NextRequest,
  handler: (request: NextRequest, userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = await verifyAuth(request);

  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return handler(request, auth.userId!);
}
