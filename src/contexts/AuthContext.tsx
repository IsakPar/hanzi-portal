/**
 * Auth Context (Token-Based)
 * 
 * Uses JWT tokens stored in localStorage for authentication.
 * No cookies, no CORS issues, no Safari ITP drama.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { 
  login as authLogin, 
  logout as authLogout, 
  getStoredUser, 
  hasTokens,
  getCurrentUser,
  type AuthUser 
} from '@/lib/authClient';
import { set401Handler } from '@/services/api';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { IdleWarningModal } from '@/components/IdleWarningModal';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  const isAuthenticated = !!user;

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    await authLogout();
    setUser(null);
    window.location.href = '/login';
  }, []);

  // Register 401 handler with API client
  useEffect(() => {
    set401Handler(() => {
      setUser(null);
      window.location.href = '/login';
    });
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      // Quick check - do we have tokens?
      if (!hasTokens()) {
        setIsLoading(false);
        return;
      }

      // Try to get stored user first (fast)
      const storedUser = getStoredUser();
      if (storedUser) {
        setUser(storedUser);
      }

      // Validate with server in background
      try {
        const serverUser = await getCurrentUser();
        if (serverUser) {
          setUser(serverUser);
        } else {
          // Token invalid/expired and couldn't refresh
          setUser(null);
        }
      } catch {
        // Keep using stored user if server check fails
        // (network error, etc.)
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Idle timeout - 10 minutes of inactivity
  const { isWarning, remainingTime, resetTimer } = useIdleTimeout({
    onIdle: () => {
      handleSignOut();
    },
    onWarning: () => {
      setShowIdleWarning(true);
    },
    enabled: isAuthenticated,
  });

  const handleContinueWorking = useCallback(() => {
    setShowIdleWarning(false);
    resetTimer();
  }, [resetTimer]);

  // Sign in
  const handleSignIn = async (email: string, password: string) => {
    try {
      const user = await authLogin(email, password);
      setUser(user);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  // Refresh user data from server
  const handleRefreshUser = async () => {
    const serverUser = await getCurrentUser();
    if (serverUser) {
      setUser(serverUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        signIn: handleSignIn,
        signOut: handleSignOut,
        refreshUser: handleRefreshUser,
      }}
    >
      {children}
      
      {/* Idle Warning Modal */}
      {isWarning && showIdleWarning && (
        <IdleWarningModal
          remainingTime={remainingTime}
          onContinue={handleContinueWorking}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Auth Guard Component
 * Redirects to login if not authenticated
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg mx-auto">
            <span className="text-white font-bold text-2xl">汉</span>
          </div>
          <div className="flex gap-2 justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  return <>{children}</>;
}

/**
 * Admin Guard Component
 * Redirects non-admins to dashboard
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-16 h-16 rounded-xl bg-red-100 flex items-center justify-center mx-auto">
            <span className="text-red-600 font-bold text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500">
            This page is restricted to administrators only.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Guest Guard Component
 * Redirects to dashboard if already authenticated
 */
export function GuestGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    window.location.href = '/';
    return null;
  }

  return <>{children}</>;
}
