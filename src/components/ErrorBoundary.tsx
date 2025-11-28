import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export function ErrorBoundary() {
  const error = useRouteError();

  let errorMessage = "An unexpected error occurred";
  let errorDetails = "";
  let statusCode = 500;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    errorMessage = error.statusText || `Error ${error.status}`;
    errorDetails = error.data?.message || "";
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = error.stack || "";
  }

  const is404 = statusCode === 404;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-12 text-center">
        <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
          is404 ? 'bg-blue-100' : 'bg-red-100'
        }`}>
          <AlertTriangle size={48} className={is404 ? 'text-blue-600' : 'text-red-600'} />
        </div>

        <h1 className="text-4xl font-extrabold text-gray-800 mb-4">
          {is404 ? 'Page Not Found' : `Error ${statusCode}`}
        </h1>

        <p className="text-xl text-gray-600 mb-6">
          {errorMessage}
        </p>

        {errorDetails && (
          <details className="text-left bg-gray-50 rounded-lg p-4 mb-6">
            <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
              Technical Details
            </summary>
            <pre className="text-xs text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap">
              {errorDetails}
            </pre>
          </details>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <Home size={20} />
            Go Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
          >
            <RefreshCw size={20} />
            Reload Page
          </button>
        </div>

        {statusCode >= 500 && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
            <h3 className="font-semibold text-yellow-800 mb-2">🔧 Troubleshooting:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Check if the backend server is running</li>
              <li>• Verify API_BASE_URL in your environment</li>
              <li>• Check browser console for network errors</li>
              <li>• Try clearing browser cache and reload</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

