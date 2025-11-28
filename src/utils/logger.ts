/**
 * 📝 Logger Utility
 * 
 * Wraps console methods to control logging based on environment.
 * In production, only errors are logged to avoid exposing internal data.
 */

const isDev = import.meta.env.DEV;

/**
 * Logger object with environment-aware methods
 */
export const logger = {
  /**
   * Debug logs - only in development
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug('[DEBUG]', ...args);
    }
  },

  /**
   * Info logs - only in development
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Info logs - only in development
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warning logs - always shown
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error logs - always shown
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * API logs - detailed in dev, minimal in prod
   */
  api: (method: string, endpoint: string, data?: any) => {
    if (isDev) {
      console.log(`[API] ${method} ${endpoint}`, data || '');
    }
  },

  /**
   * API error logs - always shown but sanitized in prod
   */
  apiError: (method: string, endpoint: string, error: any) => {
    if (isDev) {
      console.error(`[API ERROR] ${method} ${endpoint}`, error);
    } else {
      console.error(`[API ERROR] ${method} ${endpoint}`, error?.message || 'Request failed');
    }
  },
};

export default logger;

