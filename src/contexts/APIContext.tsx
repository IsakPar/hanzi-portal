import { createContext, useContext, type ReactNode, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { setTokenProvider, set401Handler } from '@/services/api';

/**
 * 🔌 API Context
 * Provides authenticated API client throughout the app
 * 
 * Note: Better Auth uses httpOnly cookies for authentication,
 * so we rely on credentials: 'include' for API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// API Response wrapper type
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// API Error class
export class APIError extends Error {
  statusCode: number;
  response?: any;
  
  constructor(
    message: string,
    statusCode: number,
    response?: any
  ) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * API Client Interface
 */
export interface APIClient {
  get: <T>(endpoint: string) => Promise<T>;
  post: <T>(endpoint: string, data?: any) => Promise<T>;
  put: <T>(endpoint: string, data?: any) => Promise<T>;
  patch: <T>(endpoint: string, data?: any) => Promise<T>;
  delete: <T>(endpoint: string) => Promise<T>;
  upload: <T>(endpoint: string, file: File, metadata?: Record<string, string>) => Promise<T>;
}

const APIContext = createContext<APIClient | null>(null);

/**
 * API Provider - Wraps app to provide authenticated API client
 */
export function APIProvider({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();

  // Handle 401 errors by signing out and redirecting
  const handleUnauthorized = useCallback(async () => {
    console.warn('[API] Unauthorized - signing out and redirecting to login');
    await signOut();
    window.location.href = '/login';
  }, [signOut]);

  // Set up global handlers
  useEffect(() => {
    // Better Auth uses cookies, so no token provider needed
    setTokenProvider(async () => null);
    set401Handler(handleUnauthorized);
  }, [handleUnauthorized]);

  /**
   * Base fetch wrapper with Better Auth cookie authentication
   */
  const apiFetch = async <T,>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Send cookies with request
      });

      // Handle different status codes
      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - force sign out
          await handleUnauthorized();
          throw new APIError('Session expired - please sign in again', 401);
        }

        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.error || errorData.message || `Request failed with status ${response.status}`,
          response.status,
          errorData
        );
      }

      // Parse and return response
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      // Network error or other issues
      throw new APIError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  };

  /**
   * Upload file with multipart/form-data
   */
  const uploadFile = async <T,>(
    endpoint: string,
    file: File,
    metadata?: Record<string, string>
  ): Promise<T> => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add metadata fields
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
      credentials: 'include', // Send cookies with request
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.error || errorData.message || 'Upload failed',
        response.status,
        errorData
      );
    }

    return response.json();
  };

  const apiClient: APIClient = {
    get: <T,>(endpoint: string) => apiFetch<T>(endpoint, { method: 'GET' }),
    
    post: <T,>(endpoint: string, data?: any) =>
      apiFetch<T>(endpoint, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      }),
    
    put: <T,>(endpoint: string, data?: any) =>
      apiFetch<T>(endpoint, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      }),
    
    patch: <T,>(endpoint: string, data?: any) =>
      apiFetch<T>(endpoint, {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      }),
    
    delete: <T,>(endpoint: string) => apiFetch<T>(endpoint, { method: 'DELETE' }),
    
    upload: uploadFile,
  };

  return <APIContext.Provider value={apiClient}>{children}</APIContext.Provider>;
}

/**
 * Hook to use API client in components
 * @example
 * const api = useAPI();
 * const lessons = await api.get<Lesson[]>('/v1/admin/lessons');
 */
export function useAPI(): APIClient {
  const context = useContext(APIContext);
  if (!context) {
    throw new Error('useAPI must be used within an APIProvider');
  }
  return context;
}
