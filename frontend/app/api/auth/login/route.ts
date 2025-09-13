import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { comparePassword, generateToken } from '@/lib/auth';
import { fallbackDB } from '@/lib/mongodb-fallback';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    // Try MongoDB first, fallback to in-memory if it fails
    try {
      const client = await clientPromise;
      const db = client.db('onboardcademy');
      const users = db.collection('users');

      const user = await users.findOne({ email });
      if (!user) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const token = generateToken(user._id.toString());

      const response = NextResponse.json({
        message: 'Login successful',
        user: { id: user._id, email: user.email, name: user.name }
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
      const user = await fallbackDB.findUserByEmail(email);
      if (!user) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const token = generateToken(user._id);

      const response = NextResponse.json({
        message: 'Login successful (using fallback database)',
        user: { id: user._id, email: user.email, name: user.name }
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
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}