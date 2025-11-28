import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, useSaveShortcut, useEscapeKey } from '@/hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let eventListeners: { [key: string]: EventListener };

  beforeEach(() => {
    eventListeners = {};
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      eventListeners[event] = handler as EventListener;
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((event) => {
      delete eventListeners[event];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register keyboard event listener', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([
      { key: 's', meta: true, handler },
    ]));

    expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should call handler on matching shortcut', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([
      { key: 's', meta: true, handler },
    ]));

    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
    });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

    eventListeners['keydown']?.(event);

    expect(handler).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should not call handler when modifiers do not match', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([
      { key: 's', meta: true, handler },
    ]));

    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: false,
    });

    eventListeners['keydown']?.(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should cleanup on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts([
      { key: 's', meta: true, handler },
    ]));

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

describe('useSaveShortcut', () => {
  let eventListeners: { [key: string]: EventListener };

  beforeEach(() => {
    eventListeners = {};
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      eventListeners[event] = handler as EventListener;
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should trigger on Cmd+S', () => {
    const handler = vi.fn();
    renderHook(() => useSaveShortcut(handler));

    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
    });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

    eventListeners['keydown']?.(event);

    expect(handler).toHaveBeenCalled();
  });

  it('should trigger on Ctrl+S', () => {
    const handler = vi.fn();
    renderHook(() => useSaveShortcut(handler));

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

    eventListeners['keydown']?.(event);

    expect(handler).toHaveBeenCalled();
  });
});

describe('useEscapeKey', () => {
  let eventListeners: { [key: string]: EventListener };

  beforeEach(() => {
    eventListeners = {};
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      eventListeners[event] = handler as EventListener;
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should trigger on Escape key', () => {
    const handler = vi.fn();
    renderHook(() => useEscapeKey(handler));

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
    });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

    eventListeners['keydown']?.(event);

    expect(handler).toHaveBeenCalled();
  });
});

