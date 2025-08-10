import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export interface User {
  id: string;
  email: string;
  name: string;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
    const secret = new TextEncoder().encode(JWT_SECRET);

    const { payload } = await jwtVerify(token, secret);

    return {
      id: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

export function createAuthResponse(redirectTo: string = '/auth/signin') {
  return NextResponse.redirect(new URL(redirectTo, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}