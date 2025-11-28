import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from './button';

interface APIErrorBannerProps {
  error: string | null;
  statusCode?: number;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Visible error banner for API failures
 * Shows instead of silent console.log failures
 */
export function APIErrorBanner({ error, statusCode, onRetry, onDismiss }: APIErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  
  if (!error || dismissed) return null;

  const is401 = statusCode === 401;
  const is403 = statusCode === 403;
  const isCors = error.toLowerCase().includes('cors') || error.toLowerCase().includes('network');
  
  const getErrorType = () => {
    if (is401) return { title: 'Authentication Error', color: 'red' };
    if (is403) return { title: 'Permission Denied', color: 'orange' };
    if (isCors) return { title: 'Connection Error', color: 'yellow' };
    return { title: 'API Error', color: 'red' };
  };
  
  const { title, color } = getErrorType();

  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  }[color];

  const iconClasses = {
    red: 'text-red-500',
    orange: 'text-orange-500',
    yellow: 'text-yellow-500',
  }[color];

  return (
    <div className={`rounded-lg border p-4 ${colorClasses}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${iconClasses}`} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-sm mt-1 opacity-90">{error}</p>
          
          {/* Helpful hints */}
          {is401 && (
            <p className="text-xs mt-2 opacity-75">
              Your session may have expired. Try refreshing the page or signing out and back in.
            </p>
          )}
          {isCors && (
            <p className="text-xs mt-2 opacity-75">
              This could be a CORS configuration issue. Check that the backend ALLOWED_ORIGINS includes this portal's URL.
            </p>
          )}
          {statusCode && (
            <p className="text-xs mt-2 font-mono opacity-60">
              Status: {statusCode}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-8 px-2"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDismissed(true);
                onDismiss();
              }}
              className="h-8 px-2"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

