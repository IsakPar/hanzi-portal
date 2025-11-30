/**
 * Auth API Service
 * Provides utility functions for token-based authentication
 */

import { 
  login, 
  logout, 
  getAccessToken, 
  getStoredUser,
  type AuthUser 
} from '@/lib/authClient';

export type { AuthUser };

// Storage helper for getting auth token
export const authStorage = {
  getToken: (): string | null => {
    return getAccessToken();
  },
  clear: () => {
    // Handled by logout
  },
};

// Re-export auth methods for backward compatibility
export const authAPI = {
  signIn: async (email: string, password: string) => {
    const user = await login(email, password);
    return { user };
  },
  signOut: async () => {
    await logout();
  },
  getSession: async () => {
    const user = getStoredUser();
    return user ? { user } : null;
  },
  forgotPassword: async (_email: string) => {
    // TODO: Implement password reset via API
    // For now, admin can reset passwords via admin panel
    return { success: true };
  },
  resetPassword: async (_token: string, _password: string) => {
    // TODO: Implement password reset via API
    return { success: true };
  },
};

// Admin user management types
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
