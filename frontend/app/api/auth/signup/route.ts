import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { hashPassword, generateToken } from '@/lib/auth';
import { fallbackDB } from '@/lib/mongodb-fallback';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    // Try MongoDB first, fallback to in-memory if it fails
    try {
      const client = await clientPromise;
      const db = client.db('onboardcademy');
      const users = db.collection('users');

      const existingUser = await users.findOne({ email });
      if (existingUser) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }

      const result = await users.insertOne({
        email,
        password: hashedPassword,
        name,
        enrolledLessons: [],
        createdAt: new Date()
      });

      const token = generateToken(result.insertedId.toString());

      const response = NextResponse.json({
        message: 'User created successfully',
        user: { id: result.insertedId, email, name }
      });

      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return response;

    } catch (mongoError) {
      console.warn('MongoDB unavailable, using fallback database:', mongoError.message);

      // Use fallback database
      const existingUser = await fallbackDB.findUserByEmail(email);
      if (existingUser) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }

      const result = await fallbackDB.insertUser({
        email,
        password: hashedPassword,
        name,
        enrolledLessons: [],
        createdAt: new Date()
      });

      const token = generateToken(result.insertedId);

      const response = NextResponse.json({
        message: 'User created successfully (using fallback database)',
        user: { id: result.insertedId, email, name }
      });

      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return response;
    }

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}