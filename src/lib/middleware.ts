import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function requireAuth(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export function requireRole(request: NextRequest, role: 'instructor' | 'student') {
  const user = requireAuth(request);

  console.log("User role: ", user.role);
  if (user.role !== role) {
    throw new Error(`Access denied. ${role} role required.`);
  }
  return user;
}

