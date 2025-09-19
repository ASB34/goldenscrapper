import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create admin client for server-side operations
let supabaseAdmin: any;

if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not found - some operations may fail');
}

export async function getSupabaseSession() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;
    
    if (!accessToken) {
      return null;
    }

    if (!supabaseAdmin) {
      console.error('Supabase admin client not available');
      return null;
    }

    // Verify the session using the admin client
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (error || !user) {
      return null;
    }
    
    return {
      user,
      access_token: accessToken,
      refresh_token: refreshToken
    };
  } catch (error) {
    console.error('Session error:', error);
    return null;
  }
}

export async function isAuthenticated() {
  const session = await getSupabaseSession();
  return !!session?.user;
}

export async function getCurrentUser() {
  const session = await getSupabaseSession();
  return session?.user || null;
}

// Legacy functions for backward compatibility
export async function createJWT(payload: Record<string, unknown>) {
  console.warn('createJWT is deprecated - use Supabase Auth instead');
  return '';
}

export async function verifyJWT(token: string) {
  console.warn('verifyJWT is deprecated - use Supabase Auth instead');
  return null;
}

export async function getTokenFromCookies() {
  console.warn('getTokenFromCookies is deprecated - use getSupabaseSession instead');
  return null;
}
