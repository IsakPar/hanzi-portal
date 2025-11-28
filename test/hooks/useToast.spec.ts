import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast } from '@/hooks/useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add a toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({
        title: 'Test Toast',
        description: 'Test description',
      });
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
    expect(result.current.toasts[0].description).toBe('Test description');
  });

  it('should add success toast via shorthand', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast.success('Success!', 'Operation completed');
    });

    // The toast is added globally, so we need to use the hook to see it
    expect(result.current.toasts.some(t => t.title === 'Success!')).toBe(true);
  });

  it('should add error toast via shorthand', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast.error('Error!', 'Something went wrong');
    });

    expect(result.current.toasts.some(t => t.variant === 'error')).toBe(true);
  });

  it('should dismiss a toast', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;
    act(() => {
      const { id } = result.current.toast({
        title: 'Dismissable Toast',
      });
      toastId = id;
    });

    // There may be toasts from other tests due to shared state
    const toastsBefore = result.current.toasts.length;
    expect(toastsBefore).toBeGreaterThanOrEqual(1);

    act(() => {
      result.current.dismiss(toastId);
    });

    // Toast should be marked as closed
    const dismissedToast = result.current.toasts.find(t => t.id === toastId);
    expect(dismissedToast?.open).toBe(false);
  });

  it('should respect toast limit', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      // Add more toasts than the limit (3)
      toast.info('Toast 1');
      toast.info('Toast 2');
      toast.info('Toast 3');
      toast.info('Toast 4');
    });

    // Should not exceed limit of 3
    expect(result.current.toasts.length).toBeLessThanOrEqual(3);
  });
});

