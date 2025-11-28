/**
 * Auth Context
 * Uses Better Auth for authentication state management
 * Includes 10-minute inactivity timeout for security
 * 
 * @see https://www.better-auth.com
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { authClient, useSession } from '@/lib/auth-client';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { IdleWarningModal } from '@/components/IdleWarningModal';

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role?: string;
  tier?: string;
  image?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending, error, refetch } = useSession();
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  // ==============================================
  // TEMPORARY DEV BYPASS - REMOVE BEFORE PRODUCTION
  // ==============================================
  const user: AuthUser = {
    id: 'dev-bypass-admin',
    email: 'isak@polymasterlabs.com',
    name: 'Isak Parild',
    role: 'admin',
    tier: 'pro',
  };
  const isAuthenticated = true;
  const bypassMode = true;
  // END TEMPORARY BYPASS ======================

  // Real auth values (unused in bypass mode)
  void session; void error;

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    window.location.href = '/login';
  }, []);

  // Idle timeout - 10 minutes of inactivity
  const { isWarning, remainingTime, resetTimer } = useIdleTimeout({
    onIdle: () => {
      handleSignOut();
    },
    onWarning: () => {
      setShowIdleWarning(true);
    },
    enabled: isAuthenticated, // Only track when logged in
  });

  const handleContinueWorking = useCallback(() => {
    setShowIdleWarning(false);
    resetTimer();
  }, [resetTimer]);

  const handleSignIn = async (email: string, password: string) => {
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });
      
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const handleRefreshSession = async () => {
    await refetch();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: bypassMode ? false : isPending, // Bypass: never loading
        isAuthenticated,
        signIn: handleSignIn,
        signOut: handleSignOut,
        refreshSession: handleRefreshSession,
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
