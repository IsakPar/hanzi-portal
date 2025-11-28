/**
 * Auth API Service
 * Re-exports Better Auth client methods for backward compatibility
 * 
 * Note: Most auth is handled directly through the Better Auth client
 * This file provides some utility functions for token access
 */

import { authClient } from '@/lib/auth-client';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'user';
  tier: 'free' | 'premium' | 'pro';
}

// Storage helper for getting auth token (Better Auth uses cookies, but we may need token for some API calls)
export const authStorage = {
  // Better Auth handles cookies automatically, but we can get session for API calls
  getToken: (): string | null => {
    // Better Auth uses httpOnly cookies by default
    // For API calls, we rely on cookies being sent automatically
    return null;
  },
  clear: () => {
    // Better Auth handles this via signOut
  },
};

// Re-export auth client methods
export const authAPI = {
  signIn: async (email: string, password: string) => {
    return authClient.signIn.email({ email, password });
  },
  signOut: async () => {
    return authClient.signOut();
  },
  getSession: async () => {
    return authClient.getSession();
  },
  forgotPassword: async (_email: string) => {
    // TODO: Set up email service for password reset
    // For now, admin can reset passwords via admin panel
    return { success: true };
  },
  resetPassword: async (token: string, password: string) => {
    return authClient.resetPassword({
      newPassword: password,
      token,
    });
  },
};

// Admin user management types (these will use the admin plugin endpoints)
export interface CreateUserInput {
  email: string;
  name: string;
  role: 'admin' | 'user';
  password: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'user';
  tier: 'free' | 'premium' | 'pro';
  emailVerified: boolean;
  createdAt: string;
}
