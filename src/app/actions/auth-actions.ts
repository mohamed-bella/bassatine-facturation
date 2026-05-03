'use server';

import { cookies } from 'next/headers';

export async function login(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bassatine.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'bassatine2024';

  if (email === adminEmail && password === adminPassword) {
    const cookieStore = await cookies();
    cookieStore.set('auth_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    return { success: true };
  }

  return { success: false, error: 'Identifiants incorrects.' };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_session');
  return { success: true };
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('auth_session');
  return session?.value === 'authenticated';
}
