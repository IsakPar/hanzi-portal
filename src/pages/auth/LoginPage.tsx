/**
 * Login Page
 * Admin portal login - email/password only
 * Uses token-based authentication (JWT)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { login } from '@/lib/authClient';
import { API_BASE_URL } from '@/services/api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error' | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Check API connectivity on mount
  useEffect(() => {
    const checkApi = async () => {
      setApiStatus('checking');
      try {
        // Simple health check - just fetch the root endpoint
        const response = await fetch(`${API_BASE_URL}/`);
        console.log('[API Check] Response:', {
          status: response.status,
          ok: response.ok,
        });
        setApiStatus('ok');
        setApiError(null);
      } catch (err) {
        console.error('[API Check] Failed:', err);
        setApiStatus('error');
        setApiError(err instanceof Error ? `${err.name}: ${err.message}` : 'Unknown error');
      }
    };
    checkApi();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      // Successful login - redirect to dashboard
      window.location.href = '/';
    } catch (err) {
      setError((err as Error).message || 'Failed to sign in');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shadow-2xl mx-auto mb-4 border border-white/10">
            <span className="text-white font-bold text-3xl">汉</span>
          </div>
          <h1 className="text-2xl font-bold text-white">HanziMaster</h1>
          <p className="text-slate-400 text-sm mt-1">Admin Portal</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* API Status */}
        <div className="mt-6 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 text-sm">
            {apiStatus === 'checking' && (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span className="text-slate-400">Checking API connection...</span>
              </>
            )}
            {apiStatus === 'ok' && (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-green-400">API connected</span>
              </>
            )}
            {apiStatus === 'error' && (
              <div className="w-full">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">API connection failed</span>
                </div>
                {apiError && (
                  <p className="text-xs text-red-300/70 mt-1 font-mono break-all">{apiError}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-8">
          Contact your administrator to get an account.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
