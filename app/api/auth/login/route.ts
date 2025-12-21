import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/mongodb';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get credentials from environment variables
    const envUsername = process.env.ADMIN_USERNAME;
    const envPassword = process.env.ADMIN_PASSWORD;

    if (!envUsername || !envPassword) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing ADMIN_USERNAME or ADMIN_PASSWORD in environment variables' },
        { status: 500 }
      );
    }

    // Verify username
    if (username !== envUsername) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password (plain text comparison)
    if (password !== envPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    try {
      const db = await getDb();
      const sessions = db.collection('sessions');
      await sessions.insertOne({
        token: sessionToken,
        userId: username,
        expiresAt,
        createdAt: new Date(),
      });
    } catch (dbError) {
      console.error('Database error during login:', dbError);
      return NextResponse.json(
        { error: 'Database connection error. Please check your MongoDB connection.' },
        { status: 500 }
      );
    }

    // Set cookie
    try {
      const cookieStore = await cookies();
      cookieStore.set('session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
      });
    } catch (cookieError) {
      console.error('Cookie error during login:', cookieError);
      // Continue even if cookie setting fails - session is still in DB
    }

    return NextResponse.json({ success: true, user: { username } });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
