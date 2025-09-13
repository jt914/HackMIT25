import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getUserFromToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = getUserFromToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('onboardcademy');
    const users = db.collection('users');

    // Check if email is already taken by another user
    const existingUser = await users.findOne({
      email,
      _id: { $ne: new ObjectId(decoded.userId) }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already taken' }, { status: 400 });
    }

    const result = await users.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: { name, email } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}