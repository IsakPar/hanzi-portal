/**
 * API Context
 * 
 * Thin wrapper around api.ts for React context compatibility.
 * All actual HTTP logic lives in api.ts - this just provides the context interface.
 */

import { createContext, useContext, type ReactNode, useEffect } from 'react';
import { api, set401Handler, APIError } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

// Re-export types from api.ts
export { APIError };
export type { APIResponse } from '@/services/api';

/**
 * API Client Interface
 */
export interface APIClient {
  get: <T>(endpoint: string) => Promise<T>;
  post: <T>(endpoint: string, data?: unknown) => Promise<T>;
  put: <T>(endpoint: string, data?: unknown) => Promise<T>;
  patch: <T>(endpoint: string, data?: unknown) => Promise<T>;
  delete: <T>(endpoint: string) => Promise<T>;
  upload: <T>(endpoint: string, file: File, metadata?: Record<string, string>) => Promise<T>;
}

const APIContext = createContext<APIClient | null>(null);

/**
 * API Provider - Sets up 401 handler for auth redirects
 */
export function APIProvider({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();

  // Register 401 handler - when refresh fails, sign out
  useEffect(() => {
    set401Handler(() => {
      signOut();
    });
  }, [signOut]);

  // Use the singleton api from api.ts
  return (
    <APIContext.Provider value={api}>
      {children}
    </APIContext.Provider>
  );
}

/**
 * Hook to access API client
 */
export function useAPI(): APIClient {
  const context = useContext(APIContext);
  if (!context) {
    // Fall back to singleton if not in provider (for service files)
    return api;
  }
  return context;
}
