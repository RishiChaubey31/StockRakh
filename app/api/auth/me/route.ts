import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);

  if (!auth.authenticated) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, user: { username: auth.userId } });
}
