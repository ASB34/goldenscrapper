import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }

    // Verify and decode JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as { id: string; email: string; isAdmin: boolean };
    
    return {
      user: {
        id: decoded.id,
        email: decoded.email,
        is_admin: decoded.isAdmin
      },
      token
    };
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

export async function isAuthenticated() {
  const session = await getSession();
  return !!session?.user;
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

// Legacy functions for backward compatibility
export async function createJWT(payload: Record<string, unknown>) {
  console.warn('createJWT is deprecated - use /api/auth instead');
  return '';
}

export async function verifyJWT(token: string) {
  console.warn('verifyJWT is deprecated - use /api/auth/check instead');
  return null;
}

export async function getTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value || null;
}
