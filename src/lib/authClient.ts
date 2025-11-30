/**
 * Token-Based Auth Client
 * 
 * Manages JWT access tokens and refresh tokens in localStorage.
 * No cookies, no CORS issues, no Safari ITP drama.
 */

const ACCESS_TOKEN_KEY = 'hm_access_token';
const REFRESH_TOKEN_KEY = 'hm_refresh_token';
const USER_KEY = 'hm_user';

// API URL - direct to backend, no proxy needed
const API_URL = import.meta.env.VITE_API_URL || 'https://api.studio.polymasterlabs.com';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  tier: 'free' | 'premium' | 'pro';
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ═══════════════════════════════════════════════════════════
// TOKEN STORAGE
// ═══════════════════════════════════════════════════════════

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export function setTokens(accessToken: string, refreshToken: string, user: AuthUser): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ═══════════════════════════════════════════════════════════
// AUTH METHODS
// ═══════════════════════════════════════════════════════════

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/v1/auth/token/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(error.error || error.message || 'Login failed');
  }

  const data: TokenResponse = await res.json();
  setTokens(data.accessToken, data.refreshToken, data.user);
  return data.user;
}

/**
 * Logout - clear tokens and notify server
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  
  // Clear local tokens first
  clearTokens();
  
  // Notify server (best effort)
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/v1/auth/token/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Ignore errors - we're logging out anyway
    }
  }
}

/**
 * Refresh the access token using the refresh token
 * Returns true if successful, false if refresh failed (need to re-login)
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    return false;
  }

  try {
    const res = await fetch(`${API_URL}/v1/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      // Refresh failed - clear tokens
      clearTokens();
      return false;
    }

    const data = await res.json();
    const user = getStoredUser();
    
    if (user) {
      setTokens(data.accessToken, data.refreshToken, user);
    }
    
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

/**
 * Get current user from /me endpoint (validates token with server)
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const accessToken = getAccessToken();
  
  if (!accessToken) {
    return null;
  }

  try {
    const res = await fetch(`${API_URL}/v1/auth/token/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
      // Token expired, try refresh
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry with new token
        return getCurrentUser();
      }
      return null;
    }

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Check if we have tokens stored (quick check, doesn't validate)
 */
export function hasTokens(): boolean {
  return !!getAccessToken() && !!getRefreshToken();
}
