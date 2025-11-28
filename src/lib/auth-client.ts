/**
 * Better Auth Client Configuration
 * 
 * This creates the auth client that communicates with the backend
 * @see https://www.better-auth.com
 */

import { createAuthClient } from 'better-auth/react';

const API_URL = import.meta.env.VITE_API_URL || 'https://hanzimaster-backend-v2.isak-parild.workers.dev';

export const authClient = createAuthClient({
  baseURL: `${API_URL}/v1/auth`,
});

// Export individual hooks and methods for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  resetPassword,
} = authClient;

// Note: forgotPassword is accessed via authClient.forgetPassword() or authClient.email.sendVerificationEmail()

