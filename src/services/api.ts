/**
 * 🔌 API Client Service (Better Auth aware singleton)
 * 
 * This exports a singleton `api` object that works with Better Auth cookies.
 * All service files can continue using `import { api } from './api'`.
 * 
 * Features:
 * - Automatic cookie-based authentication via credentials: 'include'
 * - AbortController support for request cancellation
 * - Upload progress tracking via XMLHttpRequest
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Export for use in upload functions
export { API_BASE_URL };

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

// 401 handler - set by APIContext
let handle401Fn: (() => Promise<void>) | null = null;

export function set401Handler(fn: () => Promise<void>) {
  handle401Fn = fn;
}

/**
 * Token provider function - kept for backwards compatibility but not used
 * Better Auth uses cookies, so no tokens needed
 */
let getTokenFn: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>) {
  getTokenFn = fn;
}

/**
 * Get the current token - kept for upload functions that need it
 */
export async function getAuthToken(): Promise<string | null> {
  return getTokenFn ? await getTokenFn() : null;
}

/**
 * Base fetch wrapper with Better Auth cookie authentication
 */
async function apiFetch<T>(
  endpoint: string,
  options: APIRequestOptions = {}
): Promise<T> {
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
      signal: options.signal,
    });

    // Handle different status codes
    if (!response.ok) {
      if (response.status === 401) {
        if (handle401Fn) {
          console.warn('[API] 401 received, triggering sign out');
          await handle401Fn();
        }
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

    // Handle abort errors
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new APIError('Request cancelled', 0, undefined, true);
    }

    // Network error or other issues
    throw new APIError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
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

  // Upload file (multipart/form-data) - basic version without progress
  upload: async <T,>(endpoint: string, file: File, metadata?: Record<string, string>): Promise<T> => {
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
  },
};

export default api;
