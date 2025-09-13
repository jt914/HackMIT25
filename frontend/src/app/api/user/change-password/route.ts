import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getUserFromToken, comparePassword, hashPassword } from '@/lib/auth';
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

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('onboardcademy');
    const users = db.collection('users');

    const user = await users.findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValidPassword = await comparePassword(currentPassword, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await users.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: { password: hashedNewPassword } }
    );

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}