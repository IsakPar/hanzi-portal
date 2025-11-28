/**
 * Idle Timeout Hook
 * Tracks user activity and triggers logout after inactivity
 * 
 * Security feature: 10 minute timeout for admin portal
 */

import { useEffect, useRef, useCallback, useState } from 'react';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE_MS = 60 * 1000; // Show warning 1 minute before logout

interface UseIdleTimeoutOptions {
  onIdle: () => void;
  onWarning?: () => void;
  enabled?: boolean;
}

export function useIdleTimeout({ onIdle, onWarning, enabled = true }: UseIdleTimeoutOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isWarning, setIsWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(IDLE_TIMEOUT_MS);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    clearTimers();
    setIsWarning(false);
    setRemainingTime(IDLE_TIMEOUT_MS);

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setIsWarning(true);
      onWarning?.();
      
      // Start countdown
      const countdownInterval = setInterval(() => {
        setRemainingTime(prev => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            clearInterval(countdownInterval);
          }
          return Math.max(0, newTime);
        });
      }, 1000);

      // Store interval ref for cleanup
      (warningRef.current as any)._countdownInterval = countdownInterval;
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      onIdle();
    }, IDLE_TIMEOUT_MS);
  }, [enabled, clearTimers, onIdle, onWarning]);

  // Track activity
  useEffect(() => {
    if (!enabled) return;

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // Initial timer
    resetTimer();

    // Add listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimers();
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      // Clear countdown interval if exists
      if ((warningRef.current as any)?._countdownInterval) {
        clearInterval((warningRef.current as any)._countdownInterval);
      }
    };
  }, [enabled, resetTimer, clearTimers]);

  return {
    isWarning,
    remainingTime,
    resetTimer,
  };
}

export default useIdleTimeout;

