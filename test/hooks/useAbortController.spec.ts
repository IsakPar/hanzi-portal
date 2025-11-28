import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAbortController, useAbortControllers } from '@/hooks/useAbortController';

describe('useAbortController', () => {
  it('should create an abort signal', () => {
    const { result } = renderHook(() => useAbortController());

    let signal: AbortSignal;
    act(() => {
      signal = result.current.getSignal();
    });

    expect(signal!).toBeInstanceOf(AbortSignal);
    expect(signal!.aborted).toBe(false);
  });

  it('should abort previous signal when getting new one', () => {
    const { result } = renderHook(() => useAbortController());

    let firstSignal: AbortSignal;
    let secondSignal: AbortSignal;

    act(() => {
      firstSignal = result.current.getSignal();
    });

    act(() => {
      secondSignal = result.current.getSignal();
    });

    expect(firstSignal!.aborted).toBe(true);
    expect(secondSignal!.aborted).toBe(false);
  });

  it('should abort on manual call', () => {
    const { result } = renderHook(() => useAbortController());

    let signal: AbortSignal;
    act(() => {
      signal = result.current.getSignal();
    });

    expect(signal!.aborted).toBe(false);

    act(() => {
      result.current.abort();
    });

    expect(signal!.aborted).toBe(true);
  });

  it('should abort on unmount', () => {
    const { result, unmount } = renderHook(() => useAbortController());

    let signal: AbortSignal;
    act(() => {
      signal = result.current.getSignal();
    });

    expect(signal!.aborted).toBe(false);

    unmount();

    expect(signal!.aborted).toBe(true);
  });
});

describe('useAbortControllers', () => {
  it('should create named abort signals', () => {
    const { result } = renderHook(() => useAbortControllers());

    let signalA: AbortSignal;
    let signalB: AbortSignal;

    act(() => {
      signalA = result.current.getSignal('requestA');
      signalB = result.current.getSignal('requestB');
    });

    expect(signalA!.aborted).toBe(false);
    expect(signalB!.aborted).toBe(false);
  });

  it('should abort only the named request', () => {
    const { result } = renderHook(() => useAbortControllers());

    let signalA: AbortSignal;
    let signalB: AbortSignal;

    act(() => {
      signalA = result.current.getSignal('requestA');
      signalB = result.current.getSignal('requestB');
    });

    act(() => {
      result.current.abort('requestA');
    });

    expect(signalA!.aborted).toBe(true);
    expect(signalB!.aborted).toBe(false);
  });

  it('should abort all on abortAll', () => {
    const { result } = renderHook(() => useAbortControllers());

    let signalA: AbortSignal;
    let signalB: AbortSignal;

    act(() => {
      signalA = result.current.getSignal('requestA');
      signalB = result.current.getSignal('requestB');
    });

    act(() => {
      result.current.abortAll();
    });

    expect(signalA!.aborted).toBe(true);
    expect(signalB!.aborted).toBe(true);
  });

  it('should abort previous signal with same name', () => {
    const { result } = renderHook(() => useAbortControllers());

    let firstSignal: AbortSignal;
    let secondSignal: AbortSignal;

    act(() => {
      firstSignal = result.current.getSignal('request');
    });

    act(() => {
      secondSignal = result.current.getSignal('request');
    });

    expect(firstSignal!.aborted).toBe(true);
    expect(secondSignal!.aborted).toBe(false);
  });
});

