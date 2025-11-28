import { useEffect, useCallback, useRef } from 'react';

type KeyHandler = () => void;

interface ShortcutDefinition {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: KeyHandler;
  /** Prevent default browser behavior (default: true) */
  preventDefault?: boolean;
  /** Description for help screens */
  description?: string;
}

/**
 * Hook for registering keyboard shortcuts.
 * Automatically handles Cmd vs Ctrl for cross-platform compatibility.
 * 
 * @example
 * ```tsx
 * function Editor() {
 *   const handleSave = useCallback(() => {
 *     saveDocument();
 *   }, []);
 * 
 *   useKeyboardShortcuts([
 *     { key: 's', meta: true, handler: handleSave, description: 'Save document' },
 *     { key: 'Escape', handler: () => closePanel(), description: 'Close panel' },
 *   ]);
 * 
 *   return <div>...</div>;
 * }
 * ```
 */
export function useKeyboardShortcuts(shortcuts: ShortcutDefinition[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs (unless it's Escape)
      const target = event.target as HTMLElement | null;
      const isInputField = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );

      for (const shortcut of shortcutsRef.current) {
        const {
          key,
          ctrl = false,
          meta = false,
          shift = false,
          alt = false,
          handler,
          preventDefault = true,
        } = shortcut;

        // Allow Escape in input fields
        if (isInputField && key !== 'Escape') continue;

        // Check if key matches (case-insensitive for letters)
        const keyMatches = 
          event.key.toLowerCase() === key.toLowerCase() ||
          event.code.toLowerCase() === `key${key}`.toLowerCase();

        if (!keyMatches) continue;

        // Cross-platform: treat Cmd (meta) and Ctrl as equivalent for shortcuts
        const modifierKeyPressed = meta ? (event.metaKey || event.ctrlKey) : ctrl ? event.ctrlKey : true;
        
        // Check other modifiers
        const shiftMatches = shift ? event.shiftKey : !event.shiftKey;
        const altMatches = alt ? event.altKey : !event.altKey;

        // For shortcuts without meta/ctrl requirement, make sure neither is pressed
        const noModifierRequired = !meta && !ctrl;
        const noModifierPressed = !event.metaKey && !event.ctrlKey;

        if (
          keyMatches &&
          (meta || ctrl ? modifierKeyPressed : noModifierPressed || noModifierRequired) &&
          shiftMatches &&
          altMatches
        ) {
          if (preventDefault) {
            event.preventDefault();
          }
          handler();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

/**
 * Hook for a single save shortcut (Cmd+S / Ctrl+S).
 * The most common use case gets a dedicated hook.
 * 
 * @example
 * ```tsx
 * function Editor() {
 *   const [isDirty, setIsDirty] = useState(false);
 *   
 *   useSaveShortcut(() => {
 *     if (isDirty) saveDocument();
 *   }, [isDirty]);
 * 
 *   return <div>...</div>;
 * }
 * ```
 */
export function useSaveShortcut(handler: KeyHandler, deps: unknown[] = []) {
  const memoizedHandler = useCallback(handler, deps);
  
  useKeyboardShortcuts([
    { key: 's', meta: true, handler: memoizedHandler, description: 'Save' },
  ]);
}

/**
 * Hook for escape key to close panels/modals.
 * 
 * @example
 * ```tsx
 * function Modal({ onClose }) {
 *   useEscapeKey(onClose);
 *   return <div>...</div>;
 * }
 * ```
 */
export function useEscapeKey(handler: KeyHandler) {
  useKeyboardShortcuts([
    { key: 'Escape', handler, description: 'Close' },
  ]);
}

