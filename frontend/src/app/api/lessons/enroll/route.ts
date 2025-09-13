import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getUserFromToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = getUserFromToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { lessonId } = await request.json();

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('onboardcademy');
    const users = db.collection('users');

    const result = await users.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $addToSet: { enrolledLessons: lessonId } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Successfully enrolled in lesson' });
  } catch (error) {
    console.error('Enrollment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}