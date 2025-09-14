import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getUserFromToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { fallbackDB } from '@/lib/mongodb-fallback';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = getUserFromToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Try MongoDB first, fallback to in-memory if it fails
    try {
      const client = await clientPromise;
      const db = client.db('onboardcademy');
      const users = db.collection('users');

      const user = await users.findOne(
        { _id: new ObjectId(decoded.userId) },
        { projection: { password: 0 } }
      );

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({ user });

    } catch (mongoError) {
      console.warn('MongoDB unavailable, using fallback database:', mongoError instanceof Error ? mongoError.message : String(mongoError));

      // Use fallback database
      const user = await fallbackDB.findUserById(decoded.userId);

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Remove password from response
      const { password: _password, ...userWithoutPassword } = user;

      return NextResponse.json({ user: userWithoutPassword });
    }

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}