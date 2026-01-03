/**
 * 🔌 API Client Service (Token-Based Authentication)
 * 
 * This exports a singleton `api` object that uses JWT Bearer tokens.
 * All service files can continue using `import { api } from './api'`.
 * 
 * Features:
 * - JWT token authentication via Authorization header
 * - Automatic token refresh on 401
 * - AbortController support for request cancellation
 */

import { getAccessToken, refreshAccessToken } from '@/lib/authClient';

// Direct API URL - no proxy needed with token auth
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.studio.polymasterlabs.com';

// CDN URL for static content (R2 bucket)
const CDN_BASE_URL = import.meta.env.VITE_CDN_URL || 'https://content.polymasterlabs.com';

// Export for use in other files
export { API_BASE_URL, CDN_BASE_URL };

// API Response wrapper type
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Request options - extends RequestInit for full compatibility
export type APIRequestOptions = RequestInit;

// API Error class
export class APIError extends Error {
  statusCode: number;
  response?: unknown;
  isAborted: boolean;
  
  constructor(
    message: string,
    statusCode: number,
    response?: unknown,
    isAborted = false
  ) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.response = response;
    this.isAborted = isAborted;
  }
}

// 401 handler - set by AuthContext for logout/redirect
let handle401Fn: (() => void) | null = null;

export function set401Handler(fn: () => void) {
  handle401Fn = fn;
}

// Track if we're currently refreshing to prevent thundering herd
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Ensure we have a valid access token, refreshing if necessary
 */
async function ensureValidToken(): Promise<string | null> {
  const token = getAccessToken();
  if (token) return token;
  
  // No token - maybe we can refresh?
  if (isRefreshing && refreshPromise) {
    await refreshPromise;
    return getAccessToken();
  }
  
  return null;
}

/**
 * Handle 401 - try to refresh, or logout
 */
async function handle401(): Promise<boolean> {
  // Prevent multiple simultaneous refresh attempts (thundering herd)
  if (isRefreshing) {
    return refreshPromise!;
  }
  
  isRefreshing = true;
  refreshPromise = refreshAccessToken();
  
  try {
    const success = await refreshPromise;
    if (!success && handle401Fn) {
      handle401Fn();
    }
    return success;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

/**
 * Base fetch wrapper with JWT authentication
 */
async function apiFetch<T>(
  endpoint: string,
  options: APIRequestOptions = {},
  isRetry = false
): Promise<T> {
  const token = await ensureValidToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json; charset=utf-8',
    ...options.headers,
  };
  
  // Add Authorization header if we have a token
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  // Debug logging for 404 investigation
  console.log('[apiFetch] Making request:', {
    url,
    method: options.method || 'GET',
    hasToken: !!token,
    headers: Object.keys(headers),
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal,
    });
    
    console.log('[apiFetch] Response received:', {
      url,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
    });

    // Handle 401 - try refresh once
    if (response.status === 401 && !isRetry) {
      const refreshed = await handle401();
      if (refreshed) {
        // Retry with new token
        return apiFetch<T>(endpoint, options, true);
      }
      throw new APIError('Session expired - please sign in again', 401);
    }

    // Handle other errors
    if (!response.ok) {
      const responseText = await response.text();
      console.log('[apiFetch] Error response body:', responseText);
      
      let errorData = {};
      try {
        errorData = JSON.parse(responseText);
      } catch {
        console.log('[apiFetch] Response is not JSON');
      }
      
      throw new APIError(
        (errorData as any).error || (errorData as any).message || `Request failed with status ${response.status}`,
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

    // Handle abort errors
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new APIError('Request cancelled', 0, undefined, true);
    }

    // Network error or other issues
    const errorMessage = error instanceof Error ? error.message : 'Network error';
    throw new APIError(errorMessage, 0);
  }
}

/**
 * API client singleton - works everywhere, including service files
 * All methods support optional AbortSignal for request cancellation
 */
export const api = {
  // GET request
  get: <T,>(endpoint: string, signal?: AbortSignal): Promise<T> =>
    apiFetch<T>(endpoint, { method: 'GET', signal }),

  // POST request
  post: <T,>(endpoint: string, data?: unknown, signal?: AbortSignal): Promise<T> =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      signal,
    }),

  // PUT request
  put: <T,>(endpoint: string, data?: unknown, signal?: AbortSignal): Promise<T> =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      signal,
    }),

  // PATCH request
  patch: <T,>(endpoint: string, data?: unknown, signal?: AbortSignal): Promise<T> =>
    apiFetch<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      signal,
    }),

  // DELETE request
  delete: <T,>(endpoint: string, signal?: AbortSignal): Promise<T> =>
    apiFetch<T>(endpoint, { method: 'DELETE', signal }),

  // Upload file (multipart/form-data)
  upload: async <T,>(endpoint: string, file: File, metadata?: Record<string, string>): Promise<T> => {
    const token = getAccessToken();
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Add metadata fields
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
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
  },
};

export default api;
