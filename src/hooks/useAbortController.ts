import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook for managing AbortController in React components.
 * Automatically cancels pending requests on unmount or when creating a new controller.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { getSignal, abort } = useAbortController();
 * 
 *   useEffect(() => {
 *     async function fetchData() {
 *       try {
 *         const data = await api.get('/endpoint', getSignal());
 *         setData(data);
 *       } catch (err) {
 *         if (err.isAborted) return; // Ignore cancelled requests
 *         setError(err.message);
 *       }
 *     }
 *     fetchData();
 *   }, [getSignal]);
 * 
 *   return <div>...</div>;
 * }
 * ```
 */
export function useAbortController() {
  const controllerRef = useRef<AbortController | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  /**
   * Get a new AbortSignal, cancelling any previous pending request.
   * Call this at the start of each new request.
   */
  const getSignal = useCallback((): AbortSignal => {
    // Cancel previous request if exists
    controllerRef.current?.abort();
    // Create new controller
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, []);

  /**
   * Manually abort the current request.
   * Useful for cancel buttons or navigation away.
   */
  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  return { getSignal, abort };
}

/**
 * Hook for managing multiple named AbortControllers.
 * Useful when a component makes multiple concurrent requests.
 * 
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { getSignal, abort, abortAll } = useAbortControllers();
 * 
 *   useEffect(() => {
 *     Promise.all([
 *       api.get('/lessons', getSignal('lessons')),
 *       api.get('/vocab', getSignal('vocab')),
 *     ]).then(([lessons, vocab]) => {
 *       setLessons(lessons);
 *       setVocab(vocab);
 *     });
 *   }, [getSignal]);
 * 
 *   return <div>...</div>;
 * }
 * ```
 */
export function useAbortControllers() {
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  // Clean up all on unmount
  useEffect(() => {
    return () => {
      controllersRef.current.forEach(controller => controller.abort());
      controllersRef.current.clear();
    };
  }, []);

  /**
   * Get a new AbortSignal for a named request.
   * Cancels any previous request with the same name.
   */
  const getSignal = useCallback((name: string): AbortSignal => {
    // Cancel previous request with this name if exists
    controllersRef.current.get(name)?.abort();
    // Create new controller
    const controller = new AbortController();
    controllersRef.current.set(name, controller);
    return controller.signal;
  }, []);

  /**
   * Abort a specific named request.
   */
  const abort = useCallback((name: string) => {
    controllersRef.current.get(name)?.abort();
    controllersRef.current.delete(name);
  }, []);

  /**
   * Abort all pending requests.
   */
  const abortAll = useCallback(() => {
    controllersRef.current.forEach(controller => controller.abort());
    controllersRef.current.clear();
  }, []);

  return { getSignal, abort, abortAll };
}

