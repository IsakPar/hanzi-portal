/**
 * 🔌 API Client Service (Clerk-aware singleton)
 * 
 * This exports a singleton `api` object that works with Clerk authentication.
 * All service files can continue using `import { api } from './api'`.
 * 
 * The token is fetched dynamically on each request.
 * 
 * Features:
 * - Automatic Clerk token injection
 * - AbortController support for request cancellation
 * - Upload progress tracking via XMLHttpRequest
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// ==============================================
// DEV TOKEN AUTH - For local development against prod backend
// ==============================================
// Set VITE_DEV_JWT_TOKEN in .env.local with a valid JWT token
// Generate with: JWT_SECRET=xxx node scripts/mint-jwt.mjs --sub dev-admin --role admin --expires 30d
const DEV_JWT_TOKEN = import.meta.env.VITE_DEV_JWT_TOKEN || '';
const USE_DEV_TOKEN = !!DEV_JWT_TOKEN;
// ==============================================

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
 * Token provider function - set by APIContext
 * This allows the singleton api object to fetch Clerk tokens
 */
let getTokenFn: (() => Promise<string | null>) | null = null;

/**
 * Set the token provider (called by APIContext on mount)
 */
export function setTokenProvider(fn: () => Promise<string | null>) {
  getTokenFn = fn;
}

/**
 * Get the current token (exported for XMLHttpRequest uploads)
 * In dev mode with VITE_DEV_JWT_TOKEN set, returns the dev token
 */
export async function getAuthToken(): Promise<string | null> {
  // If dev token is configured, always use it
  if (USE_DEV_TOKEN) {
    return DEV_JWT_TOKEN;
  }
  return getTokenFn ? await getTokenFn() : null;
}

/**
 * Base fetch wrapper with JWT authentication
 * Supports both dev token (VITE_DEV_JWT_TOKEN) and runtime token provider
 */
async function apiFetch<T>(
  endpoint: string,
  options: APIRequestOptions = {}
): Promise<T> {
  // Get token - dev token takes priority, then runtime provider
  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth header if token exists
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal,
    });

    // Handle different status codes
    if (!response.ok) {
      if (response.status === 401) {
        // Don't trigger sign out if using dev token - it might just be expired
        if (!USE_DEV_TOKEN && handle401Fn) {
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
    const token = await getAuthToken();
    
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
      headers["Authorization"] = `Bearer ${token}`;
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
