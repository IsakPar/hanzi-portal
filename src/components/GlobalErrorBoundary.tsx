import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('❌ Global Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;
      const errorMessage = this.state.error?.message || 'An unexpected error occurred';
      const isEnvError = errorMessage.includes('VITE_') || errorMessage.includes('env');

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-8">
          <div className="max-w-3xl w-full bg-white rounded-2xl shadow-2xl p-12">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Something Went Wrong</h1>
                <p className="text-gray-500">The application encountered an error</p>
              </div>
            </div>

            {/* Error Message */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="font-mono text-sm text-red-800">{errorMessage}</p>
            </div>

            {/* Environment Error Help */}
            {isEnvError && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="font-bold text-blue-900 mb-3">⚙️ Environment Variable Issue</h3>
                <p className="text-sm text-blue-800">
                  Check your <code className="bg-blue-100 px-2 py-1 rounded">.env.local</code> file and make sure all required variables are set.
                  Remember to restart the dev server after making changes.
                </p>
              </div>
            )}

            {/* Technical Details (Dev Mode Only) */}
            {isDev && this.state.errorInfo && (
              <details className="mb-6">
                <summary className="cursor-pointer font-semibold text-gray-700 bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                  🔍 Technical Details (Dev Mode)
                </summary>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <div className="mb-4">
                    <p className="font-semibold text-gray-700 mb-2">Error Stack:</p>
                    <pre className="text-xs text-gray-600 overflow-auto max-h-40 bg-white p-3 rounded border">
                      {this.state.error?.stack}
                    </pre>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 mb-2">Component Stack:</p>
                    <pre className="text-xs text-gray-600 overflow-auto max-h-40 bg-white p-3 rounded border">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
              >
                <Home size={20} />
                Go Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
              >
                <RefreshCw size={20} />
                Reload Page
              </button>
            </div>

            {/* Dev Mode Indicator */}
            {isDev && (
              <div className="mt-6 text-center">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-mono rounded-full">
                  DEV MODE - Detailed errors enabled
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
